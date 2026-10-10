import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { auditPublicAssetExclusions, excludedReferences } from './cloudflare-public-asset-usage.mjs';

test('recognizes dynamic frame directories and relative picture/srcset references', () => {
  assert.deepEqual(excludedReferences([
    { path: 'scene.jsx', text: 'frameDir="fall-frames"' },
    { path: 'picture.html', text: '<img srcset="images/alpha.jpeg 1x">' },
  ]), [
    { asset: 'fall-frames', source: 'scene.jsx' },
    { asset: 'images/alpha.jpeg', source: 'picture.html' },
  ]);
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cloudflare-asset-guard-'));
  for (const dir of ['src', 'public', 'cloudflare']) mkdirSync(join(root, dir));
  writeFileSync(join(root, 'src/index.js'), 'console.log("active page");');
  writeFileSync(join(root, 'src/PausedScene.js'), 'console.log("fall-frames");');
  return root;
}

test('unreachable paused scenes do not block safe exclusion; re-enabling an import does', async () => {
  const root = fixture();
  try {
    await auditPublicAssetExclusions(root);
    writeFileSync(join(root, 'src/index.js'), 'import "./PausedScene.js";');
    await assert.rejects(auditPublicAssetExclusions(root), /fall-frames <- src\/PausedScene.js/);
  } finally { rmSync(root, { recursive: true }); }
});

test('retained public documents and nested stylesheets can veto exclusion', async () => {
  const root = fixture();
  try {
    writeFileSync(join(root, 'public/manifest.json'), '{"icons":[{"src":"images/alpha.jpeg"}]}');
    await assert.rejects(auditPublicAssetExclusions(root), /images\/alpha.jpeg <- public\/manifest.json/);
    writeFileSync(join(root, 'public/manifest.json'), '{}');
    writeFileSync(join(root, 'src/imported-style.css'), 'body{background:url(/main_background.jpeg)}');
    await assert.rejects(auditPublicAssetExclusions(root), /main_background.jpeg <- src\/imported-style.css/);
  } finally { rmSync(root, { recursive: true }); }
});

test('current application and Worker/public documents do not reference exclusions', async () => {
  const audit = await auditPublicAssetExclusions();
  assert.ok(audit.reachableSourceFiles > 100);
});
