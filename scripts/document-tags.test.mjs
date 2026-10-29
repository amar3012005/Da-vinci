import test from 'node:test';
import assert from 'node:assert/strict';
import { isSystemTag } from '../src/components/hivemind/app/shared/documentTags.mjs';

test('system filing tags are hidden, typed tags are shown', () => {
  for (const tag of ['source-id:e2e-revenue-test-csv', 'scope-key:personal:2323d7bc-3ae1', 'document-type:spreadsheet', 'document_type:pdf', 'filename:a.pdf', 'platform:mcp', 'ts:2026-10-28', 'doc-hash:abc', 'knowledge-base', 'document']) {
    assert.equal(isSystemTag(tag), true, tag);
  }
  for (const tag of ['q4-planning', 'client acme', 'project-dc', 'legal']) assert.equal(isSystemTag(tag), false, tag);
});
