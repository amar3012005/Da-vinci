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

const dayZeroLifecycle = await worker.fetch(
  new Request('https://dev.next.singulancelabs.com/__hivemind/feature-flags/day0-onboarding', {
    method: 'POST', headers: { authorization: 'Bearer edge-secret', 'content-type': 'application/json' },
    body: JSON.stringify({ org_id: 'org-1', user_id: 'user-1' }),
  }),
  {
    ASSETS: { fetch: async () => new Response('unused') },
    HIVE_HARNESS_EDGE_EVAL_SECRET: 'edge-secret',
    FLAGS: { getBooleanValue: async (key, _fallback, context) => key === 'day0_onboarding_v1' && context.targetingKey === 'org-1:user-1' },
  },
);
assert.deepEqual(await dayZeroLifecycle.json(), {
  key: 'day0_onboarding_v1', enabled: true, source: 'cloudflare-flagship',
});

const unauthorizedDayZeroLifecycle = await worker.fetch(
  new Request('https://dev.next.singulancelabs.com/__hivemind/feature-flags/day0-onboarding', { method: 'POST' }),
  envReturning(new Response('unused')),
);
assert.equal(unauthorizedDayZeroLifecycle.status, 401);

const enigmaFlagContext = [];
await worker.fetch(
  new Request('https://dev.next.singulancelabs.com/__hivemind/feature-flags/partner-referrals'),
  {
    ASSETS: { fetch: async () => new Response('unused') },
    FLAGS: { getBooleanValue: async (_key, _fallback, context) => { enigmaFlagContext.push(context); return false; } },
    FLAGSHIP_ENVIRONMENT: 'dev',
    FLAGSHIP_SURFACE: 'hivemind-web-enigma',
  },
);
assert.deepEqual(enigmaFlagContext, [{
  environment: 'dev',
  surface: 'hivemind-web-enigma',
  hostname: 'dev.next.singulancelabs.com',
}]);

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

const onboardingArtwork = await worker.fetch(
  new Request('https://dev.next.singulancelabs.com/assets/onboarding/awakening-1920.webp'),
  envReturning(new Response('webp-bytes', { headers: { 'content-type': 'image/webp' } })),
);
assert.equal(onboardingArtwork.status, 200);
assert.equal(onboardingArtwork.headers.get('content-type'), 'image/webp');
assert.equal(await onboardingArtwork.text(), 'webp-bytes');

const harnessAsset = await worker.fetch(
  new Request('https://dev.next.singulancelabs.com/assets/native-runtime.js', {
    headers: { cookie: 'dsh-auth-session=opaque; hm_harness_admitted=1' },
  }),
  {
    ...envReturning(new Response('public asset should not be used')),
    HARNESS_CHAT: { fetch: async () => new Response('native-runtime', { headers: { 'content-type': 'text/javascript' } }) },
  },
);
assert.equal(await harnessAsset.text(), 'native-runtime');

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
