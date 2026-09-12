import { execFileSync } from 'node:child_process';

const run = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const branch = run(['branch', '--show-current']);
const dirty = run(['status', '--porcelain', '--untracked-files=no']);

if (dirty) {
  throw new Error('Refusing Enigma Worker deployment from a dirty checkout.');
}

if (branch !== 'enigma-main') {
  throw new Error(`Refusing Enigma Worker deployment from ${branch || 'detached HEAD'}. Use enigma-main.`);
}

console.log(`Cloudflare Enigma source verified: ${branch}.`);
