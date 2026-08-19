import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const projectName = process.env.CF_PAGES_PROJECT_NAME;
const branch = process.env.CF_PAGES_BRANCH || 'preview';
const allowProduction = process.env.CF_PAGES_ALLOW_PRODUCTION === 'true';

if (!projectName) {
  throw new Error('Set CF_PAGES_PROJECT_NAME before deploying (for example: hivemind-web).');
}

if (['main', 'production'].includes(branch) && !allowProduction) {
  throw new Error(
    'Refusing a production Pages deployment. Set CF_PAGES_ALLOW_PRODUCTION=true only after preview acceptance.'
  );
}

if (!existsSync('build/index.html')) {
  throw new Error('Missing build/index.html. Run `npm run build:cloudflare` before deploying.');
}

const commitHash = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const commitMessage = execFileSync('git', ['log', '-1', '--pretty=%s'], { encoding: 'utf8' }).trim();
const args = [
  'wrangler',
  'pages',
  'deploy',
  'build',
  '--project-name', projectName,
  '--branch', branch,
  '--commit-hash', commitHash,
  '--commit-message', commitMessage,
  '--commit-dirty', 'false',
];

console.log(`Deploying ${commitHash.slice(0, 12)} to Cloudflare Pages project ${projectName} (${branch}).`);
execFileSync('npx', args, { stdio: 'inherit' });
