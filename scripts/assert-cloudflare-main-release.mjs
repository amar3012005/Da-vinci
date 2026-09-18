import { execFileSync } from 'node:child_process';

const run = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const head = run(['rev-parse', 'HEAD']);
const dirty = run(['status', '--porcelain', '--untracked-files=no']);
const remote = run(['ls-remote', 'origin', 'refs/heads/singulance-main']).split(/\s+/)[0];

if (dirty) {
  throw new Error('Refusing production Worker deployment from a dirty checkout.');
}

if (!remote || head !== remote) {
  throw new Error(
    `Refusing production Worker deployment: HEAD ${head.slice(0, 12)} is not current origin/singulance-main ${remote?.slice(0, 12) || 'unknown'}.`,
  );
}

console.log(`Cloudflare production source verified: singulance-main @ ${head.slice(0, 12)}.`);
