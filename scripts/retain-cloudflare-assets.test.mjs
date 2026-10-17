import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshotProductionAssets, restoreRetainedAssets } from './retain-cloudflare-assets.mjs';

const a = '/static/js/1.aaaaaaaa.chunk.js';
const b = '/static/js/2.bbbbbbbb.chunk.js';
const c = '/static/js/3.cccccccc.chunk.js';
function production({ history = [[b], [c]], missing = null } = {}) {
  const requests = [];
  return { requests, fetcher: async input => {
    const path = new URL(input).pathname; requests.push(path);
    if (new URL(input).hostname.startsWith('69eda68b-') && path === '/asset-manifest.json') return Response.json({ files: { 'main.js': '/static/js/main.cc29df13.js' } });
    if (path === '/asset-manifest.json') return Response.json({ files: { main: a, html: '/index.html', api: '/v1/bootstrap' } });
    if (path === '/asset-history.json') return history === null ? new Response('Not found', { status: 404 }) : Response.json({ version: 1, generations: history });
    return path === missing ? new Response('Not found', { status: 404 })
      : new Response(`/* ${path} */`, { headers: { 'content-type': 'application/javascript' } });
  } };
}

test('keeps exactly two previous generations; private and older files never enter the artifact', async () => {
  const remote = production();
  const snapshot = await snapshotProductionAssets(remote.fetcher);
  assert.deepEqual(snapshot.generations, [[a], [b]]);
  assert.equal(remote.requests.includes(c), false);
  assert.equal(remote.requests.includes('/v1/bootstrap'), false);
  const directory = await mkdtemp(join(tmpdir(), 'hm-assets-'));
  try {
    await restoreRetainedAssets(directory, snapshot);
    assert.equal(await readFile(join(directory, a.slice(1)), 'utf8'), `/* ${a} */`);
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'asset-history.json'))).generations, [[a], [b]]);
  } finally { await rm(directory, { recursive: true }); }
});

test('first retention release recovers the observed older release from its immutable Worker version', async () => {
  const snapshot = await snapshotProductionAssets(production({ history: null }).fetcher);
  assert.deepEqual(snapshot.generations, [[a], ['/static/js/main.cc29df13.js']]);
});

test('missing old code and malicious history fail the build instead of publishing a broken promise', async () => {
  await assert.rejects(snapshotProductionAssets(production({ missing: b }).fetcher), /Cannot retain/);
  await assert.rejects(snapshotProductionAssets(production({ history: [['/api/session']] }).fetcher), /Invalid retained asset path/);
});

test('never overwrites different bytes at a content-hashed URL', async () => {
  const snapshot = await snapshotProductionAssets(production().fetcher);
  const directory = await mkdtemp(join(tmpdir(), 'hm-assets-'));
  try {
    await mkdir(join(directory, 'static/js'), { recursive: true });
    await writeFile(join(directory, a.slice(1)), 'new bytes');
    await assert.rejects(restoreRetainedAssets(directory, snapshot), /Hashed asset collision/);
    assert.equal(await readFile(join(directory, a.slice(1)), 'utf8'), 'new bytes');
  } finally { await rm(directory, { recursive: true }); }
});
