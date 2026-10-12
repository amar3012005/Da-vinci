import React from 'react';
import { render, screen } from '@testing-library/react';
import AgentRoomStatus, { aggregateAgentRooms } from './AgentRoomStatus';
test('renders native working, unread, scheduled and input status on mobile', () => {
  render(<AgentRoomStatus compact room={{ running: true, unread: true, scheduled: true, actionRequired: true }} />);
  expect(screen.getByRole('img', { name: 'Working' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Unread update' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Work scheduled' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('Action required');
});
test('combines only rooms for the selected employee', () => {
  expect(aggregateAgentRooms([{ id: 'romeo', updatedAt: 1, scheduled: true }, { id: 'romeo', updatedAt: 2, running: true }, { id: 'other', updatedAt: 3, actionRequired: true }], 'romeo')).toMatchObject({ running: true, scheduled: true, actionRequired: false });
});
test('shows a pulsing bell for an unanswered native question and clears it when answered', () => {
  const view = render(<AgentRoomStatus room={{ actionRequired: true, waitingForAnswer: true }} />);
  expect(screen.getByRole('status').textContent).toContain('Waiting for your response');
  expect(view.container.querySelector('svg').classList.contains('animate-pulse')).toBe(true);
  view.rerender(<AgentRoomStatus room={{ actionRequired: false, waitingForAnswer: false }} />);
  expect(screen.queryByRole('status')).toBeNull();
});

test('shows a connected call independently of model work and clears on end', () => {
  const view = render(<AgentRoomStatus room={{ activeCall: true }} />);
  expect(screen.getByRole('img', { name: 'In call' })).toBeTruthy();
  expect(screen.queryByRole('img', { name: 'Working' })).toBeNull();
  view.rerender(<AgentRoomStatus room={{ activeCall: false }} />);
  expect(screen.queryByRole('img', { name: 'In call' })).toBeNull();
});
test('retains an active call from an older same-agent room without leaking another agent', () => {
  expect(aggregateAgentRooms([{ id: 'runtime', updatedAt: 1, activeCall: true }, { id: 'runtime', updatedAt: 2 }, { id: 'other', updatedAt: 3, actionRequired: true }], 'runtime'))
    .toMatchObject({ activeCall: true, actionRequired: false });
  expect(aggregateAgentRooms([{ id: 'other', updatedAt: 3, activeCall: true }], 'runtime')).toBeUndefined();
});
