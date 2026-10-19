import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';
const origin='https://runtime-runner.singulancelabs.com';
test('native graph events bypass SPA fallback before and after admission',async()=>{
 for(const cookie of [null,'dsh-auth-fixture=expired']){
  let calls=0;
  const response=await worker.fetch(new Request(origin+'/plugins/events',{headers:cookie?{cookie}:{}}),{HARNESS_CHAT:{fetch:async req=>{calls++;assert.equal(req.headers.get('cookie'),cookie);return new Response(': connected\n\n',{headers:{'content-type':'text/event-stream','cache-control':'no-cache'}});}},ASSETS:{fetch:()=>{throw Error('Stream reached public SPA')}}});
  assert.equal(calls,1);assert.equal(response.status,200);assert.equal(await response.text(),': connected\n\n');assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('cdn-cache-control'),'no-store');
 }
});
test('events preserve native denials and refuse cached documents/redirects',async()=>{
 for(const status of [200,302,401,403]){
  const response=await worker.fetch(new Request(origin+'/plugins/events'),{HARNESS_CHAT:{fetch:async()=>new Response('denied',{status,headers:status===302?{location:'https://next.singulancelabs.com/'}:{'content-type':'text/html'}})}});
  assert.equal(response.status,status===200||status===302?502:status);assert.equal(response.headers.get('location'),null);
 }
});
test('cold plugin code reaches native owner without an admission cookie',async()=>{
 for(const cookie of [null,'dsh-auth-fixture=expired']){
  const response=await worker.fetch(new Request(origin+'/plugins/??@deepseek-ai/dsh-api-gateway/client.js&rev=fixture',{headers:cookie?{cookie}:{}}),{HARNESS_CHAT:{fetch:async()=>new Response('/* native */',{headers:{'content-type':'text/javascript','cache-control':'public, max-age=31536000, immutable'}})},ASSETS:{fetch:()=>{throw Error('Plugin reached SPA')}}});
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/javascript/);assert.match(response.headers.get('cache-control'),/immutable/);
 }
});
test('plugin fallback never masquerades as a successful document',async()=>{
 const response=await worker.fetch(new Request(origin+'/plugins/??missing.js'),{HARNESS_CHAT:{fetch:async()=>new Response('<html/>',{headers:{'content-type':'text/html'}})}});
 assert.equal(response.status,502);
});
