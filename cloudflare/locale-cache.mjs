// Locale bundles under /locales/<lng>/<ns>.json are not content-hashed, so they
// cannot be immutable. A short fresh window plus a long stale-while-revalidate
// window lets repeat visits paint translations from cache while a background
// revalidation picks up a redeploy.
const LOCALE_BUNDLE_PATH = /^\/locales\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.json$/u;
export const LOCALE_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=604800';

/**
 * Cache-Control for a static request path, or null when the path is not a locale bundle.
 * @param {string} pathname - URL pathname of the request.
 * @returns {string|null} header value for locale bundles, otherwise null.
 */
export function localeCacheControl(pathname) {
  return LOCALE_BUNDLE_PATH.test(pathname) ? LOCALE_CACHE_CONTROL : null;
}

/**
 * Apply the locale cache policy to a successful asset response.
 * Other responses pass through unchanged.
 * @param {Response} response - response returned by the ASSETS binding.
 * @param {string} pathname - URL pathname of the request.
 * @returns {Response} response with the locale Cache-Control, or the original response.
 */
export function withLocaleCacheHeaders(response, pathname) {
  const cacheControl = localeCacheControl(pathname);
  if (!cacheControl || !response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set('cache-control', cacheControl);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
