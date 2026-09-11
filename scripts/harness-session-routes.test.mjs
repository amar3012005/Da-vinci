import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

const origin = 'https://next.preview.singulancelabs.com';
const env = (fetch) => ({
  HARNESS_CHAT: { fetch },
  ASSETS: { fetch: async () => new Response('<!doctype html><div>Da-vinci</div>', { headers: { 'content-type': 'text/html' } }) },
});

test('admitted session routes serve the Harness document', async () => {
  let path;
  const response = await worker.fetch(new Request(`${origin}/hivemind/app/overview/session/session-opaque`, {
    headers: { cookie: 'dsh-auth-main=value; hm_harness_admitted=1' },
  }), env(async request => {
    path = new URL(request.url).pathname;
    return new Response('<!doctype html><script src="./assets/index.js"></script>', { headers: { 'content-type': 'text/html' } });
  }));
  assert.equal(response.status, 200);
  assert.equal(path, '/');
  assert.match(await response.text(), /src="\/assets\/index\.js"/);
});

test('repeated Overview suffixes canonicalize once before Harness dispatch', async () => {
  const target = '/hivemind/app/overview/session/session-opaque';
  const response = await worker.fetch(new Request(`${origin}${target}/overview/overview/overview`), env(async () => {
    throw new Error('must redirect before Harness dispatch');
  }));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), `${origin}${target}`);
});

test('unknown session suffixes stay on Da-vinci', async () => {
  let calls = 0;
  const response = await worker.fetch(new Request(`${origin}/hivemind/app/overview/session/session-opaque/settings`, {
    headers: { cookie: 'dsh-auth-main=value; hm_harness_admitted=1' },
  }), env(async () => { calls += 1; return new Response('Harness'); }));
  assert.equal(response.status, 200);
  assert.equal(calls, 0);
});

test('admitted native RPCs are delegated to Harness', async () => {
  let path;
  const response = await worker.fetch(new Request(`${origin}/api/session/create`, {
    method: 'POST',
    headers: { cookie: 'dsh-auth-main=value; hm_harness_admitted=1', 'content-type': 'application/json' },
    body: '{}',
  }), env(async request => { path = new URL(request.url).pathname; return Response.json({ ok: true }); }));
  assert.equal(response.status, 200);
  assert.equal(path, '/api/session/create');
});
