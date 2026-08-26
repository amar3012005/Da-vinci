import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';

function envReturning(response) {
  return { ASSETS: { fetch: async () => response } };
}

const missingAsset = await worker.fetch(
  new Request('https://next.singulancelabs.com/static/js/missing.chunk.js'),
  envReturning(new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } })),
);
assert.equal(missingAsset.status, 404);
assert.equal(missingAsset.headers.get('x-content-type-options'), 'nosniff');
assert.equal(missingAsset.headers.get('cache-control'), 'no-store');

const javascript = new Response('self.webpackChunk=[];', {
  headers: { 'content-type': 'text/javascript' },
});
assert.equal(
  await worker.fetch(
    new Request('https://next.singulancelabs.com/static/js/present.chunk.js'),
    envReturning(javascript),
  ),
  javascript,
);

const spa = new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } });
assert.equal(
  await worker.fetch(
    new Request('https://next.singulancelabs.com/hivemind/app/mycompany'),
    envReturning(spa),
  ),
  spa,
);

console.log('cloudflare static asset boundary: ok');
