const HOST = 'icarus.singulancelabs.com';
// This origin is a public product cover. It never serves app APIs or sessions.
export async function icarusPublic(request, env, { seo, markdown, prefersMarkdown }) {
  const url = new URL(request.url);
  if (url.hostname !== HOST) return null;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } });
  if (url.protocol !== 'https:' && env.ENVIRONMENT !== 'development') { url.protocol = 'https:'; return Response.redirect(url.href, 308); }
  if (['/privacy', '/cookies', '/security'].includes(url.pathname)) return Response.redirect(`https://singulancelabs.com${url.pathname}`, 308);
  if (url.pathname === '/icarus' || url.pathname === '/icarus/') return Response.redirect(`https://${HOST}/`, 308);
  if (/^\/hivemind(?:\/|$)/.test(url.pathname)) return Response.redirect(`https://next.singulancelabs.com${url.pathname}${url.search}`, 302);
  if (url.pathname.startsWith('/research')) return Response.redirect(`https://singulancelabs.com${url.pathname}${url.search}`, 308);
  const pageMarkdown = () => {
    const response = markdown(request, '/icarus');
    const headers = new Headers(response.headers);
    headers.set('content-location', `https://${HOST}/`);
    headers.set('link', `<https://${HOST}/>; rel="canonical"`);
    return new Response(response.body, { status: response.status, headers });
  };
  if (url.pathname === '/robots.txt') return new Response(request.method === 'HEAD' ? null : `User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /\nSitemap: https://${HOST}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  if (url.pathname === '/sitemap.xml') return new Response(request.method === 'HEAD' ? null : `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${HOST}/</loc></url></urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  if (['/index.md', '/index.txt'].includes(url.pathname)) return pageMarkdown();
  if (url.pathname === '/') {
    if (prefersMarkdown(request.headers.get('accept'))) return pageMarkdown();
    const assetRequest = new Request(new URL('/', url), request);
    assetRequest.headers.delete('if-none-match'); assetRequest.headers.delete('if-modified-since');
    return seo(await env.ASSETS.fetch(assetRequest), '/icarus');
  }
  if (/^\/(?:static|assets|agent-setup)\//.test(url.pathname) || ['/favicon.ico', '/favicon.svg', '/logo.svg', '/singulance-mark.svg', '/singulance-mark-192.png', '/singulance-mark-512.png', '/manifest.json', '/manifest.webmanifest'].includes(url.pathname)) {
    const response = await env.ASSETS.fetch(request);
    if (!/text\/html/i.test(response.headers.get('content-type') || '')) return response;
  }
  return new Response(request.method === 'HEAD' ? null : 'Not found', { status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'content-type': 'text/plain; charset=utf-8' } });
}
