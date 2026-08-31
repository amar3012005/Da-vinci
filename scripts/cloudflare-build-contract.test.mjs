import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const dockerignore = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');
const gitignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');

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
