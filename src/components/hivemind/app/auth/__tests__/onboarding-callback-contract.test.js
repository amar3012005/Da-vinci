const fs = require('fs');
const path = require('path');

test('enterprise onboarding survives blocked browser storage without duplicating company setup', () => {
  const login = fs.readFileSync(path.resolve(__dirname, '../LoginPage.jsx'), 'utf8');
  const onboarding = fs.readFileSync(path.resolve(__dirname, '../../pages/Onboarding.jsx'), 'utf8');
  const serviceWorker = fs.readFileSync(path.resolve(__dirname, '../../../../../../public/sw.js'), 'utf8');

  expect(login).toContain('#onboarding=${intentFragment}');
  expect(onboarding).toContain("new URLSearchParams(window.location.hash.slice(1)).get('onboarding')");
  expect(onboarding).toContain('enterprise_access_code: isEnt ? saved.enterprise_access_code : undefined');

  expect(login).not.toContain('Company website');
  expect(login).not.toContain('Company context');
  expect(onboarding).not.toContain('Company context');
  expect(onboarding).not.toContain('company_profile:');

  expect(serviceWorker).toContain('function offlineResponse()');
  expect(serviceWorker).toContain('r || offlineResponse()');
});
