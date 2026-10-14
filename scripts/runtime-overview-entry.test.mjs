import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';
const runtime = 'https://runtime-runner.singulancelabs.com';
test('bare Runtime overview resolves straight to same-host native Runtime entry', async () => {
  for (const method of ['GET','HEAD']) {
    const response = await worker.fetch(new Request(`${runtime}/hivemind/app/overview?source=entry`,{method}),{RUNTIME_RUNNER_PUBLIC_ORIGIN:runtime});
    assert.equal(response.status,307);
    assert.equal(response.headers.get('location'),`${runtime}/hivemind/app/employee/harness?source=entry`);
    assert.match(response.headers.get('cache-control'),/no-store/);
  }
});
test('historical Brain session links retain their Next host ownership', async () => {
  const response = await worker.fetch(new Request(`${runtime}/hivemind/app/overview/session/session-saved`),{RUNTIME_RUNNER_PUBLIC_ORIGIN:runtime});
  assert.match(await response.text(),/https:\/\/next.singulancelabs.com\/hivemind\/app\/overview\/session\/session-saved/);
});
