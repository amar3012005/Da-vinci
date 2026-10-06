import { readFileSync } from 'node:fs';
const readiness = JSON.parse(readFileSync('native/readiness.json', 'utf8'));
if (!readiness.storeReady || readiness.required.length) {
  console.error('Store release blocked: native acceptance gates remain.');
  readiness.required.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log('All recorded native acceptance gates complete.');
