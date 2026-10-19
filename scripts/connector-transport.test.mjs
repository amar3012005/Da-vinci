import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proxyConnectorTransport } from '../cloudflare/connector-transport.mjs';
const origin='https://runtime-runner.singulancelabs.com';
const request=(suffix='github/connect',headers={},body='{}')=>new Request(origin+'/__hivemind/connectors/composio/'+suffix,{method:'POST',headers:{origin,cookie:'hm_cp_session=test; secret=never','content-type':'application/json',...headers},body});
test('uses fixed authenticated upstream and retains readable upstream errors',async()=>{
 const before=globalThis.fetch;
 try { globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.singulancelabs.com/v1/connectors/composio/github/connect');assert.equal(options.headers.cookie,'hm_cp_session=test');assert.equal(options.redirect,'manual');return Response.json({error:'specific_auth_requirement'},{status:400});};
 const response=await proxyConnectorTransport(request());assert.equal(response.status,400);assert.deepEqual(await response.json(),{error:'specific_auth_requirement'});assert.equal(response.headers.get('cache-control'),'private, no-store');
 } finally {globalThis.fetch=before;}
});
test('denies cross-origin, unknown routes and missing credentials before dispatch',async()=>{
 assert.equal((await proxyConnectorTransport(request('github/connect',{origin:'https://evil.test'}))).status,403);
 assert.equal((await proxyConnectorTransport(request('github/connect',{cookie:''}))).status,401);
 assert.equal((await proxyConnectorTransport(request('../admin'))).status,405);
 assert.equal((await proxyConnectorTransport(request('github/connect',{},'x'.repeat(17000)))).status,413);
});
test('outages and redirects never become successful connection responses',async()=>{
 const before=globalThis.fetch;try {
 globalThis.fetch=async()=>{throw Error('offline')};assert.equal((await proxyConnectorTransport(request())).status,503);
 globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'https://other.test'}});assert.equal((await proxyConnectorTransport(request())).status,502);
 }finally{globalThis.fetch=before;}
});
