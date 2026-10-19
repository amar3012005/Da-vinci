import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyModelConnection } from './model-connection.mjs';
test('OpenRouter callback uses authenticated fixed-origin JSON transport', async () => {
 const previous = globalThis.fetch;
 globalThis.fetch = async (url, options) => {
  assert.equal(String(url), 'https://runtime-runner-origin.singulancelabs.com/api/hivemind/model-connection/openrouter/callback');
  assert.equal(options.headers.get('cookie'), 'hm_cp_session=test');
  assert.equal(options.headers.get('accept'), 'application/json');
  return Response.json({ connected: true });
 };
 try {
  const response = await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/openrouter/callback', { method: 'POST', headers: { origin: 'https://next.singulancelabs.com', cookie: 'irrelevant=excluded; hm_cp_session=test', 'content-type': 'application/json' }, body: JSON.stringify({ code: 'one-use', state: 'bound-state' }) }), {});
  assert.equal(response.status, 200);
 } finally { globalThis.fetch = previous; }
});
test('OpenRouter transport rejects foreign origins, arbitrary actions and missing auth', async () => {
 assert.equal((await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/openrouter/select', { method: 'POST', headers: { origin: 'https://attacker.example' } }), {})).status, 403);
 assert.equal((await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/openrouter/stream'), {})).status, 404);
 assert.equal((await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/openrouter/status'), {})).status, 401);
});
