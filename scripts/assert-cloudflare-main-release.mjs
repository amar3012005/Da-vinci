import { execFileSync } from 'node:child_process';

const run = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const head = run(['rev-parse', 'HEAD']);
// Wrangler may create local, untracked metadata before it invokes this command.
// Only a tracked source change can make the release artifact ambiguous.
const dirty = run(['status', '--porcelain', '--untracked-files=no']);
const remoteMain = run(['ls-remote', 'origin', 'refs/heads/main']).split(/\s+/)[0];

if (dirty) {
  throw new Error('Refusing production Worker deployment from a dirty checkout.');
}

if (!remoteMain || head !== remoteMain) {
  throw new Error(
    `Refusing production Worker deployment: HEAD ${head.slice(0, 12)} is not current origin/main ${remoteMain?.slice(0, 12) || 'unknown'}.`
  );
}

console.log(`Cloudflare production source verified: main @ ${head.slice(0, 12)}.`);
