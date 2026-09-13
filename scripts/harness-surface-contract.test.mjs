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

test('native composer dictation reuses the authenticated mobile transcription transport', () => {
  assert.match(surface, /window\.__HIVEMIND_TRANSCRIBE_AUDIO__ = transcribeAudio/);
  assert.match(surface, /apiClient\.core\.post\(/);
  assert.match(surface, /\/api\/meetings\/transcribe\?diarize=false/);
  assert.match(surface, /baseURL: window\.location\.origin/);
  assert.doesNotMatch(surface, /__HIVEMIND_DICTATION_ENDPOINT__/);
});

test('an open native chat re-establishes admission after a runner restart invalidates its session', () => {
  assert.match(surface, /method: 'HEAD', credentials: 'include', cache: 'no-store'/);
  assert.match(surface, /response\.status !== 401 && response\.status !== 403/);
  assert.match(surface, /await establishHarnessSession\(\);\s*if \(!cancelled\) window\.location\.reload\(\)/);
  assert.match(surface, /HARNESS_LIVENESS_INTERVAL_MS = 5000/);
  assert.match(surface, /document\.visibilityState === 'hidden'/);
});
