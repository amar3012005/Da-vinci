import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AgentRoomStatus, { aggregateAgentRooms } from '../AgentRoomStatus';

const output = (room, collapsed = false) => renderToStaticMarkup(<AgentRoomStatus room={room} collapsed={collapsed} />);

test('working is a spinner, separate from an unread result', () => {
  expect(output({ running: true })).toContain('animate-spin');
  expect(output({ running: true })).not.toContain('Unread update');
  expect(output({ unread: true })).toContain('bg-green-500');
  expect(output({ unread: true })).not.toContain('animate-spin');
});

test('action and schedule indicators require explicit native facts', () => {
  expect(output({ running: true, unread: true })).not.toContain('Action required');
  expect(output({ running: true, unread: true })).not.toContain('Work scheduled');
  expect(output({ actionRequired: true, scheduled: true })).toContain('Action required');
  expect(output({ actionRequired: true, scheduled: true })).toContain('Work scheduled');
  expect(output({ actionRequired: 'true', scheduled: 'true' })).toBe('');
  expect(output(undefined)).toBe('');
});

test('collapsed sidebar retains accessible status without a long label', () => {
  const value = output({ running: true, unread: true, actionRequired: true, scheduled: true }, true);
  expect(value).toContain('absolute right-1 top-1');
  expect(value).toContain('sr-only');
  expect(value).toContain('Action required');
  expect(value).toContain('aria-label="Working"');
});

 test('a newer idle room cannot hide another room activity or approval', () => {
  const rooms = [
    { id: 'ravi', updatedAt: 1, preview: 'Working', running: true, actionRequired: true, scheduled: true, unread: true },
    { id: 'ravi', updatedAt: 2, preview: 'Latest', running: false },
    { id: 'elena', updatedAt: 3, preview: 'Another agent', running: true },
  ];
  expect(aggregateAgentRooms(rooms, 'ravi')).toMatchObject({ preview: 'Latest', running: true, actionRequired: true, scheduled: true, unread: true });
  expect(aggregateAgentRooms(rooms, 'elena')).toMatchObject({ preview: 'Another agent', actionRequired: false, scheduled: false, unread: false });
  expect(aggregateAgentRooms(rooms, 'missing')).toBeUndefined();
  expect(rooms[0].preview).toBe('Working');
 });
