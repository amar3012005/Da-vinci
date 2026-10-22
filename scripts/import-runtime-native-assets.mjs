import {readFileSync, mkdirSync, copyFileSync, writeFileSync, statSync} from 'node:fs';
import {resolve,join} from 'node:path';
const source=resolve(process.argv[2]||'');
let manifest=JSON.parse(readFileSync(join(source,'manifest.json'),'utf8'));
if(!/^[a-f0-9]{40}$/.test(manifest.release)||!manifest.entries)throw Error('Invalid native release');
for(const [key,entry] of Object.entries(manifest.entries)) {
 if(!/^\/(plugins|assets)\//.test(key)||key.startsWith('/plugins/events')||!new RegExp('^/runtime-native/'+manifest.release+'/[a-f0-9]{64}$').test(entry.path)||!entry.type||entry.type.includes('html'))throw Error('Invalid public asset');
 const hash=entry.path.split('/').at(-1), file=join(source,'files',hash);
 if(statSync(file).size>24*1024*1024)throw Error('Asset exceeds budget');
 const destination=join('public',entry.path);mkdirSync(resolve(destination,'..'),{recursive:true});copyFileSync(file,destination);
}
let previous;try { previous=JSON.parse(readFileSync('cloudflare/generated/runtime-native-assets.json','utf8')); } catch {}
const oldKeys=previous?.generations?.[0] || Object.keys(previous?.entries||{});
const oldEntries=Object.fromEntries(oldKeys.filter(key=>previous.entries[key]).map(key=>[key,previous.entries[key]]));
manifest={...manifest,generations:[Object.keys(manifest.entries),oldKeys],entries:{...oldEntries,...manifest.entries}};
writeFileSync('cloudflare/generated/runtime-native-assets.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({release:manifest.release,assets:Object.keys(manifest.entries).length}));
