import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRuntimePublic } from '../cloudflare/getruntime-public.mjs';
const origin = 'https://getruntime.singulancelabs.com';
const handlers = { seo: (response, path) => new Response(path, { headers: { 'cache-control': 'no-cache', 'x-robots-tag': 'index, follow' } }), markdown: (request, path) => new Response('markdown:' + path), prefersMarkdown: value => value?.includes('text/markdown') };
function env(html = true) { return { ASSETS: { fetch: async request => new Response(html ? '<div id="root"></div>' : '/* asset */', { headers: { 'content-type': html ? 'text/html' : 'text/javascript' } }) } }; }
test('only the new public host is owned; Brain and Runtime application hosts are unchanged', async () => {
  for (const host of ['next.singulancelabs.com', 'runtime-runner.singulancelabs.com', 'runtime.singulancelabs.com']) assert.equal(await getRuntimePublic(new Request('https://' + host + '/'), env(), handlers), null);
});
test('root renders the Runtime cover with its own public SEO identity', async () => {
  const response = await getRuntimePublic(new Request(origin), env(), handlers);
  assert.equal(await response.text(), '/getruntime'); assert.equal(response.headers.get('cache-control'), 'no-cache');
});
test('private API writes and reads never enter a product proxy on this hostname', async () => {
  let calls = 0; const platform = { ASSETS: { fetch() { calls++; throw new Error('must not proxy'); } } };
  assert.equal((await getRuntimePublic(new Request(origin + '/api/hivemind/session', { method: 'POST' }), platform, handlers)).status, 405);
  assert.equal((await getRuntimePublic(new Request(origin + '/v1/bootstrap'), platform, handlers)).status, 404);
  assert.equal(calls, 0);
});
test('missing hashed files are real non-HTML errors; valid assets pass through', async () => {
  const missing = await getRuntimePublic(new Request(origin + '/static/js/missing.js'), env(), handlers);
  assert.equal(missing.status, 404); assert.match(missing.headers.get('content-type'), /text\/plain/);
  assert.equal((await getRuntimePublic(new Request(origin + '/static/js/main.12345678.js'), env(false), handlers)).status, 200);
});
test('discovery and markdown use the new canonical host; HEAD robots has no body', async () => {
  const robots = await getRuntimePublic(new Request(origin + '/robots.txt'), env(), handlers);
  assert.match(await robots.text(), /Sitemap: https:\/\/getruntime.singulancelabs.com\/sitemap.xml/);
  assert.equal(await (await getRuntimePublic(new Request(origin + '/robots.txt', { method: 'HEAD' }), env(), handlers)).text(), '');
  assert.match(await (await getRuntimePublic(new Request(origin + '/', { headers: { accept: 'text/markdown' } }), env(), handlers)).text(), /markdown:\/getruntime/);
});
test('app entry keeps authentication on the actual Runtime application origin', async () => {
  const response = await getRuntimePublic(new Request(origin + '/hivemind/login'), env(), handlers);
  assert.equal(response.status, 302); assert.equal(response.headers.get('location'), 'https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness');
});

test('shared cookie-consent policy links resolve to the existing published legal pages', async () => {
  for (const path of ['/privacy', '/cookies', '/security']) {
    const response = await getRuntimePublic(new Request(origin + path), env(), handlers);
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), 'https://singulancelabs.com' + path);
  }
});
