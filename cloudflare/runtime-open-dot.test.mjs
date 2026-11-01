import assert from 'node:assert/strict';
import test from 'node:test';
import { isRuntimeOpenDotRequest, proxyRuntimeOpenDot, openDotSurfaceRedirect } from './runtime-open-dot.mjs';

/**
 * Every /api path the OpenDot client (hivemind-open-dot: src/lib, src/components, src/app) calls on the Runtime origin.
 * OpenDot CHANGES THAT ADD OR RENAME A CLIENT API PATH MUST UPDATE THIS LIST (and the API allowlist in runtime-open-dot.mjs),
 * or the Worker serves the SPA for it and the browser sees a 405/404.
 */
const FORWARDED_TO_OPEN_DOT = [
  '/api/cards/msg_example', '/api/conversations', '/api/conversations/conv_example', '/api/files/file_example',
  '/api/dots/autonomy', '/api/dots/company-glance', '/api/dots/local-duties', '/api/dots/team-board', '/api/dots/team-week',
  ...['agenda', 'control', 'conversations', 'event-watches', 'files', 'frames', 'input', 'library', 'live', 'results', 'screen', 'stream', 'warm', 'workspace']
    .map(name => `/api/dots/dot_2c1a636bd2ac7f18/${name}`),
  '/api/hivemind/setup', '/api/hivemind/needs-you', '/api/hivemind/voice/context', '/api/hivemind/voice/events',
  '/api/locale', '/api/desktop/entry', '/api/models', '/api/organization', '/api/settings/open-dot-recovery', '/api/composio/oauth',
];

/** OpenDot client paths the Worker serves through its own handlers, not this allowlist. */
const HANDLED_ELSEWHERE = ['/api/apps/slug', '/api/events', '/api/hivemind/apps', '/api/hivemind/workspace-shell', '/api/hivemind/employees/status', '/api/hivemind/onboarding'];

test('every OpenDot client API path is forwarded to OpenDot on the Runtime origin', () => {
  for (const path of FORWARDED_TO_OPEN_DOT) {
    assert.equal(isRuntimeOpenDotRequest(new URL(path, 'https://runtime-runner.singulancelabs.com')), true, `${path} must be in the allowlist`);
  }
});

test('the local duty history read and the pause and resume actions use the allowlisted local-duties path with their query', () => {
  const history = new URL('/api/dots/local-duties?history=local-duty%3Adot_a%3Abrief', 'https://runtime-runner.singulancelabs.com');
  assert.equal(isRuntimeOpenDotRequest(history), true);
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/dots/local-duties/history', 'https://runtime-runner.singulancelabs.com')), false, 'no second path is exposed');
});

test('the local-first sync feeds keep their since and limit query and expose no nested path', () => {
  for (const path of ['/api/conversations?since=start&limit=100', '/api/conversations/conv_a?since=12', '/api/hivemind/needs-you?since=now']) {
    assert.equal(isRuntimeOpenDotRequest(new URL(path, 'https://runtime-runner.singulancelabs.com')), true, path);
  }
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/conversations/other', 'https://runtime-runner.singulancelabs.com')), false);
});

test('the Needs you path is forwarded on the Runtime origin only, and not when nested', () => {
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/hivemind/needs-you/extra', 'https://runtime-runner.singulancelabs.com')), false);
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/hivemind/needs-you', 'https://next.singulancelabs.com')), false);
});

test('the allowlist does not forward other origins or unlisted paths', () => {
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/dots/autonomy', 'https://next.singulancelabs.com')), false);
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/dots/dot_x/secret', 'https://runtime-runner.singulancelabs.com')), false);
  assert.equal(HANDLED_ELSEWHERE.length > 0, true);
});

test('the team board read is forwarded on the Runtime origin only, and not when nested', () => {
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/dots/team-board', 'https://runtime-runner.singulancelabs.com')), true);
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/dots/team-board/extra', 'https://runtime-runner.singulancelabs.com')), false);
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/dots/team-board', 'https://next.singulancelabs.com')), false);
});

const BRAIN = 'https://brain-runner.singulancelabs.com';
const RUNTIME_ORIGIN = 'https://runtime-runner.singulancelabs.com';

async function forwarded(origin, path, extra = {}) {
  let seen;
  const response = await proxyRuntimeOpenDot(new Request(origin + path, { headers: { cookie: 'hm_cp_session=a', 'last-event-id': '7', ...extra } }),
    async upstream => { seen = upstream; return new Response('ok'); });
  return { response, seen };
}

test('brain-runner serves the same OpenDot allowlist as runtime-runner', () => {
  for (const path of FORWARDED_TO_OPEN_DOT) assert.equal(isRuntimeOpenDotRequest(new URL(path, BRAIN)), true, path);
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/dots/dot_x/secret', BRAIN)), false);
});

