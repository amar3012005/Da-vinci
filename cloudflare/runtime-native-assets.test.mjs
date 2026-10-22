import assert from 'node:assert/strict';
import {runtimeNativeAsset} from './runtime-native-assets.mjs';
for(const path of ['/api/hivemind/boot','/api/remote.mux','/plugins/events','/plugins/??unknown/client.js&rev=unknown']){
 assert.equal(await runtimeNativeAsset(new Request('https://runtime-runner.singulancelabs.com'+path),{}),null);
}
assert.equal(await runtimeNativeAsset(new Request('https://next.singulancelabs.com/plugins/??anything&rev=old'),{}),null);
assert.equal((await runtimeNativeAsset(new Request('https://runtime-runner.singulancelabs.com/runtime-native/missing'),{})).status,404);
console.log('Runtime static boundary preserves Brain, protected endpoints and real missing-asset errors');
const manifest=(await import('./generated/runtime-native-assets.json',{with:{type:'json'}})).default;
const [key,entry]=Object.entries(manifest.entries)[0]||[];
if(key){
 const result=await runtimeNativeAsset(new Request('https://runtime-runner.singulancelabs.com'+key),{ASSETS:{fetch:async request=>{assert.equal(new URL(request.url).pathname,entry.path);return new Response('/* native code */',{headers:{'content-type':'application/octet-stream'}})}}});
 assert.equal(result.status,200);assert.equal(result.headers.get('content-type'),entry.type);assert.match(result.headers.get('cache-control'),/max-age/);
 assert.equal(await runtimeNativeAsset(new Request('https://next.singulancelabs.com'+key),{}),null);
 const invalid=await runtimeNativeAsset(new Request('https://runtime-runner.singulancelabs.com'+key),{ASSETS:{fetch:async()=>new Response('<html>',{headers:{'content-type':'text/html'}})}});
 assert.equal(invalid.status,503);
 console.log('Published asset serves immutable native bytes and rejects SPA fallback');
}
