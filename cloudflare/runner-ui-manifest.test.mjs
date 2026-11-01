import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

const RUNNER = 'https://runner.internal.example';
const env = () => {
  const forwarded = [];
  return {
    forwarded,
    RUNTIME_RUNNER_PUBLIC_ORIGIN: 'https://runtime-runner.singulancelabs.com',
    BRAIN_RUNNER_PUBLIC_ORIGIN: 'https://brain-runner.singulancelabs.com',
    RUNTIME_RUNNER_ORIGIN: RUNNER,
    RUNNER_ORIGIN: RUNNER,
    ASSETS: { fetch: async () => new Response('<!doctype html><title>spa</title>', { headers: { 'content-type': 'text/html' } }) },
    HARNESS_CHAT: { fetch: async (request) => { forwarded.push(new URL(request.url).pathname); return Response.json({ version: 'v', shell: '/', files: [] }); } },
  };
};

for (const host of ['runtime-runner.singulancelabs.com', 'brain-runner.singulancelabs.com']) {
  test(`${host} forwards /ui-manifest.json to the runner without a session`, async () => {
    const realFetch = globalThis.fetch;
    const forwarded = [];
    globalThis.fetch = async (input) => { const url = new URL(input instanceof Request ? input.url : input); forwarded.push(url.origin + url.pathname); return Response.json({ version: 'v', shell: '/', files: [] }); };
    try {
      const response = await worker.fetch(new Request(`https://${host}/ui-manifest.json`), env(), { waitUntil() {} });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type')?.startsWith('application/json'), true);
      assert.deepEqual(forwarded, [`${RUNNER}/ui-manifest.json`]);
    } finally { globalThis.fetch = realFetch; }
  });
}

test('/ui-manifest.json is not forwarded on other hosts or for other methods', async () => {
  const realFetch = globalThis.fetch;
  const forwarded = [];
  globalThis.fetch = async (input) => { forwarded.push(String(input instanceof Request ? input.url : input)); return Response.json({}); };
  try {
    await worker.fetch(new Request('https://next.singulancelabs.com/ui-manifest.json'), env(), { waitUntil() {} });
    await worker.fetch(new Request('https://runtime-runner.singulancelabs.com/ui-manifest.json', { method: 'POST', body: '{}' }), env(), { waitUntil() {} });
    assert.deepEqual(forwarded.filter(url => url.endsWith('/ui-manifest.json')), []);
  } finally { globalThis.fetch = realFetch; }
});
