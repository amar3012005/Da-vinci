import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyCustomProviders } from './custom-providers.mjs';

const ORIGIN = 'https://next.singulancelabs.com';
const ID = 'custom-0123456789abcdef';
const env = {};

function request(path, { method = 'GET', headers = {}, body } = {}) {
  return new Request(ORIGIN + path, {
    method,
    headers: { cookie: 'hm_cp_session=test', origin: ORIGIN, ...headers },
    ...(body === undefined ? {} : { body }),
  });
}

async function withFetch(handler, run) {
  const previous = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    return await run();
  } finally {
    globalThis.fetch = previous;
  }
}

test('list forwards the session cookie to the fixed runner origin without redirects or caching', async () => {
  await withFetch(async (url, options) => {
    assert.equal(String(url), 'https://runtime-runner-origin.singulancelabs.com/api/hivemind/custom-providers');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.get('cookie'), 'hm_cp_session=test');
    assert.equal(options.headers.get('accept'), 'application/json');
    assert.equal(options.headers.get('x-forwarded-host'), 'next.singulancelabs.com');
    assert.equal(options.headers.get('origin'), null);
    return Response.json({ providers: [] });
  }, async () => {
    const response = await proxyCustomProviders(request('/api/hivemind/custom-providers'), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await response.json(), { providers: [] });
  });
});

test('upsert forwards a JSON body with the same origin after the origin check', async () => {
  const payload = JSON.stringify({ name: 'Acme', baseUrl: 'https://api.acme.example/v1', protocol: 'openai-chat-completions', models: [{ id: 'acme-large' }], apiKey: 'sk-test-value' });
  await withFetch(async (url, options) => {
    assert.equal(String(url), 'https://runtime-runner-origin.singulancelabs.com/api/hivemind/custom-providers');
    assert.equal(options.method, 'PUT');
    assert.equal(options.headers.get('origin'), ORIGIN);
    assert.equal(options.headers.get('content-type'), 'application/json');
    assert.equal(new TextDecoder().decode(options.body), payload);
    return Response.json({ provider: { id: ID } }, { status: 201 });
  }, async () => {
    const response = await proxyCustomProviders(request('/api/hivemind/custom-providers', {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: payload,
    }), env);
    assert.equal(response.status, 201);
  });
});

test('delete and stored-provider test route to the provider id without a body', async () => {
  const calls = [];
  await withFetch(async (url, options) => {
    calls.push([String(url), options.method, options.body]);
    return Response.json({ deleted: true });
  }, async () => {
    assert.equal((await proxyCustomProviders(request(`/api/hivemind/custom-providers/${ID}`, { method: 'DELETE' }), env)).status, 200);
    assert.equal((await proxyCustomProviders(request(`/api/hivemind/custom-providers/${ID}/test`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    }), env)).status, 200);
  });
  assert.deepEqual(calls.map(([url, method]) => [url, method]), [
    [`https://runtime-runner-origin.singulancelabs.com/api/hivemind/custom-providers/${ID}`, 'DELETE'],
    [`https://runtime-runner-origin.singulancelabs.com/api/hivemind/custom-providers/${ID}/test`, 'POST'],
  ]);
  assert.equal(calls[0][2], undefined);
});

test('draft test-connection posts JSON to the test route', async () => {
  await withFetch(async (url, options) => {
    assert.equal(String(url), 'https://runtime-runner-origin.singulancelabs.com/api/hivemind/custom-providers/test');
    assert.equal(options.method, 'POST');
    return Response.json({ ok: true, models: [{ id: 'acme-large' }] });
  }, async () => {
    const response = await proxyCustomProviders(request('/api/hivemind/custom-providers/test', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"baseUrl":"https://api.acme.example/v1","protocol":"openai-chat-completions","apiKey":"sk-x"}',
    }), env);
    assert.equal(response.status, 200);
  });
});

test('mutating requests must be JSON and same-origin', async () => {
  assert.equal((await proxyCustomProviders(request('/api/hivemind/custom-providers', {
    method: 'PUT', headers: { 'content-type': 'text/plain' }, body: '{}',
  }), env)).status, 415);
  assert.equal((await proxyCustomProviders(request('/api/hivemind/custom-providers', {
    method: 'PUT', headers: { 'content-type': 'application/json', origin: 'https://attacker.example' }, body: '{}',
  }), env)).status, 403);
  assert.equal((await proxyCustomProviders(request('/api/hivemind/custom-providers', {
    method: 'PUT', headers: { 'content-type': 'application/json', origin: '', }, body: '{}',
  }), env)).status, 403);
  assert.equal((await proxyCustomProviders(request(`/api/hivemind/custom-providers/${ID}`, {
    method: 'DELETE', headers: { 'sec-fetch-site': 'cross-site' },
  }), env)).status, 403);
});

test('cross-origin reads are refused', async () => {
  assert.equal((await proxyCustomProviders(request('/api/hivemind/custom-providers', {
    headers: { origin: 'https://attacker.example' },
  }), env)).status, 403);
});

test('request bodies over 10 KB are refused before reaching the runner', async () => {
  let called = false;
  await withFetch(async () => { called = true; return Response.json({}); }, async () => {
    const oversized = JSON.stringify({ name: 'x'.repeat(10001) });
    const response = await proxyCustomProviders(request('/api/hivemind/custom-providers', {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: oversized,
    }), env);
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error, 'request_too_large');
  });
  assert.equal(called, false);
});

test('unknown paths, malformed ids and wrong methods are refused', async () => {
  const cases = [
    ['/api/hivemind/custom-providers/unknown/extra/path', 'GET', 404],
    ['/api/hivemind/custom-providers/not-an-id', 'DELETE', 404],
    ['/api/hivemind/custom-providers/../model-connection/status', 'GET', 404],
    ['/api/hivemind/custom-providers/test', 'GET', 405],
    ['/api/hivemind/custom-providers', 'DELETE', 405],
    [`/api/hivemind/custom-providers/${ID}`, 'GET', 405],
  ];
  for (const [path, method, status] of cases) {
    assert.equal((await proxyCustomProviders(request(path, { method, headers: { 'content-type': 'application/json' }, body: method === 'PUT' ? '{}' : undefined }), env)).status, status, `${method} ${path}`);
  }
});

test('missing session cookie is refused without contacting the runner', async () => {
  let called = false;
  await withFetch(async () => { called = true; return Response.json({}); }, async () => {
    const response = await proxyCustomProviders(new Request(`${ORIGIN}/api/hivemind/custom-providers`, { headers: { cookie: 'other=1' } }), env);
    assert.equal(response.status, 401);
  });
  assert.equal(called, false);
});

test('runner redirects are denied and unreachable runners return 503', async () => {
  await withFetch(async () => new Response(null, { status: 302, headers: { location: 'https://attacker.example/' } }), async () => {
    const response = await proxyCustomProviders(request('/api/hivemind/custom-providers'), env);
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error, 'runtime_redirect_denied');
  });
  await withFetch(async () => { throw new TypeError('network down'); }, async () => {
    const response = await proxyCustomProviders(request('/api/hivemind/custom-providers'), env);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'custom_providers_unavailable');
  });
});
