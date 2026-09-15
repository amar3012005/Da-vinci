const fs = require('fs');
const path = require('path');

test('platform invitation stays draft-only until the preview confirmation sends it', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../PlatformAdmin.jsx'), 'utf8');
  const createStart = source.indexOf('const submitEnterpriseInvitation');
  const createEnd = source.indexOf('const createPersonalInvitationLink', createStart);
  const previewStart = source.indexOf('const openInvitationEmailPreview', createEnd);
  const confirmStart = source.indexOf('const confirmInvitationEmail', previewStart);
  const actionStart = source.indexOf('const invitationAction', confirmStart);

  const createFlow = source.slice(createStart, createEnd);
  const previewFlow = source.slice(previewStart, confirmStart);
  const confirmFlow = source.slice(confirmStart, actionStart);

  expect(createFlow).toContain('createPlatformEnterpriseInvitation');
  expect(createFlow).not.toContain('enterpriseInvitationAction');
  expect(createFlow).toContain('setOneTimeInvitationCode("")');
  expect(previewFlow).toContain('enterpriseInvitationAction(id, "preview")');
  expect(confirmFlow).toContain('invitationEmailPreview.action');
  expect(confirmFlow).toContain('"Invitation email sent."');
});
