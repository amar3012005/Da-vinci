import { existsSync, rmSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { auditPublicAssetExclusions, filesUnder, unusedPublicAssets } from './cloudflare-public-asset-usage.mjs';

// Fail before deleting anything if a page reintroduces one of these assets.
const usage = await auditPublicAssetExclusions();
console.log(`Public asset usage checked: ${usage.reachableSourceFiles} reachable source files, ${usage.checkedDocuments} documents.`);
let excludedFiles = 0;
let excludedBytes = 0;
for (const asset of unusedPublicAssets) {
  const outputPath = join('build', asset.path);
  if (!existsSync(outputPath)) continue;
  const files = statSync(outputPath).isDirectory() ? filesUnder(outputPath) : [outputPath];
  const bytes = files.reduce((total, path) => total + statSync(path).size, 0);
  rmSync(outputPath, { recursive: true });
  excludedFiles += files.length;
  excludedBytes += bytes;
  console.log(`Excluded ${asset.path}: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(2)} MiB. ${asset.reason}`);
}
console.log(`Unused public assets excluded: ${excludedFiles} files, ${(excludedBytes / 1024 / 1024).toFixed(2)} MiB; public/ unchanged.`);

// These historical source artifacts are not referenced by the application, but
// CRA copies all files in public/ into build/. Workers Static Assets has a
// 25 MiB per-file limit, so keeping them in the deployment artifact would make
// an otherwise valid release impossible. The source files remain untouched.
const externalizedAssets = [
  // Pages consumes this redirect syntax, but Workers Static Assets provides
  // SPA fallback through wrangler.jsonc. Keeping both makes Workers reject the
  // deployment as an infinite redirect loop.
  '_redirects',
];

for (const relativePath of externalizedAssets) {
  const outputPath = join('build', relativePath);
  if (!existsSync(outputPath)) continue;

  const bytes = statSync(outputPath).size;
  rmSync(outputPath);
  console.log(`Excluded unreferenced ${relativePath} (${(bytes / 1024 / 1024).toFixed(1)} MiB) from Cloudflare artifact.`);
}

// Keep the deployment artifact intentionally bounded. CRA copies public/
// wholesale, so an accidentally committed archive or source asset otherwise
// becomes Cloudflare upload work without being imported by the application.
const allowedExtensions = new Set([
  '', '.avif', '.cjs', '.css', '.csv', '.gif', '.html', '.ico', '.jpeg', '.jpg',
  '.js', '.json', '.map', '.md', '.mp3', '.mp4', '.png', '.sh', '.svg',
  '.txt', '.wasm', '.webp', '.woff', '.woff2', '.xml',
]);
const maxFileBytes = 25 * 1024 * 1024;
const maxArtifactBytes = 100 * 1024 * 1024;

const buildFiles = filesUnder('build');
let artifactBytes = 0;
for (const path of buildFiles) {
  const bytes = statSync(path).size;
  const extension = extname(path).toLowerCase();
  const artifactPath = relative('build', path);
  artifactBytes += bytes;

  if (!allowedExtensions.has(extension)) {
    throw new Error(`Refusing Cloudflare artifact with unapproved file type: ${artifactPath}`);
  }
  if (bytes > maxFileBytes) {
    throw new Error(`Refusing Cloudflare artifact with file over 25 MiB: ${artifactPath}`);
  }
}

if (artifactBytes > maxArtifactBytes) {
  throw new Error(`Refusing ${(artifactBytes / 1024 / 1024).toFixed(1)} MiB Cloudflare artifact; budget is 100 MiB.`);
}

console.log(`Cloudflare artifact verified: ${buildFiles.length} files, ${(artifactBytes / 1024 / 1024).toFixed(1)} MiB.`);
