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

test('the app host sends Overview and New chat to the Company Brain page and serves saved sessions itself', async () => {
  for (const path of ['/hivemind/app/overview', '/hivemind/app/overview/new']) {
    const response = await go(`https://next.singulancelabs.com${path}`);
    assert.equal(response.status, 302, path);
    assert.equal(response.headers.get('location'), 'https://brain-runner.singulancelabs.com/dots/dot_company_brain');
  }
  const session = await go('https://next.singulancelabs.com/hivemind/app/overview/session/abc');
  assert.ok(session.status < 300 || session.status >= 400, `session ${session.status}`);
});
