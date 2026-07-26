import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CampaignOperatingReport, { normalizeCampaignReport } from '../CampaignOperatingReport';

const renderReport = (props) => renderToStaticMarkup(<CampaignOperatingReport {...props} />);

const v2Bundle = {
  summary: 'Launch the Singulance awareness campaign',
  strategy: 'Lead with concrete proof that Campaign Rooms produce executable work.',
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
    evidence: ['Campaign Room product workflow'],
  }],
  kpis: [{ name: 'Engagement rate', target: 'Establish a seven-day baseline', source: 'X API' }],
  assumptions: [{ assumption: 'Proof-led language will outperform feature lists.', validation: 'Compare post engagement.' }],
  launch_checklist: [{ item: 'Final copy approved', status: 'ready' }],
};

describe('CampaignOperatingReport', () => {
  it('renders the complete campaign operating report from a V2 bundle', () => {
    const markup = renderReport({ report: { bundle: v2Bundle } });

    [
      v2Bundle.summary,
      v2Bundle.positioning.statement,
      'Operators',
      'Proof of work',
      v2Bundle.actions[0].final_copy,
      'Use product proof',
      'Campaign Room product workflow',
      'Do not claim guaranteed growth.',
      'Engagement rate',
      'Proof-led language will outperform feature lists.',
      'Final copy approved',
      'Timeline',
      'Jul 27, 2026',
    ].forEach((value) => expect(markup).toContain(value));
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
    expect(markup).toContain('Immediately after launch');
    expect(markup).toContain(legacy.actions[0].final_copy);
    expect(markup).toContain('Do not imply measured results.');
    expect(markup).toContain('Debate decisions');
  });

  it('preserves legacy markdown when no structured bundle is available', () => {
    const markup = renderReport({ report: { content: '## Campaign Strategy\nBuild trust with proof.' }, taskTitle: 'Legacy campaign' });

    expect(markup).toContain('Legacy campaign');
    expect(markup).toContain('Campaign brief');
    expect(markup).toContain('Build trust with proof.');
  });

  it('normalizes JSON report content without requiring a separate bundle prop', () => {
    const normalized = normalizeCampaignReport({ content: JSON.stringify(v2Bundle) });
    expect(normalized.hasBundle).toBe(true);
    expect(normalized.actions).toHaveLength(1);
    expect(normalized.actions[0].finalCopy).toBe(v2Bundle.actions[0].final_copy);
  });
});
