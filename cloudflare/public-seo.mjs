import RENDERED from './generated/public-renderings.json';
import { DISCOVERY_LINKS } from './agent-readiness.mjs';
import { SITE, OG_IMAGE, PUBLIC_PAGES, canonicalFor, schemaFor } from '../src/seo/public-pages.mjs';
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function publicSeoResponse(response, path) {
  const page = PUBLIC_PAGES[path];
  const title = escape(page.title);
  const description = escape(page.description);
  const canonical = canonicalFor(path);
  const heroPreload = path === '/' ? '<link rel="preload" as="image" href="/singulance-cover-mobile-750.avif" imagesrcset="/singulance-cover-mobile-450.avif 450w, /singulance-cover-mobile-750.avif 750w, /singulance-cover-mobile-900.avif 900w" imagesizes="100vw" type="image/avif" media="(max-width: 767px)" fetchpriority="high">' : '';
  const webTools = `<script>(()=>{const setup=()=>{const context=document.modelContext||navigator.modelContext;if(!context||typeof context.registerTool!=="function")return;const tool={name:"get_singulance_public_pages",description:"List canonical public research pages and the authenticated HIVEMIND workspace entry. Does not access private data or navigate.",inputSchema:{type:"object",properties:{},additionalProperties:false},execute:async()=>({content:[{type:"text",text:JSON.stringify({pages:${JSON.stringify(Object.entries(PUBLIC_PAGES).map(([path,p])=>({url:SITE+path,title:p.heading,description:p.description})))},workspace:{url:"https://next.singulancelabs.com/",requiresUserAuthorization:true},mcpSetup:"https://next.singulancelabs.com/hivemind/app/mcp"})}]})};try{Promise.resolve(context.registerTool(tool)).catch(()=>{});}catch{}};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();})();</script>`;
  const head = `${webTools}${heroPreload}<title data-rh="true">${title}</title><meta data-rh="true" name="description" content="${description}"><meta data-rh="true" name="robots" content="index, follow, max-image-preview:large"><link data-rh="true" rel="canonical" href="${canonical}"><meta data-rh="true" property="og:type" content="website"><meta data-rh="true" property="og:site_name" content="SINGULANCE"><meta data-rh="true" property="og:title" content="${title}"><meta data-rh="true" property="og:description" content="${description}"><meta data-rh="true" property="og:url" content="${canonical}"><meta data-rh="true" property="og:image" content="${OG_IMAGE}"><meta data-rh="true" property="og:image:width" content="1200"><meta data-rh="true" property="og:image:height" content="630"><meta data-rh="true" property="og:image:alt" content="SINGULANCE — AI workforce that runs inside memory"><meta data-rh="true" name="twitter:card" content="summary_large_image"><meta data-rh="true" name="twitter:title" content="${title}"><meta data-rh="true" name="twitter:description" content="${description}"><meta data-rh="true" name="twitter:image" content="${OG_IMAGE}"><script data-rh="true" type="application/ld+json">${JSON.stringify(schemaFor(path)).replace(/</g, '\\u003c')}</script>`;
  const links = Object.entries(PUBLIC_PAGES).filter(([href]) => href !== path).map(([href, item]) => `<li><a href="${href}">${escape(item.heading)}</a></li>`).join('');
  // This readable initial summary is replaced by React, not hydrated as a full
  // server render. Serve identical content to visitors and search crawlers.
  const fallback = `<main style="max-width:960px;margin:2rem auto;padding:clamp(1.25rem,4vw,3rem);color:#eee;background:#05070f;border-radius:16px;font-family:system-ui;line-height:1.6"><h1 style="font-size:clamp(1.5rem,4vw,2.5rem);line-height:1.2;margin:0 0 1rem">${escape(page.heading)}</h1><p style="margin:0 0 1.5rem">${escape(page.summary)}</p><section aria-label="Open your workspace" style="padding:1.25rem;border:1px solid #384052;border-radius:12px;margin:0 0 2rem"><h2 style="font-size:1.25rem;margin:0 0 .5rem">Your workspace is at next.singulancelabs.com</h2><p style="margin:0 0 .75rem">singulancelabs.com is the public SINGULANCE website. Open <a style="color:#a9caff;text-decoration:underline" href="https://next.singulancelabs.com/">next.singulancelabs.com</a> to use HIVEMIND Brain, HyperAgents and TARA Voice. Sign in to access your company workspace.</p><a style="display:inline-block;padding:.65rem 1rem;border-radius:8px;background:#dce8ff;color:#14213a;text-decoration:none;font-weight:600" href="https://next.singulancelabs.com/">Open your workspace →</a></section><h2 style="font-size:1.25rem;margin:0 0 .75rem">Explore SINGULANCE</h2><ul style="margin:0;padding-left:1.25rem">${links}</ul></main>`;
  const headers = new Headers(response.headers);
  headers.delete('etag');
  headers.delete('content-length');
  headers.set('cache-control', 'no-cache');
  headers.set('vary', [headers.get('vary'), 'Accept'].filter(Boolean).join(', '));
  headers.set('link', DISCOVERY_LINKS);
  headers.set('x-robots-tag', 'index, follow');
  const source = new Response(response.body, { status: response.status, headers });
  return new HTMLRewriter()
    .on('title, meta[name="description"], meta[name="robots"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"], noscript', { element(el) { el.remove(); } })
    .on('head', { element(el) { el.append(head, { html: true }); } })
    .on('#root', { element(el) { el.setAttribute('data-seo-fallback', 'true'); el.setAttribute('data-public-render', 'true'); el.setInnerContent(RENDERED[path]?.html || fallback, { html: true }); } })
    .transform(source);
}
export { PUBLIC_PAGES, SITE };
