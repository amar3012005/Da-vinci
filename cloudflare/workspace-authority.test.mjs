import assert from 'node:assert/strict';
import test from 'node:test';
import { finalDocumentHref, workspaceDocumentRedirect } from '../src/components/hivemind/app/shared/workspace-authority.mjs';

const NEXT = 'https://next.singulancelabs.com';
const RUNTIME = 'https://runtime-runner.singulancelabs.com';
const ROOM = '/hivemind/app/employee/dots/employee/11111111-1111-4111-8111-111111111111';

test('a Brain link on the Runtime host is one redirect to the final new-chat URL', () => {
  assert.equal(workspaceDocumentRedirect(`${RUNTIME}/hivemind/app/overview`), `${NEXT}/hivemind/app/overview/new`);
  assert.equal(workspaceDocumentRedirect(`${RUNTIME}/hivemind/app/overview/`), `${NEXT}/hivemind/app/overview/new`);
  assert.equal(workspaceDocumentRedirect(`${RUNTIME}/hivemind/app/overview/session/abc?x=1`), `${NEXT}/hivemind/app/overview/session/abc?x=1`);
  assert.equal(workspaceDocumentRedirect(`${RUNTIME}/`), `${NEXT}/hivemind/app/overview/new`);
});

test('the owning host answers without a redirect', () => {
  assert.equal(workspaceDocumentRedirect(`${NEXT}/hivemind/app/overview`), null);
  assert.equal(workspaceDocumentRedirect(`${NEXT}/hivemind/app/overview/new`), null);
  assert.equal(workspaceDocumentRedirect(`${RUNTIME}/hivemind/app/employee/harness`), null);
  assert.equal(workspaceDocumentRedirect(`${RUNTIME}${ROOM}`), null);
});

test('an employee page on the Brain host moves once to the Runtime host, never across companies', () => {
  assert.equal(workspaceDocumentRedirect(`${NEXT}${ROOM}?c=1`), `${RUNTIME}${ROOM}?c=1`);
  assert.equal(workspaceDocumentRedirect(`https://other.example${ROOM}`), null);
});

test('finalDocumentHref returns the owning host so following a link needs no redirect', () => {
  assert.equal(finalDocumentHref(`${NEXT}${ROOM}`, `${NEXT}/hivemind/app/overview/new`), `${RUNTIME}${ROOM}`);
  assert.equal(finalDocumentHref(ROOM, `${NEXT}/hivemind/app/overview/new`), `${RUNTIME}${ROOM}`);
  assert.equal(finalDocumentHref(`${NEXT}/hivemind/app/overview/session/s1`, `${NEXT}/x`), `${NEXT}/hivemind/app/overview/session/s1`);
  assert.equal(finalDocumentHref(ROOM, `${RUNTIME}/hivemind/app/employee/harness`), `${RUNTIME}${ROOM}`);
  assert.equal(finalDocumentHref('https://example.com/a', `${NEXT}/x`), 'https://example.com/a');
});
