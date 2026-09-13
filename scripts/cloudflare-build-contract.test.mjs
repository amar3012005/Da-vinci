import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const dockerignore = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');
const gitignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../cloudflare/worker.mjs', import.meta.url), 'utf8');
const previewWrangler = readFileSync(new URL('../wrangler.preview.jsonc', import.meta.url), 'utf8');

test('Cloudflare build stays bounded and uses a pinned Wrangler', () => {
  assert.equal(packageJson.scripts['build:cloudflare'], 'node scripts/build-cloudflare.mjs');
  assert.match(packageJson.devDependencies.wrangler, /^4\./);
  assert.match(gitignore, /^\/\.next$/m);
  assert.match(gitignore, /^\/\*\.tsbuildinfo$/m);
});

test('Docker excludes local and generated build inputs', () => {
  for (const entry of ['.git', '.next', '.wrangler', 'build', 'node_modules']) {
    assert.match(dockerignore, new RegExp(`^${entry.replace('.', '\\.')}$`, 'm'));
  }
});

test('browser package excludes known server-only dependencies', () => {
  for (const dependency of ['express', 'mysql2', 'nodemailer', 'sequelize', 'twilio']) {
    assert.equal(packageJson.dependencies[dependency], undefined);
  }
});

test('preview UI-shell flag is evaluated by the Harness service binding', () => {
  assert.match(worker, /UI_SHELL_FLAG_PATH\s*=\s*['"]\/__hivemind\/feature-flags\/ui-shell['"]/);
  assert.match(worker, /pathname === HARNESS_CHAT_FLAG_PATH \|\| pathname === UI_SHELL_FLAG_PATH/);
});

test('legacy Harness manifest path resolves to the real JSON manifest', () => {
  assert.match(worker, /pathname === ['"]\/manifest\.webmanifest['"]/);
  assert.match(worker, /new URL\(['"]\/manifest\.json['"], request\.url\)/);
  assert.match(previewWrangler, /"\/manifest\.webmanifest"/);
});
