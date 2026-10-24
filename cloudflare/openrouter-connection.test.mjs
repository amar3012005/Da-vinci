import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyModelConnection } from './model-connection.mjs';
test('OpenRouter callback uses authenticated fixed-origin JSON transport', async () => {
 const previous = globalThis.fetch;
 globalThis.fetch = async (url, options) => {
  assert.equal(String(url), 'https://runtime-runner-origin.singulancelabs.com/api/hivemind/model-connection/openrouter/callback');
  assert.equal(options.headers.get('cookie'), 'hm_cp_session=test');
  assert.equal(options.headers.get('accept'), 'application/json');
  return Response.json({ connected: true });
 };
 try {
  const response = await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/openrouter/callback', { method: 'POST', headers: { origin: 'https://next.singulancelabs.com', cookie: 'irrelevant=excluded; hm_cp_session=test', 'content-type': 'application/json' }, body: JSON.stringify({ code: 'one-use', state: 'bound-state' }) }), {});
  assert.equal(response.status, 200);
 } finally { globalThis.fetch = previous; }
});
test('OpenRouter transport rejects foreign origins, arbitrary actions and missing auth', async () => {
 assert.equal((await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/openrouter/select', { method: 'POST', headers: { origin: 'https://attacker.example' } }), {})).status, 403);
 assert.equal((await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/openrouter/stream'), {})).status, 404);
 assert.equal((await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/openrouter/status'), {})).status, 401);
});
test('top-level OAuth callback exchanges server-side and redirects without codes', async () => {
 const previous = globalThis.fetch;
 globalThis.fetch = async (_url, options) => {
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.get('origin'), 'https://next.singulancelabs.com');
  assert.equal(JSON.parse(options.body).code, 'one-use-code');
  return Response.json({ connected: true });
 };
 try {
  const response = await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/openrouter/callback?code=one-use-code&state='+ 's'.repeat(43), { headers: { cookie: 'hm_cp_session=test', 'sec-fetch-site': 'cross-site' } }), {});
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/hivemind/app/ai-models?openrouter_connected=1');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
 } finally { globalThis.fetch = previous; }
});
test('Brain model connection stays on Brain and preserves its native admission cookie', async () => {
 const previous = globalThis.fetch;
 globalThis.fetch = async (url, options) => {
  assert.equal(String(url), 'https://harness-chat-origin.singulancelabs.com/api/hivemind/model-connection/status');
  assert.equal(options.headers.get('cookie'), 'hm_cp_session=member; native_session=admitted');
  assert.equal(options.headers.get('x-forwarded-host'), 'next.singulancelabs.com');
  return Response.json({ available:false, connected:false });
 };
 try {
  const response = await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/status', { headers:{cookie:'hm_cp_session=member; native_session=admitted'} }), {});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(), {available:false,connected:false});
 } finally { globalThis.fetch=previous; }
});
test('Runtime retains its owner and arbitrary Brain origins are rejected', async () => {
 const previous=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  assert.equal(new URL(url).origin,'https://runtime-runner-origin.singulancelabs.com');
  assert.equal(options.headers.get('cookie'),'hm_cp_session=member');
  return Response.json({connected:false});
 };
 try {
  const headers={cookie:'hm_cp_session=member; native_session=admitted'};
  assert.equal((await proxyModelConnection(new Request('https://runtime-runner.singulancelabs.com/api/hivemind/model-connection/status',{headers}),{})).status,200);
  assert.equal((await proxyModelConnection(new Request('https://next.singulancelabs.com/api/hivemind/model-connection/status',{headers}),{RUNNER_ORIGIN:'https://attacker.example'})).status,503);
 } finally {globalThis.fetch=previous;}
});
test('Runtime Dark mode switch is forwarded as same-origin JSON; OpenRouter has no Dark mode action', async () => {
 const previous=globalThis.fetch;let forwarded;
 globalThis.fetch=async(url,options)=>{forwarded={url:new URL(url),method:options.method,body:new TextDecoder().decode(options.body)};return Response.json({dark_mode:{eligible:true,enabled:true}});};
 try {
  const origin='https://runtime-runner.singulancelabs.com';
  const response=await proxyModelConnection(new Request(origin+'/api/hivemind/model-connection/dark-mode',{method:'POST',headers:{origin,cookie:'hm_cp_session=member','content-type':'application/json'},body:JSON.stringify({enabled:true})}),{});
  assert.equal(response.status,200);
  assert.equal(forwarded.url.href,'https://runtime-runner-origin.singulancelabs.com/api/hivemind/model-connection/dark-mode');
  assert.equal(forwarded.method,'POST');assert.equal(forwarded.body,'{"enabled":true}');
  assert.equal((await proxyModelConnection(new Request(origin+'/api/hivemind/model-connection/dark-mode',{method:'POST',headers:{origin:'https://attacker.example',cookie:'hm_cp_session=member','content-type':'application/json'},body:'{}'}),{})).status,403);
  assert.equal((await proxyModelConnection(new Request(origin+'/api/hivemind/model-connection/dark-mode',{headers:{cookie:'hm_cp_session=member'}}),{})).status,405);
  assert.equal((await proxyModelConnection(new Request(origin+'/api/hivemind/model-connection/openrouter/dark-mode',{method:'POST',headers:{origin,cookie:'hm_cp_session=member','content-type':'application/json'},body:'{}'}),{})).status,404);
 } finally {globalThis.fetch=previous;}
});
