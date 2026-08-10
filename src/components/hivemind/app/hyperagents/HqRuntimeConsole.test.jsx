import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentRuntimeTasksPanel, ExternalActionMarker, GrowthBrief, NarrativeEvent, collectRuntimeArtifacts, mergeRuntimeTaskProjection, projectLifecycleQueueStatus } from './HqRuntimeConsole';
import { CampaignLaunchPreview, GmailMessagePreview, RuntimeCampaignCanvas } from './RuntimeAuthorityPreview';

test('renders one truthful domain-neutral Runtime Tasks panel with the Growth Brief first', () => {
  const markup = renderToStaticMarkup(<AgentRuntimeTasksPanel firstLife={{
    status: 'AWAITING_START',
  }} growthBrief={{
    current_position: 'Current retained position.',
    primary_constraint: { statement: 'Primary evidenced constraint.' },
    evidence_refs: ['baseline-1'],
  }} queue={[
      {
        id: 'one', title: 'Improve the primary customer journey', objective: 'Resolve the highest-evidence constraint.',
        status: 'PROPOSED', recommended: true, recommendation_rank: 1, effect_class: 'internal', evidence_refs: ['baseline-1'],
        expected_outcome: 'A measurable customer result', selection_reason: 'It has the strongest retained evidence.',
      },
      {
        id: 'two', title: 'Validate the next opportunity', objective: 'Gather a bounded result before expanding.',
        status: 'PROPOSED', recommended: false, recommendation_rank: 2, effect_class: 'external', evidence_refs: [],
      },
    ]} onDecision={() => {}} />);

  expect(markup).toContain('aria-label="Artifacts and Runtime tasks"');
  expect(markup).toContain('Artifacts');
  expect(markup).toContain('Growth brief');
  expect(markup).toContain('Improve the primary customer journey');
  expect(markup).toContain('Start recommended work');
  expect(markup).toContain('Review later');
  expect(markup).toContain('Recommended');
  expect(markup).toContain('A measurable customer result');
  expect(markup).toContain('Proposed');
  expect(markup).not.toContain('>Ready<');
  expect(markup).not.toMatch(/campaign|outreach|seo/i);
  expect(markup.indexOf('Growth brief')).toBeLessThan(markup.indexOf('Improve the primary customer journey'));
});

test('projects unique persisted Runtime artifacts from the brief and task checkpoints', () => {
  expect(collectRuntimeArtifacts([
    { artifact_refs: [{ id: 'receipt-1', key: 'provider_receipt', status: 'ACCEPTED' }] },
    { artifact_refs: [{ id: 'receipt-1', key: 'provider_receipt', status: 'ACCEPTED' }, { id: 'report-1', key: 'room_report' }] },
  ], { baseline_id: 'baseline-1', plan_id: 'plan-1', evidence_refs: ['baseline-1'] })).toEqual([
    { id: 'baseline-1', key: 'company_baseline' },
    { id: 'plan-1', key: 'growth_plan' },
    { id: 'receipt-1', key: 'provider_receipt', status: 'ACCEPTED' },
    { id: 'report-1', key: 'room_report' },
  ]);
});

test('keeps later user-instruction todos in the same queue as first-life opportunities', () => {
  const merged = mergeRuntimeTaskProjection([
    { id: 'planned', title: 'Recommended proposal', status: 'RUNNING' },
    { id: 'instruction', title: 'User-requested follow-up', status: 'READY' },
  ], [
    { id: 'planned', title: 'Recommended proposal', status: 'PROPOSED', recommended: true },
    { id: 'remaining', title: 'Dormant proposal', status: 'PROPOSED' },
  ]);
  expect(merged.map((item) => item.id)).toEqual(['planned', 'instruction', 'remaining']);
  expect(merged.find((item) => item.id === 'planned').status).toBe('RUNNING');
  expect(merged.find((item) => item.id === 'planned').recommended).toBe(true);
});

test('renders explicit zero while omitting unobserved baseline values', () => {
  const markup = renderToStaticMarkup(<NarrativeEvent active={false} item={{
    eventType: 'baseline_observation', sequence: '4', createdAt: '2026-08-03T10:00:00Z',
    title: 'lead_customer_activity', summary: 'observed',
    details: { source_key: 'lead_customer_activity', status: 'observed', facts: { total: 0, website: null } },
  }} />);
  expect(markup).toContain('total: 0');
  expect(markup).not.toContain('website:');
});

test('renders the evidence-backed Growth Brief without fabricating confidence', () => {
  const markup = renderToStaticMarkup(<GrowthBrief brief={{
    current_position: 'Current retained position.',
    primary_constraint: { statement: 'Primary evidenced constraint.' },
    supporting_evidence: ['Observed fact.'],
    material_unknowns: ['A source was not observed.'],
    evidence_refs: ['baseline-1'],
    recommended_motion: { title: 'Begin the recommended motion', selection_reason: 'Highest evidence.' },
  }} />);
  expect(markup).toContain('Current retained position.');
  expect(markup).toContain('Primary evidenced constraint.');
  expect(markup).toContain('A source was not observed.');
  expect(markup).toContain('Evidence bounded');
});

