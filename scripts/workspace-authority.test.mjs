import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceDocumentRedirect, runtimeLoginUrl, trustedRuntimeReturn, RUNTIME_ORIGIN, MAIN_ORIGIN } from '../src/components/hivemind/app/shared/workspace-authority.mjs';
test('top-level employee documents and Brain belong to next; native transport stays isolated', () => {
  for (const path of ['/hivemind/login','/hivemind/app/overview/new','/hivemind/app/usage','/hivemind/app/employee/harness','/hivemind/app/employee/dots/abc']) assert.equal(workspaceDocumentRedirect(RUNTIME_ORIGIN+path),MAIN_ORIGIN+path);
  for (const path of ['/api/hivemind/boot','/static/js/main.js','/hivemind/apps/connected']) assert.equal(workspaceDocumentRedirect(RUNTIME_ORIGIN+path),null);
});
test('sign in preserves only a validated HyperAgent destination without nested native pane', () => {
 const login=new URL(runtimeLoginUrl(RUNTIME_ORIGIN+'/hivemind/app/employee/harness/session/abc?native_pane=1'));
 assert.equal(login.origin,MAIN_ORIGIN);
 assert.equal(trustedRuntimeReturn(login.search),MAIN_ORIGIN+'/hivemind/app/employee/harness/session/abc?auth=callback');
 for(const target of ['https://evil.test/hivemind/app/employee/harness',RUNTIME_ORIGIN+'/hivemind/app/overview/new', 'not a URL']) assert.equal(trustedRuntimeReturn('?runtime_return_to='+encodeURIComponent(target)),null);
});

test('native dreamer APIs never redirect authenticated requests across origins', () => {
 for (const endpoint of ['credits', 'connectors', 'settings', 'agenda']) {
   assert.equal(workspaceDocumentRedirect(RUNTIME_ORIGIN + '/hivemind/dreamer/' + endpoint + '?session=test'), null);
 }
 assert.equal(workspaceDocumentRedirect(RUNTIME_ORIGIN + '/hivemind/future-transport'), null);
});

test('embedded Runtime clients keep their owning origin without a shell redirect loop', () => {
 const path=RUNTIME_ORIGIN+'/hivemind/app/employee/harness/session/saved';
 assert.equal(workspaceDocumentRedirect(path+'?native_pane=1'),null);
 assert.equal(workspaceDocumentRedirect(path,{embedded:true}),null);
 assert.equal(workspaceDocumentRedirect(path+'?employee=owned#context'),MAIN_ORIGIN+'/hivemind/app/employee/harness/session/saved?employee=owned#context');
});
