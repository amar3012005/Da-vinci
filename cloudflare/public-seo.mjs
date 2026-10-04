import { SITE, OG_IMAGE, PUBLIC_PAGES, canonicalFor, schemaFor } from '../src/seo/public-pages.mjs';
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function publicSeoResponse(response, path) {
  const page = PUBLIC_PAGES[path];
  const title = escape(page.title);
  const description = escape(page.description);
  const canonical = canonicalFor(path);
  const heroPreload = path === '/' ? '<link rel="preload" as="image" href="/singulance-cover-mobile-750.avif" imagesrcset="/singulance-cover-mobile-450.avif 450w, /singulance-cover-mobile-750.avif 750w, /singulance-cover-mobile-900.avif 900w" imagesizes="100vw" type="image/avif" media="(max-width: 767px)" fetchpriority="high">' : '';
  const head = `${heroPreload}<title data-rh="true">${title}</title><meta data-rh="true" name="description" content="${description}"><meta data-rh="true" name="robots" content="index, follow, max-image-preview:large"><link data-rh="true" rel="canonical" href="${canonical}"><meta data-rh="true" property="og:type" content="website"><meta data-rh="true" property="og:site_name" content="SINGULANCE"><meta data-rh="true" property="og:title" content="${title}"><meta data-rh="true" property="og:description" content="${description}"><meta data-rh="true" property="og:url" content="${canonical}"><meta data-rh="true" property="og:image" content="${OG_IMAGE}"><meta data-rh="true" property="og:image:width" content="1200"><meta data-rh="true" property="og:image:height" content="630"><meta data-rh="true" property="og:image:alt" content="SINGULANCE — AI workforce that runs inside memory"><meta data-rh="true" name="twitter:card" content="summary_large_image"><meta data-rh="true" name="twitter:title" content="${title}"><meta data-rh="true" name="twitter:description" content="${description}"><meta data-rh="true" name="twitter:image" content="${OG_IMAGE}"><script data-rh="true" type="application/ld+json">${JSON.stringify(schemaFor(path)).replace(/</g, '\\u003c')}</script>`;
  const links = Object.entries(PUBLIC_PAGES).filter(([href]) => href !== path).map(([href, item]) => `<li><a href="${href}">${escape(item.heading)}</a></li>`).join('');
  // This readable initial summary is replaced by React, not hydrated as a full
  // server render. Serve identical content to visitors and search crawlers.
  const fallback = `<main style="max-width:960px;margin:4rem auto;padding:1.5rem;color:#eee;background:#05070f;font-family:system-ui"><h1>${escape(page.heading)}</h1><p>${escape(page.summary)}</p><h2>Explore SINGULANCE</h2><ul>${links}</ul><p><a href="https://next.singulancelabs.com/">Open HIVEMIND</a></p></main>`;
  const headers = new Headers(response.headers);
  headers.delete('etag');
  headers.delete('content-length');
  headers.set('cache-control', 'no-cache');
  headers.set('x-robots-tag', 'index, follow');
  const source = new Response(response.body, { status: response.status, headers });
  return new HTMLRewriter()
    .on('title, meta[name="description"], meta[name="robots"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"], noscript', { element(el) { el.remove(); } })
    .on('head', { element(el) { el.append(head, { html: true }); } })
    .on('#root', { element(el) { el.setAttribute('data-seo-fallback', 'true'); el.setInnerContent(fallback, { html: true }); } })
    .transform(source);
}
export { PUBLIC_PAGES, SITE };
