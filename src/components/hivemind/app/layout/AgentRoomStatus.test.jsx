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
