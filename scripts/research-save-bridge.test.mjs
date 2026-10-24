import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { isTrustedReportMessage, registerReportWindow } from '../src/components/hivemind/app/shared/research-save-bridge.mjs';

const origin = 'https://next.singulancelabs.com';

test('only a registered report tab on the app origin may request a save', () => {
  const report = {};
  const foreign = {};
  registerReportWindow(report);
  assert.equal(isTrustedReportMessage({ origin, source: report }, origin), true);
  assert.equal(isTrustedReportMessage({ origin: 'https://attacker.invalid', source: report }, origin), false);
  assert.equal(isTrustedReportMessage({ origin, source: foreign }, origin), false);
  assert.equal(isTrustedReportMessage({ origin, source: null }, origin), false);
  assert.equal(isTrustedReportMessage({ origin: 'null', source: report }, origin), false);
});

test('every hm-save-research listener checks the sender and replies to the app origin only', () => {
  for (const file of ['pages/WebStudio.jsx', 'pages/Overview.jsx', 'mobile/pages/TalkToHiveMobile.jsx']) {
    const source = fs.readFileSync(new URL(`../src/components/hivemind/app/${file}`, import.meta.url), 'utf8');
    assert.match(source, /d\.type !== 'hm-save-research' \|\| !d\.jobId \|\| !isTrustedReportMessage\(e, window\.location\.origin\)\) return;/, file);
    assert.doesNotMatch(source, /hm-save-result[^\n]*'\*'\)/, file);
  }
  const studio = fs.readFileSync(new URL('../src/components/hivemind/app/pages/WebStudio.jsx', import.meta.url), 'utf8');
  assert.match(studio, /if \(!w\) return false;[^\n]*\n\s*registerReportWindow\(w\);/);
  assert.match(studio, /window\.opener\.postMessage\(\{type:'hm-save-research'[^\n]*\},ORIGIN\);/);
  assert.match(studio, /if\(e\.origin!==ORIGIN\|\|e\.source!==window\.opener\)return;/);
});
