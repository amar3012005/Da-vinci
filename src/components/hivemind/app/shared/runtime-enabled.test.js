jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({}) }));
import { isRuntimeSessionPath, runtimeDisabledDestination, runtimeEnabledFor, runtimeRouteAllowed, setEmployeeRoomOpen, TEAM_PAGE_PATH } from './runtime-enabled';

const dotEmployee = id => ({ id, name: 'Mia', policy_rules: { open_dot_employee: { version: 1, state: 'bound', dot_id: 'dot-1', execution_backend: 'open-dot' } } });
const READY_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

afterEach(() => setEmployeeRoomOpen(false));

test('Runtime stays on unless Control explicitly says false', () => {
  expect(runtimeEnabledFor({ runtime_enabled: false })).toBe(false);
  for (const org of [{ runtime_enabled: true }, {}, null, undefined, { runtime_enabled: 'false' }, { runtime_enabled: 0 }]) expect(runtimeEnabledFor(org)).toBe(true);
});

test('only the Runtime session route and its children count as Runtime', () => {
  for (const path of ['/hivemind/app/employee/harness', '/hivemind/app/employee/harness/new', '/hivemind/app/employee/harness/session/session-abc']) expect(isRuntimeSessionPath(path)).toBe(true);
  for (const path of ['/hivemind/app/employee/harnessing', '/hivemind/app/employee/apps', '/hivemind/app/employee/dots/employee/x', '/hivemind/app/employee/library', '/hivemind/app/employees/mycompany', '/hivemind/app/crm', '/hivemind/app/overview/new']) expect(isRuntimeSessionPath(path)).toBe(false);
});

test('a company without Runtime may only use the route for an employee room it opened on purpose', () => {
  const runtime = { pathname: '/hivemind/app/employee/harness/session/session-abc', search: '' };
  expect(runtimeRouteAllowed(runtime)).toBe(false);
  expect(runtimeRouteAllowed({ pathname: '/hivemind/app/employee/harness', search: '?employee=runtime' })).toBe(false);
  expect(runtimeRouteAllowed({ pathname: '/hivemind/app/employee/harness', search: '?employee=mia' })).toBe(true);
  setEmployeeRoomOpen(true);
  expect(runtimeRouteAllowed(runtime)).toBe(true);
  setEmployeeRoomOpen(false);
  expect(runtimeRouteAllowed({ pathname: '/hivemind/app/employee/apps', search: '' })).toBe(true);
});

test('Runtime links go to the first ready employee, else the team page', () => {
  expect(runtimeDisabledDestination([{ id: 'legacy', name: 'Old' }, dotEmployee(READY_ID), dotEmployee('0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4e')])).toBe(`/hivemind/app/employee/dots/employee/${READY_ID}`);
  expect(runtimeDisabledDestination([{ id: 'legacy', name: 'Old' }, { ...dotEmployee(READY_ID), archived_at: '2026-10-01' }])).toBe(TEAM_PAGE_PATH);
  expect(runtimeDisabledDestination([])).toBe(TEAM_PAGE_PATH);
  expect(runtimeDisabledDestination(undefined)).toBe(TEAM_PAGE_PATH);
  expect(TEAM_PAGE_PATH).toBe('/hivemind/app/employee/apps');
});
