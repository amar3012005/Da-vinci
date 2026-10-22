import {readFileSync, mkdirSync, copyFileSync, writeFileSync, statSync} from 'node:fs';
import {resolve,join} from 'node:path';
const source=resolve(process.argv[2]||'');
const manifest=JSON.parse(readFileSync(join(source,'manifest.json'),'utf8'));
if(!/^[a-f0-9]{40}$/.test(manifest.release)||!manifest.entries)throw Error('Invalid native release');
for(const [key,entry] of Object.entries(manifest.entries)) {
 if(!/^\/(plugins|assets)\//.test(key)||key.startsWith('/plugins/events')||!new RegExp('^/runtime-native/'+manifest.release+'/[a-f0-9]{64}$').test(entry.path)||!entry.type||entry.type.includes('html'))throw Error('Invalid public asset');
 const hash=entry.path.split('/').at(-1), file=join(source,'files',hash);
 if(statSync(file).size>24*1024*1024)throw Error('Asset exceeds budget');
 const destination=join('public',entry.path);mkdirSync(resolve(destination,'..'),{recursive:true});copyFileSync(file,destination);
}
writeFileSync('cloudflare/generated/runtime-native-assets.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({release:manifest.release,assets:Object.keys(manifest.entries).length}));
