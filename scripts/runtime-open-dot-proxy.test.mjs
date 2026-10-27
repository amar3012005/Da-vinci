import test from 'node:test';
import assert from 'node:assert/strict';
import {isRuntimeOpenDotRequest,proxyRuntimeOpenDot} from '../cloudflare/runtime-open-dot.mjs';
const origin='https://runtime-runner.singulancelabs.com';
const path='/dots/dot_fixture';
const cookie='hm_cp_session=company';
test('only the Runtime origin owns native OpenDot routes; Brain and Harness are unchanged',()=>{
 for(const path of ['/dots/dot_fixture','/employees/976c0a88-8c22-4ea9-9638-d3296db486da','/api/conversations/conv_fixture','/api/cards/msg_a95d9b18-64ce-4dad-9d5a-42ee0445c9c2','/api/dots/dot_fixture/files','/api/dots/dot_fixture/warm','/api/hivemind/voice/events','/?embed=hivemind','/apps?embed=hivemind']) assert.equal(isRuntimeOpenDotRequest(new URL(origin+path)),true,path);
 for(const url of ['https://next.singulancelabs.com/dots/dot_fixture',origin+'/api/remote',origin+'/api/cards/../settings',origin+'/api/cards',origin+'/plugins/events',origin+'/api/hivemind/employees',origin+'/',origin+'/hivemind/app/employee/harness/session/saved',origin+'/api/internal/hivemind/runtime/dispatch',origin+'/api/dots/dot_fixture/warmup']) assert.equal(isRuntimeOpenDotRequest(new URL(url)),false,url);
});
test('authentication and same-origin write checks run before forwarding',async()=>{
 const noFetch=()=>{throw Error('unexpected upstream')};
 assert.equal((await proxyRuntimeOpenDot(new Request(origin+path),noFetch)).status,401);
 for(const headers of [{cookie},{cookie,origin:'https://foreign.example'},{cookie,origin,'sec-fetch-site':'cross-site'}]) assert.equal((await proxyRuntimeOpenDot(new Request(origin+path,{method:'POST',headers,body:'data'}),noFetch)).status,403);
});
test('native actions stream and retain only the company credential and exact Next headers',async()=>{
 let forwarded;
 const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('native-action'));c.close()}});
 const response=await proxyRuntimeOpenDot(new Request(origin+path+'?embed=hivemind',{method:'POST',headers:{cookie:cookie+'; unrelated=secret',origin,authorization:'Bearer secret','x-org-id':'foreign','next-action':'action-identity','content-type':'text/plain'},body,duplex:'half'}),async request=>{forwarded=request;return new Response('delta',{headers:{'set-cookie':'wrong=value','content-type':'text/x-component'}})});
 assert.equal(forwarded.url,'https://dots.singulancelabs.com'+path+'?embed=hivemind');
 assert.equal(forwarded.redirect,'manual');assert.equal(await forwarded.text(),'native-action');
 assert.equal(forwarded.headers.get('cookie'),cookie);assert.equal(forwarded.headers.get('authorization'),null);assert.equal(forwarded.headers.get('x-org-id'),null);assert.equal(forwarded.headers.get('next-action'),'action-identity');
 assert.equal(forwarded.headers.get('origin'),'https://dots.singulancelabs.com');
 assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(await response.text(),'delta');
});
test('native redirects remain on Runtime and cannot redirect to a foreign origin',async()=>{
 for(const location of ['/dots/dot_fixture?embed=hivemind','https://dots.singulancelabs.com/dots/dot_fixture']) {
 const r=await proxyRuntimeOpenDot(new Request(origin+'/employees/976c0a88-8c22-4ea9-9638-d3296db486da',{headers:{cookie}}),async()=>new Response(null,{status:307,headers:{location}}));assert.equal(new URL(r.headers.get('location')).origin,origin);
 }
 const r=await proxyRuntimeOpenDot(new Request(origin+path,{headers:{cookie}}),async()=>new Response(null,{status:307,headers:{location:'https://foreign.example'}}));assert.equal(r.status,502);
});
test('SSE bytes pass through before the stream completes',async()=>{
 let finish;
 const source=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: first\n\n'));finish=()=>c.close()}});
 const response=await proxyRuntimeOpenDot(new Request(origin+'/api/hivemind/voice/events',{headers:{cookie}}),async()=>new Response(source,{headers:{'content-type':'text/event-stream'}}));
 const reader=response.body.getReader();assert.equal(new TextDecoder().decode((await reader.read()).value),'data: first\n\n');finish();assert.equal((await reader.read()).done,true);
});
