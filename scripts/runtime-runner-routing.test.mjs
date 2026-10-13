import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

const publicOrigin = 'https://runtime-runner.singulancelabs.com';
const env = { RUNTIME_RUNNER_PUBLIC_ORIGIN: publicOrigin,
  RUNTIME_RUNNER_ORIGIN: 'https://runtime-runner-origin.singulancelabs.com',
  RUNNER_ORIGIN: 'https://harness-chat-origin.singulancelabs.com' };

test('employee navigation transfers its exact route without transferring credentials', async () => {
  const response = await worker.fetch(new Request('https://next.singulancelabs.com/hivemind/app/employee/harness/session/existing#tab'), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.match(await response.text(), /location\.replace\("https:\/\/runtime-runner\.singulancelabs\.com\/hivemind\/app\/employee\/harness\/session\/existing#tab"\)/);
  assert.equal(response.headers.get('set-cookie'), null);
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

test('Runtime Brain launchers and validated session paths strictly return to Next', async () => {
  for (const route of ['/hivemind/app/overview','/hivemind/app/overview/new',
    '/hivemind/app/overview/session/session-46d220df35a3f985de773d7832c82d8e?view=chat#turn-1']) {
    const response = await worker.fetch(new Request(`${publicOrigin}${route}`), env);
    assert.equal(response.headers.get('cache-control'),'private, no-store');
    assert.ok((await response.text()).includes(`location.replace("https://next.singulancelabs.com${route}")`));
  }
  const response = await worker.fetch(new Request(`${publicOrigin}/hivemind/app/overview/session/a/b`), {
    ...env, ASSETS:{fetch:async()=>new Response('<html>native room</html>',{headers:{'content-type':'text/html'}})},
  });
  assert.equal((await response.text()).includes('location.replace'),false);
});
