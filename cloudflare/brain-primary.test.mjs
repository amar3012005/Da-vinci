import test from 'node:test';
import assert from 'node:assert/strict';
import { brainPrimaryResponse, normalizeBrainPrimary, readBrainPrimary, resetBrainPrimaryCache } from './brain-primary.mjs';

const env = (value, calls = []) => ({ FLAGS: { getStringValue: async (key, fallback) => { calls.push([key, fallback]); if (value instanceof Error) throw value; return value; } } });

test('only "harness" selects the old runner', () => {
  assert.equal(normalizeBrainPrimary('harness'), 'harness');
  for (const v of ['company', undefined, null, '', 'HARNESS', 7]) assert.equal(normalizeBrainPrimary(v), 'company');
});

test('reads brain-primary from Flagship, defaulting to company, cached for 15 s', async () => {
  resetBrainPrimaryCache();
  const calls = []; let clock = 0;
  assert.equal(await readBrainPrimary(env('harness', calls), () => clock), 'harness');
  assert.deepEqual(calls[0], ['brain-primary', 'company']);
  clock = 14_000; assert.equal(await readBrainPrimary(env('company', calls), () => clock), 'harness');
  assert.equal(calls.length, 1);
  clock = 16_000; assert.equal(await readBrainPrimary(env('company', calls), () => clock), 'company');
});

test('a missing binding or a Flagship outage resolves to company', async () => {
  resetBrainPrimaryCache();
  assert.equal(await readBrainPrimary({}), 'company');
  resetBrainPrimaryCache();
  assert.equal(await readBrainPrimary(env(new Error('flagship down'))), 'company');
});

test('the flag route answers JSON with CORS for the packaged apps, GET and OPTIONS only', async () => {
  resetBrainPrimaryCache();
  const res = await brainPrimaryResponse(new Request('https://next.singulancelabs.com/__hivemind/feature-flags/brain-primary'), env('harness'));
  assert.deepEqual(await res.json(), { primary: 'harness' });
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  assert.equal((await brainPrimaryResponse(new Request('https://x/', { method: 'OPTIONS' }), env('x'))).status, 204);
  assert.equal((await brainPrimaryResponse(new Request('https://x/', { method: 'POST' }), env('x'))).status, 405);
});
