import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

function serviceWorker(response) {
  const handlers = {}, calls = [], writes = [];
  vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: {location:{origin:'https://next.singulancelabs.com'},addEventListener:(name,handler)=>{handlers[name]=handler;}},
    URL, Response, fetch:async(...args)=>{calls.push(args);return response;},
    caches:{open:async()=>({put:(...args)=>writes.push(args)}),match:async()=>undefined},
  });
  return {calls,writes,dispatch:async (pathname,mode='navigate')=>{
    let result;
    handlers.fetch({request:{method:'GET',mode,url:`https://next.singulancelabs.com${pathname}`},respondWith:promise=>{result=promise;}});
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
