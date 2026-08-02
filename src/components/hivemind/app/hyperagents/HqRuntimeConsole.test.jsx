import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentRuntimeTasksPanel, projectLifecycleQueueStatus } from './HqRuntimeConsole';

test('renders one truthful domain-neutral Agent Runtime task panel', () => {
  const markup = renderToStaticMarkup(<AgentRuntimeTasksPanel firstLife={{
    status: 'AWAITING_START',
  }} queue={[
      {
        id: 'one', title: 'Improve the primary customer journey', objective: 'Resolve the highest-evidence constraint.',
        status: 'PROPOSED', recommended: true, recommendation_rank: 1, effect_class: 'internal', evidence_refs: ['baseline-1'],
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
  expect(markup).toContain('Proposed');
  expect(markup).not.toContain('>Ready<');
  expect(markup).not.toMatch(/campaign|outreach|seo/i);
});

test('projects Runtime lifecycle waits from canonical snapshot data', () => {
  expect(projectLifecycleQueueStatus({ status: 'WAITING_AUTHORITY' })).toBe('WAITING_FOR_AUTHORITY');
  expect(projectLifecycleQueueStatus({ status: 'WAITING_EVENT', waiting_for: { types: ['capability.connected'] } })).toBe('WAITING_FOR_CONNECTOR');
  expect(projectLifecycleQueueStatus({ status: 'WAITING_EVENT', waiting_for: { types: ['provider.reply'] } })).toBe('MONITORING');
  expect(projectLifecycleQueueStatus({ status: 'NEEDS_INTERVENTION' })).toBe('NEEDS_ATTENTION');
});
