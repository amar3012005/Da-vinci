import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountModeAccess, evaluateModeAccess, handleModeAccess, gateWorkspaceDocument, MODE_ACCESS_FLAG } from '../cloudflare/account-mode-access.mjs';
const grants = () => {
 const records = new Map();
 return { records, binding: { idFromName: key => key, get: key => ({ fetch: (url, options) => new AccountModeAccess({ storage: { get: async () => records.get(key), put: async (_, value) => records.set(key, value) } }).fetch(new Request(url, options)) }) } };
};
const env = store => ({ ACCOUNT_MODE_ACCESS: store.binding, FLAGS: { getBooleanValue: async (key, fallback, context) => {
 assert.equal(key, MODE_ACCESS_FLAG); assert.equal(fallback, false);
 return !context.admin_denied && (context.admin_granted || ['amarsai2005@gmail.com', 'support@singulancelabs.com'].includes(context.email));
} } });
test('default off, two seeded accounts, explicit revocation wins, grants stay per account', async () => {
 const store=grants(), config=env(store);
 assert.equal(await evaluateModeAccess(config,'AMARSAI2005@gmail.com'),true);
 assert.equal(await evaluateModeAccess(config,'support@singulancelabs.com'),true);
 assert.equal(await evaluateModeAccess(config,'other@example.com'),false);
 const original=globalThis.fetch;
 globalThis.fetch=async () => Response.json({users:[]});
 try {
  const request=(email,enabled)=>new Request('https://admin.hivemind.singulancelabs.com/__hivemind/admin/account-mode-access',{method:'POST',headers:{origin:'https://admin.hivemind.singulancelabs.com',cookie:'hm_platform_admin=verified','content-type':'application/json'},body:JSON.stringify({email,enabled})});
  assert.equal((await handleModeAccess(request('amarsai2005@gmail.com',false),config)).status,200);
  assert.equal(await evaluateModeAccess(config,'amarsai2005@gmail.com'),false);
  await handleModeAccess(request('other@example.com',true),config);
  assert.equal(await evaluateModeAccess(config,'other@example.com'),true);
  assert.equal(await evaluateModeAccess(config,'third@example.com'),false);
 } finally { globalThis.fetch=original; }
});
test('request-supplied email cannot impersonate eligible account', async () => {
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({authenticated:true,user:{id:'ordinary',email:'other@example.com'}});
 try {
  const result=await handleModeAccess(new Request('https://next.singulancelabs.com/__hivemind/account-mode-access?email=amarsai2005@gmail.com',{headers:{cookie:'hm_cp_session=ordinary'}}),env(grants()));
  assert.deepEqual(await result.json(),{enabled:false});
 } finally {globalThis.fetch=original;}
});
test('admin API denies missing session, wrong host and cross-origin writes',async()=>{
 const config=env(grants());
 for(const [host,origin,cookie,expected] of [
  ['admin.hivemind.singulancelabs.com','https://evil.example','hm_platform_admin=x',403],
  ['next.singulancelabs.com','https://next.singulancelabs.com','hm_platform_admin=x',401],
  ['admin.hivemind.singulancelabs.com','https://admin.hivemind.singulancelabs.com','',401],
 ]) {
  const result=await handleModeAccess(new Request(`https://${host}/__hivemind/admin/account-mode-access`,{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:'{"email":"other@example.com","enabled":true}'}),config);
  assert.equal(result.status,expected);
 }
});
test('flag/store failure is unavailable and denied workspace links stay on their route',async()=>{
 await assert.rejects(evaluateModeAccess({},'amarsai2005@gmail.com'),/account_mode_access_unavailable/);
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({authenticated:true,user:{id:'ordinary',email:'other@example.com'}});
 try {
  for(const path of ['/hivemind/app/employee/harness','/hivemind/app/employee/dots/employee/test','/hivemind/app/tara']) {
   const result=await gateWorkspaceDocument(new Request('https://runtime-runner.singulancelabs.com'+path,{headers:{cookie:'hm_cp_session=x'}}),env(grants()));
   assert.equal(result.status,403);assert.equal(result.headers.get('location'),null);
  }
 } finally {globalThis.fetch=original;}
});
test('grant persists across object recreation',async()=>{
 const state=new Map();const ctx={storage:{get:async key=>state.get(key),put:async(key,value)=>state.set(key,value)}};
 await new AccountModeAccess(ctx).fetch(new Request('https://grant/',{method:'PUT',body:JSON.stringify({enabled:true,operator:'admin'})}));
 assert.equal((await(await new AccountModeAccess(ctx).fetch(new Request('https://grant/'))).json()).enabled,true);
});
test('admin proxy keeps host-only cookie server-verified and rejects cross-origin writes',async()=>{
 const {proxyPlatformAdmin}=await import('../cloudflare/account-mode-access.mjs');
 const original=globalThis.fetch;let outbound;
 globalThis.fetch=async(url,options)=>{outbound={url:String(url),options};return new Response('{}',{headers:{'set-cookie':'hm_platform_admin=opaque; HttpOnly; Secure; Path=/; SameSite=Strict'}});};
 try {
  const response=await proxyPlatformAdmin(new Request('https://admin.hivemind.singulancelabs.com/admin/api/platform/unlock',{method:'POST',headers:{origin:'https://admin.hivemind.singulancelabs.com','content-type':'application/json'},body:'{"passcode":"test"}'}));
  assert.equal(outbound.url,'https://api.singulancelabs.com/admin/api/platform/unlock');
  assert.match(response.headers.get('set-cookie'),/HttpOnly/);
  const denied=await proxyPlatformAdmin(new Request('https://admin.hivemind.singulancelabs.com/admin/api/platform/unlock',{method:'POST',headers:{origin:'https://evil.example'},body:'{}'}));
  assert.equal(denied.status,403);
 } finally {globalThis.fetch=original;}
});

test('upstream access failure returns 503 without fabricating a denial or redirect', async () => {
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({authenticated:true,user:{id:'owner',email:'amarsai2005@gmail.com'}});
 try {
  const request=new Request('https://runtime-runner.singulancelabs.com/__hivemind/account-mode-access',{headers:{cookie:'hm_cp_session=x'}});
  const result=await handleModeAccess(request,{});
  assert.equal(result.status,503);assert.deepEqual(await result.json(),{error:'account_mode_access_unavailable'});
  const document=await gateWorkspaceDocument(new Request('https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness',{headers:{cookie:'hm_cp_session=x'}}),{});
  assert.equal(document.status,503);assert.equal(document.headers.get('location'),null);
 } finally {globalThis.fetch=original;}
});

test('company onboarding and Brain bypass optional mode lookup even when the flag service is unavailable',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('must not gate onboarding')};
 try{for(const host of ['next.singulancelabs.com','runtime-runner.singulancelabs.com'])for(const path of ['/hivemind/app/employees/mycompany','/hivemind/app/employees/mycompany/','/hivemind/app/employees','/hivemind/app/overview/new','/hivemind/app/overview/session/saved'])assert.equal(await gateWorkspaceDocument(new Request('https://'+host+path),{}),null);assert.equal(calls,0)}finally{globalThis.fetch=original}
});
test('lookalike onboarding links do not bypass restricted agent routes',async()=>{
 const {requiresWorkspaceModeAccess}=await import('../src/components/hivemind/app/shared/workspace-mode-policy.mjs');
 for(const path of ['/hivemind/app/employees/mycompany/agents','/hivemind/app/employees/mycompany-other','/hivemind/app/employee/harness','/hivemind/app/employee/dots','/hivemind/app/tara'])assert.equal(requiresWorkspaceModeAccess(path),true);
});
