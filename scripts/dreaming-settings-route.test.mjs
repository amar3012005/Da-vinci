import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';
const url = 'https://next.singulancelabs.com/hivemind/dreamer/settings';

test('Dreaming settings fails closed without native admission, rather than serving SPA HTML', async () => {
  const response = await worker.fetch(new Request(url), {});
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { error: 'authentication_required' });
});

test('admitted Dreaming settings preserve tenant cookie, browser origin and exact switch body', async () => {
  const response = await worker.fetch(new Request(url, {
    method: 'PUT', headers: { cookie: 'dsh-auth-test=signed; hm_harness_admitted=1', origin: 'https://next.singulancelabs.com', 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: false }),
  }), { HARNESS_CHAT: { fetch: async request => {
    assert.equal(new URL(request.url).pathname, '/hivemind/dreamer/settings');
    assert.equal(request.headers.get('origin'), 'https://next.singulancelabs.com');
    assert.match(request.headers.get('cookie'), /dsh-auth-test=signed/);
    assert.deepEqual(await request.json(), { enabled: false });
    return Response.json({ enabled: false, available: true, canChange: true });
  } } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).enabled, false);
});

for (const path of ['agenda', 'connectors']) {
  test(`Dreaming ${path} is admission-gated JSON and never SPA HTML`, async () => {
    const address = `https://next.singulancelabs.com/hivemind/dreamer/${path}`;
    const denied = await worker.fetch(new Request(address), {});
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get('cache-control'), 'no-store');
    const body = { enabled: true, accountIds: ['ca_fixture'] };
    const admitted = await worker.fetch(new Request(address, { method: 'PUT',
      headers: { cookie: 'dsh-auth-test=signed; hm_harness_admitted=1', origin: 'https://next.singulancelabs.com', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }), { HARNESS_CHAT: { fetch: async request => {
      assert.equal(new URL(request.url).pathname, `/hivemind/dreamer/${path}`);
      assert.deepEqual(await request.json(), body);
      return Response.json({ enabled: true });
    } } });
    assert.equal(admitted.status, 200);
    assert.equal((await admitted.json()).enabled, true);
  });
}
