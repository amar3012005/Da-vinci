/**
 * The walkthrough's progress endpoint. The employee workspace (OpenDot) owns the record; this Worker forwards only the
 * company session cookie from the two app origins, with a 16 KB body cap, and never forwards tenant or authority headers.
 */
export const ONBOARDING_PATH = '/api/hivemind/onboarding';
const UPSTREAM = 'https://dots.singulancelabs.com';
const ORIGINS = ['https://next.singulancelabs.com', 'https://runtime-runner.singulancelabs.com'];
const MAX_BODY = 16_000;

/**
 * @param {Request} request
 * @param {typeof fetch} [fetcher]
 * @returns {Promise<Response|null>} null when the request is not for the walkthrough endpoint
 */
export async function proxyOnboarding(request, fetcher = fetch) {
  const url = new URL(request.url);
  if (url.pathname !== ONBOARDING_PATH) return null;
  const headers = { 'cache-control': 'private, no-store' };
  const reply = (error, status) => Response.json({ error }, { status, headers });
  const origin = request.headers.get('origin');
  if (!ORIGINS.includes(url.origin) || (origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return reply('origin_denied', 403);
  if (!['GET', 'HEAD', 'POST'].includes(request.method)) return new Response(null, { status: 405, headers: { ...headers, allow: 'GET, POST' } });
  if (request.method === 'POST' && !origin) return reply('origin_required', 403);
  const session = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith('hm_cp_session='));
  if (!session) return reply('authentication_required', 401);
  const forward = new Headers({ cookie: session, origin: url.origin, accept: 'application/json' });
  let body;
  if (request.method === 'POST') {
    forward.set('content-type', 'application/json');
    const text = await request.text();
    if (text.length > MAX_BODY) return reply('onboarding_request_too_large', 413);
    body = text;
  }
  try {
    const response = await fetcher(new Request(`${UPSTREAM}${ONBOARDING_PATH}`, { method: request.method, headers: forward, body, redirect: 'manual' }));
    if (response.status >= 300 && response.status < 400) return reply('onboarding_redirect_denied', 502);
    return new Response(response.body, { status: response.status, headers: { ...headers, 'content-type': response.headers.get('content-type') || 'application/json' } });
  } catch {
    return reply('onboarding_unavailable', 502);
  }
}