test('brain-runner requests carry x-open-dot-surface: brain and keep Last-Event-ID', async () => {
  const { response, seen } = await forwarded(BRAIN, '/api/dots/dot_company_brain/stream', { 'x-open-dot-surface': 'runtime' });
  assert.equal(response.status, 200);
  assert.equal(seen.headers.get('x-open-dot-surface'), 'brain');
  assert.equal(seen.headers.get('last-event-id'), '7');
  assert.equal(seen.headers.get('cookie'), 'hm_cp_session=a');
  assert.equal(new URL(seen.url).origin, 'https://dots.singulancelabs.com');
});

test('runtime-runner never sends x-open-dot-surface, even when the client does', async () => {
  const { seen } = await forwarded(RUNTIME_ORIGIN, '/api/dots/dot_company_brain/stream', { 'x-open-dot-surface': 'brain' });
  assert.equal(seen.headers.has('x-open-dot-surface'), false);
});

test('brain-runner accepts its own origin and refuses the other, and still needs a session', async () => {
  const post = (origin, headers) => proxyRuntimeOpenDot(new Request(BRAIN + '/api/conversations', { method: 'POST', headers: { origin, cookie: 'hm_cp_session=a', ...headers } }),
    async () => new Response('ok'));
  assert.equal((await post(BRAIN)).status, 200);
  assert.equal((await post(RUNTIME_ORIGIN)).status, 403);
  const anonymous = await proxyRuntimeOpenDot(new Request(BRAIN + '/dots/dot_company_brain'), async () => new Response('ok'));
  assert.equal(anonymous.status, 401);
});

test('upstream redirects are rewritten to the requesting public host', async () => {
  const response = await proxyRuntimeOpenDot(new Request(BRAIN + '/settings', { headers: { cookie: 'hm_cp_session=a' } }),
    async () => new Response(null, { status: 302, headers: { location: 'https://dots.singulancelabs.com/dots/dot_company_brain' } }));
  assert.equal(response.headers.get('location'), BRAIN + '/dots/dot_company_brain');
});

test('brain-runner root and other dots redirect to the Company Brain; the Company Brain itself does not', () => {
  for (const path of ['/', '/dots/dot_abc123', '/dots/dot_abc123/']) {
    const response = openDotSurfaceRedirect(new Request(BRAIN + path));
    assert.equal(response.status, 302, path);
    assert.equal(response.headers.get('location'), BRAIN + '/dots/dot_company_brain');
  }
  assert.equal(openDotSurfaceRedirect(new Request(BRAIN + '/dots/dot_company_brain')), null);
  assert.equal(openDotSurfaceRedirect(new Request(BRAIN + '/api/conversations')), null);
  assert.equal(openDotSurfaceRedirect(new Request(BRAIN + '/', { method: 'POST' })), null);
});

test('the Company Brain on runtime-runner redirects to brain-runner; other dots stay', () => {
  const response = openDotSurfaceRedirect(new Request(RUNTIME_ORIGIN + '/dots/dot_company_brain'));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), BRAIN + '/dots/dot_company_brain');
  assert.equal(openDotSurfaceRedirect(new Request(RUNTIME_ORIGIN + '/dots/dot_abc123')), null);
  assert.equal(openDotSurfaceRedirect(new Request(RUNTIME_ORIGIN + '/')), null);
});

test('the brain-runner redirect keeps the embed query string', () => {
  const response = openDotSurfaceRedirect(new Request(BRAIN + '/?embed=hivemind&hm_locale=de'));
  assert.equal(response.headers.get('location'), BRAIN + '/dots/dot_company_brain?embed=hivemind&hm_locale=de');
  const moved = openDotSurfaceRedirect(new Request(RUNTIME_ORIGIN + '/dots/dot_company_brain?embed=hivemind'));
  assert.equal(moved.headers.get('location'), BRAIN + '/dots/dot_company_brain?embed=hivemind');
});

