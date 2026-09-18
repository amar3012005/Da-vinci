import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const worker = fs.readFileSync(path.join(root, 'cloudflare/worker.mjs'), 'utf8');
const overlay = fs.readFileSync(path.join(root, 'src/components/hivemind/app/hyperagents/HyperOnboarding.jsx'), 'utf8');
const topbar = fs.readFileSync(path.join(root, 'src/components/hivemind/app/layout/TopBar.jsx'), 'utf8');
const assertScript = fs.readFileSync(path.join(root, 'scripts/assert-cloudflare-main-release.mjs'), 'utf8');

test('onboarding artwork never goes to the Harness runner', () => {
  assert.match(worker, /assets\/onboarding\//);
});

test('awakening overlay uses Enigma picture+srcSet still', () => {
  assert.match(overlay, /<picture className="fixed inset-0 block h-full w-full">/);
  assert.match(overlay, /awakening-1920\.webp/);
});

test('language picker is outside the start form', () => {
  assert.match(overlay, /preferred_language/);
  assert.match(overlay, /<LangSwitcher \/>/);
  assert.doesNotMatch(overlay, /<form[\s\S]*<LangSwitcher \/>/);
});

test('navbar does not show Digital Employees or the Hyper Agents subtitle', () => {
  assert.doesNotMatch(topbar, /Digital Employees/);
  assert.doesNotMatch(topbar, /autonomous brains with HIVEMIND memory/);
});

test('production Worker deploys from origin/singulance-main', () => {
  assert.match(assertScript, /refs\/heads\/singulance-main/);
});
