import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

const origin = 'https://runtime-runner.singulancelabs.com';
const path = '/api/hivemind/employees/create';
test('employee proxy denies foreign origin and missing company authentication', async () => {
  assert.equal((await worker.fetch(new Request(`${origin}${path}`, { method: 'POST', headers: { origin: 'https://foreign.example' } }), {})).status, 403);
  assert.equal((await worker.fetch(new Request(`${origin}${path}`, { method: 'POST', headers: { origin } }), {})).status, 401);
});
test('employee proxy preflight is exact-origin and bounded to the registered method', async () => {
  const response = await worker.fetch(new Request(`${origin}${path}`, { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST' } }), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  assert.equal((await worker.fetch(new Request(`${origin}${path}`, { method: 'DELETE' }), {})).status, 405);
});
test('proxy forwards only the company cookie and actual Origin, preserving tenant validation upstream', async () => {
  const previous = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async request => { forwarded = request; return Response.json({ error: 'invalid draft' }, { status: 400 }); };
  try {
    const response = await worker.fetch(new Request(`${origin}${path}`, { method: 'POST', headers: {
      origin, cookie: 'dsh-auth-runner=private; hm_cp_session=company; other=private',
      authorization: 'Bearer private', 'x-org-id': 'foreign', 'content-type': 'application/json',
    }, body: '{}' }), {});
    assert.equal(forwarded.redirect, 'manual');
    assert.equal(forwarded.url, `https://dots.singulancelabs.com${path}`);
    assert.equal(forwarded.headers.get('origin'), origin);
    assert.equal(forwarded.headers.get('cookie'), 'hm_cp_session=company');
    assert.equal(forwarded.headers.get('authorization'), null);
    assert.equal(forwarded.headers.get('x-org-id'), null);
    assert.equal(await forwarded.text(), '{}');
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  } finally { globalThis.fetch = previous; }
});

test('employee JSON forwarding rejects oversized drafts before any upstream request', async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({}); };
  try {
    const response = await worker.fetch(new Request(`${origin}${path}`, { method: 'POST', headers: {
      origin, cookie: 'hm_cp_session=company', 'content-type': 'application/json',
    }, body: 'x'.repeat(64001) }), {});
    assert.equal(response.status, 413);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = previous; }
});
