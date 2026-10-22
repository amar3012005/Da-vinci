/** Rehydrate public release assets in clean checkouts; never fetch private boot data. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
export async function ensureRuntimeNativeAssets() {
 const manifest=JSON.parse(await readFile('cloudflare/generated/runtime-native-assets.json','utf8'));
 let fetched=0;
 const entries=Object.entries(manifest.entries), checked=new Map();
 const digest=(key,bytes)=>createHash('sha256').update(key).update(bytes).digest('hex');
 let cursor=0;
 await Promise.all(Array.from({length:3},async()=>{
  while(cursor<entries.length){
   const [key,entry]=entries[cursor++];
   if(!/^\/(plugins|assets)\//.test(key)||key.startsWith('/plugins/events')||!/^\/runtime-native\/[a-f0-9]{40}\/[a-f0-9]{64}$/.test(entry.path))throw Error('Invalid public native asset');
   const hash=entry.path.split('/').at(-1),file=join('public',entry.path);
   let bytes;try { bytes=await readFile(file); } catch(error){if(error.code!=='ENOENT')throw error;}
   if(!bytes||digest(key,bytes)!==hash){
    const response=await fetch(new URL(key,'https://runtime-runner.singulancelabs.com'),{redirect:'error',signal:AbortSignal.timeout(30000)});
    if(!response.ok||response.headers.get('content-type')?.includes('text/html'))throw Error('Native public release asset unavailable');
    bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length>24*1024*1024||digest(key,bytes)!==hash)throw Error('Native public release asset hash mismatch');
    await mkdir(dirname(file),{recursive:true});await writeFile(file,bytes);fetched++;
   }
   checked.set(entry.path,true);
  }
 }));
 console.log(`Verified ${checked.size} native Runtime static assets (${fetched} restored from public edge)`);
}
