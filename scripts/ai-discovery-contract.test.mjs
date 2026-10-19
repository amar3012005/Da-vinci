import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import worker from '../cloudflare/worker.mjs';

const root = new URL('..', import.meta.url);
const readPublic = (name) => readFile(new URL(`public/${name}`, root), 'utf8');

test('public discovery files permit retrieval but reserve training and exclude private session data', async () => {
  const robots = await readPublic('robots.txt');
  const llms = await readPublic('llms.txt');
  const full = await readPublic('llms-full.txt');

  assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=no/);
  assert.match(robots, /Disallow: \/hivemind\//);
  assert.match(robots, /Disallow: \/invite\//);
  assert.match(robots, /Sitemap: https:\/\/singulancelabs\.com\/sitemap\.xml/);

  for (const content of [llms, full]) {
    assert.match(content, /https:\/\/singulancelabs\.com/);
    assert.doesNotMatch(content, /session-[a-z0-9-]{20,}|Bearer [a-zA-Z0-9]{16}|\/Users\//);
  }
  assert.match(llms, /model training is not authorized/i);
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
  assert.equal(privateRobots.status, 302);
  assert.equal(privateRobots.headers.get('location'), 'https://singulancelabs.com/robots.txt');

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
