// OpenDot build assets under /_next/static/ are content-hashed public files with
// no tenant data. They are cached at the edge and served without the session
// cookie. Any other path, and any non-200 upstream response, stays private.
export const BUILD_ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const PRIVATE_NO_STORE = 'private, no-store';

/**
 * Whether a request is a cacheable build asset (GET or HEAD under /_next/static/).
 * @param {Request} request - incoming request.
 * @returns {boolean} true for build asset requests.
 */
export function isStaticBuildAsset(request) {
  const url = new URL(request.url);
  return ['GET', 'HEAD'].includes(request.method) && url.pathname.startsWith('/_next/static/');
}

/**
 * Cache key built from the exact URL, with no cookie or other request headers.
 * @param {Request} request - incoming build asset request.
 * @returns {Request} GET request used as the cache key.
 */
export function buildAssetCacheKey(request) {
  return new Request(new URL(request.url).href, { method: 'GET' });
}

/**
 * Serve a cached build asset without authentication.
 * @param {Request} request - incoming build asset request.
 * @param {{ match: (key: Request) => Promise<Response|undefined> }} cache - edge cache (caches.default).
 * @returns {Promise<Response|null>} cached response, or null on a miss.
 */
export async function matchBuildAsset(request, cache) {
  const hit = await cache.match(buildAssetCacheKey(request));
  if (!hit) return null;
  const headers = new Headers(hit.headers);
  headers.set('cache-control', BUILD_ASSET_CACHE_CONTROL);
  return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
}

/**
 * Prepare an authenticated upstream build asset response. Only a 200 is stored at
 * the edge. Set-Cookie is always removed.
 * @param {Request} request - incoming build asset request.
 * @param {Response} upstream - response from the authenticated upstream fetch.
 * @param {{ waitUntil: (promise: Promise<unknown>) => void }} ctx - execution context.
 * @param {{ put: (key: Request, response: Response) => Promise<void> }} cache - edge cache (caches.default).
 * @returns {Response} response to send to the client.
 */
export function storeBuildAsset(request, upstream, ctx, cache) {
  const headers = new Headers(upstream.headers);
  headers.delete('set-cookie');
  if (upstream.status !== 200 || upstream.redirected) {
    headers.set('cache-control', PRIVATE_NO_STORE);
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  }
  headers.set('cache-control', BUILD_ASSET_CACHE_CONTROL);
  const response = new Response(upstream.body, { status: 200, statusText: upstream.statusText, headers });
  ctx.waitUntil(cache.put(buildAssetCacheKey(request), response.clone()));
  return response;
}
