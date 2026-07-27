import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CampaignOperatingReport, { normalizeCampaignReport } from '../CampaignOperatingReport';

const renderReport = (props) => renderToStaticMarkup(<CampaignOperatingReport {...props} />);

const v3Bundle = {
  contract_version: 4,
  summary: 'Launch the Singulance awareness campaign',
  strategy: 'Lead with concrete proof that Campaign Rooms produce executable work.',
  strategy_options: [
    { id: 'proof', name: 'Proof led', thesis: 'Show the finished work.', tradeoff: 'Requires clear product evidence.' },
    { id: 'control', name: 'Control led', thesis: 'Lead with governance.', tradeoff: 'Less emotionally direct.' },
    { id: 'speed', name: 'Speed led', thesis: 'Lead with coordination.', tradeoff: 'Avoid timing claims.' },
  ],
  selected_strategy_id: 'proof',
  company_grounding: { company_name: 'Singulance', facts_used: ['Campaign Rooms produce structured plans.'], unknowns: [] },
  campaign_horizon: { duration_days: 14, intensity: 'focused', rationale: 'Build a useful baseline.' },
  positioning: { statement: 'Run your company with AI, with a human launch decision.' },
  audience: {
    rationale: 'Operations leaders need outcomes rather than another chat interface.',
    segments: [{ name: 'Operators', description: 'Small teams coordinating growth work.' }],
    safety_notes: ['Do not claim guaranteed growth.'],
  },
  content_pillars: [{ title: 'Proof of work', description: 'Show the finished campaign artifact.' }],
  debate_decisions: [{ decision: 'Use product proof', rationale: 'The reviewer rejected abstract AI claims.' }],
  actions: [{
    id: 'x-1',
    channel: 'x_organic',
    title: 'Campaign Rooms in action',
    final_copy: 'A campaign should leave the room ready to run.',
    payload: { text: 'A campaign should leave the room ready to run.' },
    scheduled_at: '2026-07-27T09:30:00Z',
    scheduled_offset_minutes: 0,
    rationale: 'Demonstrate the operating outcome.',
    format: 'single_post',
    creative_brief: { required: true, concept: 'Show the finished Campaign Board.' },
    claim_status: 'verified',
    evidence_ids: ['ev-1'],
    hypothesis_id: 'proof-hypothesis',
    dependencies: ['Approved X connection'],
    success_measure: 'Establish an organic engagement baseline.',
    rollback_or_exit: 'Pause the remaining sequence if provider validation fails.',
  }],
  evidence: [{ id: 'ev-1', claim: 'Campaign Room product workflow', source: 'Product workflow', source_type: 'company', confidence: 'high', status: 'verified' }],
  media_plan: { currency: null, channels: [{ channel: 'x_organic', role: 'Organic awareness and message learning', rationale: 'Use the connected X audience for the first message test.', budget_amount: 0, prerequisites: ['Approved X connection'], exclusions: ['No paid promotion'] }] },
  creative_system: { approved_claim_ids: ['ev-1'], hypotheses: [
    { id: 'proof-hypothesis', insight: 'Operators need finished work.', promise: 'Show the approval-ready result.', hook: 'A campaign should leave the room ready to run.', cta: 'Inspect the plan.', channels: ['x_organic'], experiment_hypothesis: 'Proof-led copy earns qualified engagement.' },
    { id: 'control-hypothesis', insight: 'Operators need control over external actions.', promise: 'Keep launch approval-bound.', hook: 'AI can plan without publishing.', cta: 'Review the workflow.', channels: ['x_organic'], experiment_hypothesis: 'Control-led copy earns trust-oriented replies.' },
  ] },
  launch_plan: { mode: 'draft_only', approval_mode: 'APPROVE_PLAN_ONCE', prerequisites: ['Confirm X identity'], blocked_by: ['Approve the final visual'], ceilings: [], verification_steps: ['Read back the published Post'], rollback_steps: ['Pause remaining scheduled actions'] },
  monitoring_plan: { baseline: 'Capture the X account baseline before launch.', primary_outcome: 'Qualified organic engagement', attribution_limit: 'Engagement does not prove revenue causation.', checkpoints: [{ timing: '24 hours after each Post', metrics: ['Impressions', 'Engagements'], decision_rule: 'Review message resonance; do not auto-optimize.' }], optimization_requires_approval: true },
  kpis: [{ name: 'Engagement rate', target: 'Establish a seven-day baseline', source: 'X API' }],
  measurement: { primary_kpi: 'Engagement rate', review_cadence: 'Daily', attribution_limit: 'Organic engagement is directional.' },
  assumptions: [{ assumption: 'Proof-led language will outperform feature lists.', validation: 'Compare post engagement.' }],
  launch_checklist: [{ item: 'Final copy approved', status: 'ready' }],
  quality_gate: { ready: true, checks: { goal_alignment: 'passed', company_grounding: 'passed', channel_completeness: 'passed', provider_validity: 'passed', schedule_completeness: 'passed', evidence_integrity: 'passed', creative_completeness: 'passed', launch_safety: 'passed', measurement_readiness: 'passed' } },
};

