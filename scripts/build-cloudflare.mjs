await import('./generate-public-renderings.mjs');
await import('./generate-public-discovery.mjs');
import { spawnSync } from 'node:child_process';
import { snapshotProductionAssets, restoreRetainedAssets } from './retain-cloudflare-assets.mjs';

// Snapshot before CRA replaces build/. A clean checkout must protect old tabs too.
const retainedAssets = await snapshotProductionAssets();

const windows = process.platform === 'win32';
const build = spawnSync(windows ? process.env.ComSpec : 'npm', windows ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'], {
  env: {
    ...process.env,
    DISABLE_ESLINT_PLUGIN: 'true',
    GENERATE_SOURCEMAP: 'false',
  },
  stdio: 'inherit',
});

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

await restoreRetainedAssets('build', retainedAssets);
await import('./prune-cloudflare-assets.mjs');
