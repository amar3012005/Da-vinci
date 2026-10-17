import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceDocumentRedirect, runtimeLoginUrl, trustedRuntimeReturn, RUNTIME_ORIGIN, MAIN_ORIGIN } from '../src/components/hivemind/app/shared/workspace-authority.mjs';
test('only employee documents stay on runtime; login and Brain belong to next', () => {
  for (const path of ['/hivemind/login','/hivemind/app/overview/new','/hivemind/app/usage']) assert.equal(workspaceDocumentRedirect(RUNTIME_ORIGIN+path),MAIN_ORIGIN+path);
  for (const path of ['/hivemind/app/employee/harness','/hivemind/app/employee/dots/abc','/api/hivemind/boot','/static/js/main.js','/hivemind/apps/connected']) assert.equal(workspaceDocumentRedirect(RUNTIME_ORIGIN+path),null);
});
test('sign in preserves only a validated HyperAgent destination without nested native pane', () => {
 const login=new URL(runtimeLoginUrl(RUNTIME_ORIGIN+'/hivemind/app/employee/harness/session/abc?native_pane=1'));
 assert.equal(login.origin,MAIN_ORIGIN);
 assert.equal(trustedRuntimeReturn(login.search),RUNTIME_ORIGIN+'/hivemind/app/employee/harness/session/abc?auth=callback');
 for(const target of ['https://evil.test/hivemind/app/employee/harness',RUNTIME_ORIGIN+'/hivemind/app/overview/new', 'not a URL']) assert.equal(trustedRuntimeReturn('?runtime_return_to='+encodeURIComponent(target)),null);
});
