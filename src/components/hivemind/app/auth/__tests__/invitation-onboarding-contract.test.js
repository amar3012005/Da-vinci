import fs from 'fs';
import path from 'path';

test('invitation route and locked onboarding paths stay wired together', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../../HiveMindApp.jsx'), 'utf8');
  const login = fs.readFileSync(path.resolve(__dirname, '../LoginPage.jsx'), 'utf8');
  const landing = fs.readFileSync(path.resolve(__dirname, '../InvitationLanding.jsx'), 'utf8');
  expect(app).toContain('path="invite"');
  expect(landing).toContain("navigate('/hivemind/login?create=1&invitation=1'");
  expect(login).toContain("invitationLockedKind === 'enterprise'");
  expect(login).toContain("invitationLockedKind === 'personal'");
  expect(login).toContain('personalInvitationToken: appliedPersonalInvitationToken');
  expect(login).toContain('enterpriseInvitation.hosting_mode');
});
