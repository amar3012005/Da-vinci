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
