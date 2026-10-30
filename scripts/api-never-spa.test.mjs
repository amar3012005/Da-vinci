import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

const origin = 'https://runtime-runner.singulancelabs.com';
const spa = () => new Response('<!doctype html><html></html>', { headers: { 'content-type': 'text/html; charset=utf-8' } });

test('an unrouted API path answers JSON 404, never the SPA document', async () => {
  const env = { ASSETS: { fetch: async () => spa() } };
  for (const path of ['/api/hivemind/does-not-exist', '/api/unknown/thing']) {
    const response = await worker.fetch(new Request(`${origin}${path}`, { headers: { cookie: 'hm_cp_session=x' } }), env);
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get('content-type'), /json/);
    assert.deepEqual(await response.json(), { error: 'api_route_not_found' });
  }
});

test('the Runtime roster reaches the runner even without a Harness cookie', async () => {
  const seen = [];
  const env = {
    ASSETS: { fetch: async () => spa() },
    RUNNER_ORIGIN: 'https://runner.invalid',
  };
  const previous = globalThis.fetch;
  globalThis.fetch = async request => { seen.push(request.url); return Response.json({ error: 'authentication_required' }, { status: 401 }); };
  try {
    const response = await worker.fetch(new Request(`${origin}/api/hivemind/employees`, { headers: { cookie: 'hm_cp_session=x' } }), env);
    assert.equal(response.status, 401);
    assert.match(response.headers.get('content-type'), /json/);
    assert.deepEqual(seen, ['https://runner.invalid/api/hivemind/employees']);
  } finally { globalThis.fetch = previous; }
});
