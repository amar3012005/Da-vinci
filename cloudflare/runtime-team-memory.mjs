/** Main-app facade for the existing tenant-scoped operating-memory setup service. */
export async function proxyRuntimeTeamMemory(request) {
  const url = new URL(request.url);
  const reply = (error, status) => Response.json({ error }, { status, headers: { 'cache-control': 'private, no-store' } });
  if (url.origin !== 'https://runtime-runner.singulancelabs.com') return reply('origin_denied', 403);
  if (!['GET', 'POST'].includes(request.method)) return reply('method_not_allowed', 405);
  const origin = request.headers.get('origin');
  if ((origin && origin !== url.origin) || (request.method === 'POST' && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return reply('origin_denied', 403);
  const cookie = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith('hm_cp_session='));
  if (!cookie) return reply('authentication_required', 401);
  if (request.method === 'POST' && request.body) {
    const reader = request.body.getReader();
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; if (value.byteLength) { await reader.cancel(); return reply('request_body_not_allowed', 400); } } }
    finally { reader.releaseLock(); }
  }
  const headers = new Headers({ cookie, accept: 'application/json' });
  if (origin) headers.set('origin', origin);
  if (request.headers.has('sec-fetch-site')) headers.set('sec-fetch-site', request.headers.get('sec-fetch-site'));
  if (request.method === 'POST') headers.set('content-type', 'application/json');
  try {
    const response = await fetch('https://dots.singulancelabs.com/api/hivemind/setup', {
      method: request.method, headers, ...(request.method === 'POST' ? { body: JSON.stringify({ action: 'enable_private_writes', confirm: true }) } : {}), redirect: 'manual', signal: AbortSignal.timeout(20000),
    });
    if (response.status >= 300 && response.status < 400) return reply('memory_redirect_denied', 502);
    return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });
  } catch { return reply('memory_temporarily_unavailable', 503); }
}
