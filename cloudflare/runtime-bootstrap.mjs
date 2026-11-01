// Runtime-only, read-only bootstrap. Control remains the authentication owner.
import { hedgedFetch } from './hedged-fetch.mjs';
export async function proxyRuntimeBootstrap(request) {
  const url = new URL(request.url);
  if (!['runtime-runner.singulancelabs.com', 'brain-runner.singulancelabs.com'].includes(url.hostname) || url.pathname !== '/__hivemind/bootstrap') return null;
  const reply = (error, status) => Response.json({error}, {status, headers: {'cache-control':'private, no-store'}});
  if (request.method !== 'GET') return reply('method_not_allowed', 405);
  const origin = request.headers.get('origin');
  if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return reply('origin_denied', 403);
  const headers = new Headers({accept:'application/json'});
  const cookie = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith('hm_cp_session='));
  if (cookie) headers.set('cookie', cookie);
  try {
    const response = await hedgedFetch('https://api.singulancelabs.com/v1/bootstrap', {
      headers, redirect:'manual', cache:'no-store', signal:AbortSignal.any([request.signal, AbortSignal.timeout(15000)])
    });
    if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); return reply('bootstrap_redirect_denied', 502); }
    if (!response.headers.get('content-type')?.includes('application/json')) { await response.body?.cancel(); return reply('bootstrap_invalid_response', 502); }
    return new Response(response.body, {status:response.status, headers:{'content-type':'application/json', 'cache-control':'private, no-store', 'cdn-cache-control':'no-store', 'vary':'Cookie', 'x-content-type-options':'nosniff'}});
  } catch { return reply('bootstrap_temporarily_unavailable', 503); }
}
