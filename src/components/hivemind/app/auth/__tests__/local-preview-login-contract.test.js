import fs from 'node:fs';
import path from 'node:path';

const login = fs.readFileSync(path.resolve(__dirname, '../LoginPage.jsx'), 'utf8');
const client = fs.readFileSync(path.resolve(__dirname, '../../shared/api-client.js'), 'utf8');

test('email identity mode controls one shared OTP UI for preview and production', () => {
  expect(login).toContain('Continue with Email');
  expect(login).toContain('Continue with Google');
  expect(login.indexOf('Continue with Email')).toBeLessThan(login.indexOf('Continue with Google'));
  expect(login).toContain('autoComplete="one-time-code"');
  expect(login).toContain('Opening the email link alone never authenticates you');
  expect(login).toContain('emailOnly');
  expect(client).toContain("'/auth/email/start'");
  expect(client).toContain("'/auth/email/verify'");
  expect(client).toContain("'/auth/email/resend'");
});
