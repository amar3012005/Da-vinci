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

test('admitted opaque session routes serve the native Harness document', async () => {
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
  assert.equal(forwarded, '/hivemind/app/overview/session/session-opaque');
  assert.match(await response.text(), /src="\/assets\/index\.js"/);
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

test('generic API traffic without Harness admission stays on Da-vinci', async () => {
  let calls = 0;
  const env = environment(async () => { calls += 1; return new Response('Harness'); });
  const response = await worker.fetch(new Request(`${origin}/api/session/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ request: {} }),
  }), env);

  assert.equal(response.status, 200);
  assert.equal(calls, 0);
  assert.match(await response.text(), /Da-vinci/);
});