test('the embedded Company Brain document is served without a Worker frame restriction', async () => {
  const response = await proxyRuntimeOpenDot(new Request(BRAIN + '/dots/dot_company_brain?embed=hivemind', { headers: { cookie: 'hm_cp_session=a', 'sec-fetch-dest': 'iframe' } }),
    async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-frame-options'), null);
});

test('Overview and New chat on the app host go straight to the Company Brain, keeping the query', async () => {
  const { brainInstantRedirect } = await import('./runtime-open-dot.mjs');
  const room = 'https://brain-runner.singulancelabs.com/dots/dot_company_brain';
  for (const path of ['/hivemind/app/overview', '/hivemind/app/overview/', '/hivemind/app/overview/new', '/hivemind/app/overview/new/']) {
    for (const method of ['GET', 'HEAD']) {
      const res = brainInstantRedirect(new Request(`https://next.singulancelabs.com${path}`, { method }));
      assert.equal(res.status, 302, path);
      assert.equal(res.headers.get('location'), room);
    }
  }
  assert.equal(brainInstantRedirect(new Request('https://next.singulancelabs.com/hivemind/app/overview/new?hm_locale=de')).headers.get('location'), `${room}?hm_locale=de`);
});

test('the Brain redirect leaves sessions, dreaming, native panes, iframes, writes and other hosts alone', async () => {
  const { brainInstantRedirect } = await import('./runtime-open-dot.mjs');
  const next = 'https://next.singulancelabs.com';
  for (const path of ['/hivemind/app/overview/session/abc', '/hivemind/app/overview/dreaming', '/hivemind/app/overview/memories', '/hivemind/app/overview/new/x']) {
    assert.equal(brainInstantRedirect(new Request(next + path)), null, path);
  }
  assert.equal(brainInstantRedirect(new Request(`${next}/hivemind/app/overview/new?native_pane=1`)), null);
  assert.equal(brainInstantRedirect(new Request(`${next}/hivemind/app/overview/new`, { headers: { 'sec-fetch-dest': 'iframe' } })), null);
  assert.equal(brainInstantRedirect(new Request(`${next}/hivemind/app/overview/new`, { method: 'POST' })), null);
  assert.equal(brainInstantRedirect(new Request('https://runtime-runner.singulancelabs.com/hivemind/app/overview/new')), null);
});

test('a conversation id in the address (?c=) reaches the Company Brain room unchanged and is never redirected away', async () => {
  const path = '/dots/dot_company_brain?c=conv_abc123&hm_locale=de';
  assert.equal(isRuntimeOpenDotRequest(new URL(path, BRAIN)), true);
  assert.equal(openDotSurfaceRedirect(new Request(BRAIN + path)), null);
  const { response, seen } = await forwarded(BRAIN, path);
  assert.equal(response.status, 200);
  assert.equal(new URL(seen.url).pathname + new URL(seen.url).search, path);
  assert.equal(seen.headers.get('x-open-dot-surface'), 'brain');
});

test('edge redirects to the Company Brain keep a supplied conversation id and add none of their own', async () => {
  const { brainInstantRedirect } = await import('./runtime-open-dot.mjs');
  const room = BRAIN + '/dots/dot_company_brain';
  assert.equal(brainInstantRedirect(new Request('https://next.singulancelabs.com/hivemind/app/overview/new?c=conv_abc123')).headers.get('location'), `${room}?c=conv_abc123`);
  assert.equal(brainInstantRedirect(new Request('https://next.singulancelabs.com/hivemind/app/overview/new')).headers.get('location'), room);
  assert.equal(openDotSurfaceRedirect(new Request(BRAIN + '/?c=conv_abc123')).headers.get('location'), `${room}?c=conv_abc123`);
  assert.equal(openDotSurfaceRedirect(new Request(BRAIN + '/dots/dot_other?c=conv_abc123')).headers.get('location'), `${room}?c=conv_abc123`);
  assert.equal(openDotSurfaceRedirect(new Request(RUNTIME_ORIGIN + '/dots/dot_company_brain?c=conv_abc123')).headers.get('location'), `${room}?c=conv_abc123`);
});

test('the legacy autonomy read on the Brain origin is answered from OpenDot, and an empty Needs you list replaces a 404', async () => {
  const seen = [];
  const fetcher = async request => {
    seen.push(new URL(request.url).pathname);
    return new URL(request.url).pathname === '/api/dots/autonomy' ? Response.json({ value: { level: 2, revision: 3 } }) : new Response('nope', { status: 404 });
  };
  const get = path => new Request(`https://brain-runner.singulancelabs.com${path}`, { headers: { cookie: 'hm_cp_session=x' } });
  const dial = await proxyRuntimeOpenDot(get('/api/hivemindHq/autonomyLevel'), fetcher);
  assert.deepEqual(await dial.json(), { ok: true, value: { level: 2, revision: 3 } });
  assert.deepEqual(seen, ['/api/dots/autonomy']);
  const needs = await proxyRuntimeOpenDot(get('/api/hivemind/needs-you'), fetcher);
  assert.equal(needs.status, 200);
  assert.deepEqual(await needs.json(), { version: 1, cards: [] });
  assert.equal(isRuntimeOpenDotRequest(new URL('/api/hivemindHq/autonomyLevel', 'https://runtime-runner.singulancelabs.com')), false);
  const post = await proxyRuntimeOpenDot(new Request('https://brain-runner.singulancelabs.com/api/hivemindHq/autonomyLevel', { method: 'POST', headers: { cookie: 'hm_cp_session=x', origin: 'https://brain-runner.singulancelabs.com' } }), fetcher);
  assert.equal(post.status, 405);
});
