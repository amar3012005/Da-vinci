import { existsSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

// These historical source artifacts are not referenced by the application, but
// CRA copies all files in public/ into build/. Workers Static Assets has a
// 25 MiB per-file limit, so keeping them in the deployment artifact would make
// an otherwise valid release impossible. The source files remain untouched.
const externalizedAssets = [
  'Demo audio/background.wav',
  'reference/Screen Recording 2026-03-11 at 01.41.59.mov',
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
