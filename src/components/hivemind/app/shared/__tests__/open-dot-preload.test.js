import { openDotPreloadRoute, preloadAllowed, rememberOpenDotRoute } from '../open-dot-preload';
const EMPLOYEE = 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07';
const route = `/hivemind/app/employee/dots/employee/${EMPLOYEE}`;
const bound = { id: EMPLOYEE, policy_rules: { open_dot_employee: { version: 1, state: 'bound', dot_id: 'dot_a' } } };
beforeEach(() => localStorage.clear());
test('stores only canonical employee routes, per owner scope', () => {
  rememberOpenDotRoute('u:o', '/hivemind/app/employee/dots'); rememberOpenDotRoute(':', route); rememberOpenDotRoute('u:o', `${route}/`);
  expect(openDotPreloadRoute('u:o', undefined)).toBe(route);
  expect(openDotPreloadRoute('other:o', undefined)).toBeNull();
  expect(openDotPreloadRoute(':', [bound])).toBeNull();
});
test('falls back to the first bound employee in the cached roster', () => {
  expect(openDotPreloadRoute('u:o', [{ id: 'runtime' }, { ...bound, status: 'paused' }, bound])).toBe(route);
  expect(openDotPreloadRoute('u:o', [{ id: EMPLOYEE }])).toBeNull();
});
test('skips background loading on Data Saver and 2G', () => {
  Object.defineProperty(navigator, 'connection', { configurable: true, value: { effectiveType: '2g' } });
  expect(preloadAllowed()).toBe(false);
  Object.defineProperty(navigator, 'connection', { configurable: true, value: { effectiveType: '4g' } });
  expect(preloadAllowed()).toBe(true);
  Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
});

test('a parked native chat is reported only for its own application and owner', () => {
  const { parkNativeHarnessSeat, takeNativeHarnessSeat, hasParkedNativeHarnessSeat, clearNativeHarnessSeat } = require('../native-harness-seat');
  const app = {}; const container = document.createElement('div'); document.body.append(container);
  expect(hasParkedNativeHarnessSeat(app, 'u:o')).toBe(false);
  expect(parkNativeHarnessSeat(app, container, '/hivemind/app/employee/dots/employee/x', 'u:o')).toBe(true);
  expect(hasParkedNativeHarnessSeat(app, 'u:o')).toBe(true);
  expect(hasParkedNativeHarnessSeat({}, 'u:o')).toBe(false);
  expect(hasParkedNativeHarnessSeat(app, 'other:o')).toBe(false);
  takeNativeHarnessSeat(app, document.body, 'u:o'); clearNativeHarnessSeat();
  expect(hasParkedNativeHarnessSeat(app, 'u:o')).toBe(false);
});
