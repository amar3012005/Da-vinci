import fs from 'node:fs';
import path from 'node:path';
import { isEmployeeHarnessRoute } from '../employee-harness-route';
test.each([
  '/hivemind/app/employee/harness',
  '/hivemind/app/employee/harness/',
  '/hivemind/app/employee/harness/new',
  '/hivemind/app/employee/harness/session/runtime-room',
  '/hivemind/app/employee/harness/session/employee-room',
])('preserves native employee route %s on mobile', route => {
  expect(isEmployeeHarnessRoute(route)).toBe(true);
});
test.each(['/hivemind/app/overview', '/hivemind/app/overview/new', '/hivemind/m/chat', '/hivemind/app/employee/harness-other'])('retains existing routing outside employee rooms: %s', route => {
  expect(isEmployeeHarnessRoute(route)).toBe(false);
});
test('employee route exclusion runs before device/viewport/query redirects', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'Overview.jsx'), 'utf8');
  const check = source.indexOf('if (isEmployeeHarnessRoute(pathname)) return false;');
  expect(check).toBeGreaterThan(-1);
  expect(check).toBeLessThan(source.indexOf("const narrowViewport = window.matchMedia"));
  expect(source).toContain('if (shouldUseMobileChat(pathname)) return <MobileChatRedirect />;');
});
