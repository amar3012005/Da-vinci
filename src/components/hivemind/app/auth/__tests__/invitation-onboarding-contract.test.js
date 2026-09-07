import fs from 'fs';
import path from 'path';

test('invitation route and locked onboarding paths stay wired together', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../../HiveMindApp.jsx'), 'utf8');
  const login = fs.readFileSync(path.resolve(__dirname, '../LoginPage.jsx'), 'utf8');
  const landing = fs.readFileSync(path.resolve(__dirname, '../InvitationLanding.jsx'), 'utf8');
  const platformAdmin = fs.readFileSync(path.resolve(__dirname, '../../pages/PlatformAdmin.jsx'), 'utf8');
  expect(app).toContain('path="invite"');
  expect(app).toContain('path="app/invite"');
  expect(landing).toContain("Accept {isReferral ? `${referralName}'s invitation` : 'invitation'}");
  expect(landing).toContain("params.get('referral_token')");
  expect(landing).toContain('previewPartnerReferral(credential, true)');
  expect(platformAdmin).toContain('nextReferralCampaigns.enabled === true');
  expect(platformAdmin).toContain('Partner invitations are safely disabled.');
  expect(landing).toContain("navigate('/hivemind/login?create=1&invitation=1'");
  expect(login).toContain("invitationLockedKind === 'enterprise'");
  expect(login).toContain("invitationLockedKind === 'personal'");
  expect(login).toContain('referralToken: appliedReferralToken');
  expect(login).toContain('personalInvitationToken: appliedPersonalInvitationToken');
  expect(login).toContain('enterpriseInvitation.hosting_mode');
});

test('platform admin environment switch latches the complete API surface', () => {
  const platformAdmin = fs.readFileSync(path.resolve(__dirname, '../../pages/PlatformAdmin.jsx'), 'utf8');
  const apiClient = fs.readFileSync(path.resolve(__dirname, '../../shared/api-client.js'), 'utf8');
  expect(apiClient).toContain("controlPlane: 'https://api.singulancelabs.com'");
  expect(apiClient).toContain("core: 'https://core.singulancelabs.com'");
  expect(apiClient).toContain("controlPlane: 'https://api.dev.next.singulancelabs.com'");
  expect(apiClient).toContain("core: 'https://core.dev.next.singulancelabs.com'");
  expect(apiClient).toContain("frontend: 'https://dev.next.singulancelabs.com'");
  expect(apiClient).toContain('if (this._platformAdminEnvironment)');
  expect(apiClient).toContain('this._controlPlaneBaseUrl()');
  expect(apiClient).toContain('window.location.reload()');
  expect(platformAdmin).toContain('Switch the entire admin console to Production?');
  expect(platformAdmin).toContain('<EnvironmentToggle environment={environment} onChange={changeEnvironment} />');
  expect(platformAdmin).toContain('apiClient.getPlatformAdminFrontendUrl("/hivemind/m/chat")');
});
