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
