/** Same-origin connector facade; authentication and connector ownership remain upstream. */
export async function proxyConnectorTransport(request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/__hivemind/connectors/')) return null;
  const reply = (error, status) => Response.json({ error }, { status, headers: { 'cache-control': 'private, no-store' } });
  if (!['https://runtime-runner.singulancelabs.com', 'https://next.singulancelabs.com'].includes(url.origin)) return reply('origin_denied', 403);
  const tail = url.pathname.slice('/__hivemind/connectors/'.length);
  const read = /^composio\/toolkits(?:\/[a-zA-Z0-9_-]+\/tools)?$/.test(tail);
  const write = /^composio\/[a-zA-Z0-9_-]+\/(connect|connect-api-key|disconnect)$/.test(tail);
  if (!(read && request.method === 'GET') && !(write && request.method === 'POST')) return reply('route_not_allowed', 405);
  const origin = request.headers.get('origin');
  if ((origin && origin !== url.origin) || (write && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return reply('origin_denied', 403);
  const cookie = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith('hm_cp_session='));
  if (!cookie) return reply('authentication_required', 401);
  let body;
  if (write) {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply('json_required', 415);
    const reader = request.body?.getReader(), chunks = []; let size = 0;
    if (reader) try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 16384) { await reader.cancel(); return reply('request_too_large', 413); } chunks.push(part.value); } } finally { reader.releaseLock(); }
    body = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  }
  try {
    const response = await fetch(`https://api.singulancelabs.com/v1/connectors/${tail}${url.search}`, {
      method: request.method, headers: { cookie, origin: url.origin, accept: 'application/json', 'content-type': 'application/json' },
      body, redirect: 'manual', signal: AbortSignal.timeout(25000),
    });
    if (response.status >= 300 && response.status < 400) return reply('connector_redirect_denied', 502);
    return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });
  } catch { return reply('connector_temporarily_unavailable', 503); }
}
