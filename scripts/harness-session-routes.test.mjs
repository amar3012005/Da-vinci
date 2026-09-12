import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

const origin = 'https://next.preview.singulancelabs.com';

function environment(harnessFetch) {
  return {
    HARNESS_CHAT: { fetch: harnessFetch },
    ASSETS: { fetch: async () => new Response('<!doctype html><div>Da-vinci</div>', { headers: { 'content-type': 'text/html' } }) },
  };
}

test('admitted session deep links retain the Da-vinci document and embedded mount', async () => {
  let forwarded;
  const env = environment(async (request) => {
    forwarded = new URL(request.url).pathname;
    return new Response('<!doctype html><script src="./assets/index.js"></script>', {
      headers: { 'content-type': 'text/html' },
    });
  });
  const response = await worker.fetch(new Request(`${origin}/hivemind/app/overview/session/session-opaque`, {
    headers: { cookie: 'dsh-auth-main=value; hm_harness_admitted=1' },
  }), env);
  assert.equal(response.status, 200);
  assert.equal(forwarded, undefined);
  assert.match(await response.text(), /Da-vinci/);
});

test('a deep link survives the one-shot admission exchange', async () => {
  const target = '/hivemind/app/overview/session/session-opaque';
  const env = environment(async () => new Response(null, { status: 303, headers: { location: '/old' } }));
  const landing = await worker.fetch(new Request(`${origin}${target}`), env);
  const returnCookie = landing.headers.getSetCookie().find(value => value.startsWith('hm_harness_return='));
  assert.ok(returnCookie);

  const encoded = returnCookie.match(/^hm_harness_return=([^;]+)/)?.[1];
  const exchange = await worker.fetch(new Request(`${origin}/api/hivemind/embed/exchange`, {
    method: 'POST', headers: { cookie: `hm_harness_return=${encoded}` }, body: '{}',
  }), env);
  assert.equal(exchange.status, 303);
  assert.equal(exchange.headers.get('location'), target);
  assert.equal(exchange.headers.getSetCookie().some(value => value.startsWith('hm_harness_admitted=1')), true);
  assert.equal(exchange.headers.getSetCookie().some(value => value.startsWith('hm_harness_return=;')), true);
});

test('invalid session paths stay on Da-vinci and never reach Harness', async () => {
  let calls = 0;
  const env = environment(async () => { calls += 1; return new Response('Harness'); });
  const response = await worker.fetch(new Request(`${origin}/hivemind/app/overview/session/a/b`, {
    headers: { cookie: 'dsh-auth-main=value; hm_harness_admitted=1' },
  }), env);
  assert.equal(response.status, 200);
  assert.equal(calls, 0);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('repeated Overview suffixes are reduced to the canonical session URL', async () => {
  const target = '/hivemind/app/overview/session/session-opaque';
  const response = await worker.fetch(new Request(`${origin}${target}/overview/overview/overview`), environment(async () => {
    throw new Error('redirect must happen before Harness dispatch');
  }));

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), `${origin}${target}`);
});

test('unknown session suffixes are not treated as recoverable Harness routes', async () => {
  let calls = 0;
  const response = await worker.fetch(new Request(`${origin}/hivemind/app/overview/session/session-opaque/settings`, {
    headers: { cookie: 'dsh-auth-main=value; hm_harness_admitted=1' },
  }), environment(async () => { calls += 1; return new Response('Harness'); }));

  assert.equal(response.status, 200);
  assert.equal(calls, 0);
});

test('admitted native unary RPCs are delegated to Harness', async () => {
  let forwarded;
  const env = environment(async (request) => {
    forwarded = { path: new URL(request.url).pathname, method: request.method };
    return Response.json({ ok: true });
  });
  const response = await worker.fetch(new Request(`${origin}/api/session/create`, {
    method: 'POST',
    headers: {
      cookie: 'dsh-auth-main=value; hm_harness_admitted=1',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ request: {} }),
  }), env);

  assert.equal(response.status, 200);
  assert.deepEqual(forwarded, { path: '/api/session/create', method: 'POST' });
});

test('native RPC authentication is enforced by Harness, never SPA HTML', async () => {
  let calls = 0;
  const env = environment(async () => { calls += 1; return new Response('Unauthorized', { status: 401 }); });
  const response = await worker.fetch(new Request(`${origin}/api/session/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ request: {} }),
  }), env);

  assert.equal(response.status, 401);
  assert.equal(calls, 1);
  assert.equal(await response.text(), 'Unauthorized');
});

test('Harness feature evaluation stays on the canonical next.preview authority', async () => {
  let forwarded;
  const response = await worker.fetch(new Request(`${origin}/__hivemind/feature-flags/harness-chat`), environment(async (request) => {
    forwarded = new URL(request.url);
    return Response.json({ enabled: true, source: 'cloudflare-flagship' });
  }));

  assert.equal(response.status, 200);
  assert.equal(forwarded.origin, origin);
  assert.equal(forwarded.pathname, '/__hivemind/feature-flags/harness-chat');
  assert.deepEqual(await response.json(), { enabled: true, source: 'cloudflare-flagship' });
});

test('WebSocket upgrade response retains the original transport object', async () => {
  const upgraded = { status: 101, webSocket: {} };
  const response = await worker.fetch(new Request(`${origin}/api/remote.mux`, {
    headers: { upgrade: 'websocket' },
  }), environment(async () => upgraded));
  assert.equal(response, upgraded);
});
