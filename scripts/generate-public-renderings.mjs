import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { parseDocument } from 'htmlparser2';
import { PUBLIC_PAGES, SITE } from '../src/seo/public-pages.mjs';
process.env.NODE_ENV='production';
const require=createRequire(import.meta.url);
await build({entryPoints:['scripts/public-render-entry.jsx'],bundle:true,platform:'node',format:'cjs',outfile:'scripts/.public-render.cjs',packages:'bundle',external:['react','react-dom/server','react-helmet-async','react-router-dom'],loader:{'.js':'jsx','.css':'empty','.svg':'dataurl','.png':'dataurl','.jpg':'dataurl','.webp':'dataurl'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'warning'});
const rendered=await require('./.public-render.cjs').renderPages();
const walk=n=>{
 if(n.type==='text')return n.data.replace(/\s+/g,' ');
 if(['script','style','svg','button','nav'].includes(n.name))return '';
 const text=(n.children||[]).map(walk).join('');
 if(/^h[1-6]$/.test(n.name||''))return '\n\n'+'#'.repeat(Number(n.name[1]))+' '+text.trim()+'\n\n';
 if(n.name==='a') {const href=n.attribs?.href;return href&&text.trim()?`[${text.trim()}](${href.startsWith('/')?SITE+href:href})`:text;}
 if(n.name==='img')return n.attribs?.alt?`\n![${n.attribs.alt}](${n.attribs.src?.startsWith('/')?SITE+n.attribs.src:n.attribs.src})\n`:'';
 if(n.name==='li')return '\n- '+text.trim();
 if(n.name==='tr')return '\n| '+text.trim()+' |';
 if(['td','th'].includes(n.name))return text.trim()+' | ';
 if(['p','div','section','article','header','footer','main','ul','ol','table','pre'].includes(n.name))return '\n\n'+text.trim()+'\n\n';
 if(n.name==='br')return '\n';
 return text;
};
const pages=Object.fromEntries(Object.entries(rendered).map(([path,body])=>{
 let html=body.replace(/style="([^"]*)"/g,(all,style)=>`style="${style.replace(/(^|;)opacity:0(?=;|$)/g,'$1opacity:1').replace(/(^|;)visibility:hidden(?=;|$)/g,'$1visibility:visible')}"`);
 const productLinks='<nav aria-label="SINGULANCE products" style="display:flex;flex-wrap:wrap;gap:20px;padding:20px 24px;background:#05070f;color:#dce8ff;font:600 14px system-ui"><a style="color:inherit" href="/">SINGULANCE</a><a style="color:inherit" href="/hivemind">HIVEMIND</a><a style="color:inherit" href="/tara">TARA</a><a style="color:inherit" href="/hyperagents">HYPERAGENTS</a><a style="color:inherit" href="https://next.singulancelabs.com/hivemind/login">Open your workspace</a></nav>';
 html=productLinks+html;
 if(path==='/')html='<h1 class="sr-only">SINGULANCE — AI workforce that runs inside memory</h1>'+html;
 const markdown=walk(parseDocument(html)).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()+`\n\n## Products and workspace\n\n- [HIVEMIND](${SITE}/hivemind)\n- [TARA](${SITE}/tara)\n- [HyperAgents](${SITE}/hyperagents)\n- [Open your workspace](https://next.singulancelabs.com/hivemind/login) — company conversations, traces and artifacts require sign-in and authorization.\n`;
 return [path,{html,markdown}];
}));
mkdirSync('cloudflare/generated',{recursive:true});
writeFileSync('cloudflare/generated/public-renderings.json',JSON.stringify(pages));
unlinkSync('scripts/.public-render.cjs');
console.log('Rendered',Object.keys(pages).length,'public pages from React source');
