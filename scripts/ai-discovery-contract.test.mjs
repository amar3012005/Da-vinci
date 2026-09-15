import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import worker from '../cloudflare/worker.mjs';

const root = new URL('..', import.meta.url);
const readPublic = (name) => readFile(new URL(`public/${name}`, root), 'utf8');

test('public discovery files permit retrieval but reserve training and omit private workspace links', async () => {
  const robots = await readPublic('robots.txt');
  const llms = await readPublic('llms.txt');
  const full = await readPublic('llms-full.txt');

  assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=no, use=reference/);
  assert.match(robots, /User-agent: OAI-SearchBot/);
  assert.match(robots, /User-agent: ClaudeBot/);
  assert.match(robots, /User-agent: PerplexityBot/);
  assert.match(robots, /Disallow: \/hivemind\/app\//);
  assert.match(robots, /Disallow: \/invite\//);
  assert.match(robots, /Sitemap: https:\/\/singulancelabs\.com\/sitemap\.xml/);

  for (const content of [llms, full]) {
    assert.match(content, /https:\/\/singulancelabs\.com/);
    assert.doesNotMatch(content, /https:\/\/[^\s]*\/hivemind\/app/);
  }
  assert.match(llms, /not licensed for model training or fine-tuning/i);
});

test('the edge worker exposes discovery assets only on public marketing hosts', async () => {
  const assets = {
    fetch: async () => new Response('public discovery asset', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    }),
  };

  const publicRobots = await worker.fetch(new Request('https://singulancelabs.com/robots.txt'), { ASSETS: assets });
  assert.equal(publicRobots.status, 200);
  assert.equal(await publicRobots.text(), 'public discovery asset');
  assert.equal(publicRobots.headers.get('x-robots-tag'), null);

  const privateRobots = await worker.fetch(new Request('https://next.singulancelabs.com/robots.txt'), { ASSETS: assets });
  assert.equal(privateRobots.status, 200);
  assert.match(await privateRobots.text(), /Disallow: \//);
  assert.match(privateRobots.headers.get('x-robots-tag'), /noindex/);

  const privateLlms = await worker.fetch(new Request('https://admin.hivemind.singulancelabs.com/llms.txt'), { ASSETS: assets });
  assert.equal(privateLlms.status, 404);
  assert.match(privateLlms.headers.get('x-robots-tag'), /noindex/);
});

test('the edge worker marks authenticated-host HTML responses as non-indexable', async () => {
  const assets = {
    fetch: async () => new Response('<!doctype html><title>Application</title>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }),
  };

  const response = await worker.fetch(new Request('https://next.singulancelabs.com/hivemind/app/overview'), { ASSETS: assets });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
});
