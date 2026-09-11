import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const buildScript = read('scripts/build-cloudflare.mjs');
const config = read('wrangler.enigma.jsonc');

test('Enigma build has isolated public origins', () => {
  assert.match(packageJson.scripts['build:cloudflare:enigma'], /HIVEMIND_FRONTEND_ENVIRONMENT=enigma/);
  assert.match(buildScript, /REACT_APP_HIVEMIND_SITE_HOST: 'dev\.next\.singulancelabs\.com'/);
  assert.match(buildScript, /REACT_APP_HIVEMIND_SITE_URL: 'https:\/\/dev\.next\.singulancelabs\.com'/);
  assert.match(buildScript, /REACT_APP_CONTROL_PLANE_URL: 'https:\/\/api\.dev\.next\.singulancelabs\.com'/);
  assert.match(buildScript, /REACT_APP_CORE_API_URL: 'https:\/\/core\.dev\.next\.singulancelabs\.com'/);
});

test('Enigma Worker exposes only the Enigma frontend hostname', () => {
  assert.match(config, /"name": "hivemind-web-enigma"/);
  assert.match(config, /"pattern": "dev\.next\.singulancelabs\.com"/);
  assert.match(config, /"FLAGSHIP_ENVIRONMENT": "dev"/);
  assert.doesNotMatch(config, /"pattern": "next\.singulancelabs\.com"/);
});
