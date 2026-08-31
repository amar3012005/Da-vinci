const fs = require('fs');
const path = require('path');

const read = (relative) => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');

test('new workspaces enter My Company onboarding while returning users keep Overview', () => {
  const routes = read('../../shared/routes.js');
  const onboarding = read('../../pages/Onboarding.jsx');
  const shell = read('../../layout/AppShell.jsx');

  expect(routes).toContain("NEW_WORKSPACE_LANDING = '/hivemind/app/employees/mycompany'");
  expect(routes).toContain("RETURNING_USER_LANDING = '/hivemind/app/overview'");
  expect(onboarding).toContain('window.location.href = NEW_WORKSPACE_LANDING');
  expect(shell).toContain('isNew ? NEW_WORKSPACE_LANDING : RETURNING_USER_LANDING');
});
