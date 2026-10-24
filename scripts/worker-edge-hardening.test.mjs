import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';
import { runnerRequestHeaders } from '../cloudflare/runner-headers.mjs';

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

const spoofed = {
  'x-forwarded-for': '203.0.113.9',
  'x-forwarded-host': 'attacker.invalid',
  'x-forwarded-proto': 'http',
  'x-forwarded-port': '80',
  forwarded: 'for=203.0.113.9;host=attacker.invalid',
  'x-real-ip': '203.0.113.9',
  'x-hivemind-tenant-id': '00000000-0000-4000-8000-000000000000',
  'x-hivemind-tenant-forwarded': '1',
  'x-hivemind-appearance-org': 'other-org',
  'x-user-id': 'other-user',
};

test('runner headers keep the allowlist and drop spoofed tenant and forwarding headers', () => {
  const headers = runnerRequestHeaders(new Request(`${origin}/api/commands/list`, {
    method: 'POST',
    headers: { ...spoofed, cookie: 'dsh-auth-main=v', origin, 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.7', 'sec-websocket-protocol': 'dsh' },
    body: '{}',
  }));
  for (const name of Object.keys(spoofed)) if (name !== 'x-forwarded-for') assert.equal(headers.get(name), null, name);
  assert.equal(headers.get('x-forwarded-for'), '198.51.100.7');
  assert.equal(headers.get('cookie'), 'dsh-auth-main=v');
  assert.equal(headers.get('origin'), origin);
  assert.equal(headers.get('content-type'), 'application/json');
  assert.equal(headers.get('sec-websocket-protocol'), 'dsh');
  assert.equal(runnerRequestHeaders(new Request(origin, { headers: spoofed })).get('x-forwarded-for'), null);
});

test('runner proxy forwards only allowlisted headers on both transports', async () => {
  const request = () => new Request(`${origin}/api/commands/list`, {
    method: 'POST', headers: { ...spoofed, cookie: 'dsh-auth-main=v; hm_harness_admitted=1', origin, 'content-type': 'application/json' }, body: '{}',
  });
  let bound;
  await worker.fetch(request(), { ...shell, HARNESS_CHAT: { fetch: async (forwarded) => { bound = forwarded; return Response.json({}); } } });
  assert.ok(bound);
  for (const name of Object.keys(spoofed)) assert.equal(bound.headers.get(name), null, `service binding ${name}`);
  assert.equal(bound.headers.get('cookie'), 'dsh-auth-main=v; hm_harness_admitted=1');
  assert.equal(await bound.text(), '{}');

  const original = globalThis.fetch;
  let sent;
  globalThis.fetch = async (forwarded) => { sent = forwarded; return Response.json({}); };
  try {
    await worker.fetch(request(), { ...shell, RUNNER_ORIGIN: 'https://runner.invalid' });
  } finally { globalThis.fetch = original; }
  assert.ok(sent);
  for (const name of Object.keys(spoofed)) if (!['x-forwarded-host', 'x-forwarded-proto'].includes(name)) assert.equal(sent.headers.get(name), null, `origin fetch ${name}`);
  assert.equal(sent.headers.get('x-forwarded-host'), new URL(origin).host);
  assert.equal(sent.headers.get('x-forwarded-proto'), 'https');
  assert.equal(sent.headers.get('origin'), origin);
});
