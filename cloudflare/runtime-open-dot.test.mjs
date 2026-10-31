import assert from 'node:assert/strict';
import test from 'node:test';
import { isRuntimeOpenDotRequest } from './runtime-open-dot.mjs';

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
