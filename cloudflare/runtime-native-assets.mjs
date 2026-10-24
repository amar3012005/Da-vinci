/** Public release-pinned native code. Protected native APIs never use this cache. */
import manifest from './generated/runtime-native-assets.json' with {type:'json'};
export async function runtimeNativeAsset(request,env) {
  const url=new URL(request.url);
  if(url.hostname!=='runtime-runner.singulancelabs.com'||!['GET','HEAD'].includes(request.method))return null;
  const entry=manifest.entries[url.pathname+url.search];
  if(!entry) {
    if(url.pathname.startsWith('/runtime-native/'))return new Response('Asset not found',{status:404,headers:{'content-type':'text/plain','cache-control':'no-store'}});
    return null;
  }
  const target=new URL(entry.path,url.origin);
  const asset=await env.ASSETS.fetch(new Request(target,{method:request.method}));
  if(!asset.ok||asset.headers.get('content-type')?.includes('text/html'))return new Response('Native asset not published',{status:503,headers:{'cache-control':'no-store'}});
  return new Response(asset.body,{status:asset.status,headers:{'content-type':entry.type,'cache-control':entry.immutable?'public, max-age=31536000, immutable':'public, max-age=3600','x-content-type-options':'nosniff','x-runtime-static-release':manifest.release}});
}

const REVISION_QUERY=/(?:^|[?&])rev=[a-f0-9]{12}(?:&|$)/;

/** True for release-pinned public native code: plugin combos and top-level shell bundles carrying a 12-hex `rev`. */
export function isRevisionedNativeCode(url) {
  if(url.hostname!=='runtime-runner.singulancelabs.com'||!REVISION_QUERY.test(url.search))return false;
  return (url.pathname.startsWith('/plugins/')&&url.pathname!=='/plugins/events')||/^\/assets\/[^/]+\.(?:js|css)$/.test(url.pathname);
}

/**
 * Serve release-pinned native code from the Cloudflare edge cache, filling it from the runner on a miss.
 * Only a non-HTML 200 marked `immutable`, not `private` or `no-store`, without `set-cookie`, and varying on at most
 * `Accept-Encoding` is stored. When the request carries `cookie` or `authorization`, the response must also be
 * explicitly `public`. Every other request and response passes through unchanged.
 * @param {Request} request - incoming browser request.
 * @param {{waitUntil?: (promise: Promise<unknown>) => void} | undefined} ctx - Worker execution context.
 * @param {() => Promise<Response>} load - runner fetch used on a miss.
 * @returns {Promise<Response>} cached or freshly loaded response.
 */
export async function edgeCachedNativeCode(request,ctx,load) {
  const url=new URL(request.url);
  if(request.method!=='GET'||!isRevisionedNativeCode(url))return load();
  const key=new Request(url.toString(),{method:'GET'});
  const cache=globalThis.caches?.default;
  const hit=await cache?.match(key);
  if(hit)return hit;
  const response=await load();
  const cacheControl=(response.headers.get('cache-control')||'').toLowerCase();
  const credentialed=request.headers.has('cookie')||request.headers.has('authorization');
  const vary=(response.headers.get('vary')||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  const storable=response.status===200&&/\bimmutable\b/.test(cacheControl)&&!/\b(?:private|no-store|no-cache)\b/.test(cacheControl)
    &&(!credentialed||/\bpublic\b/.test(cacheControl))
    &&vary.every(v=>v==='accept-encoding')
    &&!(response.headers.get('content-type')||'').includes('text/html')&&!response.headers.has('set-cookie');
  if(cache&&storable){
    const put=cache.put(key,response.clone());
    if(ctx?.waitUntil)ctx.waitUntil(put);else await put;
  }
  return response;
}
