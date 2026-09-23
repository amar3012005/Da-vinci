const fs = require('fs');
const path = require('path');

test('auth uses the mobile chat return path before the desktop OS shell', () => {
  const auth = fs.readFileSync(path.resolve(__dirname, '../AuthProvider.jsx'), 'utf8');
  const login = fs.readFileSync(path.resolve(__dirname, '../LoginPage.jsx'), 'utf8');
  const routing = fs.readFileSync(path.resolve(__dirname, '../mobile-routing.js'), 'utf8');

  expect(auth).toContain('defaultAuthReturnUrl(window.location.origin)');
  expect(login).toContain('defaultAuthenticatedPath()');
  expect(login).toContain('isMobileAuthClient() && isDesktopAppLanding');
  expect(routing).toContain("'/hivemind/m/chat'");
  expect(routing).toContain("params.get('desktop') === '1'");
});
