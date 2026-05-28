const { parse } = require('@babel/parser');
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) { if (!p.includes('node_modules') && !p.includes('build')) walk(p, out); }
    else if (f.endsWith('.jsx') || f.endsWith('.js')) out.push(p);
  }
  return out;
}
const files = walk(process.argv[2] || 'src');
let errors = 0;
for (const f of files) {
  try {
    parse(readFileSync(f, 'utf-8'), { sourceType: 'module', plugins: ['jsx', 'classProperties', 'optionalChaining'] });
  } catch (e) {
    console.error(`✗ ${f}: ${e.message}`);
    errors += 1;
  }
}
console.log(`\nChecked ${files.length} files. Errors: ${errors}`);
process.exit(errors === 0 ? 0 : 1);
