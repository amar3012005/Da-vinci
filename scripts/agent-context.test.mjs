import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { agentDiscoveryResponse, DISCOVERY_LINKS, isAgentDiscovery } from '../cloudflare/agent-readiness.mjs';

test('agents.txt serves usable public product context with correct content type and HEAD semantics',async()=>{
  assert.equal(isAgentDiscovery('/agents.txt'),true);
  const result=await agentDiscoveryResponse(new Request('https://singulancelabs.com/agents.txt'),'/agents.txt');
  assert.equal(result.status,200);
  assert.match(result.headers.get('content-type'),/text\/plain/);
  const text=await result.text();
  for(const topic of ['HIVEMIND','Runtime','HyperAgents','TARA','Dreaming','Meeting Intelligence','Memory Graph','llms-full.txt','authorization']) assert.ok(text.includes(topic),topic);
  assert.doesNotMatch(text,/\/Users\/|session-[a-z0-9-]+|Bearer [a-zA-Z0-9]{16}/);
  const head=await agentDiscoveryResponse(new Request('https://singulancelabs.com/agents.txt',{method:'HEAD'}),'/agents.txt');
  assert.equal(await head.text(),'');
  assert.match(DISCOVERY_LINKS,/agents.txt/);
});

test('generated discovery connects index, full public text and the agent guide',async()=>{
  const index=await readFile(new URL('../public/llms.txt',import.meta.url),'utf8');
  const full=await readFile(new URL('../public/llms-full.txt',import.meta.url),'utf8');
  assert.match(index,/https:\/\/singulancelabs.com\/agents.txt/);
  assert.match(index,/https:\/\/singulancelabs.com\/llms-full.txt/);
  assert.match(full,/## Runtime: anticipatory work with human control/);
  assert.match(full,/Canonical page: https:\/\/singulancelabs.com/);
});
