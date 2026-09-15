import { spawnSync } from 'node:child_process';

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

await import('./prune-cloudflare-assets.mjs');
