import { workspaceModeForPath } from '../workspace-mode';
import { openDotRoomStatus } from '../open-dot-room-status';
test('Brain and employee workspaces use one truthful mode', () => {
  for (const route of ['/hivemind/app/overview/new', '/hivemind/app/knowledge', '/hivemind/app/employee/dots-fake']) expect(workspaceModeForPath(route)).toBe('hivemind');
  for (const route of ['/hivemind/app/employee/dots/employee/owned', '/hivemind/app/employee/harness/session/saved', '/hivemind/app/employees', '/hivemind/app/employee/create']) expect(workspaceModeForPath(route)).toBe('hyperagents');
});
test('Dot status uses explicit evidence and rejects another employee', () => {
  const event = { type: 'hivemind.open-dot.room-status', version: 1, employeeId: 'owned', rooms: [{ conversationId: 'saved', updatedAt: 42, running: true, unread: true, waitingForAnswer: true, actionRequired: true, error: true }] };
  expect(openDotRoomStatus(event, 'foreign')).toBeNull();
  expect(openDotRoomStatus(event, 'owned')[0]).toMatchObject({ id: 'owned', running: true, unread: true, actionRequired: true, error: true });
  expect(openDotRoomStatus({ ...event, rooms: [{ conversationId: 'saved', updatedAt: 43 }] }, 'owned')[0]).toMatchObject({ running: false, unread: false, actionRequired: false, error: false });
});
