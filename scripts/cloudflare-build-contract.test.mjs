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

test('production Worker runs before SPA assets on Harness RPC and overview paths', () => {
  const wrangler = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url)));
  const first = wrangler.assets?.run_worker_first;
  assert.ok(Array.isArray(first), 'wrangler.jsonc must set assets.run_worker_first');
  for (const path of ['/api/*', '/plugins/*', '/assets/*', '/hivemind/app/overview', '/hivemind/app/overview/*']) {
    assert.ok(first.includes(path), `run_worker_first must include ${path}`);
  }
});

test('awakening artwork is not sent to the Harness runner', () => {
  assert.match(worker, /pathname\.startsWith\('\/assets\/onboarding\/'\)/u);
  assert.match(worker, /function isDavinciPublicAsset/u);
});

test('admitted Harness RPC includes Typert command and event paths', () => {
  assert.match(worker, /pathname\.startsWith\('\/api\/'\)/u);
  assert.match(worker, /commands\/list/u);
  assert.match(worker, /\$events\/result/u);
});

test('native session establishment reaches the runner before an admission cookie exists', () => {
  assert.match(
    worker,
    /pathname === '\/api\/hivemind\/embed\/exchange'\s*\n\s*\|\| pathname === '\/api\/hivemind\/session\/establish'/u,
  );
  assert.match(
    worker,
    /pathname === '\/api\/hivemind\/session\/establish' && response\.ok/u,
  );
  assert.match(
    worker,
    /hasHarnessAdmission\(request\) && isHarnessRunnerRoute\(pathname\)/u,
  );
});
