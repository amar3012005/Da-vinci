import test from 'node:test';
import assert from 'node:assert/strict';
import { clearSessionCache, gateWorkspaceDocument } from './account-mode-access.mjs';

const env = {
  ACCOUNT_MODE_ACCESS: { idFromName: name => name, get: () => ({ fetch: async () => Response.json({ enabled: true }) }) },
  FLAGS: { getBooleanValue: async () => true },
};
const page = cookie => new Request('https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness', { headers: { cookie } });

test('session identities are reused briefly per cookie, never across cookies or after rejection', async () => {
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    const cookie = options.headers.cookie;
    calls.push(cookie);
    if (cookie === 'hm_cp_session=rejected') return new Response(null, { status: 401 });
    return Response.json({ authenticated: true, user: { id: cookie.slice(-1), email: `${cookie.slice(-1)}@example.com` } });
  };
  clearSessionCache();
  try {
    await Promise.all([gateWorkspaceDocument(page('hm_cp_session=a'), env), gateWorkspaceDocument(page('hm_cp_session=a'), env)]);
    await gateWorkspaceDocument(page('hm_cp_session=a'), env);
    assert.deepEqual(calls, ['hm_cp_session=a']);
    await gateWorkspaceDocument(page('hm_cp_session=b'), env);
    await gateWorkspaceDocument(page('hm_cp_session=rejected'), env);
    await gateWorkspaceDocument(page('hm_cp_session=rejected'), env);
    assert.deepEqual(calls, ['hm_cp_session=a', 'hm_cp_session=b', 'hm_cp_session=rejected', 'hm_cp_session=rejected']);
  } finally { globalThis.fetch = realFetch; clearSessionCache(); }
});

test('sessionUser tries every hm_cp_session cookie, so a stale one first does not cause a 401', async () => {
  const realFetch = globalThis.fetch;
  const { sessionUser } = await import('./account-mode-access.mjs');
  globalThis.fetch = async (_url, options) => options.headers.cookie === 'hm_cp_session=stale'
    ? new Response(null, { status: 401 }) : Response.json({ authenticated: true, user: { id: 'u', email: 'u@example.com' } });
  clearSessionCache();
  try {
    const request = cookie => new Request('https://x.example/', { headers: { cookie } });
    assert.equal((await sessionUser(request('hm_cp_session=stale; hm_cp_session=good'))).id, 'u');
    assert.equal(await sessionUser(request('hm_cp_session=stale')), null);
    assert.equal(await sessionUser(request('other=1')), null);
  } finally { globalThis.fetch = realFetch; clearSessionCache(); }
});
