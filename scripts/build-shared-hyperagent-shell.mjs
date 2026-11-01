import { build } from 'esbuild';
import { readFile, mkdir, writeFile, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
const out = process.argv[2];
if (!out) throw new Error('Supply an isolated output directory');
await mkdir(out, { recursive: true });
const define = { 'process.env.NODE_ENV': '"production"' };
for (const line of (await readFile('.env.production', 'utf8')).split('\n')) {
 const match = line.match(/^(REACT_APP_[A-Z0-9_]+)=(.*)$/); if (match) define[`process.env.${match[1]}`] = JSON.stringify(match[2]);
}
define['process.env.REACT_APP_SHARED_SHELL_LOCALES'] = JSON.stringify('/shared-hyperagent-shell/locales/{{lng}}/{{ns}}.json');
define['process.env'] = '{}';
const shellDir = 'src/components/hivemind/app/shared-shell';
const common = { entryPoints:['src/components/hivemind/app/shared-shell/entry.jsx'], bundle:true, format:'iife', globalName:'HivemindSharedShell', minify:true, loader:{'.js':'jsx','.svg':'dataurl','.png':'dataurl','.jpg':'dataurl','.webp':'dataurl','.woff2':'dataurl'}, define };
// The shell never starts PostHog, so both builds drop its client. The Brain build also drops the employee avatar art: its sidebar draws none.
const alias = { 'posthog-js': `./${shellDir}/posthog-stub.js` };
await build({ ...common, outfile:`${out}/shell.js`, alias });
await build({ ...common, outfile:`${out}/shell.brain.js`, alias: { ...alias, '@humation/assets-humation-1': `./${shellDir}/brain-avatar-stub.js`, '@humation/react': `./${shellDir}/brain-avatar-stub.js`, '@humation/core': `./${shellDir}/brain-avatar-stub.js` } });
const imported = await readFile(`${out}/shell.css`, 'utf8').catch(() => '');
const css = await postcss([tailwind('./tailwind.config.js'), autoprefixer]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;\n' + imported + '\n:host{display:block;flex:none;height:100dvh;color:#111;font-family:Inter,system-ui,sans-serif} button{cursor:pointer}', {from:undefined});
await writeFile(`${out}/shell.css`, css.css);
await cp('public/locales', `${out}/locales`, {recursive:true});
const hashes = {}; for (const file of ['shell.js','shell.brain.js','shell.css']) hashes[file] = createHash('sha256').update(await readFile(`${out}/${file}`)).digest('hex');
await writeFile(`${out}/manifest.json`, JSON.stringify({version:1, source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), files:hashes},null,2));
console.log(JSON.stringify(hashes));
