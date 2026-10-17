import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyModelConnection } from '../cloudflare/model-connection.mjs';
const origin='https://next.singulancelabs.com';
const request=(action='start',headers={},body='{"consent":true}')=>new Request(origin+'/api/hivemind/model-connection/'+action,{method:action==='status'?'GET':'POST',headers:{origin,cookie:'hm_cp_session=fixture; other=private','content-type':'application/json',...headers},...(action==='status'?{}:{body})});
test('Usage forwards only the human cookie to the fixed Runtime origin and preserves OAuth streaming',async()=>{
 const previous=globalThis.fetch;let forwarded;
 globalThis.fetch=async(url,init)=>{forwarded={url:String(url),init};return new Response('data: {"type":"attempt"}\n\n',{headers:{'content-type':'text/event-stream'}});};
 try{const response=await proxyModelConnection(request('start',{authorization:'Bearer private','x-org-id':'foreign'}),{});assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'text/event-stream');assert.equal(forwarded.url,'https://runtime-runner-origin.singulancelabs.com/api/hivemind/model-connection/start');assert.equal(forwarded.init.headers.get('cookie'),'hm_cp_session=fixture');assert.equal(forwarded.init.headers.get('authorization'),null);assert.equal(forwarded.init.headers.get('x-org-id'),null);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(await response.text(),'data: {"type":"attempt"}\n\n');}finally{globalThis.fetch=previous;}
});
test('rejects cross-origin, anonymous, oversized and arbitrary destinations',async()=>{
 assert.equal((await proxyModelConnection(request('start',{origin:'https://foreign.test'}),{})).status,403);
 assert.equal((await proxyModelConnection(request('status',{cookie:''}),{})).status,401);
 assert.equal((await proxyModelConnection(request('start',{},'x'.repeat(10001)),{})).status,413);
 assert.equal((await proxyModelConnection(request('start'),{RUNTIME_RUNNER_ORIGIN:'https://foreign.test'})).status,503);
});
