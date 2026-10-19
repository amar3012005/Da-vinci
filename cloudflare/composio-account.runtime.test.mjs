import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const miniflarePath=require.resolve('miniflare',{paths:[path.dirname(require.resolve('wrangler/package.json'))]});
const {Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(miniflarePath));
test('real Cloudflare runtime: authenticated PKCE callback, MCP validation and two-user isolation',async()=>{
  const source=fs.readFileSync(new URL('./composio-account.mjs',import.meta.url),'utf8');
  let tokenCalls=0;
  const outboundService=async request=>{
    const url=new URL(request.url);
    if(url.pathname==='/v1/bootstrap')return Response.json({authenticated:true,user:{id:request.headers.get('cookie').endsWith('two')?'two':'one'},organization:{id:'org'}});
    if(url.pathname==='/oauth2/register')return Response.json({client_id:'fixture-client'});
    if(url.pathname==='/oauth2/token'){tokenCalls++;return Response.json({access_token:'fixture-user-token',token_type:'Bearer',refresh_token:'fixture-refresh',expires_in:3600});}
    assert.equal(url.href,'https://connect.composio.dev/mcp');assert.equal(request.headers.get('authorization'),'Bearer fixture-user-token');
    const rpc=await request.json();if(!rpc.id)return new Response(null,{status:202});
    return Response.json({jsonrpc:'2.0',id:rpc.id,result:rpc.method==='tools/list'?{tools:[{name:'COMPOSIO_SEARCH_TOOLS'}]}:{protocolVersion:'2025-03-26'}});
  };
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:source+'\nexport default {fetch(request,env){return handleComposioAccount(request,env)}};',compatibilityDate:'2026-08-19',outboundService,bindings:{COMPOSIO_ACCOUNT_ENCRYPTION_KEY:'ab'.repeat(32)},durableObjects:{COMPOSIO_ACCOUNTS:{className:'ComposioAccount',useSQLite:true}}}));
  const call=(action,user='one',init={})=>mf.dispatchFetch('https://next.singulancelabs.com/__hivemind/composio-account/'+action,{redirect:'manual',...init,headers:{cookie:'hm_cp_session='+user,'sec-fetch-site':'same-origin',origin:'https://next.singulancelabs.com',...init.headers}});
  try {
    assert.equal((await call('status')).status,200);
    const started=await call('start','one',{method:'POST',body:JSON.stringify({consent:true})});assert.equal(started.status,200);
    const authorize=new URL((await started.json()).url);assert.equal(authorize.origin,'https://connect.composio.dev');assert.equal(authorize.searchParams.get('code_challenge_method'),'S256');
    const callback=await call('callback?code=fixture-code&state='+authorize.searchParams.get('state'));assert.equal(callback.status,303);assert.equal(callback.headers.get('location'),'/hivemind/app/connectors?composio_account_connected=1');
    assert.equal((await (await call('status')).json()).connected,true);assert.equal((await (await call('status','two')).json()).connected,false);
    const replay=await call('callback?code=fixture-code&state='+authorize.searchParams.get('state'));assert.equal(replay.headers.get('location'),'/hivemind/app/connectors?composio_account_error=1');assert.equal(tokenCalls,1);
  } finally {await mf.dispose();}
});
