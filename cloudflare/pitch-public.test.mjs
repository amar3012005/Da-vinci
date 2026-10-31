import test from 'node:test';
import assert from 'node:assert/strict';
import {pitchPublic} from './pitch-public.mjs';
const env={ASSETS:{fetch:async(req)=>new URL(req.url).pathname.endsWith('.jpg')?new Response('jpg',{headers:{'content-type':'image/jpeg'}}):new URL(req.url).pathname.startsWith('/static/js/missing')?new Response('<html/>',{headers:{'content-type':'text/html'}}):new Response('<html/>',{headers:{'content-type':'text/html'}})}};
test('pitch room serves the app shell and deck assets, never indexed',async()=>{
 const home=await pitchPublic(new Request('https://pitch.singulancelabs.com/'),env);
 assert.equal(home.status,200); assert.equal(home.headers.get('x-robots-tag'),'noindex, nofollow');
 const slide=await pitchPublic(new Request('https://pitch.singulancelabs.com/pitch/sales/01.jpg'),env);
 assert.equal(await slide.text(),'jpg'); assert.equal(slide.headers.get('x-robots-tag'),'noindex, nofollow');
 assert.match(await(await pitchPublic(new Request('https://pitch.singulancelabs.com/robots.txt'),env)).text(),/Disallow: \//);
 assert.equal(await pitchPublic(new Request('https://next.singulancelabs.com/'),env),null);
 assert.equal((await pitchPublic(new Request('https://pitch.singulancelabs.com/pitch/market-map'),env)).status,200);
 assert.equal((await pitchPublic(new Request('https://pitch.singulancelabs.com/pitch/market-map.html?embed=1'),env)).headers.get('location'),'https://pitch.singulancelabs.com/pitch/market-map?embed=1');
});
test('pitch room cannot expose private app or missing asset routes',async()=>{
 for(const path of ['/hivemind/app','/api/session','/static/js/missing.js','/pitch/secret.html','/pitch/sales/1.jpg'])assert.equal((await pitchPublic(new Request('https://pitch.singulancelabs.com'+path),env)).status,404);
 assert.equal((await pitchPublic(new Request('https://pitch.singulancelabs.com/',{method:'POST'}),env)).status,405);
});
