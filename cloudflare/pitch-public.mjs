const HOST = 'pitch.singulancelabs.com';
const NOINDEX = 'noindex, nofollow';
// This origin is the public pitch room. It never serves app APIs or sessions and is not indexed.
export async function pitchPublic(request, env) {
  const url = new URL(request.url);
  if (url.hostname !== HOST) return null;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } });
  if (url.protocol !== 'https:' && env.ENVIRONMENT !== 'development') { url.protocol = 'https:'; return Response.redirect(url.href, 308); }
  if (['/privacy', '/cookies', '/security'].includes(url.pathname)) return Response.redirect(`https://singulancelabs.com${url.pathname}`, 308);
  if (url.pathname === '/robots.txt') return new Response(request.method === 'HEAD' ? null : 'User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  const withNoindex = (response, cacheControl) => {
    const headers = new Headers(response.headers);
    headers.set('x-robots-tag', NOINDEX);
    if (cacheControl) headers.set('cache-control', cacheControl);
    return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers });
  };
  if (url.pathname === '/') {
    const assetRequest = new Request(new URL('/', url), request);
    assetRequest.headers.delete('if-none-match'); assetRequest.headers.delete('if-modified-since');
    return withNoindex(await env.ASSETS.fetch(assetRequest), 'no-cache');
  }
  // Static Assets strips .html and serves the page at its extensionless path.
  if (url.pathname === '/pitch/market-map.html') return Response.redirect(`https://${HOST}/pitch/market-map${url.search}`, 308);
  if (url.pathname === '/pitch/market-map') return withNoindex(await env.ASSETS.fetch(request), 'no-cache');
  if (/^\/pitch\/(?:(?:product|sales|investor)\/\d{2}\.jpg|SINGULANCE-(?:Product|Sales|Investor)-Deck-2026\.pdf)$/.test(url.pathname)
    || /^\/static\//.test(url.pathname)
    || ['/favicon.ico', '/favicon.svg', '/logo.svg', '/singulance-mark.svg', '/singulance-mark-192.png', '/singulance-mark-512.png', '/manifest.json', '/manifest.webmanifest'].includes(url.pathname)) {
    const response = await env.ASSETS.fetch(request);
    if (!/text\/html/i.test(response.headers.get('content-type') || '')) return withNoindex(response);
  }
  return new Response(request.method === 'HEAD' ? null : 'Not found', { status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'content-type': 'text/plain; charset=utf-8' } });
}
