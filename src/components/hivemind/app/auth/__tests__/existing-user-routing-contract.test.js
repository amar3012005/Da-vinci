const fs = require('fs');
const path = require('path');

test('existing users cannot re-enter personal or enterprise creation', () => {
  const login = fs.readFileSync(path.resolve(__dirname, '../LoginPage.jsx'), 'utf8');
  const provider = fs.readFileSync(path.resolve(__dirname, '../AuthProvider.jsx'), 'utf8');

  expect(login).toContain('if (wantsCreate && needsOnboarding) return');
  expect(login).toContain("localStorage.removeItem('hivemind_onboarding')");
  expect(provider).toContain('if (data.organization?.id)');
  expect(provider).toContain("localStorage.removeItem('hivemind_onboarding')");
});
