import { spawnSync } from 'node:child_process';

const windows = process.platform === 'win32';
const deployment = process.env.HIVEMIND_FRONTEND_ENVIRONMENT || 'production';

// These are public browser origins, not credentials.  Keeping them in one
// build-time profile prevents a non-production Worker from accidentally
// inheriting the production auth return host or API bases from .env.production.
const deploymentProfiles = {
  production: {},
  enigma: {
    REACT_APP_CONTROL_PLANE_URL: 'https://api.dev.next.singulancelabs.com',
    REACT_APP_CORE_API_URL: 'https://core.dev.next.singulancelabs.com',
    REACT_APP_HIVEMIND_SITE_HOST: 'dev.next.singulancelabs.com',
    REACT_APP_HIVEMIND_SITE_URL: 'https://dev.next.singulancelabs.com',
  },
};

if (!Object.hasOwn(deploymentProfiles, deployment)) {
  throw new Error(`Unsupported HIVEMIND_FRONTEND_ENVIRONMENT: ${deployment}`);
}

const build = spawnSync(windows ? process.env.ComSpec : 'npm', windows ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'], {
  env: {
    ...process.env,
    ...deploymentProfiles[deployment],
    DISABLE_ESLINT_PLUGIN: 'true',
    GENERATE_SOURCEMAP: 'false',
  },
  stdio: 'inherit',
});

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

await import('./prune-cloudflare-assets.mjs');
