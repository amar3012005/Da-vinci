import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

const origin = 'https://runtime-runner.singulancelabs.com';
const appOrigin = 'https://singulancelabs.com';
const spa = () => new Response('<!doctype html><html></html>', { headers: { 'content-type': 'text/html; charset=utf-8' } });

test('an unrouted API path answers JSON 404, never the SPA document', async () => {
  const env = { ASSETS: { fetch: async () => spa() } };
  for (const path of ['/api/hivemind/does-not-exist', '/api/unknown/thing']) {
    const response = await worker.fetch(new Request(`${appOrigin}${path}`, { headers: { cookie: 'hm_cp_session=x' } }), env);
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get('content-type'), /json/);
    assert.deepEqual(await response.json(), { error: 'api_route_not_found' });
  }
});

test('Runtime runner APIs reach the runner even without a Harness cookie', async () => {
  const seen = [];
  const env = {
    ASSETS: { fetch: async () => spa() },
    RUNNER_ORIGIN: 'https://runner.invalid',
  };
  const previous = globalThis.fetch;
  globalThis.fetch = async request => { seen.push(request.url); return Response.json({ error: 'authentication_required' }, { status: 401 }); };
  try {
    for (const path of ['/api/hivemind/employees', '/api/hivemind/artifacts?limit=5']) {
      const response = await worker.fetch(new Request(`${origin}${path}`, { headers: { cookie: 'hm_cp_session=x' } }), env);
      assert.equal(response.status, 401, path);
      assert.match(response.headers.get('content-type'), /json/);
    }
    assert.deepEqual(seen, ['https://runner.invalid/api/hivemind/employees', 'https://runner.invalid/api/hivemind/artifacts?limit=5']);
  } finally { globalThis.fetch = previous; }
});
