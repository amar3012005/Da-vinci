import assert from 'node:assert/strict';
import test from 'node:test';
import { edgeCachedNativeCode, isRevisionedNativeCode } from '../cloudflare/runtime-native-assets.mjs';

function memoryCache() {
  const store = new Map();
  return { store, match: async (request) => store.get(request.url)?.clone(), put: async (request, response) => { store.set(request.url, response); } };
}

const combo = 'https://runtime-runner.singulancelabs.com/plugins/??@deepseek-ai/dsh-client-ui-chat/client.js&rev=5009a079309a';

test('identifies only release-pinned plugin and shell code', () => {
  assert.equal(isRevisionedNativeCode(new URL(combo)), true);
  assert.equal(isRevisionedNativeCode(new URL('https://runtime-runner.singulancelabs.com/assets/harness-shell.js?rev=17f4f9781999')), true);
  assert.equal(isRevisionedNativeCode(new URL('https://runtime-runner.singulancelabs.com/plugins/events?rev=17f4f9781999')), false);
  assert.equal(isRevisionedNativeCode(new URL('https://runtime-runner.singulancelabs.com/api/hivemind/boot?rev=17f4f9781999')), false);
  assert.equal(isRevisionedNativeCode(new URL('https://runtime-runner.singulancelabs.com/assets/harness-shell.js')), false);
  assert.equal(isRevisionedNativeCode(new URL('https://next.singulancelabs.com/assets/harness-shell.js?rev=17f4f9781999')), false);
});

test('fills the edge cache once and serves later requests without the runner', async () => {
  const cache = memoryCache();
  globalThis.caches = { default: cache };
  let loads = 0;
  const load = async () => { loads += 1; return new Response('code', { headers: { 'cache-control': 'public, max-age=31536000, immutable', 'content-type': 'text/javascript' } }); };
  const waits = [];
  const first = await edgeCachedNativeCode(new Request(combo), { waitUntil: (p) => waits.push(p) }, load);
  await Promise.all(waits);
  const second = await edgeCachedNativeCode(new Request(combo), undefined, load);
  assert.equal(await first.text(), 'code');
  assert.equal(await second.text(), 'code');
  assert.equal(loads, 1);
});

test('never stores private, cookie-bearing, HTML or failed responses', async () => {
  for (const response of [
    new Response('x', { headers: { 'cache-control': 'private, no-store' } }),
    new Response('x', { headers: { 'cache-control': 'public, immutable', 'set-cookie': 'a=1' } }),
    new Response('<html>', { headers: { 'cache-control': 'public, immutable', 'content-type': 'text/html' } }),
    new Response('x', { status: 503, headers: { 'cache-control': 'public, immutable' } }),
  ]) {
    const cache = memoryCache();
    globalThis.caches = { default: cache };
    await edgeCachedNativeCode(new Request(combo), undefined, async () => response);
    assert.equal(cache.store.size, 0);
  }
});
