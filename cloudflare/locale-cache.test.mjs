import test from 'node:test';
import assert from 'node:assert/strict';
import { localeCacheControl, withLocaleCacheHeaders, LOCALE_CACHE_CONTROL } from './locale-cache.mjs';

test('locale bundles are revalidated with a short fresh window and long stale window', () => {
  assert.equal(localeCacheControl('/locales/en/dashboard.json'), 'public, max-age=300, stale-while-revalidate=604800');
  assert.equal(localeCacheControl('/locales/de/common.json'), LOCALE_CACHE_CONTROL);
  assert.equal(LOCALE_CACHE_CONTROL.includes('immutable'), false);
});

test('non-locale paths keep their own cache policy', () => {
  for (const path of ['/index.html', '/static/js/main.abc.js', '/locales/en/../secret.json', '/locales/en/dashboard.js', '/locales/en/a/b.json', '/hivemind/app/overview']) {
    assert.equal(localeCacheControl(path), null, path);
  }
});

test('withLocaleCacheHeaders sets the policy on successful bundles and preserves the body', async () => {
  const source = new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=0, must-revalidate' } });
  const out = withLocaleCacheHeaders(source, '/locales/en/landing.json');
  assert.equal(out.headers.get('cache-control'), LOCALE_CACHE_CONTROL);
  assert.equal(out.headers.get('content-type'), 'application/json');
  assert.equal(await out.text(), '{"ok":true}');
});

test('withLocaleCacheHeaders leaves failed and non-locale responses untouched', () => {
  const missing = new Response('nope', { status: 404 });
  assert.equal(withLocaleCacheHeaders(missing, '/locales/en/dashboard.json'), missing);
  const page = new Response('<html>', { status: 200 });
  assert.equal(withLocaleCacheHeaders(page, '/index.html'), page);
});
