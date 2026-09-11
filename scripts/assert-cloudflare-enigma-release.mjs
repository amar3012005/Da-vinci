import { execFileSync } from 'node:child_process';

const run = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const branch = run(['branch', '--show-current']);
const dirty = run(['status', '--porcelain', '--untracked-files=no']);

if (dirty) {
  throw new Error('Refusing Enigma Worker deployment from a dirty checkout.');
}

if (branch !== 'codex/enigma-dev-origin') {
  throw new Error(`Refusing Enigma Worker deployment from ${branch || 'detached HEAD'}. Use codex/enigma-dev-origin.`);
}

console.log(`Cloudflare Enigma source verified: ${branch}.`);
