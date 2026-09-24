import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare/worker.mjs';

test('the private Day 0 gate evaluates the unified pre-onboarding flag', async () => {
  const evaluated = [];
  const response = await worker.fetch(
    new Request('https://next.singulancelabs.com/__hivemind/feature-flags/day0-onboarding', {
      method: 'POST',
      headers: { authorization: 'Bearer edge-secret', 'content-type': 'application/json' },
      body: JSON.stringify({ org_id: 'org-1', user_id: 'user-1' }),
    }),
    {
      ASSETS: { fetch: async () => new Response('unused') },
      HIVE_HARNESS_EDGE_EVAL_SECRET: 'edge-secret',
      FLAGS: {
        getBooleanDetails: async (key, fallback, context) => {
          evaluated.push(key);
          assert.equal(fallback, false);
          assert.equal(context.targetingKey, 'org-1:user-1');
          return { value: key === 'pre_onboarding_lifecycle_v1', evaluationId: `${key}-evaluation` };
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    key: 'pre_onboarding_lifecycle_v1',
    source: 'cloudflare-flagship',
    enabled: true,
    evaluation_id: 'pre_onboarding_lifecycle_v1-evaluation',
    report_flag_key: 'day0_report_editorial_v1',
    report_editorial_enabled: false,
    report_evaluation_id: 'day0_report_editorial_v1-evaluation',
  });
  assert.deepEqual(evaluated, ['pre_onboarding_lifecycle_v1', 'day0_report_editorial_v1']);
});

test('the private Day 0 gate can enable the editorial report independently', async () => {
  const response = await worker.fetch(
    new Request('https://next.singulancelabs.com/__hivemind/feature-flags/day0-onboarding', {
      method: 'POST',
      headers: { authorization: 'Bearer edge-secret', 'content-type': 'application/json' },
      body: JSON.stringify({ org_id: 'org-1', user_id: 'user-1' }),
    }),
    {
      HIVE_HARNESS_EDGE_EVAL_SECRET: 'edge-secret',
      FLAGS: {
        getBooleanDetails: async (key) => ({ value: key === 'day0_report_editorial_v1', evaluationId: `${key}-evaluation` }),
      },
    },
  );
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.enabled, false);
  assert.equal(result.report_flag_key, 'day0_report_editorial_v1');
  assert.equal(result.report_editorial_enabled, true);
});

test('the private Day 0 gate fails closed without edge authorization', async () => {
  const response = await worker.fetch(
    new Request('https://next.singulancelabs.com/__hivemind/feature-flags/day0-onboarding', { method: 'POST' }),
    { ASSETS: { fetch: async () => new Response('unused') } },
  );
  assert.equal(response.status, 401);
});
