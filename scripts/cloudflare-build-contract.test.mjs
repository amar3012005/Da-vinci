import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const dockerignore = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');
const gitignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../cloudflare/worker.mjs', import.meta.url), 'utf8');

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

test('native session establishment reaches the runner before an admission cookie exists', () => {
  assert.match(
    worker,
    /pathname === '\/api\/hivemind\/embed\/exchange'\s*\n\s*\|\| pathname === '\/api\/hivemind\/session\/establish'/u,
  );
  assert.match(worker, /const runner = new URL\(env\.RUNNER_ORIGIN\)/u);
  assert.match(worker, /new Request\(request, \{/u);
  assert.match(
    worker,
    /pathname === '\/api\/hivemind\/session\/establish' && response\.ok/u,
  );
  assert.match(
    worker,
    /hasHarnessAdmission\(request\) && isHarnessRunnerRoute\(pathname\)/u,
  );
  assert.match(worker, /resolveOverride: runner\.hostname/u);
  assert.doesNotMatch(worker, /headers\.set\('origin', target\.origin\)/u);
});
