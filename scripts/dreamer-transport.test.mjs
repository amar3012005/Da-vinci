import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';
const origin='https://runtime-runner.singulancelabs.com';
for(const endpoint of ['credits?sessionId=session-test123','connectors']) {
 test(endpoint+' keeps authenticated JSON on its origin',async()=>{
  const request=new Request(origin+'/hivemind/dreamer/'+endpoint,{headers:{cookie:'dsh-auth-fixture=test'}});
  const response=await worker.fetch(request,{HARNESS_CHAT:{fetch:async req=>{
    assert.equal(new URL(req.url).origin,origin);
    assert.equal(req.headers.get('cookie'),'dsh-auth-fixture=test');
    return Response.json({ok:true});
  }}});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('location'),null);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(response.headers.get('x-hivemind-api-owner'),new URL(origin).hostname);
 });
 test(endpoint+' rejects upstream document redirects and preserves auth denials',async()=>{
  for(const status of [302,401,403]) {
    const response=await worker.fetch(new Request(origin+'/hivemind/dreamer/'+endpoint,{headers:{cookie:'dsh-auth-fixture=test'}}),{
      HARNESS_CHAT:{fetch:async()=>status===302?Response.redirect('https://next.singulancelabs.com/hivemind/login'):Response.json({error:'denied'},{status})},
    });
    assert.equal(response.status,status===302?502:status);
    assert.equal(response.headers.get('location'),null);
  }
 });
 test(endpoint+' requires a session before upstream access',async()=>{
  const response=await worker.fetch(new Request(origin+'/hivemind/dreamer/'+endpoint),{HARNESS_CHAT:{fetch:()=>{throw Error('unauthenticated upstream access');}}});
  assert.equal(response.status,401);
 });
}
