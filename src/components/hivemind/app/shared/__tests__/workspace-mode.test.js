import { workspaceModeForPath, workspaceModeDestination } from '../workspace-mode';
import { openDotRoomStatus, ownedOpenDotRoomStatuses, reconnectingOpenDotRoomStatuses } from '../open-dot-room-status';
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

test('shared apps keep employee shell and Runtime host without changing Brain connectors', () => {
  const path = '/hivemind/app/employee/apps';
  expect(workspaceModeForPath(path)).toBe('hyperagents');
  expect(workspaceModeDestination(path, 'https://runtime-runner.singulancelabs.com')).toBe(path);
  expect(workspaceModeDestination(path, 'https://next.singulancelabs.com')).toBe(`https://runtime-runner.singulancelabs.com${path}`);
  expect(workspaceModeForPath('/hivemind/app/connectors')).toBe('hivemind');
  expect(workspaceModeForPath('/hivemind/app/employee/apps-fake')).toBe('hivemind');
});

test('transport failures retain scoped evidence as stale and auth failures clear it', () => {
 const previous = { owned: [{ id: 'owned', running: true, unread: true, updatedAt: 42 }] };
 const next = reconnectingOpenDotRoomStatuses(previous, 502);
 expect(next.owned[0]).toMatchObject({ stale: true, running: true, unread: true, updatedAt: 42 });
 expect(previous.owned[0].stale).toBeUndefined();
 for (const code of [401, 403, 404]) expect(reconnectingOpenDotRoomStatuses(previous, code)).toEqual({});
});
