const fs = require('fs');
const path = require('path');

test('auth uses the mobile chat return path before the desktop OS shell', () => {
  const auth = fs.readFileSync(path.resolve(__dirname, '../AuthProvider.jsx'), 'utf8');
  const login = fs.readFileSync(path.resolve(__dirname, '../LoginPage.jsx'), 'utf8');

  expect(auth).toContain('defaultAuthReturnUrl(window.location.origin)');
  expect(login).toContain('defaultAuthenticatedPath()');
  expect(login).toContain('isMobileAuthClient() && isDesktopAppLanding');
  expect(login).toContain('emailIntent !== \'register\' && isMobileAuthClient()');
});

test('mobile callback helpers honor mobile viewport and explicit desktop mode', () => {
  const routing = require('../mobile-routing');
  const previousMatchMedia = window.matchMedia;
  const previousSearch = window.location.search;

  try {
    window.matchMedia = () => ({ matches: true });
    window.history.replaceState({}, '', '/hivemind/login');
    expect(routing.defaultAuthReturnUrl('https://example.test'))
      .toBe('https://example.test/hivemind/m/chat?auth=callback');
    expect(routing.defaultAuthenticatedPath()).toBe('/hivemind/m/chat');
    expect(routing.newWorkspaceLanding()).toBe('/hivemind/m/chat');

    window.history.replaceState({}, '', '/hivemind/login?desktop=1');
    expect(routing.defaultAuthReturnUrl('https://example.test'))
      .toBe('https://example.test/hivemind/app/overview?auth=callback');
    expect(routing.defaultAuthenticatedPath()).toBe('/hivemind/app/overview');
    expect(routing.newWorkspaceLanding()).toBe('/hivemind/app/employees/mycompany');
  } finally {
    window.matchMedia = previousMatchMedia;
    window.history.replaceState({}, '', `/hivemind/login${previousSearch}`);
  }
});
