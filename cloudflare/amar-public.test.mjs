import test from 'node:test';
import assert from 'node:assert/strict';
import {amarPublic} from './amar-public.mjs';
const deps={seo:async(_,path)=>new Response(path),markdown:(_,path)=>new Response(path),prefersMarkdown:a=>a?.includes('text/markdown')};
const env={ASSETS:{fetch:async()=>new Response('<html/>',{headers:{'content-type':'text/html'}})}};
test('founder subdomain renders the founder on HTML and Markdown paths',async()=>{
 for(const path of ['/','/index.md'])assert.equal(await(await amarPublic(new Request('https://amar.singulancelabs.com'+path),env,deps)).text(),'/amar-sai-gadde');
 assert.equal(await amarPublic(new Request('https://next.singulancelabs.com/'),env,deps),null);
});
test('founder cover cannot expose private app or missing asset routes',async()=>{
 for(const path of ['/hivemind/app','/api/session','/static/js/missing.js'])assert.equal((await amarPublic(new Request('https://amar.singulancelabs.com'+path),env,deps)).status,404);
 assert.equal((await amarPublic(new Request('https://amar.singulancelabs.com/',{method:'POST'}),env,deps)).status,405);
});
test('founder discovery and aliases identify one canonical origin',async()=>{
 assert.equal((await amarPublic(new Request('https://amar.singulancelabs.com/amar-sai-gadde'),env,deps)).headers.get('location'),'https://amar.singulancelabs.com/');
 assert.match(await(await amarPublic(new Request('https://amar.singulancelabs.com/sitemap.xml'),env,deps)).text(),/https:\/\/amar.singulancelabs.com\//);
});
