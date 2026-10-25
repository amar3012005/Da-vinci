import { cacheKey, cacheScopePrefix, createBrowserCache, createMemoryStore } from './browser-cache';

const key = (tenant, user, kind = 'sessions', id = '') => cacheKey({ tenant, user, kind, id });

test('keys follow hm:<tenant>:<user>:<kind>:<id> and refuse an incomplete identity', () => {
  expect(key('org-1', 'user-1', 'rooms', 'brain')).toBe('hm:org-1:user-1:rooms:brain');
  expect(key('org-1', 'user-1', 'sessions')).toBe('hm:org-1:user-1:sessions:');
  expect(key('', 'user-1', 'sessions')).toBeNull();
  expect(key('org-1', undefined, 'sessions')).toBeNull();
  expect(key('org-1', 'user-1', '')).toBeNull();
});

test('colons inside ids cannot make one tenant key collide with another', () => {
  // Without encoding, tenant "a:b" user "c" and tenant "a" user "b:c" would share a key.
  expect(key('a:b', 'c', 'x', 'y')).not.toBe(key('a', 'b:c', 'x', 'y'));
});

test('a tenant scope prefix never matches another tenant', () => {
  expect(key('org-1', 'user-1', 'rooms', 'x').startsWith(cacheScopePrefix('org-1'))).toBe(true);
  expect(key('org-10', 'user-1', 'rooms', 'x').startsWith(cacheScopePrefix('org-1'))).toBe(false);
});

test('reads never return another tenant or user entry', async () => {
  const cache = createBrowserCache({ store: createMemoryStore() });
  await cache.load(key('org-1', 'user-1', 'rooms', 'brain'), async () => ['tenant-one-room']);
  expect(await cache.read(key('org-2', 'user-1', 'rooms', 'brain'))).toBeUndefined();
  expect(await cache.read(key('org-1', 'user-2', 'rooms', 'brain'))).toBeUndefined();
  expect((await cache.read(key('org-1', 'user-1', 'rooms', 'brain'))).value).toEqual(['tenant-one-room']);
});

test('stale-while-revalidate: a stored value is readable before the next fetch finishes', async () => {
  let clock = 1000;
  const cache = createBrowserCache({ store: createMemoryStore(), now: () => clock, maxAgeMs: 100 });
  const k = key('org-1', 'user-1', 'sessions');
  await cache.load(k, async () => 'v1');
  clock += 500;
  const stale = await cache.read(k);
  expect(stale.value).toBe('v1');
  expect(stale.fresh).toBe(false);
});

test('concurrent loads for one key share one in-flight request', async () => {
  const cache = createBrowserCache({ store: createMemoryStore() });
  const k = key('org-1', 'user-1', 'sessions');
  let calls = 0;
  const fetcher = () => { calls += 1; return new Promise((resolve) => setTimeout(() => resolve('ok'), 5)); };
  const [a, b, c] = await Promise.all([cache.load(k, fetcher), cache.load(k, fetcher), cache.load(k, fetcher)]);
  expect([a, b, c]).toEqual(['ok', 'ok', 'ok']);
  expect(calls).toBe(1);
});

test('clearTenant removes one tenant and leaves the others', async () => {
  const cache = createBrowserCache({ store: createMemoryStore() });
  await cache.load(key('org-1', 'user-1', 'sessions'), async () => 'a');
  await cache.load(key('org-1', 'user-2', 'sessions'), async () => 'b');
  await cache.load(key('org-2', 'user-1', 'sessions'), async () => 'c');
  await cache.clearTenant('org-1');
  expect(await cache.read(key('org-1', 'user-1', 'sessions'))).toBeUndefined();
  expect(await cache.read(key('org-1', 'user-2', 'sessions'))).toBeUndefined();
  expect((await cache.read(key('org-2', 'user-1', 'sessions'))).value).toBe('c');
});

test('clearAll on sign-out removes every tenant', async () => {
  const cache = createBrowserCache({ store: createMemoryStore() });
  await cache.load(key('org-1', 'user-1', 'sessions'), async () => 'a');
  await cache.load(key('org-2', 'user-9', 'sessions'), async () => 'c');
  await cache.clearAll();
  expect(await cache.read(key('org-1', 'user-1', 'sessions'))).toBeUndefined();
  expect(await cache.read(key('org-2', 'user-9', 'sessions'))).toBeUndefined();
});

test('a load that started before clearTenant does not write back into the cleared scope', async () => {
  const cache = createBrowserCache({ store: createMemoryStore() });
  const k = key('org-1', 'user-1', 'sessions');
  let release;
  const pending = cache.load(k, () => new Promise((resolve) => { release = () => resolve('late'); }));
  await cache.clearTenant('org-1', 'user-1');
  release();
  await pending;
  expect(await cache.read(k)).toBeUndefined();
});

test('writes are broadcast, and subscribers are told which key changed', async () => {
  const sent = [];
  const peer = {
    postMessage: (message) => sent.push(message),
    onmessage: null,
    close() {},
  };
  const cache = createBrowserCache({ store: createMemoryStore(), channel: peer });
  const seen = [];
  cache.subscribe((changed) => seen.push(changed));
  const k = key('org-1', 'user-1', 'sessions');
  await cache.load(k, async () => 'x');
  expect(sent).toEqual([{ type: 'set', key: k }]);
  peer.onmessage({ data: { type: 'set', key: k } });
  expect(seen).toEqual([k]);
});
