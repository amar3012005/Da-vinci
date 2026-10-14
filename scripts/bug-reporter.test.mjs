import assert from 'node:assert/strict';
import test from 'node:test';
import { bugReport, reporterEnabled, withBugReporter } from '../cloudflare/bug-reports.mjs';
import worker from '../cloudflare/worker.mjs';

const origin='https://runtime-runner.singulancelabs.com';
const enabled=()=>({ BUG_REPORTS_ENABLED:'true',BUG_REPORT_FROM:'bugs@example.com',BUG_REPORT_TO:'admin@example.com',
  BUG_REPORT_RATE_LIMITER:{ limit:async()=>({ success:true }) },BUG_REPORT_EMAIL:{ send:async()=>({ messageId:'mock' }) } });
const form=()=>{ const data=new FormData();data.set('remark','The button failed');data.set('path','/hivemind/app/employee/harness?token=secret');data.set('consent','yes');return data; };
const request=(body=form(),headers={})=>new Request(`${origin}/api/hivemind/bug-reports`,{ method:'POST',headers:{ origin,cookie:'hm_cp_session=valid; dsh-auth-runner=secret',...headers },body });
async function authenticated(run) {
  const previous=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{ assert.equal(url,'https://api.singulancelabs.com/v1/bootstrap');assert.equal(options.headers.cookie,'hm_cp_session=valid');assert.equal(options.headers.authorization,undefined);return Response.json({user:{id:'user'},organization:{id:'org'}}); };
  try { await run(); } finally { globalThis.fetch=previous; }
}
test('feature is off until all real binding and address configuration exists',()=>{
  assert.equal(Boolean(reporterEnabled({})),false);
  assert.equal(Boolean(reporterEnabled(enabled())),true);
  assert.equal(Boolean(reporterEnabled({...enabled(),BUG_REPORT_TO:'recipient\nInjected: yes'})),false);
});
test('exact origin, method and company session required before configuration',async()=>{
  assert.equal((await bugReport(request(form(),{origin:'https://evil.example'}),enabled())).status,403);
  assert.equal((await bugReport(request(form(),{cookie:''}),enabled())).status,401);
  assert.equal((await bugReport(new Request(`${origin}/api/hivemind/bug-reports`,{headers:{origin}}),enabled())).status,405);
  assert.equal((await worker.fetch(request(),{})).status,503);
});
test('expired upstream session is denied and no email sent',async()=>{
  const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({}, {status:401});let sent=false;
  try { const env=enabled();env.BUG_REPORT_EMAIL.send=async()=>{sent=true;};assert.equal((await bugReport(request(),env)).status,401);assert.equal(sent,false); }
  finally {globalThis.fetch=previous;}
});
test('fixed recipient, verified actor, escaped HTML, query removal and no cookie forwarding to email',()=>authenticated(async()=>{
  let email,key;const env=enabled();env.BUG_REPORT_EMAIL.send=async value=>{email=value;};env.BUG_REPORT_RATE_LIMITER.limit=async value=>{key=value.key;return{success:true};};
  const data=form();data.set('remark','<script>alert(1)</script>');const response=await bugReport(request(data),env);
  assert.equal(response.status,200);assert.equal(email.to,'admin@example.com');assert.equal(email.from,'bugs@example.com');assert.equal(key,'org:user');assert.ok(email.html.includes('&lt;script&gt;'));assert.ok(!email.text.includes('token=secret'));assert.ok(!email.text.includes('hm_cp_session'));assert.equal(response.headers.get('cache-control'),'private, no-store');
}));
test('enforced rate limit and consent block delivery',()=>authenticated(async()=>{
  const env=enabled();env.BUG_REPORT_RATE_LIMITER.limit=async()=>({success:false});assert.equal((await bugReport(request(),env)).status,429);
  const data=form();data.set('consent','no');assert.equal((await bugReport(request(data),enabled())).status,400);
}));
test('stream cap, duplicate fields and recipient injection rejected',()=>authenticated(async()=>{
  const huge=new Request(`${origin}/api/hivemind/bug-reports`,{method:'POST',headers:{origin,cookie:'hm_cp_session=valid','content-type':'multipart/form-data; boundary=bound'},body:'x'.repeat(3_000_001)});
  assert.equal((await bugReport(huge,enabled())).status,413);
  const dup=form();dup.append('remark','second');assert.equal((await bugReport(request(dup),enabled())).status,400);
  const relay=form();relay.set('to','victim@example.com');assert.equal((await bugReport(request(relay),enabled())).status,400);
}));
test('attachments require matching signature and safe generated filename',()=>authenticated(async()=>{
  const bad=form();bad.set('screenshot',new Blob(['<svg>evil</svg>'],{type:'image/png'}),'fake.png');assert.equal((await bugReport(request(bad),enabled())).status,400);
  const good=form();good.set('screenshot',new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,0])],{type:'image/png'}),'../../bad.png');let email;
  const env=enabled();env.BUG_REPORT_EMAIL.send=async value=>{email=value;};assert.equal((await bugReport(request(good),env)).status,200);assert.equal(email.attachments[0].filename,'screenshot.png');
}));
test('unknown delivery does not automatically retry',()=>authenticated(async()=>{
  let sends=0;const env=enabled();env.BUG_REPORT_EMAIL.send=async()=>{sends++;throw new Error('timeout');};const response=await bugReport(request(),env);
  assert.equal(response.status,502);assert.equal((await response.json()).error,'delivery_unconfirmed_do_not_repeat');assert.equal(sends,1);
}));
test('disabled widget does not change existing response; only enabled app HTML is rewritten',()=>{
  const response=new Response('<body>App</body>',{headers:{'content-type':'text/html'}});
  assert.equal(withBugReporter(response,new Request(`${origin}/hivemind/app/overview/new`),{}),response);
  assert.equal(withBugReporter(response,new Request(`${origin}/static/x.js`),enabled()),response);
  const previous=globalThis.HTMLRewriter;let selector,appended;
  globalThis.HTMLRewriter=class {on(value,handler){selector=value;handler.element({append:(text,options)=>{appended={text,options};}});return this;}transform(value){return value;}};
  try{withBugReporter(response,new Request(`${origin}/hivemind/app/overview/new`),enabled());assert.equal(selector,'body');assert.ok(appended.text.includes('/bug-reporter.js'));assert.equal(appended.options.html,true);}finally{globalThis.HTMLRewriter=previous;}
});