describe('CampaignOperatingReport', () => {
  it('renders a high-level interactive Campaign Board from a V3 bundle', () => {
    const markup = renderReport({ report: { bundle: v3Bundle } });

    [
      'Campaign Board',
      v3Bundle.summary,
      v3Bundle.positioning.statement,
      'Proof led',
      'Recommended',
      '14 days',
      'Operators',
      'Proof of work',
      'Channel roles',
      'X Organic Posts',
      'Organic awareness and message learning',
      'Creative hypotheses',
      'Proof-led copy earns qualified engagement.',
      v3Bundle.actions[0].final_copy,
      'Establish an organic engagement baseline.',
      'Pause the remaining sequence if provider validation fails.',
      'Approved X connection',
      'Use product proof',
      'Campaign Room product workflow',
      'Company · High · Product workflow',
      'Do not claim guaranteed growth.',
      'Engagement rate',
      'Capture the X account baseline before launch.',
      '24 hours after each Post',
      'Approve the final visual',
      'Proof-led language will outperform feature lists.',
      'Final copy approved',
      'Campaign sequence',
      'Copy',
      '46/280 characters',
      'Jul 27, 2026',
    ].forEach((value) => expect(markup).toContain(value));
    expect(markup).toContain('role="tablist"');
    expect(markup).not.toContain('Not included in this campaign plan.');
  });

  it('distinguishes regular X posts from paid X ads throughout the report', () => {
    const bundle = JSON.parse(JSON.stringify(v3Bundle));
    bundle.actions.push({ ...bundle.actions[0], id: 'paid-x-1', channel: 'x_ads', title: 'Paid amplification' });
    bundle.media_plan.channels.push({ channel: 'x_ads', role: 'Paid reach', rationale: 'Amplify approved creative.', budget_amount: 100, prerequisites: ['X Ads approval'], exclusions: [] });

    const markup = renderReport({ report: { bundle } });

    expect(markup).toContain('X Organic Posts');
    expect(markup).toContain('Paid X Ads');
  });

  it('degrades gracefully for the existing bundle contract', () => {
    const legacy = {
      strategy: 'Publish one concise awareness post.',
      audience: { rationale: 'Existing followers interested in AI operations.' },
      content_pillars: ['Clarity'],
      actions: [{
        id: 'legacy-x',
        channel: 'x_organic',
        title: 'Awareness post',
        final_copy: 'See how Campaign Rooms turn a goal into a launch-ready plan.',
        payload: { text: 'See how Campaign Rooms turn a goal into a launch-ready plan.' },
        scheduled_offset_minutes: 0,
        rationale: 'Open with the product outcome.',
      }],
      kpis: [{ name: 'Impressions', target: 'Measure from baseline', source: 'X' }],
      risks: ['Do not imply measured results.'],
    };

    const markup = renderReport({ report: { bundle: legacy }, taskTitle: 'X awareness campaign' });

    expect(markup).toContain('X awareness campaign');
    expect(markup).toContain('Launch day');
    expect(markup).toContain(legacy.actions[0].final_copy);
    expect(markup).toContain('Do not imply measured results.');
    expect(markup).toContain('Launch readiness');
  });

  it('preserves legacy markdown when no structured bundle is available', () => {
    const markup = renderReport({ report: { content: '## Campaign Strategy\nBuild trust with proof.' }, taskTitle: 'Legacy campaign' });

    expect(markup).toContain('Legacy campaign');
    expect(markup).toContain('Legacy campaign report');
    expect(markup).toContain('Build trust with proof.');
  });

  it('normalizes JSON report content without requiring a separate bundle prop', () => {
    const normalized = normalizeCampaignReport({ content: JSON.stringify(v3Bundle) });
    expect(normalized.hasBundle).toBe(true);
    expect(normalized.actions).toHaveLength(1);
    expect(normalized.actions[0].finalCopy).toBe(v3Bundle.actions[0].final_copy);
    expect(normalized.strategyOptions).toHaveLength(3);
    expect(normalized.companyName).toBe('Singulance');
  });
});
