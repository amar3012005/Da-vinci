/** Fixed Runtime transport for the authenticated Usage page; no identity or token exchange in the browser. */
export async function proxyModelConnection(request, env) {
  const url = new URL(request.url);
  const reply = (error, status) => Response.json({ error }, { status, headers: { 'cache-control': 'private, no-store' } });
  const action = url.pathname.split('/').at(-1);
  if (!['status', 'models', 'start', 'answer', 'cancel', 'select', 'disconnect'].includes(action)) return reply('not_found', 404);
  const method = ['status', 'models'].includes(action) ? 'GET' : 'POST';
  if (request.method !== method) return reply('method_not_allowed', 405);
  const origin = request.headers.get('origin');
  if ((origin && origin !== url.origin) || (method === 'POST' && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return reply('origin_denied', 403);
  const cookie = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith('hm_cp_session='));
  if (!cookie) return reply('authentication_required', 401);
  const target = new URL(env.RUNTIME_RUNNER_ORIGIN || 'https://runtime-runner-origin.singulancelabs.com');
  if (target.origin !== 'https://runtime-runner-origin.singulancelabs.com') return reply('runtime_origin_invalid', 503);
  target.pathname = url.pathname;
  const headers = new Headers({ cookie, accept: action === 'start' ? 'text/event-stream' : 'application/json', 'x-forwarded-host': url.host, 'x-forwarded-proto': 'https' });
  if (origin) headers.set('origin', origin);
  let body;
  if (method === 'POST') {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply('json_required', 415);
    const reader = request.body?.getReader();let size = 0;const parts = [];
    if (reader) try { for (;;) { const part = await reader.read();if (part.done) break;size += part.value.length;if (size > 10000) { await reader.cancel();return reply('request_too_large',413); } parts.push(part.value); } } finally { reader.releaseLock(); }
    body = new Uint8Array(size);let offset = 0;for (const part of parts) { body.set(part,offset);offset+=part.length; }
    headers.set('content-type','application/json');
  }
  try {
    const response = await fetch(target, { method, headers, body, redirect: 'manual', signal: request.signal });
    if (response.status >= 300 && response.status < 400) return reply('runtime_redirect_denied',502);
    return new Response(response.body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'private, no-store', 'x-accel-buffering':'no' } });
  } catch { return reply('model_connection_unavailable',503); }
}
