import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const login = fs.readFileSync(path.resolve(dir, '../LoginPage.jsx'), 'utf8');

test('email sign-in cannot submit a fake challenge before Turnstile is ready', () => {
  assert.match(login, /const securityReady = !emailConfig\.turnstile_site_key \|\| Boolean\(turnstileToken\)/);
  assert.match(login, /!emailAddress\.trim\(\) \|\| !securityReady/);
  assert.match(login, /Completing security check/);
});

test('code resend obtains a fresh Turnstile token and respects the server cooldown', () => {
  assert.match(login, /key={`resend-\$\{turnstileEpoch\}`}/);
  assert.match(login, /resendSeconds > 0 \|\| !securityReady/);
  assert.match(login, /setTurnstileToken\(''\)/);
  assert.match(login, /Resend code in \$\{resendSeconds\}s/);
});

test('verification step exposes a one-step back action', () => {
  assert.match(login, /aria-label="Back to email address"/);
  assert.equal(login.includes('<ArrowLeft size={14} /> Back'), true);
});
