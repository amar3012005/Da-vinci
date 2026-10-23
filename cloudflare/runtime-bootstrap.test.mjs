import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proxyRuntimeBootstrap} from './runtime-bootstrap.mjs';
const url='https://runtime-runner.singulancelabs.com/__hivemind/bootstrap';
test('scoped read-only authenticated proxy never caches or forwards extra credentials',async()=>{
 const saved=globalThis.fetch;let seen;
 globalThis.fetch=async(u,o)=>{seen={u,o};return Response.json({authenticated:true});};
 try{
 const r=await proxyRuntimeBootstrap(new Request(url,{headers:{cookie:'other=secret; hm_cp_session=test',authorization:'Bearer ignored'}}));
 assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);
 assert.equal(seen.u,'https://api.singulancelabs.com/v1/bootstrap');assert.equal(seen.o.headers.get('cookie'),'hm_cp_session=test');assert.equal(seen.o.headers.get('authorization'),null);assert.equal(seen.o.redirect,'manual');assert.equal(seen.o.cache,'no-store');
 assert.equal(await proxyRuntimeBootstrap(new Request('https://next.singulancelabs.com/__hivemind/bootstrap')),null);
 assert.equal((await proxyRuntimeBootstrap(new Request(url,{method:'POST'}))).status,405);
 assert.equal((await proxyRuntimeBootstrap(new Request(url,{headers:{origin:'https://evil.example'}}))).status,403);
 globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'https://evil.example'}});
 assert.equal((await proxyRuntimeBootstrap(new Request(url))).status,502);
 globalThis.fetch=async()=>{throw Error('DNS');};assert.equal((await proxyRuntimeBootstrap(new Request(url))).status,503);
 }finally{globalThis.fetch=saved;}
});
