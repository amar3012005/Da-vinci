import { workspaceModeForPath } from '../workspace-mode';
import { openDotRoomStatus, ownedOpenDotRoomStatuses } from '../open-dot-room-status';
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

test('background Dot unread requires an owned binding and real local read watermark', () => {
  const roster = [{ id: 'owned', policy_rules: { open_dot_employee: { version: 1, state: 'bound', dot_id: 'dot-owned' } } }];
  const employees = [{ employeeId: 'owned', dotId: 'dot-owned', rooms: [{ conversationId: 'saved', updatedAt: 50, lastAssistantAt: 45, running: true }] }];
  expect(ownedOpenDotRoomStatuses(employees, roster).owned[0].unread).toBe(false);
  expect(ownedOpenDotRoomStatuses(employees, roster, { owned: 40 }).owned[0].unread).toBe(true);
  expect(ownedOpenDotRoomStatuses([{ ...employees[0], dotId: 'foreign' }], roster)).toEqual({});
});
