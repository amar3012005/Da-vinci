import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CampaignOperatingReport, { normalizeCampaignReport } from '../CampaignOperatingReport';

const renderReport = (props) => renderToStaticMarkup(<CampaignOperatingReport {...props} />);

const v3Bundle = {
  contract_version: 3,
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
  }],
  evidence: [{ id: 'ev-1', claim: 'Campaign Room product workflow', source: 'Product workflow', status: 'verified' }],
  kpis: [{ name: 'Engagement rate', target: 'Establish a seven-day baseline', source: 'X API' }],
  measurement: { primary_kpi: 'Engagement rate', review_cadence: 'Daily', attribution_limit: 'Organic engagement is directional.' },
  assumptions: [{ assumption: 'Proof-led language will outperform feature lists.', validation: 'Compare post engagement.' }],
  launch_checklist: [{ item: 'Final copy approved', status: 'ready' }],
  quality_gate: { ready: true, checks: { goal_alignment: 'passed', company_grounding: 'passed', channel_completeness: 'passed', provider_validity: 'passed', schedule_completeness: 'passed' } },
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
      v3Bundle.actions[0].final_copy,
      'Use product proof',
      'Campaign Room product workflow',
      'Do not claim guaranteed growth.',
      'Engagement rate',
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
