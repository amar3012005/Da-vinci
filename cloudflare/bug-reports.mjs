const HOSTS = new Set(['https://next.singulancelabs.com', 'https://runtime-runner.singulancelabs.com']);
const MAX_BODY = 3_000_000;
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mp4']);
const reply = (error, status) => Response.json({ error }, { status, headers: { 'cache-control': 'private, no-store' } });

export function reporterEnabled(env) {
  return env.BUG_REPORTS_ENABLED === 'true' && env.BUG_REPORT_EMAIL && env.BUG_REPORT_RATE_LIMITER
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.BUG_REPORT_FROM || '')
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.BUG_REPORT_TO || '');
}

async function boundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw new Error('large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

function safePath(input, origin) {
  try {
    const url = new URL(input, origin);
    return url.origin === origin && url.pathname.startsWith('/hivemind/app') ? url.pathname.slice(0, 500) : '/hivemind/app';
  } catch { return '/hivemind/app'; }
}

function imageSignature(bytes, type) {
  if (type === 'image/png') return [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  if (type === 'audio/webm') return [26,69,223,163].every((v,i) => bytes[i] === v);
  if (type === 'audio/ogg') return String.fromCharCode(...bytes.slice(0,4)) === 'OggS';
  return type === 'audio/mp4' && String.fromCharCode(...bytes.slice(4,8)) === 'ftyp';
}

export async function bugReport(request, env) {
  const url = new URL(request.url);
  if (!HOSTS.has(url.origin) || request.headers.get('origin') !== url.origin) return reply('origin_denied', 403);
  if (request.method !== 'POST') return new Response(null, { status:405, headers:{ allow:'POST' } });
  const session = (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith('hm_cp_session='));
  if (!session) return reply('authentication_required', 401);
  if (!reporterEnabled(env)) return reply('bug_reporting_unavailable', 503);
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return reply('invalid_report', 415);
  let principal;
  try {
    const auth = await fetch('https://api.singulancelabs.com/v1/bootstrap', {
      headers:{ cookie:session, origin:url.origin, accept:'application/json' }, redirect:'error', signal:AbortSignal.timeout(8000),
    });
    if (auth.status === 401 || auth.status === 403) return reply('authentication_required', 401);
    if (!auth.ok) return reply('authentication_unavailable', 503);
    principal = await auth.json();
    if (!principal.user?.id || principal.authenticated === false) return reply('authentication_required', 401);
  } catch { return reply('authentication_unavailable', 503); }
  // Native per-Cloudflare-location enforcement, never a process-local counter.
  let limit;
  try { limit = await env.BUG_REPORT_RATE_LIMITER.limit({ key: `${principal.organization?.id || 'personal'}:${principal.user.id}` }); }
  catch { return reply('bug_reporting_unavailable', 503); }
  if (!limit.success) return reply('report_rate_limited', 429);
  let form;
  try {
    const bytes = await boundedBody(request);
    form = await new Response(bytes, { headers:{ 'content-type':request.headers.get('content-type') } }).formData();
  } catch (error) { return reply(error.message === 'large' ? 'report_too_large' : 'invalid_report', error.message === 'large' ? 413 : 400); }
  if ([...form.keys()].some(key => !['remark','path','consent','screenshot','audio'].includes(key))) return reply('invalid_report', 400);
  if ([...new Set(form.keys())].some(key => form.getAll(key).length !== 1)) return reply('invalid_report', 400);
  const remark = form.get('remark');
  if (typeof remark !== 'string' || remark.length > 4000 || form.get('consent') !== 'yes') return reply('invalid_report', 400);
  const attachments = [];
  for (const field of ['screenshot','audio']) {
    const file = form.get(field);
    if (!file) continue;
    if (typeof file === 'string' || file.size > 2_000_000 || !TYPES.has(file.type)
      || (field === 'screenshot') !== file.type.startsWith('image/')) return reply('invalid_attachment', 400);
    const content = await file.arrayBuffer();
    if (!imageSignature(new Uint8Array(content), file.type)) return reply('invalid_attachment', 400);
    const ext = { 'image/png':'png','image/jpeg':'jpg','image/webp':'webp','audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a' }[file.type];
    attachments.push({ content, filename:`${field}.${ext}`, type:file.type, disposition:'attachment' });
  }
  if (!remark.trim() && !attachments.some(x => x.type.startsWith('audio/'))) return reply('describe_the_bug', 400);
  const id = crypto.randomUUID();
  const text = `SINGULANCE bug report ${id}\nUser: ${principal.user.id}\nOrganization: ${principal.organization?.id || 'personal'}\nPage: ${url.origin}${safePath(form.get('path'), url.origin)}\nReceived: ${new Date().toISOString()}\n\n${remark.trim() || '(Audio remark attached)'}\n\nUser reviewed attachments and consented to sending. No automatic console logs or browser storage collected.`;
  try {
    await env.BUG_REPORT_EMAIL.send({ from:env.BUG_REPORT_FROM, to:env.BUG_REPORT_TO,
      subject:`SINGULANCE bug report ${id}`, text, html:`<pre>${text.replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]))}</pre>`, attachments });
  } catch {
    // Do not retry: a delivery timeout can have an unknown outcome.
    return reply('delivery_unconfirmed_do_not_repeat', 502);
  }
  return Response.json({ status:'sent', reportId:id }, { headers:{ 'cache-control':'private, no-store' } });
}

export function withBugReporter(response, request, env) {
  const url = new URL(request.url);
  if (!reporterEnabled(env) || !HOSTS.has(url.origin) || !url.pathname.startsWith('/hivemind/app/')
    || request.method !== 'GET' || response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return response;
  return new HTMLRewriter().on('body', { element(element) {
    element.append('<script src="/bug-reporter.js" defer></script>', { html:true });
  } }).transform(response);
}
