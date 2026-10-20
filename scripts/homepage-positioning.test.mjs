import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const {html} = JSON.parse(readFileSync(new URL('../cloudflare/generated/public-renderings.json',import.meta.url),'utf8'))['/'];
test('public homepage presents four distinct roles and Runtime coordinates HyperAgents',()=>{
  for(const name of ['HIVEMIND','Runtime','HyperAgents','ICARUS']) assert.ok(html.includes(name),name);
  assert.ok(html.includes('Your proactive, always-on AI Chief of Staff'));
  assert.ok(html.includes('Runtime coordinates their work.'));
  assert.ok(html.includes('href="/hyperagents"'));
  assert.ok(html.includes('href="/runtime"'));
});
test('the post-film story avoids old conflicting positioning and unconditional claims',()=>{
  for(const oldCopy of ['Three minds. One sovereign system.','never forgets','never sent outside','inside your walls','built for regulated Europe','The work it already ships.','87.2%','7.5×']) assert.ok(!html.includes(oldCopy),oldCopy);
  assert.ok(html.includes('Cinematic vision, not a live product demonstration'));
  assert.ok(html.includes('Product demo · Coming soon'));
  assert.ok(html.includes('Bring you in'));
});
