import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/components/hivemind/app/pages/HarnessChatSurface.jsx', import.meta.url), 'utf8');

test('Harness admission is exchanged on the current origin and never navigates to embed_url', () => {
  assert.match(source, /const HARNESS_EXCHANGE_PATH = '\/api\/hivemind\/embed\/exchange'/u);
  assert.match(source, /credentials: 'include'/u);
  assert.match(source, /body: JSON\.stringify\(\{ ticket, request_id: requestId \}\)/u);
  assert.match(source, /window\.location\.replace\(canonicalHarnessDestination/u);
  assert.doesNotMatch(source, /chat\.preview\.singulancelabs\.com/u);
  assert.doesNotMatch(source, /target\.pathname = '\/auth\/callback'/u);
});

test('only canonical same-origin Overview routes can become the post-exchange destination', () => {
  assert.match(source, /target\.origin !== window\.location\.origin/u);
  assert.match(source, /overview\\\/session\\\/\[\^\/\]\+/u);
  assert.match(source, /return HARNESS_OVERVIEW_PATH/u);
});
