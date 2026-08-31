import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/App.js', import.meta.url), 'utf8');

test('preview is an explicit HIVEMIND application host and cannot redirect to production', () => {
  assert.match(source, /const HIVEMIND_PREVIEW_HOST = 'next\.preview\.singulancelabs\.com'/);
  assert.match(source, /window\.location\.hostname === HIVEMIND_PREVIEW_HOST/);
});
