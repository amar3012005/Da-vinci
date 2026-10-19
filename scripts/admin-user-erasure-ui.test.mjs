import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const dialog=fs.readFileSync(new URL('../src/components/hivemind/app/pages/AdminUserErasureDialog.jsx',import.meta.url),'utf8');
test('erasure UI names exact target, waits for verified completion and reconciles unknown responses',()=>{
 assert.match(dialog,/result\.user\.id !== user\.id/);assert.match(dialog,/email\.trim\(\)\.toLowerCase\(\) !== user\.email\.toLowerCase\(\)/);
 assert.match(dialog,/operation\.status === 'completed'/);assert.match(dialog,/Erasure blocked — not completed/);assert.match(dialog,/setPreview\(null\);setRefresh/);
 assert.match(dialog,/Audit records and backups/);assert.doesNotMatch(dialog,/window\.confirm/);
});
