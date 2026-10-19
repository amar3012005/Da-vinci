import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

function serviceWorker(response, origin='https://next.singulancelabs.com') {
  const handlers = {}, calls = [], writes = [];
  vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: {location:{origin},addEventListener:(name,handler)=>{handlers[name]=handler;},skipWaiting:()=>{}},
    URL, Response, fetch:async(...args)=>{calls.push(args);return response;},
    caches:{open:async()=>({addAll:async urls=>calls.push(['precache',urls]),put:(...args)=>writes.push(args)}),match:async()=>undefined},
  });
  return {calls,writes,install:async()=>{let pending;handlers.install({waitUntil:value=>{pending=value;}});await pending;},dispatch:async (pathname,mode='navigate')=>{
    let result;
    handlers.fetch({request:{method:'GET',mode,url:`${origin}${pathname}`},respondWith:promise=>{result=promise;}});
    await result;
    await Promise.resolve();
  }};
}

test('employee navigation bypasses the service worker and cannot cache a cross-host handoff', async()=>{
  const worker=serviceWorker({});
  await worker.dispatch('/hivemind/app/employee/harness/session/existing');
  assert.equal(worker.calls.length,0);
  assert.equal(worker.writes.length,0);
});

test('private and redirected navigation responses never replace the offline shell', async()=>{
  for (const policy of ['private, no-store','public']) {
    const worker=serviceWorker({status:200,type:'basic',redirected:policy==='public',headers:{get:name=>name==='content-type'?'text/html':policy},clone(){return this;}});
    await worker.dispatch('/hivemind/app/overview');
    assert.equal(worker.writes.length,0);
  }
});

test('authenticated dreamer reads never enter asset caching or offline fallback', async()=>{
  const worker=serviceWorker({status:200});
  for(const endpoint of ['credits?sessionId=existing','connectors','settings','agenda']) {
    await worker.dispatch('/hivemind/dreamer/'+endpoint,'same-origin');
  }
  assert.equal(worker.calls.length,0);
  assert.equal(worker.writes.length,0);
});

test('Runtime never precaches its redirected root or fetches document navigation',async()=>{
  const worker=serviceWorker({},'https://runtime-runner.singulancelabs.com');
  await worker.install();
  assert.equal(worker.calls[0][0],'precache');
  assert.equal(worker.calls[0][1].length,0);
  worker.calls.length=0;
  for(const path of ['/','/hivemind/login','/hivemind/app/employee/harness']) await worker.dispatch(path);
  assert.equal(worker.calls.length,0);
});

test('current native revision bundles use immutable browser cache without shared private storage',async()=>{
 const response={status:200,type:'basic',headers:{get:name=>name==='content-type'?'text/javascript':'public, max-age=31536000, immutable'}};
 const worker=serviceWorker(response,'https://runtime-runner.singulancelabs.com');
 await worker.dispatch('/plugins/??@deepseek-ai/dsh-api-gateway/client.js&rev=2e04b1b28f932209-0','same-origin');
 assert.equal(worker.calls.length,1);
 assert.equal(worker.calls[0][1].cache,'default');
 assert.equal(worker.writes.length,0);
});
