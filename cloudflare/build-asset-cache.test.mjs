import test from 'node:test';
import assert from 'node:assert/strict';
import { isStaticBuildAsset, matchBuildAsset, storeBuildAsset, buildAssetCacheKey, BUILD_ASSET_CACHE_CONTROL } from './build-asset-cache.mjs';

const ASSET = 'https://runtime-runner.singulancelabs.com/_next/static/css/app.abc123.css';

function fakeCache(seed = new Map()) {
  const puts = [];
  return {
    puts,
    store: seed,
    async match(key) { return seed.get(key.url)?.clone(); },
    async put(key, response) { puts.push(key); seed.set(key.url, response); },
  };
}

test('only GET and HEAD under /_next/static/ are cacheable build assets', () => {
  assert.equal(isStaticBuildAsset(new Request(ASSET)), true);
  assert.equal(isStaticBuildAsset(new Request(ASSET, { method: 'HEAD' })), true);
  for (const path of ['/_next/data/abc/page.json', '/_next/image?url=x', '/api/apps/gmail', '/shared-hyperagent-shell/x.js']) {
    assert.equal(isStaticBuildAsset(new Request('https://runtime-runner.singulancelabs.com' + path)), false, path);
  }
  assert.equal(isStaticBuildAsset(new Request(ASSET, { method: 'POST' })), false);
});

test('a cache hit is served without a session cookie, with the immutable policy', async () => {
  const cache = fakeCache();
  const primed = new Response('body{}', { status: 200, headers: { 'content-type': 'text/css', 'cache-control': 'private, no-store' } });
  const keyUrls = [];
  const observer = { match: async (key) => { keyUrls.push(key); return cache.match(key); }, put: cache.put.bind(cache) };
  cache.store.set(ASSET, primed);
  const hit = await matchBuildAsset(new Request(ASSET), observer);
  assert.equal(hit.status, 200);
  assert.equal(hit.headers.get('cache-control'), BUILD_ASSET_CACHE_CONTROL);
  assert.equal(hit.headers.get('content-type'), 'text/css');
  assert.equal(await hit.text(), 'body{}');
  assert.equal(keyUrls[0].headers.get('cookie'), null);
  assert.equal(buildAssetCacheKey(new Request(ASSET, { headers: { cookie: 'hm_cp_session=x' } })).headers.get('cookie'), null);
});

test('a miss primes the cache only for a 200 and strips set-cookie', async () => {
  const cache = fakeCache();
  const waits = [];
  const ctx = { waitUntil: (promise) => waits.push(promise) };
  const upstream = new Response('body{}', { status: 200, headers: { 'content-type': 'text/css', 'set-cookie': 'hm_cp_session=leak; Path=/' } });
  const served = storeBuildAsset(new Request(ASSET), upstream, ctx, cache);
  await Promise.all(waits);
  assert.equal(cache.puts.length, 1);
  assert.equal(cache.puts[0].url, ASSET);
  assert.equal(served.headers.get('cache-control'), BUILD_ASSET_CACHE_CONTROL);
  assert.equal(served.headers.get('set-cookie'), null);
  assert.equal(await served.text(), 'body{}');

  const notFound = storeBuildAsset(new Request(ASSET), new Response('missing', { status: 404 }), ctx, cache);
  await Promise.all(waits);
  assert.equal(cache.puts.length, 1, 'a 404 must not prime the cache');
  assert.equal(notFound.headers.get('cache-control'), 'private, no-store');
});

test('a 401 from the authenticated upstream is never cached', async () => {
  const cache = fakeCache();
  const waits = [];
  const ctx = { waitUntil: (promise) => waits.push(promise) };
  const denied = storeBuildAsset(new Request(ASSET), new Response('{"error":"unauthorized"}', { status: 401 }), ctx, cache);
  await Promise.all(waits);
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('cache-control'), 'private, no-store');
  assert.equal(cache.puts.length, 0);
  assert.equal(await matchBuildAsset(new Request(ASSET), cache), null);
});
