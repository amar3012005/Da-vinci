/** Hosted Composio MCP account enrollment. No toolkit execution or shared API-key fallback. */
const BASE = '/__hivemind/composio-account/';
const MCP = 'https://connect.composio.dev/mcp';
const AUTH = 'https://connect.composio.dev/oauth/authorize';
const TOKEN = 'https://login.composio.dev/oauth2/token';
const REGISTER = 'https://login.composio.dev/oauth2/register';
const encoder = new TextEncoder();
const headers = { 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' };
const reply = (value, status = 200) => Response.json(value, { status, headers });
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const un64 = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
async function jsonFetch(url, init) {
  const response = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 400 ? 'composio_reconnect_required' : 'composio_temporarily_unavailable');
  const text = await boundedText(response);
  return JSON.parse(text);
}
async function boundedText(response) {
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 262144) { await reader.cancel(); throw new Error('composio_response_too_large'); } chunks.push(part.value); } } finally { reader.releaseLock(); }
  const out = new Uint8Array(size); let offset=0; for (const chunk of chunks) { out.set(chunk,offset); offset+=chunk.length; }
  return new TextDecoder().decode(out);
}
export class ComposioAccount {
  constructor(ctx, env) { this.ctx=ctx; this.env=env; this.queue=Promise.resolve(); }
  fetch(request) { const run=this.queue.then(()=>this.handle(request)); this.queue=run.catch(()=>{}); return run; }
  async key() {
    const value=this.env.COMPOSIO_ACCOUNT_ENCRYPTION_KEY;
    if (!/^[a-f0-9]{64}$/.test(value || '')) throw new Error('composio_not_configured');
    return crypto.subtle.importKey('raw',Uint8Array.from(value.match(/../g),v=>parseInt(v,16)), 'AES-GCM',false,['encrypt','decrypt']);
  }
  async read() {
    const record=await this.ctx.storage.get('account'); if (!record) return {};
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(record.iv),additionalData:encoder.encode(this.ctx.id.toString())},await this.key(),un64(record.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async write(value) {
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(this.ctx.id.toString())},await this.key(),encoder.encode(JSON.stringify(value)));
    await this.ctx.storage.put('account',{iv:b64(iv),data:b64(new Uint8Array(data))});
  }
  async validate(accessToken) {
    let session;
    const rpc=async (method,params,id) => {
      const h={'content-type':'application/json',accept:'application/json, text/event-stream',authorization:`Bearer ${accessToken}`,'mcp-protocol-version':'2025-03-26'};
      if(session) h['mcp-session-id']=session;
      const response=await fetch(MCP,{method:'POST',headers:h,body:JSON.stringify({jsonrpc:'2.0',...(id ? {id}:{}),method,params}),redirect:'error',signal:AbortSignal.timeout(10000)});
      if(!response.ok) throw new Error('composio_connection_unconfirmed');
      session=response.headers.get('mcp-session-id') || session;
      if(!id) {await response.body?.cancel();return;}
      let value;
      if(response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader=response.body.getReader(), decoder=new TextDecoder(); let buffer='',size=0;
        try { for (;;) {
          const chunk=await reader.read(); if(chunk.done) break; size+=chunk.value.length;
          if(size>262144) throw new Error('composio_response_too_large');
          buffer+=decoder.decode(chunk.value,{stream:true});
          const lines=buffer.split('\n');buffer=lines.pop();
          for(const line of lines) { if(!line.startsWith('data:')) continue; let parsed;try{parsed=JSON.parse(line.slice(5));}catch{continue;} if(parsed?.id===id){value=parsed;break;} }
          if(value) break;
        } } finally { await reader.cancel();reader.releaseLock(); }
      } else value=JSON.parse(await boundedText(response));
      if(value?.error || !value?.result) throw new Error('composio_connection_unconfirmed');
      return value.result;
    };
    await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'HIVEMIND Connectors',version:'1.0.0'}},1);
    await rpc('notifications/initialized',{});
    const result=await rpc('tools/list',{},2);
    if(!Array.isArray(result.tools) || !result.tools.some(tool=>tool.name==='COMPOSIO_SEARCH_TOOLS')) throw new Error('composio_connection_unconfirmed');
    return result.tools.length;
  }
  async handle(request) {
    try {
      await this.key();
      const {action,origin,code,state,consent}=await request.json();
      const account=await this.read();
      if(action==='status' && account.token && account.refresh && account.expiresAt<=Date.now()+60000) {
        try {
          const result=await jsonFetch(TOKEN,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:account.refresh,client_id:account.client.id,resource:MCP})});
          if(typeof result.access_token!=='string' || result.token_type?.toLowerCase()!=='bearer') throw new Error('composio_reconnect_required');
          Object.assign(account,{token:result.access_token,refresh:result.refresh_token || account.refresh,expiresAt:Date.now()+Math.max(0,Number(result.expires_in)||3600)*1000});
          await this.write(account);
        } catch(error) { if(error.message!=='composio_reconnect_required') throw error; account.expiresAt=0; await this.write(account); }
      }
      if(action==='status') return reply({connected:!!account.token,provider:'composio-connect',verifiedAt:account.verifiedAt || null,toolCount:account.toolCount || 0,expired:!!account.token && account.expiresAt<=Date.now(),executionEnabled:false});
      if(action==='disconnect') {
        await this.ctx.storage.delete('account');
        return reply({connected:false,credentialsRemoved:true,providerRevocation:'not_supported',message:'HIVEMIND credentials removed. Remove the HIVEMIND authorization in Composio to revoke it there too.'});
      }
      if(action==='start') {
        if(consent!==true) return reply({error:'consent_required'},400);
        const redirect=`${origin}${BASE}callback`;
        let client=account.client;
        if(!client || client.redirect!==redirect) {
          const registration=await jsonFetch(REGISTER,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client_name:'HIVEMIND Connectors',redirect_uris:[redirect],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none'})});
          if(typeof registration.client_id!=='string' || registration.client_secret) throw new Error('composio_registration_unsupported');
          client={id:registration.client_id,redirect};
        }
        const verifier=random(), nextState=random();
        const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))));
        await this.write({...account,client,pending:{verifier,state:nextState,expires:Date.now()+600000}});
        const url=new URL(AUTH); for(const [k,v] of Object.entries({client_id:client.id,redirect_uri:redirect,response_type:'code',scope:'openid profile email offline_access',state:nextState,code_challenge:challenge,code_challenge_method:'S256',resource:MCP})) url.searchParams.set(k,v);
        return reply({url:url.toString()});
      }
      if(action==='callback') {
        const pending=account.pending;
        if(!pending || pending.state!==state || pending.expires<=Date.now() || account.client?.redirect!==`${origin}${BASE}callback` || typeof code!=='string' || !code || code.length>4096) return reply({error:'invalid_oauth_callback'},400);
        delete account.pending; await this.write(account); // Claim before exchange; never replay uncertain authorization codes.
        const result=await jsonFetch(TOKEN,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:account.client.id,redirect_uri:account.client.redirect,code_verifier:pending.verifier,resource:MCP})});
        if(typeof result.access_token!=='string' || result.token_type?.toLowerCase()!=='bearer') throw new Error('composio_connection_unconfirmed');
        const toolCount=await this.validate(result.access_token);
        await this.write({...account,token:result.access_token,refresh:result.refresh_token,expiresAt:Date.now()+Math.max(0,Number(result.expires_in)||3600)*1000,verifiedAt:new Date().toISOString(),toolCount});
        return reply({connected:true,toolCount});
      }
      return reply({error:'not_found'},404);
    } catch(error) { return reply({error:/^composio_[a-z_]+$/.test(error.message) ? error.message : 'composio_connection_unavailable'},503); }
  }
}
export async function handleComposioAccount(request,env) {
  const url=new URL(request.url); if(!url.pathname.startsWith(BASE)) return null;
  const action=url.pathname.slice(BASE.length);
  if(!['https://next.singulancelabs.com','https://runtime-runner.singulancelabs.com'].includes(url.origin)) return reply({error:'origin_denied'},403);
  if(!['start','status','callback','disconnect'].includes(action)) return reply({error:'not_found'},404);
  const callback=action==='callback';
  if(request.method!==(callback || action==='status'?'GET':'POST')) return reply({error:'method_not_allowed'},405);
  if(!callback && ((request.headers.get('origin') && request.headers.get('origin')!==url.origin) || (request.method==='POST' && request.headers.get('origin')!==url.origin) || request.headers.get('sec-fetch-site')==='cross-site')) return reply({error:'origin_denied'},403);
  const cookie=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('hm_cp_session='));
  if(!cookie) return reply({error:'authentication_required'},401);
  try {
    const identity=await jsonFetch('https://api.singulancelabs.com/v1/bootstrap',{headers:{cookie,accept:'application/json'}});
    if(identity.authenticated!==true || !identity.user?.id || !identity.organization?.id) return reply({error:'workspace_authentication_required'},401);
    if(!env.COMPOSIO_ACCOUNTS || !env.COMPOSIO_ACCOUNT_ENCRYPTION_KEY) return reply({error:'composio_not_configured'},503);
    const input={action,origin:url.origin};
    if(action==='start') { if(request.headers.get('content-length')>1024) return reply({error:'request_too_large'},413); const text=await request.text(); if(text.length>1024)return reply({error:'request_too_large'},413); input.consent=JSON.parse(text).consent; }
    if(callback) { input.code=url.searchParams.get('code'); input.state=url.searchParams.get('state'); }
    const id=env.COMPOSIO_ACCOUNTS.idFromName(JSON.stringify([identity.organization.id,identity.user.id]));
    const response=await env.COMPOSIO_ACCOUNTS.get(id).fetch('https://composio-account/',{method:'POST',body:JSON.stringify(input)});
    if(callback) { await response.body?.cancel(); return new Response(null,{status:303,headers:{...headers,location:`/hivemind/app/connectors?composio_account_${response.ok?'connected':'error'}=1`}}); }
    return response;
  } catch { return reply({error:'composio_connection_unavailable'},503); }
}
