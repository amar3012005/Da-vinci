/** Fixed owner transport; Brain and Runtime keep separate native authorization. */
export async function proxyModelConnection(request, env) {
  const url = new URL(request.url);
  const reply = (error, status) => Response.json({ error }, { status, headers: { 'cache-control': 'private, no-store' } });
  const action = url.pathname.split('/').at(-1);
  const openrouter = url.pathname.startsWith('/api/hivemind/model-connection/openrouter/');
  if (openrouter && !['status', 'start', 'callback', 'select', 'disconnect'].includes(action)) return reply('not_found', 404);
  if (!['status', 'models', 'start', 'answer', 'cancel', 'select', 'disconnect', ...(openrouter ? ['callback'] : [])].includes(action)) return reply('not_found', 404);
  const oauthCallback = openrouter && action === 'callback' && request.method === 'GET';
  const method = oauthCallback ? 'GET' : ['status', 'models'].includes(action) ? 'GET' : 'POST';
  if (request.method !== method) return reply('method_not_allowed', 405);
  const origin = request.headers.get('origin');
  if (!oauthCallback && ((origin && origin !== url.origin) || (method === 'POST' && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site')) return reply('origin_denied', 403);
  const cookie = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith('hm_cp_session='));
  if (!cookie) return reply('authentication_required', 401);
  const brain = !openrouter && url.hostname === 'next.singulancelabs.com';
  const expectedOrigin = brain ? 'https://harness-chat-origin.singulancelabs.com' : 'https://runtime-runner-origin.singulancelabs.com';
  const target = new URL((brain ? env.RUNNER_ORIGIN : env.RUNTIME_RUNNER_ORIGIN) || expectedOrigin);
  if (target.origin !== expectedOrigin) return reply('model_origin_invalid', 503);
  target.pathname = url.pathname;
  const headers = new Headers({ cookie: brain ? request.headers.get('cookie') : cookie, accept: action === 'start' && !openrouter ? 'text/event-stream' : 'application/json', 'x-forwarded-host': url.host, 'x-forwarded-proto': 'https' });
  if (origin) headers.set('origin', origin);
  let body;
  if (oauthCallback) {
    const code = url.searchParams.get('code'), state = url.searchParams.get('state');
    if (!code || code.length > 4096 || !state || !/^[A-Za-z0-9_-]{43}$/.test(state)) return reply('invalid_callback', 400);
    body = JSON.stringify({ code, state });
    headers.set('content-type', 'application/json');
    headers.set('origin', url.origin);
  }
  if (method === 'POST') {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply('json_required', 415);
    const reader = request.body?.getReader();let size = 0;const parts = [];
    if (reader) try { for (;;) { const part = await reader.read();if (part.done) break;size += part.value.length;if (size > 10000) { await reader.cancel();return reply('request_too_large',413); } parts.push(part.value); } } finally { reader.releaseLock(); }
    body = new Uint8Array(size);let offset = 0;for (const part of parts) { body.set(part,offset);offset+=part.length; }
    headers.set('content-type','application/json');
  }
  try {
    const response = await fetch(target, { method: oauthCallback ? 'POST' : method, headers, body, redirect: 'manual', signal: request.signal });
    if (response.status >= 300 && response.status < 400) return reply('runtime_redirect_denied',502);
    if (oauthCallback) {
      await response.body?.cancel();
      return new Response(null, { status: 303, headers: { location: `/hivemind/app/ai-models?openrouter_${response.ok ? 'connected' : 'error'}=1`, 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' } });
    }
    return new Response(response.body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'private, no-store', 'x-accel-buffering':'no' } });
  } catch { return reply('model_connection_unavailable',503); }
}
