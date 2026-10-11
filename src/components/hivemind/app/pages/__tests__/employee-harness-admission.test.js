import { needsAgentHarnessNavigation } from '../employee-harness-route';

test('Brain overview without native agent handler enters the employee Harness', () => {
  expect(needsAgentHarnessNavigation('/hivemind/app/overview', undefined)).toBe(true);
  expect(needsAgentHarnessNavigation('/hivemind/app/overview/session/saved', undefined)).toBe(true);
});
test('mounted native overview and pending employee startup retain their application', () => {
  expect(needsAgentHarnessNavigation('/hivemind/app/overview/session/saved', () => {})).toBe(false);
  expect(needsAgentHarnessNavigation('/hivemind/app/employee/harness', undefined)).toBe(false);
});
test('non-chat pages enter the employee Harness even if a prior handler remains', () => {
  expect(needsAgentHarnessNavigation('/hivemind/app/workspace', () => {})).toBe(true);
});
