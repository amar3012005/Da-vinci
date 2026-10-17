import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyRuntimeTeamMemory } from '../cloudflare/runtime-team-memory.mjs';
const origin = 'https://runtime-runner.singulancelabs.com';
const request = (headers = {}, body) => new Request(origin + '/api/hivemind/team-memory', { method: 'POST', headers: { origin, cookie: 'hm_cp_session=company; dsh=private', ...headers }, body });
test('enrollment preserves tenant authentication without forwarding other credentials', async () => {
 const previous = globalThis.fetch; let forwarded;
 globalThis.fetch = async (url, init) => { forwarded = { url, init }; return Response.json({ configured: true }); };
 try {
  const response = await proxyRuntimeTeamMemory(request({ authorization: 'Bearer secret', 'x-org-id': 'foreign' }));
  assert.equal(response.status, 200);
  assert.equal(forwarded.url, 'https://dots.singulancelabs.com/api/hivemind/setup');
  assert.equal(forwarded.init.headers.get('cookie'), 'hm_cp_session=company');
  assert.equal(forwarded.init.headers.get('origin'), origin);
  assert.deepEqual(JSON.parse(forwarded.init.body), {action:'enable_private_writes',confirm:true});
  assert.equal(forwarded.init.headers.get('authorization'), null);
  assert.equal(forwarded.init.headers.get('x-org-id'), null);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
 } finally { globalThis.fetch = previous; }
});
test('rejects cross-origin enrollment, missing authentication and request bodies', async () => {
 assert.equal((await proxyRuntimeTeamMemory(request({ origin: 'https://foreign.test' }))).status, 403);
 assert.equal((await proxyRuntimeTeamMemory(request({ cookie: '' }))).status, 401);
 assert.equal((await proxyRuntimeTeamMemory(request({}, '{}'))).status, 400);
 assert.equal((await proxyRuntimeTeamMemory(request({ 'sec-fetch-site': 'cross-site' }))).status, 403);
});
test('upstream redirects cannot redirect or enroll another authority', async () => {
 const previous = globalThis.fetch;
 globalThis.fetch = async () => Response.redirect('https://foreign.test');
 try { assert.equal((await proxyRuntimeTeamMemory(request())).status, 502); }
 finally { globalThis.fetch = previous; }
});
