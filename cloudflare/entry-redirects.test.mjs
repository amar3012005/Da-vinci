import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './worker.mjs';

const env = { RUNTIME_RUNNER_PUBLIC_ORIGIN: 'https://runtime-runner.singulancelabs.com', ENVIRONMENT: 'production', ASSETS: { fetch: async () => new Response('shell') } };
const ctx = { waitUntil() {} };
const go = (url) => worker.fetch(new Request(url), env, ctx);

test('bare overview on the Runtime host is one redirect to the final Brain URL', async () => {
  const response = await go('https://runtime-runner.singulancelabs.com/hivemind/app/overview');
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://next.singulancelabs.com/hivemind/app/overview/new');
});

test('repeated overview segments redirect once to the final new-chat route', async () => {
  for (const path of ['/hivemind/app/overview/overview', '/hivemind/app/v1/overview']) {
    const response = await go(`https://next.singulancelabs.com${path}`);
    assert.equal(response.status, 302, path);
    assert.equal(response.headers.get('location'), 'https://next.singulancelabs.com/hivemind/app/overview/new', path);
  }
});

test('the Brain host serves its own overview and new-chat documents without a redirect', async () => {
  for (const path of ['/hivemind/app/overview', '/hivemind/app/overview/new']) {
    const response = await go(`https://next.singulancelabs.com${path}`);
    assert.ok(response.status < 300 || response.status >= 400, `${path} ${response.status}`);
  }
});
