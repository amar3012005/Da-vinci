import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Profile export downloads actual records rather than promising an unsent email', async () => {
  const source = readFileSync(new URL('../src/components/hivemind/app/pages/Profile.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('  const handleExport = async () => {');
  const end = source.indexOf('  const handleDeleteConfirm',start);
  const messages = [], loading = [], requests = [], actions = [];
  const link = { click: () => actions.push('click'), remove: () => actions.push('remove') };
  const invoke = new Function('deps', `const { setExportLoading, setExportMsg, apiClient, t, Blob, URL, document, window } = deps; ${source.slice(start,end)}; return handleExport;`);
  const handler = invoke({ setExportLoading: value => loading.push(value), setExportMsg: value => messages.push(value), apiClient: { controlPlane: { post: async (...args) => { requests.push(args); return { data: { format: 'hivemind-account-records-v1', excluded: ['original_file_bytes'] } }; } } }, t: (_, text) => text, Blob, URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL: () => actions.push('revoke') }, document: { createElement: () => link, body: { appendChild: () => actions.push('append') } }, window: { setTimeout: fn => fn() } });
  await handler();
  assert.equal(requests[0][0],'/v1/account/export');
  assert.equal(link.download,'hivemind-account-records.json');
  assert.deepEqual(actions,['append','click','remove','revoke']);
  assert.deepEqual(loading,[true,false]);
  assert.equal(messages.at(-1).type,'success');
  assert.ok(messages.at(-1).text.includes('original file bytes are not included'));
  assert.ok(!source.slice(start,end).includes('receive an email'));
});

test('Privacy copy describes export exclusions and does not promise universal residency or deletion', () => {
  const source = readFileSync(new URL('../src/components/hivemind/app/pages/Profile.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('Download available personal account records as JSON.'));
  assert.ok(source.includes('original file bytes are not included'));
  assert.ok(source.includes('Shared company records and unresolved cleanup may be retained.'));
  for (const claim of ['Download all your memories', 'GDPR compliant', 'No US data transfer', 'EU data residency guaranteed', 'Your data is stored in Frankfurt', 'Permanently delete all your data', 'ALL your memory data', 'Yes, delete everything']) {
    assert.ok(!source.includes(claim), claim);
  }
});
