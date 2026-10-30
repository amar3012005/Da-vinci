import { workspaceModeForPath, workspaceModeDestination, employeeAppsPath, runtimeHostLink } from '../workspace-mode';
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
test('an authenticated bound employee with no room is ready, not unavailable', () => {
  const roster = [{ id: 'owned', policy_rules: { open_dot_employee: { version: 1, state: 'bound', dot_id: 'dot-owned' } } }];
  expect(ownedOpenDotRoomStatuses([{ employeeId: 'owned', dotId: 'dot-owned', rooms: [], agent: { state: 'idle' } }], roster).owned)
    .toMatchObject([{ id: 'owned', serverStatus: true, status: 'idle', running: false, waitingForAnswer: false, actionRequired: false }]);
  expect(ownedOpenDotRoomStatuses([{ employeeId: 'owned', dotId: 'foreign', rooms: [], agent: { state: 'idle' } }], roster)).toEqual({});
});

test('working, waiting and failed come only from the server agent status, never from room flags or stored words', () => {
  const roster = [{ id: 'owned', policy_rules: { open_dot_employee: { version: 1, state: 'bound', dot_id: 'dot-owned' } } }];
  const rooms = [{ conversationId: 'old', updatedAt: 5, status: 'waiting', running: true, waitingForAnswer: true, actionRequired: true, error: true }];
  const without = ownedOpenDotRoomStatuses([{ employeeId: 'owned', dotId: 'dot-owned', status: 'waiting', rooms }], roster).owned;
  expect(without.some(room => room.running || room.waitingForAnswer || room.actionRequired || room.error || room.status)).toBe(false);
  const waiting = ownedOpenDotRoomStatuses([{ employeeId: 'owned', dotId: 'dot-owned', rooms, agent: { state: 'waiting' } }], roster).owned;
  expect(waiting.filter(room => room.waitingForAnswer)).toHaveLength(1);
  const working = ownedOpenDotRoomStatuses([{ employeeId: 'owned', dotId: 'dot-owned', rooms, agent: { state: 'working' } }], roster).owned;
  expect(working.some(room => room.waitingForAnswer || room.actionRequired)).toBe(false);
  expect(working.some(room => room.running)).toBe(true);
  expect(ownedOpenDotRoomStatuses([{ employeeId: 'owned', dotId: 'dot-owned', rooms: [], agent: { state: 'bogus' } }], roster).owned).toEqual([]);
});

test('shared apps use Runtime without changing Brain connectors', () => {
  const path = '/hivemind/app/employee/apps';
  expect(workspaceModeForPath(path)).toBe('hyperagents');
  expect(workspaceModeDestination(path, 'https://runtime-runner.singulancelabs.com')).toBe(path);
  expect(workspaceModeDestination(path, 'https://next.singulancelabs.com')).toBe(`https://runtime-runner.singulancelabs.com${path}`);
  expect(workspaceModeForPath('/hivemind/app/connectors')).toBe('hivemind');
  expect(workspaceModeForPath('/hivemind/app/employee/apps-fake')).toBe('hivemind');
  expect(workspaceModeForPath('/hivemind/app/employee/library')).toBe('hyperagents');
  expect(workspaceModeDestination('/hivemind/app/employee/library', 'https://next.singulancelabs.com')).toBe('https://runtime-runner.singulancelabs.com/hivemind/app/employee/library');
});

test('transport failures retain scoped evidence as stale and auth failures clear it', () => {
 const previous = { owned: [{ id: 'owned', running: true, unread: true, updatedAt: 42 }] };
 const next = reconnectingOpenDotRoomStatuses(previous, 502);
 expect(next.owned[0]).toMatchObject({ stale: true, running: true, unread: true, updatedAt: 42 });
 expect(previous.owned[0].stale).toBeUndefined();
 for (const code of [401, 403, 404]) expect(reconnectingOpenDotRoomStatuses(previous, code)).toEqual({});
});

test('reopening Apps preserves the original employee return route', () => {
 const employee = { pathname: '/hivemind/app/employee/dots/employee/owned', search: '?conversation=saved' };
 const path = employeeAppsPath(employee);
 const url = new URL(path, 'https://runtime-runner.singulancelabs.com');
 expect(url.searchParams.get('return_to')).toBe(employee.pathname + employee.search);
 expect(employeeAppsPath({ pathname: url.pathname, search: url.search })).toBe(path);
});

test('mode switches preserve saved sessions and native local routes', () => {
 const saved = '/hivemind/app/employee/harness/session/saved?view=chat#latest';
 expect(workspaceModeDestination(saved, 'https://next.singulancelabs.com')).toBe('https://runtime-runner.singulancelabs.com' + saved);
 expect(workspaceModeDestination(saved, 'http://localhost:3000')).toBe(saved);
 expect(workspaceModeDestination('/hivemind/app/overview/new', 'https://runtime-runner.singulancelabs.com')).toBe('https://next.singulancelabs.com/hivemind/app/overview/new');
});

test('drawer links to Runtime-owned employee pages leave the Brain host; everything else routes in place', () => {
  const next = 'https://next.singulancelabs.com';
  const runtime = 'https://runtime-runner.singulancelabs.com';
  // CRM documents belong to the Brain host (workspace-authority), so the link routes in place.
  expect(runtimeHostLink(`${next}/hivemind/app/crm`, next)).toBeNull();
  expect(runtimeHostLink(`${next}/hivemind/app/employee/dots/d1?x=1`, next)).toBe(`${runtime}/hivemind/app/employee/dots/d1?x=1`);
  expect(runtimeHostLink(`${next}/hivemind/m/memories`, next)).toBeNull();
  expect(runtimeHostLink(`${runtime}/hivemind/app/crm`, runtime)).toBeNull();
  expect(runtimeHostLink(`${runtime}/hivemind/m/connectors`, runtime)).toBeNull();
  expect(runtimeHostLink('http://localhost:3000/hivemind/app/crm', 'http://localhost:3000')).toBeNull();
});
