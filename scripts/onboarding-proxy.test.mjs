import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyOnboarding, ONBOARDING_PATH } from '../cloudflare/onboarding-proxy.mjs';

const runtime = 'https://runtime-runner.singulancelabs.com';
const brain = 'https://next.singulancelabs.com';
const cookie = 'hm_cp_session=company; other=secret';
const noFetch = () => { throw Error('unexpected upstream'); };

test('only the walkthrough path is handled', async () => {
  assert.equal(await proxyOnboarding(new Request(`${runtime}/api/hivemind/onboarding/x`), noFetch), null);
});

test('foreign origins, cross-site writes, missing session and other methods are refused before forwarding', async () => {
  assert.equal((await proxyOnboarding(new Request(`https://evil.example${ONBOARDING_PATH}`, { headers: { cookie } }), noFetch)).status, 403);
  assert.equal((await proxyOnboarding(new Request(`${runtime}${ONBOARDING_PATH}`, { method: 'POST', headers: { cookie, origin: 'https://evil.example' }, body: '{}' }), noFetch)).status, 403);
  assert.equal((await proxyOnboarding(new Request(`${runtime}${ONBOARDING_PATH}`, { method: 'POST', headers: { cookie }, body: '{}' }), noFetch)).status, 403);
  assert.equal((await proxyOnboarding(new Request(`${runtime}${ONBOARDING_PATH}`), noFetch)).status, 401);
  assert.equal((await proxyOnboarding(new Request(`${runtime}${ONBOARDING_PATH}`, { method: 'DELETE', headers: { cookie, origin: runtime } }), noFetch)).status, 405);
  assert.equal((await proxyOnboarding(new Request(`${runtime}${ONBOARDING_PATH}`, { method: 'POST', headers: { cookie, origin: runtime }, body: 'x'.repeat(16_001) }), noFetch)).status, 413);
});

test('forwards only the company session and the app origin, from both app hosts', async () => {
  for (const origin of [runtime, brain]) {
    let forwarded;
    const response = await proxyOnboarding(new Request(`${origin}${ONBOARDING_PATH}`, { method: 'POST', headers: { cookie, origin, authorization: 'Bearer x', 'x-org-id': 'foreign', 'content-type': 'application/json' }, body: '{"events":[]}' }),
      async request => { forwarded = request; return Response.json({ steps: [] }, { headers: { 'set-cookie': 'a=b' } }); });
    assert.equal(forwarded.url, `https://dots.singulancelabs.com${ONBOARDING_PATH}`);
    assert.equal(forwarded.headers.get('cookie'), 'hm_cp_session=company');
    assert.equal(forwarded.headers.get('origin'), origin);
    assert.equal(forwarded.headers.get('authorization'), null);
    assert.equal(forwarded.headers.get('x-org-id'), null);
    assert.equal(await forwarded.text(), '{"events":[]}');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('an upstream failure or redirect answers 502 without leaking the upstream', async () => {
  assert.equal((await proxyOnboarding(new Request(`${runtime}${ONBOARDING_PATH}`, { headers: { cookie } }), async () => { throw Error('down'); })).status, 502);
  assert.equal((await proxyOnboarding(new Request(`${runtime}${ONBOARDING_PATH}`, { headers: { cookie } }), async () => new Response(null, { status: 302, headers: { location: 'https://x' } }))).status, 502);
});
