import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AgentRoomStatus from '../AgentRoomStatus';

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
