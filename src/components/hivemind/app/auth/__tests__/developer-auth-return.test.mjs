import test from 'node:test';
import assert from 'node:assert/strict';
import { trustedDeveloperReturn } from '../developer-auth-return.mjs';
test('developer UI context accepts the configured issuer and exact route only', () => {
  const origin = 'https://api.example.test';
  const search = value => `?cli_return_to=${encodeURIComponent(value)}`;
  assert.ok(trustedDeveloperReturn(search(`${origin}/auth/developer/cli/start?state=abc`), origin));
  assert.equal(trustedDeveloperReturn(search('https://evil.test/auth/developer/cli/start'), origin), null);
  assert.equal(trustedDeveloperReturn(search(`${origin}/auth/cli/start`), origin), null);
  assert.equal(trustedDeveloperReturn('?account=developer', origin), null);
  assert.equal(trustedDeveloperReturn('', origin), null);
});
