import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {parseDocument} from 'htmlparser2';
import RENDERED from '../cloudflare/generated/public-renderings.json' with {type:'json'};
import {PUBLIC_PAGES,canonicalFor,schemaFor} from '../src/seo/public-pages.mjs';
import {DEFINITION,FAQS} from '../src/seo/visibility-content.mjs';
const paths=['/proactive-intelligence','/about','/amar-sai-gadde'];
const nodes=(n,pred)=>[...(pred(n)?[n]:[]),...(n.children||[]).flatMap(c=>nodes(c,pred))];
const text=n=>n.type==='text'?n.data:(n.children||[]).map(text).join('');
for(const path of paths)test(`public HTML, metadata and discovery agree for ${path}`,async()=>{
 const page=PUBLIC_PAGES[path],render=RENDERED[path];assert.ok(render?.html);
 const root=parseDocument(render.html);const headings=nodes(root,n=>n.name==='h1');
 assert.equal(headings.length,1);assert.equal(text(headings[0]),page.heading);
 assert.equal(canonicalFor(path),path==='/amar-sai-gadde'?'https://amar.singulancelabs.com/':'https://singulancelabs.com'+path);
 for(const f of ['sitemap.xml','llms.txt','llms-full.txt'])assert.ok((await readFile(new URL('../public/'+f,import.meta.url),'utf8')).includes(canonicalFor(path).replace(/\/$/,'')));
 assert.doesNotMatch(render.html,/session-[a-z0-9-]{20,}|Bearer [A-Za-z0-9]{16}|\/Users\//);
});
test('definition and every structured FAQ answer are visible in the rendered page',()=>{
 const root=parseDocument(RENDERED['/proactive-intelligence'].html),visible=text(root);assert.ok(visible.includes(DEFINITION));
 const faq=schemaFor('/proactive-intelligence')['@graph'].find(n=>n['@type']==='FAQPage');
 assert.equal(faq.mainEntity.length,FAQS.length);
 for(const q of faq.mainEntity){assert.ok(visible.includes(q.name));assert.ok(visible.includes(q.acceptedAnswer.text));}
});
test('founder and company use stable linked identities without invented credentials',()=>{
 const graph=schemaFor('/about')['@graph'];const org=graph.find(n=>n['@type']==='Organization'),person=graph.find(n=>n['@type']==='Person');
 assert.equal(org.founder['@id'],person['@id']);assert.equal(person.name,'Amar Sai Gadde');assert.equal(person.worksFor['@id'],org['@id']);
 assert.equal(person.alumniOf,undefined);assert.equal(org.award,undefined);assert.equal(org.aggregateRating,undefined);
});
test('existing product pages lead back to the canonical definition',()=>{
 for(const path of ['/','/hivemind','/hyperagents','/runtime','/getruntime','/icarus'])assert.ok(RENDERED[path].html.includes('https://singulancelabs.com/proactive-intelligence')||RENDERED[path].html.includes('href="/proactive-intelligence"'),path);
 assert.match(PUBLIC_PAGES['/runtime'].title,/SINGULANCE Runtime/);
});
test('founder background retains study status and excludes sensitive source details',()=>{
 const visible=text(parseDocument(RENDERED['/amar-sai-gadde'].html));
 for(const fact of ['Engineering Physics studies','IIT Mandi','Leibniz Universität Hannover','2025–26','working-student role','B&B Markenagentur GmbH','Foodles','Autonomous aerial robotics'])assert.ok(visible.includes(fact),fact);
 assert.doesNotMatch(visible,/passport|iban|recovery.code|client.secret|salary|date of birth|@gmail\.com|@students\.|Master of|Ph\.D|graduated/i);
 const person=schemaFor('/amar-sai-gadde')['@graph'].find(n=>n['@type']==='Person');
 assert.equal(person.hasCredential,undefined);assert.equal(person.alumniOf,undefined);
});

test('product identity links to the company without fabricated pricing or review claims',()=>{
 for(const path of ['/hivemind','/runtime','/getruntime','/hyperagents','/tara','/icarus']){
  const graph=schemaFor(path)['@graph'];const app=graph.find(n=>n['@type']==='SoftwareApplication');const page=graph.find(n=>n['@type']==='WebPage');
  assert.equal(page.mainEntity['@id'],app['@id']);assert.equal(app.publisher['@id'],'https://singulancelabs.com/#organization');
  assert.equal(app.offers,undefined);assert.equal(app.aggregateRating,undefined);
 }
 assert.equal(schemaFor('/getruntime')['@graph'].find(n=>n['@type']==='SoftwareApplication')['@id'],schemaFor('/runtime')['@graph'].find(n=>n['@type']==='SoftwareApplication')['@id']);
});
