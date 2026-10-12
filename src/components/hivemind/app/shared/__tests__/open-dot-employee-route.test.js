import { hasOpenDotEmployeeBinding, openDotEmployeePath } from '../open-dot-employee-route';

const readyEmployee = (overrides = {}) => ({
  id: 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07',
  name: 'Maya',
  role: 'Research lead',
  avatar_url: '/maya.png',
  status: 'active',
  archived_at: null,
  policy_rules: {
    native_lifecycle: { phase: 'active' },
    open_dot_employee: { version: 1, state: 'bound', dot_id: 'owned-dot-id' },
  },
  ...overrides,
});

test('routes a ready canonical employee in-app by its unchanged HIVE employee ID', () => {
  const employee = readyEmployee();
  expect(openDotEmployeePath(employee)).toBe('/hivemind/app/employee/dots/employee/c14aaef5-24fb-46c2-806c-c3f6c1d88b07');
  expect(employee).toMatchObject({ id: 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07', name: 'Maya', role: 'Research lead', avatar_url: '/maya.png' });
});

test('accepts the lifecycle response camel-case metadata shape', () => {
  const employee = readyEmployee({
    archived_at: undefined,
    archivedAt: null,
    policy_rules: undefined,
    policyRules: {
      native_lifecycle: { phase: 'active' },
      open_dot_employee: { version: 1, state: 'bound' },
    },
  });
  expect(openDotEmployeePath(employee)).toBe('/hivemind/app/employee/dots/employee/c14aaef5-24fb-46c2-806c-c3f6c1d88b07');
});

test('workspace routing does not depend on task-dispatch readiness', () => {
  const employee = readyEmployee({
    policy_rules: { open_dot_employee: { version: 1, state: 'bound', execution_state: 'provisioning' } },
  });
  expect(openDotEmployeePath(employee)).toBe('/hivemind/app/employee/dots/employee/c14aaef5-24fb-46c2-806c-c3f6c1d88b07');
});

test.each([
  ['provisioning', readyEmployee({ policy_rules: { open_dot_employee: { version: 1, state: 'provisioning' } } })],
  ['paused', readyEmployee({ status: 'paused' })],
  ['archived', readyEmployee({ archived_at: '2026-10-12T00:00:00Z' })],
  ['inactive lifecycle', readyEmployee({ policy_rules: { native_lifecycle: { phase: 'provisioning' }, open_dot_employee: { version: 1, state: 'bound' } } })],
  ['Runtime', readyEmployee({ id: 'runtime' })],
])('does not route a %s employee through Open Dot', (_label, employee) => {
  expect(openDotEmployeePath(employee)).toBeNull();
});

test.each(['runtime', 'not-a-canonical-employee-id', '../dot_other'])('does not route noncanonical employee identity %s', id => {
  expect(openDotEmployeePath(readyEmployee({ id }))).toBeNull();
});

test('recognizes provisioning Open Dot identities so the sidebar does not start native DSH', () => {
  const employee = readyEmployee({ policy_rules: { open_dot_employee: { version: 1, state: 'provisioning' } } });
  expect(hasOpenDotEmployeeBinding(employee)).toBe(true);
  expect(openDotEmployeePath(employee)).toBeNull();
});

test('leaves ordinary employees on the existing native room path', () => {
  const employee = readyEmployee({ policy_rules: {} });
  expect(hasOpenDotEmployeeBinding(employee)).toBe(false);
  expect(openDotEmployeePath(employee)).toBeNull();
});
