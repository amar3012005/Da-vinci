import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const ORIGIN = 'https://next.singulancelabs.com';
const HISTORY = '/asset-history.json';
// One-time recovery for the observed cc29df13 tab. This is an immutable,
// already-public Worker version, not an alternate application/API origin.
const RECOVERY_ORIGIN = 'https://69eda68b-hivemind-web.amarsai2005.workers.dev';
const MAX_BYTES = 40 * 1024 * 1024;
const staticPath = path => typeof path === 'string'
  && /^\/static\/(?:js|css|media)\/[A-Za-z0-9_.-]+$/.test(path)
  && /\.[a-f0-9]{8,}\./.test(path) && !path.endsWith('.map');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// Only public, content-addressed build output crosses release boundaries.
// Never retain documents, manifests, cookies, bootstrap or API responses.
export async function snapshotProductionAssets(fetcher = fetch) {
  // Retry transient transport failures only; validation still fails closed.
  const request = async (url, options) => {
    for (let attempt = 0; ; attempt++) {
      try { return await fetcher(url, { ...options, signal: AbortSignal.timeout(30000) }); } catch (error) {
        if (attempt === 3) throw new Error(`Cannot download retained public asset ${url.pathname}`, { cause: error });
        await delay(300 * (attempt + 1));
      }
    }
  };
  const get = path => request(new URL(path, ORIGIN), {
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000),
  });
  const manifestResponse = await get('/asset-manifest.json');
  if (!manifestResponse.ok) throw new Error('Cannot read the production asset manifest');
  const manifest = await manifestResponse.json();
  const current = [...new Set(Object.values(manifest.files || {}).filter(staticPath))].sort();
  if (!current.length) throw new Error('Production manifest has no hashed assets');
  const historyResponse = await get(HISTORY);
  let previous = [];
  let recoveryPaths = new Set();
  if (historyResponse.ok && /application\/json/i.test(historyResponse.headers.get('content-type') || '')) {
    const history = await historyResponse.json();
    if (history.version !== 1 || !Array.isArray(history.generations)) throw new Error('Invalid asset history');
    previous = history.generations;
  } else if (historyResponse.status !== 404 && !/text\/html/i.test(historyResponse.headers.get('content-type') || '')) {
    throw new Error('Cannot read production asset history');
  } else {
    const recoveryResponse = await request(new URL('/asset-manifest.json', RECOVERY_ORIGIN), {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000),
    });
    if (!recoveryResponse.ok) throw new Error('Cannot recover the observed older release');
    const recoveryManifest = await recoveryResponse.json();
    if (recoveryManifest.files?.['main.js'] !== '/static/js/main.cc29df13.js') throw new Error('Recovery release identity changed');
    const paths = [...new Set(Object.values(recoveryManifest.files).filter(staticPath))].sort();
    previous = [paths]; recoveryPaths = new Set(paths);
  }
  const generations = [current, ...previous].filter((paths, index, all) => {
    if (!Array.isArray(paths) || !paths.every(staticPath)) throw new Error('Invalid retained asset path');
    return all.findIndex(other => JSON.stringify(other) === JSON.stringify(paths)) === index;
  }).slice(0, 3);
  const paths = [...new Set(generations.flat())];
  const files = new Map();
  let bytes = 0;
  let cursor = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (cursor < paths.length) {
      const path = paths[cursor++];
      const response = recoveryPaths.has(path) && !current.includes(path)
        ? await request(new URL(path, RECOVERY_ORIGIN), { redirect: 'error', signal: AbortSignal.timeout(30000) })
        : await get(path);
      const type = response.headers.get('content-type') || '';
      if (!response.ok || /text\/html/i.test(type)
        || (path.endsWith('.js') && !/javascript/i.test(type))
        || (path.endsWith('.css') && !/text\/css/i.test(type))) throw new Error(`Cannot retain ${path}`);
      const body = Buffer.from(await response.arrayBuffer());
      bytes += body.length;
      if (bytes > MAX_BYTES) throw new Error('Previous release assets exceed the retention budget');
      files.set(path, body);
    }
  }));
  return { generations, files };
}

export async function restoreRetainedAssets(buildDirectory, { generations, files }) {
  let added = 0;
  for (const [path, bytes] of files) {
    const destination = join(buildDirectory, path.slice(1));
    let existing;
    try { existing = await readFile(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (existing) {
      if (digest(existing) !== digest(bytes)) throw new Error(`Hashed asset collision: ${path}`);
      continue;
    }
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: 'wx' });
    added++;
  }
  await writeFile(join(buildDirectory, HISTORY.slice(1)), JSON.stringify({ version: 1, generations }));
  console.log(`Retained ${added} additional hashed assets from ${generations.length} previous releases.`);
}
