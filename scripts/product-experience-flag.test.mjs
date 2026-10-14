import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';
const request = () => new Request('https://next.singulancelabs.com/__hivemind/feature-flags/product-experience?mode=operating_system&publicSignup=true');
test('public presentation defaults to Brain and invitation-only when Flagship fails', async () => {
  const response = await worker.fetch(request(), { FLAGS: {} });
  assert.deepEqual(await response.json(), { mode: 'brain', publicSignup: false });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('Operating System and public signup are independent server-evaluated flags', async () => {
  const response = await worker.fetch(request(), { FLAGS: {
    getStringValue: async (key, fallback, context) => { assert.equal(key, 'hivemind-product-experience'); assert.equal(fallback, 'brain'); assert.equal(context.hostname, 'next.singulancelabs.com'); return 'operating_system'; },
    getBooleanValue: async key => { assert.equal(key, 'hivemind-public-signup'); return false; },
  } });
  assert.deepEqual(await response.json(), { mode: 'operating_system', publicSignup: false });
});
test('unknown modes and nonboolean values cannot enable signup', async () => {
  const response = await worker.fetch(request(), { FLAGS: { getStringValue: async () => 'unknown', getBooleanValue: async () => 'true' } });
  assert.deepEqual(await response.json(), { mode: 'brain', publicSignup: false });
});
test('presentation config endpoint accepts only reads', async () => {
  const response = await worker.fetch(new Request(request(), { method: 'POST' }), {});
  assert.equal(response.status, 405);
});
