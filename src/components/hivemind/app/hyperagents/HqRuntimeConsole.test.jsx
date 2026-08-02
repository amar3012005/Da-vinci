import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FirstOperatingPlanPanel, projectLifecycleQueueStatus } from './HqRuntimeConsole';

test('renders a truthful domain-neutral first operating plan', () => {
  const markup = renderToStaticMarkup(<FirstOperatingPlanPanel plan={{
    status: 'AWAITING_POLICY',
    proposal_count: 2,
    completed_count: 0,
    items: [
      {
        todo_id: 'one', title: 'Improve the primary customer journey', objective: 'Resolve the highest-evidence constraint.',
        status: 'PROPOSED', recommended: true, recommendation_rank: 1, effect_class: 'internal', evidence_refs: ['baseline-1'],
      },
      {
        todo_id: 'two', title: 'Validate the next opportunity', objective: 'Gather a bounded result before expanding.',
        status: 'PROPOSED', recommended: false, recommendation_rank: 2, effect_class: 'external', evidence_refs: [],
      },
    ],
  }} onReview={() => {}} />);

  expect(markup).toContain('aria-label="First operating plan"');
  expect(markup).toContain('Improve the primary customer journey');
  expect(markup).toContain('Recommended');
  expect(markup).toContain('Choose operating policy');
  expect(markup).not.toMatch(/campaign|outreach|seo/i);
});

test('projects Runtime lifecycle waits from canonical snapshot data', () => {
  expect(projectLifecycleQueueStatus({ status: 'WAITING_AUTHORITY' })).toBe('WAITING_FOR_AUTHORITY');
  expect(projectLifecycleQueueStatus({ status: 'WAITING_EVENT', waiting_for: { types: ['capability.connected'] } })).toBe('WAITING_FOR_CONNECTOR');
  expect(projectLifecycleQueueStatus({ status: 'WAITING_EVENT', waiting_for: { types: ['provider.reply'] } })).toBe('MONITORING');
  expect(projectLifecycleQueueStatus({ status: 'NEEDS_INTERVENTION' })).toBe('NEEDS_ATTENTION');
});
