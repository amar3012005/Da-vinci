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
