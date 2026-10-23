import test from 'node:test';
import assert from 'node:assert/strict';
import {runtimePublic} from './runtime-public.mjs';
const deps={seo:async(_,path)=>new Response(path),markdown:(_,path)=>new Response(path),prefersMarkdown:a=>a?.includes('text/markdown')};
const env={ASSETS:{fetch:async()=>new Response('<html/>',{headers:{'content-type':'text/html'}})}};
test('Runtime subdomain renders the Runtime on HTML and Markdown paths',async()=>{
 for(const path of ['/','/index.md'])assert.equal(await(await runtimePublic(new Request('https://runtime.singulancelabs.com'+path),env,deps)).text(),'/runtime');
 assert.equal(await runtimePublic(new Request('https://next.singulancelabs.com/'),env,deps),null);
});
test('Runtime cover cannot expose private app or missing asset routes',async()=>{
 for(const path of ['/hivemind/app','/api/session','/static/js/missing.js'])assert.equal((await runtimePublic(new Request('https://runtime.singulancelabs.com'+path),env,deps)).status,404);
 assert.equal((await runtimePublic(new Request('https://runtime.singulancelabs.com/',{method:'POST'}),env,deps)).status,405);
});
test('Runtime discovery and aliases identify one canonical origin',async()=>{
 assert.equal((await runtimePublic(new Request('https://runtime.singulancelabs.com/runtime'),env,deps)).headers.get('location'),'https://runtime.singulancelabs.com/');
 assert.match(await(await runtimePublic(new Request('https://runtime.singulancelabs.com/sitemap.xml'),env,deps)).text(),/https:\/\/runtime.singulancelabs.com\//);
});
