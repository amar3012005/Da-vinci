import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const surface = readFileSync(new URL('../src/components/hivemind/app/pages/HarnessSurface.jsx', import.meta.url), 'utf8');

test('every SPA remount replays the native Harness boot graph', () => {
  assert.doesNotMatch(surface, /harnessScriptLoads/);
  assert.match(surface, /function executeExternalScript\(src\) \{\s*return new Promise/);
  assert.match(surface, /const ready = deferred\(\);\s*window\.__DSH_BOOT_READY__ = ready/);
});

test('browser HTTP caching remains enabled for immutable Harness assets', () => {
  assert.match(surface, /script\.src = src/);
  assert.match(surface, /link\[data-dsh-native-style=/);
});
