import assert from 'node:assert/strict';
import test from 'node:test';
import { createResourceCache } from '../src/components/hivemind/app/shared/resource-cache.js';

test('concurrent loads of one key share a single request', async () => {
  const cache = createResourceCache();
  let calls = 0;
  const fetcher = async () => { calls += 1; return { value: calls }; };
  const [first, second] = await Promise.all([cache.load('k', fetcher), cache.load('k', fetcher)]);
  assert.equal(calls, 1);
  assert.equal(first, second);
  assert.equal(cache.pending('k'), false);
  assert.deepEqual(cache.read('k').value, { value: 1 });
});

test('settled values paint immediately while a revalidation runs', async () => {
  let time = 1000;
  const cache = createResourceCache({ now: () => time });
  await cache.load('k', async () => 'old');
  time = 5000;
  let release;
  const revalidation = cache.load('k', () => new Promise(resolve => { release = resolve; }));
  assert.equal(cache.read('k').value, 'old');
  assert.equal(cache.read('k').at, 1000);
  release('new');
  await revalidation;
  assert.deepEqual(cache.read('k'), { value: 'new', at: 5000 });
});

test('a failed load keeps the previous value and allows a retry', async () => {
  const cache = createResourceCache();
  await cache.load('k', async () => 'kept');
  await assert.rejects(cache.load('k', async () => { throw new Error('offline'); }), /offline/);
  assert.equal(cache.read('k').value, 'kept');
  assert.equal(await cache.load('k', async () => 'retried'), 'retried');
});

test('clear drops values and ignores loads started before it', async () => {
  const cache = createResourceCache();
  let release;
  const before = cache.load('k', () => new Promise(resolve => { release = resolve; }));
  cache.clear();
  release('previous tenant');
  await before;
  assert.equal(cache.read('k'), undefined);
});

test('the oldest entry is evicted beyond the bound', async () => {
  const cache = createResourceCache({ maxEntries: 2 });
  for (const key of ['a', 'b', 'c']) await cache.load(key, async () => key);
  assert.equal(cache.read('a'), undefined);
  assert.equal(cache.read('c').value, 'c');
});
