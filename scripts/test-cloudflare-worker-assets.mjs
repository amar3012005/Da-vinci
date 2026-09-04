import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';

function envReturning(response, flagValue = false) {
  return {
    ASSETS: { fetch: async () => response },
    FLAGS: { getBooleanValue: async () => flagValue },
  };
}

const enableToolsHitl = await worker.fetch(
  new Request('https://admin.hivemind.singulancelabs.com/__hivemind/feature-flags/enable-tools-hitl'),
  {
    ASSETS: { fetch: async () => new Response('unused') },
    FLAGS: {
      getBooleanValue: async (key) => key === 'enable-tools-hitl',
    },
  },
);
assert.equal(enableToolsHitl.status, 200);
assert.deepEqual(await enableToolsHitl.json(), {
  key: 'enable-tools-hitl',
  enabled: true,
  source: 'cloudflare-flagship',
});

const enabledFlag = await worker.fetch(
  new Request('https://admin.hivemind.singulancelabs.com/__hivemind/feature-flags/partner-referrals'),
  envReturning(new Response('unused'), true),
);
assert.equal(enabledFlag.status, 200);
assert.equal(enabledFlag.headers.get('cache-control'), 'no-store');
assert.deepEqual(await enabledFlag.json(), {
  key: 'partner_referrals_v1',
  enabled: true,
  source: 'cloudflare-flagship',
});

const unavailableFlag = await worker.fetch(
  new Request('https://admin.hivemind.singulancelabs.com/__hivemind/feature-flags/partner-referrals'),
  {
    ASSETS: { fetch: async () => new Response('unused') },
    FLAGS: { getBooleanValue: async () => { throw new Error('unavailable'); } },
  },
);
assert.equal((await unavailableFlag.json()).enabled, false);

const missingAsset = await worker.fetch(
  new Request('https://next.singulancelabs.com/static/js/missing.chunk.js'),
  envReturning(new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } })),
);
assert.equal(missingAsset.status, 404);
assert.equal(missingAsset.headers.get('x-content-type-options'), 'nosniff');
assert.equal(missingAsset.headers.get('cache-control'), 'no-store');

const missingAgentPrompt = await worker.fetch(
  new Request('https://icarus.singulancelabs.com/agent-setup/prompt.md'),
  envReturning(new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } })),
);
assert.equal(missingAgentPrompt.status, 404);
assert.equal(missingAgentPrompt.headers.get('content-type'), 'text/plain; charset=utf-8');

const agentPrompt = new Response('# ICARUS coding-agent setup', {
  headers: { 'content-type': 'text/markdown; charset=utf-8' },
});
const servedAgentPrompt = await worker.fetch(
  new Request('https://icarus.singulancelabs.com/agent-setup/prompt.md'),
  envReturning(agentPrompt),
);
assert.equal(servedAgentPrompt.status, 200);
assert.equal(servedAgentPrompt.headers.get('content-type'), 'text/markdown; charset=utf-8');
assert.match(servedAgentPrompt.headers.get('x-robots-tag'), /noindex/);
assert.equal(await servedAgentPrompt.text(), '# ICARUS coding-agent setup');

const javascript = new Response('self.webpackChunk=[];', {
  headers: { 'content-type': 'text/javascript' },
});
const servedJavaScript = await worker.fetch(
  new Request('https://next.singulancelabs.com/static/js/present.chunk.js'),
  envReturning(javascript),
);
assert.equal(servedJavaScript.status, 200);
assert.equal(servedJavaScript.headers.get('content-type'), 'text/javascript');
assert.match(servedJavaScript.headers.get('x-robots-tag'), /noindex/);
assert.equal(await servedJavaScript.text(), 'self.webpackChunk=[];');

const spa = new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } });
const servedSpa = await worker.fetch(
  new Request('https://next.singulancelabs.com/hivemind/app/mycompany'),
  envReturning(spa),
);
assert.equal(servedSpa.status, 200);
assert.equal(servedSpa.headers.get('content-type'), 'text/html');
assert.match(servedSpa.headers.get('x-robots-tag'), /noindex/);
assert.equal(await servedSpa.text(), '<!doctype html>');

console.log('cloudflare static asset boundary: ok');
