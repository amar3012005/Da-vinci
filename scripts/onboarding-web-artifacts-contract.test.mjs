import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dashboard = fs.readFileSync(new URL('../src/components/hivemind/app/hyperagents/CompanyDashboard.jsx', import.meta.url), 'utf8');
const rooms = fs.readFileSync(new URL('../src/components/hivemind/app/pages/HyperAgents.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/components/hivemind/app/shared/api-client.js', import.meta.url), 'utf8');

test('company dashboard exposes exact onboarding crawl previews', () => {
  assert.match(dashboard, /c\.web_artifacts/);
  assert.match(dashboard, /hyperCompanyWebArtifactPreviewUrl\(artifact\.id\)/);
  assert.match(dashboard, /content_chars/);
});

test('room company context exposes the same web artifacts', () => {
  assert.match(rooms, /company\?\.web_artifacts/);
  assert.match(rooms, /hyperCompanyWebArtifactPreviewUrl\(artifact\.id\)/);
});

test('web artifact preview URL remains on the authenticated control plane', () => {
  assert.match(api, /hyperCompanyWebArtifactPreviewUrl\(artifactId\)/);
  assert.match(api, /\/v1\/hyper\/company\/web-artifacts\/\$\{encodeURIComponent\(id\)\}\/preview/);
});
