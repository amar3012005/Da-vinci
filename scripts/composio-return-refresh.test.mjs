import assert from 'node:assert/strict';
import test from 'node:test';
import { refreshComposioReturn } from '../src/components/hivemind/app/pages/composio-return-refresh.mjs';

test('OAuth return reconciles authenticated accounts before checking provider-backed toolkit state', async () => {
  const calls = [];
  const api = {
    async listOAuthConnectors() { calls.push('accounts'); },
    async listComposioToolkits(args) { calls.push(args); return { toolkits: [{ slug: 'googlesheets', connected: true }] }; },
  };
  assert.equal(await refreshComposioReturn(api, 'googlesheets'), true);
  assert.deepEqual(calls, ['accounts', { search: 'googlesheets', limit: 24 }]);
});

test('query success cannot establish connection without exact verified toolkit', async () => {
  for (const toolkits of [[], [{ slug: 'other', connected: true }], [{ slug: 'googlesheets', connected: false }]]) {
    assert.equal(await refreshComposioReturn({ async listOAuthConnectors() {}, async listComposioToolkits() { return { toolkits }; } }, 'googlesheets'), false);
  }
});

test('unavailable authoritative refresh never produces connected state', async () => {
  let metadataCalled = false;
  await assert.rejects(refreshComposioReturn({
    async listOAuthConnectors() { throw new Error('unauthenticated'); },
    async listComposioToolkits() { metadataCalled = true; },
  }, 'googlesheets'), /unauthenticated/);
  assert.equal(metadataCalled, false);
});
