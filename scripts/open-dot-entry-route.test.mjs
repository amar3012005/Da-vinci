import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

const origin = 'https://next.preview.singulancelabs.com';

test('Open Dot listing entry redirects to its fixed origin and preserves query', async () => {
  for (const route of [
    '/hivemind/app/employee/dots?filter=mine',
    '/hivemind/app/employee/dots/?filter=mine',
  ]) {
    const response = await worker.fetch(new Request(`${origin}${route}`), {});
    assert.equal(response.status, 302, route);
    assert.equal(response.headers.get('location'), 'https://dots.singulancelabs.com/?filter=mine', route);
  }
});

test('Open Dot entry redirects to its fixed origin and preserves the dot and conversation query', async () => {
  const response = await worker.fetch(new Request(
    `${origin}/hivemind/app/employee/dots/dot_0123456789abcdef?c=conv-123&tab=computer`,
    { headers: { cookie: 'hm_cp_session=signed-session' } },
  ), {});

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('location'),
    'https://dots.singulancelabs.com/dots/dot_0123456789abcdef?c=conv-123&tab=computer',
  );
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('Open Dot entry rejects malformed IDs and path suffixes', async () => {
  for (const route of [
    '/hivemind/app/employee/dots/not-a-dot',
    '/hivemind/app/employee/dots/dot_0123456789abcdef/extra',
    '/hivemind/app/employee/dots/dot_0123456789ab%2Fcdef',
  ]) {
    const response = await worker.fetch(new Request(`${origin}${route}`), {});
    assert.equal(response.status, 404, route);
    assert.equal(response.headers.get('location'), null, route);
  }
});

test('Open Dot entry accepts browser navigation methods only', async () => {
  const response = await worker.fetch(new Request(
    `${origin}/hivemind/app/employee/dots/dot_0123456789abcdef`,
    { method: 'POST', body: '{}' },
  ), {});
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
  assert.equal(response.headers.get('location'), null);
});
