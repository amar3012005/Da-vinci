import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentRuntimeTasksPanel, ExternalActionMarker, GrowthBrief, NarrativeEvent, projectLifecycleQueueStatus } from './HqRuntimeConsole';
import { CampaignLaunchPreview, GmailMessagePreview } from './RuntimeAuthorityPreview';

test('renders one truthful domain-neutral Agent Runtime task panel', () => {
  const markup = renderToStaticMarkup(<AgentRuntimeTasksPanel firstLife={{
    status: 'AWAITING_START',
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

  expect(markup).toContain('aria-label="Agent Runtime tasks"');
  expect(markup).toContain('Improve the primary customer journey');
  expect(markup).toContain('Start recommended work');
  expect(markup).toContain('Review later');
  expect(markup).toContain('Recommended');
  expect(markup).toContain('A measurable customer result');
  expect(markup).toContain('Proposed');
  expect(markup).not.toContain('>Ready<');
  expect(markup).not.toMatch(/campaign|outreach|seo/i);
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

test('renders persisted email content as a Gmail composer preview', () => {
  const markup = renderToStaticMarkup(<GmailMessagePreview message={{
    to: 'lead@example.com', subject: 'A relevant idea', body: 'Grounded message body.',
  }} />);
  expect(markup).toContain('aria-label="Gmail message preview"');
  expect(markup).toContain('lead@example.com');
  expect(markup).toContain('Grounded message body.');
});

test('renders provider-confirmed actions inline as one fixed carousel marker', () => {
  const markup = renderToStaticMarkup(<ExternalActionMarker item={{
    id: 'event-1', createdAt: '2026-08-03T10:00:00Z', title: 'Actions launched',
    details: { items: [
      { id: 'mail-1', presentation_type: 'message', status: 'sent', headline: 'Congratulations! Your email was sent.', payload: { to: 'lead@example.com', subject: 'Hello', body: 'A grounded note.' } },
      { id: 'call-1', presentation_type: 'call', status: 'dialing', headline: 'Your TARA outreach call has started.', payload: { prospect: 'Amar', phone: '+49123', goal: 'Discuss the product.' } },
      { id: 'post-1', presentation_type: 'social_post', channel: 'linkedin', status: 'published', headline: 'Your LinkedIn post was published.', payload: { final_copy: 'A published update.' } },
    ] },
  }} />);
  expect(markup).toContain('data-testid="runtime-external-action-marker"');
  expect(markup).toContain('3 actions launched');
  expect(markup).toContain('lead@example.com');
  expect(markup).toContain('aria-label="TARA call preview"');
  expect(markup).toContain('aria-label="LinkedIn post preview"');
  expect(markup).toContain('h-[430px]');
});
