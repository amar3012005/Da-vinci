const fs = require('fs');
const path = require('path');

const read = (relative) => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');

test('fresh mobile workspaces enter chat while desktop and returning landings stay unchanged', () => {
  const routes = read('../../shared/routes.js');
  const onboarding = read('../../pages/Onboarding.jsx');
  const shell = read('../../layout/AppShell.jsx');
  const login = read('../LoginPage.jsx');
  const routing = require('../mobile-routing');

  expect(routes).toContain("NEW_WORKSPACE_LANDING = '/hivemind/app/employees/mycompany'");
  expect(routes).toContain("RETURNING_USER_LANDING = '/hivemind/app/overview'");
  expect(routing.newWorkspaceLanding(true)).toBe('/hivemind/m/chat');
  expect(routing.newWorkspaceLanding(false)).toBe('/hivemind/app/employees/mycompany');
  expect(onboarding).toContain('window.location.href = newWorkspaceLanding()');
  expect(shell).toContain('isNew ? newWorkspaceLanding() : RETURNING_USER_LANDING');
  expect(login).toContain("isMobileAuthClient() && from.pathname.startsWith('/hivemind/app/')");
});