test('projects Runtime lifecycle waits from canonical snapshot data', () => {
  expect(projectLifecycleQueueStatus({ status: 'WAITING_AUTHORITY' })).toBe('WAITING_FOR_AUTHORITY');
  expect(projectLifecycleQueueStatus({ status: 'WAITING_EVENT', waiting_for: { types: ['capability.connected'] } })).toBe('WAITING_FOR_CONNECTOR');
  expect(projectLifecycleQueueStatus({ status: 'WAITING_EVENT', waiting_for: { types: ['provider.reply'] } })).toBe('MONITORING');
  expect(projectLifecycleQueueStatus({ status: 'NEEDS_INTERVENTION' })).toBe('NEEDS_ATTENTION');
});

test('renders persisted campaign actions in platform-native review frames', () => {
  const markup = renderToStaticMarkup(<CampaignLaunchPreview campaign={{
    name: 'SINGULANCE', status: 'READY_FOR_APPROVAL', actions: [
      { id: 'x', channel: 'x_organic', payload: { text: 'A truthful text-only post.' }, assets: [] },
      { id: 'instagram', channel: 'instagram', payload: { final_copy: 'An Instagram launch note.' }, assets: [] },
      { id: 'linkedin', channel: 'linkedin', payload: { final_copy: 'A LinkedIn launch note.' }, assets: [] },
    ],
  }} />);
  expect(markup).toContain('aria-label="X post preview"');
  expect(markup).toContain('aria-label="Instagram post preview"');
  expect(markup).toContain('aria-label="LinkedIn post preview"');
  expect(markup).toContain('“A truthful text-only post.”');
});

test('renders queued campaign visuals as a three-up Runtime carousel without hiding retained copy', () => {
  const actions = ['x_organic', 'instagram', 'linkedin', 'x_organic'].map((channel, index) => ({
    id: `post-${index}`, channel, status: 'READY', scheduled_at: `2026-08-1${index}T10:00:00Z`,
    payload: { final_copy: `Persisted caption ${index}` },
    assets: [{ id: `asset-${index}`, status: index === 0 ? 'READY' : 'GENERATING', content_url: index === 0 ? '/asset.png' : null, metadata: {} }],
  }));
  const markup = renderToStaticMarkup(<RuntimeCampaignCanvas campaign={{ id: 'campaign-1', name: 'First campaign', actions }} />);
  expect(markup).toContain('aria-label="Campaign posts rendering"');
  expect(markup).toContain('Persisted caption 1');
  expect(markup).toContain('Rendering visual');
  expect(markup).toContain('xl:w-[calc(33.333%-11px)]');
  expect(markup).toContain('aria-label="Next campaign posts"');
});

test('renders persisted email content as a Gmail composer preview', () => {
  const markup = renderToStaticMarkup(<GmailMessagePreview message={{
    to: 'lead@example.com', subject: 'A relevant idea', body: 'Grounded message body.',
  }} />);
  expect(markup).toContain('aria-label="Gmail message preview"');
  expect(markup).toContain('lead@example.com');
  expect(markup).toContain('Grounded message body.');
});

test('renders provider-confirmed artifacts directly in a flat transcript carousel', () => {
  const markup = renderToStaticMarkup(<ExternalActionMarker item={{
    id: 'event-1', createdAt: '2026-08-03T10:00:00Z', title: 'Actions launched',
    details: { items: [
      { id: 'mail-1', presentation_type: 'message', status: 'sent', headline: 'Congratulations! Your email was sent.', payload: { to: 'lead@example.com', subject: 'Hello', body: 'A grounded note.' } },
      { id: 'call-1', presentation_type: 'call', status: 'dialing', headline: 'Your TARA outreach call has started.', payload: { prospect: 'Amar', phone: '+49123', goal: 'Discuss the product.' } },
      { id: 'post-1', presentation_type: 'social_post', channel: 'linkedin', status: 'published', headline: 'Your LinkedIn post was published.', payload: { final_copy: 'A published update.' } },
    ] },
  }} />);
  expect(markup).toContain('data-testid="runtime-external-action-marker"');
  expect(markup).not.toContain('Provider-confirmed action');
  expect(markup).not.toContain('3 actions launched');
  expect(markup).toContain('lead@example.com');
  expect(markup).toContain('aria-label="TARA call preview"');
  expect(markup).toContain('aria-label="LinkedIn post preview"');
  expect(markup).toContain('h-[390px]');
  expect(markup).toContain('aria-label="Show next artifact"');
  expect(markup).not.toContain('Previous launched action');
  expect(markup).not.toContain('border border-[#171717]');
});

test('renders persisted email break tags as plain message spacing', () => {
  const markup = renderToStaticMarkup(<GmailMessagePreview message={{
    to: 'lead@example.com', subject: 'Hello', body: 'First line.<br/><br/>Second line.',
  }} />);
  expect(markup).toContain('First line.\n\nSecond line.');
  expect(markup).not.toContain('&lt;br');
});
