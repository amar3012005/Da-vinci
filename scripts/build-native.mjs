import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Keep the native bundle separate from Cloudflare's static rendering/pruning.
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, GENERATE_SOURCEMAP: 'false' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const html = readFileSync('build/index.html', 'utf8');
if (!html.includes('<head>') || !html.includes('viewport-fit=cover')) {
  throw new Error('Native bundle must retain the document head and safe-area viewport.');
}
