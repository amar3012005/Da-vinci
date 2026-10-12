import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

const origin = 'https://next.preview.singulancelabs.com';

test('Open Dot listing is served by the private HIVE SPA shell', async () => {
  for (const route of [
    '/hivemind/app/employee/dots?filter=mine',
    '/hivemind/app/employee/dots/?filter=mine',
  ]) {
    let assetPath;
    const response = await worker.fetch(new Request(`${origin}${route}`), {
      ASSETS: { fetch: async request => {
        assetPath = new URL(request.url).pathname;
        return new Response('<!doctype html><main>HIVE shell</main>', { headers: { 'content-type': 'text/html' } });
      } },
    });
    assert.equal(response.status, 200, route);
    assert.equal(assetPath, '/', route);
    assert.equal(response.headers.get('location'), null, route);
    assert.equal(response.headers.get('cache-control'), 'private, no-store', route);
    assert.match(await response.text(), /HIVE shell/u);
  }
});

test('canonical employee and legacy Dot entries use the HIVE shell without changing auth cookies', async () => {
  for (const path of [
    '/hivemind/app/employee/dots/employee/1a4d2dff-7ea8-44e4-9623-6f74cd65e96a',
    '/hivemind/app/employee/dots/dot_0123456789abcdef',
  ]) {
    let assetPath;
    let forwardedCookie;
    const response = await worker.fetch(new Request(`${origin}${path}?c=conv_123`, {
      headers: { cookie: 'hm_cp_session=signed-session' },
    }), {
      ASSETS: { fetch: async request => {
        assetPath = new URL(request.url).pathname;
        forwardedCookie = request.headers.get('cookie');
        return new Response('<!doctype html><main>HIVE shell</main>', { headers: { 'content-type': 'text/html' } });
      } },
    });

    assert.equal(response.status, 200, path);
    assert.equal(assetPath, '/', path);
    assert.equal(response.headers.get('location'), null, path);
    assert.equal(response.headers.get('cache-control'), 'private, no-store', path);
    assert.match(response.headers.get('x-robots-tag'), /noindex/u, path);
    assert.equal(forwardedCookie, 'hm_cp_session=signed-session', path);
    assert.equal(response.headers.get('set-cookie'), null, path);
  }
});

test('Open Dot entry rejects malformed IDs and path suffixes', async () => {
  for (const route of [
    '/hivemind/app/employee/dots/not-a-dot',
    '/hivemind/app/employee/dots/dot_0123456789abcdef/extra',
    '/hivemind/app/employee/dots/dot_0123456789ab%2Fcdef',
    '/hivemind/app/employee/dots/employee/not-a-uuid',
    '/hivemind/app/employee/dots/employee/1a4d2dff-7ea8-44e4-9623-6f74cd65e96a/extra',
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
