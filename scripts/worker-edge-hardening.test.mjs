import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

const origin = 'https://next.preview.singulancelabs.com';
const shell = { ASSETS: { fetch: async () => new Response('<!doctype html><div>shell</div>', { headers: { 'content-type': 'text/html' } }) } };

test('app documents refuse foreign frames', async () => {
  for (const route of ['/hivemind/app/overview', '/hivemind/app/employee/harness', '/hivemind/m/chat']) {
    const response = await worker.fetch(new Request(`${origin}${route}`), shell);
    assert.equal(response.headers.get('content-security-policy'), "frame-ancestors 'self'", route);
    assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN', route);
  }
});

test('the native pane remains embeddable by both app origins', async () => {
  const response = await worker.fetch(new Request('https://next.singulancelabs.com/hivemind/app/overview?native_pane=1', { headers: { 'sec-fetch-dest': 'iframe' } }), shell);
  assert.equal(response.headers.get('content-security-policy'), 'frame-ancestors https://next.singulancelabs.com https://runtime-runner.singulancelabs.com');
  assert.equal(response.headers.get('x-frame-options'), null);
});
