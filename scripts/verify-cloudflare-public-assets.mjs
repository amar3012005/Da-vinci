import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { excludedReferences, filesUnder, unusedPublicAssets } from './cloudflare-public-asset-usage.mjs';

let retained = 0, excluded = 0;
for (const source of filesUnder('public')) {
  const path = relative('public', source);
  const omitted = path === '_redirects'
    || unusedPublicAssets.some(asset => path === asset.path || path.startsWith(`${asset.path}/`));
  const output = join('build', path);
  if (omitted) {
    assert.equal(existsSync(output), false, `Unused asset remains: ${path}`);
    excluded++;
  } else if (path !== 'index.html') {
    assert.ok(existsSync(output), `Retained public asset missing: ${path}`);
    assert.deepEqual(readFileSync(output), readFileSync(source), `Retained asset changed: ${path}`);
    retained++;
  }
}
// Independently inspect the final compiler output, including lazy chunks.
const documents = filesUnder('build').filter(path => /\.(?:js|css|html|json)$/u.test(path))
  .map(path => ({ path, text: readFileSync(path, 'utf8') }));
assert.deepEqual(excludedReferences(documents), [], 'Compiler output references an excluded asset');
console.log(`Cloudflare public asset retention: ${retained} unchanged files; ${excluded} unused files absent; all compiled references checked.`);
