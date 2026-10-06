/** Loopback-only visual demo for the real isolated Core fixture API. No production auth. */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const apiOrigin = new URL(process.env.CRM_DEMO_API_ORIGIN || 'http://127.0.0.1:62535');
if (apiOrigin.protocol !== 'http:' || apiOrigin.hostname !== '127.0.0.1') throw new Error('Only an isolated loopback Core demo is accepted');
const output = await mkdtemp(join(tmpdir(), 'crm-ui-demo-'));
await build({ entryPoints: ['scripts/crm-demo-entry.jsx'], bundle: true, outfile: join(output, 'demo.js'), define: { 'process.env.NODE_ENV': '"development"', 'process.env.REACT_APP_HIVE_APP_RUNTIME_ENABLED': '"true"' }, loader: { '.css': 'css' } });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/demo-api') {
      const actor = url.searchParams.get('actor');
      const path = url.searchParams.get('path');
      if (!['a', 'b'].includes(actor) || !/^\/api\/app-runtime\/apps(?:[/?]|$)/.test(path || '')) { res.writeHead(400); res.end(); return; }
      const response = await fetch(new URL(path, apiOrigin), { headers: { 'x-crm-demo-actor': actor } });
      res.writeHead(response.status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(await response.text()); return;
    }
    if (['/demo.js', '/demo.css'].includes(url.pathname)) { res.writeHead(200, { 'content-type': url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript' }); res.end(await readFile(join(output, url.pathname.slice(1)))); return; }
    if (url.pathname !== '/') { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
    res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your CRM · isolated demo</title><link rel="stylesheet" href="/demo.css"><style>body{margin:0;background:#fafbf7;font-family:system-ui}button,select{font:inherit;cursor:pointer}button{border:0;background:none}h1,h2,h3,p{margin:0 0 12px}</style></head><body><div id="root"></div><script src="/demo.js"></script></body></html>');
  } catch { res.writeHead(502); res.end('Isolated demo unavailable'); }
});
server.listen(62635, '127.0.0.1', () => console.log('Isolated visual demo: http://127.0.0.1:62635'));
process.on('SIGINT', () => server.close());
