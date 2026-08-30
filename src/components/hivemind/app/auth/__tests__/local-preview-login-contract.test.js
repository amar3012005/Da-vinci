import fs from 'node:fs';
import path from 'node:path';

const login = fs.readFileSync(path.resolve(__dirname, '../LoginPage.jsx'), 'utf8');
const client = fs.readFileSync(path.resolve(__dirname, '../../shared/api-client.js'), 'utf8');

test('preview hostname uses one-time email login rather than Google', () => {
  expect(login).toContain("window.location.hostname === 'next.preview.singulancelabs.com'");
  expect(login).toContain('Email one-time sign-in link');
  expect(login).toContain('localPreviewLogin ?');
  expect(client).toContain("'/auth/local-preview/request'");
});
