import React from 'react';
import RuntimeProduct from '../src/components/RuntimeProduct';
import RuntimeResearch from '../src/components/RuntimeResearch';
import PublicProduct from '../src/components/PublicProduct';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ResearchIndex from '../src/components/ResearchIndex';
import IcarusResearch from '../src/components/IcarusResearch';
import CsiResearch from '../src/components/CsiResearch';
import PostQuantumResearch from '../src/components/research/PostQuantumResearch';
import BenchmarkResearch from '../src/components/BenchmarkResearch';
import PrivacySecurity from '../src/components/PrivacySecurity';
import CookiePolicy from '../src/components/CookiePolicy';
import MobileHomepage from '../src/components/mobile/MobileHomepage';
import HivemindRedirect from '../src/components/hivemind/HivemindRedirect';
const pages = {'/runtime':<RuntimeProduct/>, '/research/runtime':<RuntimeResearch/>, '/tara':<PublicProduct path="/tara"/>, '/hyperagents':<PublicProduct path="/hyperagents"/>, '/':<MobileHomepage/>, '/hivemind':<HivemindRedirect/>, '/research':<ResearchIndex/>, '/research/icarus':<IcarusResearch/>, '/research/cognitive-swarm-intelligence':<CsiResearch/>, '/research/post-quantum-cryptography':<PostQuantumResearch/>, '/benchmark':<BenchmarkResearch/>, '/privacy':<PrivacySecurity mode="privacy"/>, '/security':<PrivacySecurity mode="security"/>, '/cookies':<CookiePolicy/>};
export async function renderPages(){
 const out={};
 for(const [path,page] of Object.entries(pages)) {
  out[path]=await new Promise((resolve,reject)=>{
   const stream=new PassThrough();let html='';let failure;
   stream.on('data',chunk=>{html+=chunk.toString();});stream.on('end',()=>{clearTimeout(timeout);failure?reject(failure):resolve(html);});stream.on('error',reject);
   const result=renderToPipeableStream(<HelmetProvider context={{}}><MemoryRouter initialEntries={[path]}>{page}</MemoryRouter></HelmetProvider>,{onAllReady(){result.pipe(stream);},onShellError:reject,onError(error){failure=error;}});
   const timeout=setTimeout(()=>{result.abort();reject(new Error('Public render timeout: '+path));},30000);
  });
 }
 return out;
}
