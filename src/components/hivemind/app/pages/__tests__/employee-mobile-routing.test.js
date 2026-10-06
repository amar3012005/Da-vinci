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
test('native Brain and employee routes never divert to legacy mobile chat', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'Overview.jsx'), 'utf8');
  expect(source).not.toContain('shouldUseMobileChat');
  expect(source).not.toContain('MobileChatRedirect');
  const router = fs.readFileSync(path.resolve(__dirname, '../../HiveMindApp.jsx'), 'utf8');
  expect(router).toContain('<Navigate to="/hivemind/app/overview" replace />');
  expect(router).not.toContain('<TalkToHiveMobile');
});
