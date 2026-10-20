import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

const publicOrigin = 'https://runtime-runner.singulancelabs.com';
const env = { RUNTIME_RUNNER_PUBLIC_ORIGIN: publicOrigin,
  RUNTIME_RUNNER_ORIGIN: 'https://runtime-runner-origin.singulancelabs.com',
  RUNNER_ORIGIN: 'https://harness-chat-origin.singulancelabs.com' };

test('outer employee navigation redirects to Runtime preserving the session', async () => {
  const response = await worker.fetch(new Request('https://next.singulancelabs.com/hivemind/app/employee/harness/session/existing'), { ...env, ASSETS:{fetch:async()=>new Response('<html>persistent shell</html>',{headers:{'content-type':'text/html'}})} });
  assert.equal(response.status,307);
  assert.equal(response.headers.get('location'), publicOrigin + '/hivemind/app/employee/harness/session/existing');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('Runtime native transport selects only Runtime origin and preserves actual browser Origin', async () => {
  const previous = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async request => { requests.push(request); return new Response('{}', { headers: {'content-type':'application/json'} }); };
  try {
    for (const authority of [publicOrigin, 'https://next.singulancelabs.com']) {
      await worker.fetch(new Request(`${authority}/api/commands/list`, {method:'POST',headers:{cookie:'dsh-auth-main=present',origin:authority}}), env);
    }
    assert.equal(new URL(requests[0].url).origin, env.RUNTIME_RUNNER_ORIGIN);
    assert.equal(new URL(requests[1].url).origin, env.RUNNER_ORIGIN);
    assert.equal(requests[0].headers.get('origin'), publicOrigin);
    assert.equal(requests[0].headers.get('x-forwarded-host'), 'runtime-runner.singulancelabs.com');
  } finally { globalThis.fetch = previous; }
});

test('Brain documents always redirect to next while correct native panes remain owned', async () => {
  const assets={fetch:async()=>new Response('<html>persistent shell</html>',{headers:{'content-type':'text/html'}})};
  for (const route of ['/hivemind/app/overview/new','/hivemind/app/overview/session/saved']) {
    const response=await worker.fetch(new Request(publicOrigin+route),{...env,ASSETS:assets});
    assert.equal(response.status,302);assert.equal(response.headers.get('location'),'https://next.singulancelabs.com'+route);
  }
  const wrong=await worker.fetch(new Request(publicOrigin+'/hivemind/app/overview/session/saved?native_pane=1'),{...env,ASSETS:assets});
  assert.equal(wrong.status,302);assert.equal(wrong.headers.get('location'),'https://next.singulancelabs.com/hivemind/app/overview/session/saved');
  const correct=await worker.fetch(new Request('https://next.singulancelabs.com/hivemind/app/overview/session/saved?native_pane=1'),{...env,ASSETS:assets});
  assert.equal(correct.status,200);assert.equal(correct.headers.get('content-security-policy'),'frame-ancestors https://next.singulancelabs.com https://runtime-runner.singulancelabs.com');
});
