import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

test('repeated CRM overview suffixes recover once at the edge and preserve query', async () => {
  const origin='https://next.singulancelabs.com';
  for (const suffix of ['/overview','/overview/overview','/overview'.repeat(32)]) {
    const response=await worker.fetch(new Request(`${origin}/hivemind/app/crm${suffix}?fullscreen=true&view=companies`),{});
    assert.equal(response.status,302);
    assert.equal(response.headers.get('location'),`${origin}/hivemind/app/crm?fullscreen=true&view=companies`);
  }
});
test('canonical CRM document stays Da Vinci and never proxies to Harness', async () => {
  let path;let harnessCalls=0;
  const response=await worker.fetch(new Request('https://next.singulancelabs.com/hivemind/app/crm?fullscreen=true'),{
    ASSETS:{fetch:async request=>{path=new URL(request.url).pathname;return new Response('<html>current CRM shell</html>',{headers:{'content-type':'text/html'}});}},
    HARNESS_CHAT:{fetch:async()=>{harnessCalls++;return new Response('unexpected Harness');}},
  });
  assert.equal(response.status,200);assert.equal(path,'/');assert.equal(harnessCalls,0);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
});
