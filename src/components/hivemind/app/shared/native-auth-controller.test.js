import { TextEncoder } from 'util';
import { webcrypto } from 'crypto';
import { createNativeAuthController, NATIVE_AUTH_CALLBACK, NATIVE_CONTROL_PLANE } from './native-auth-controller';

global.TextEncoder = TextEncoder;

function fixture() {
  const values = new Map();
  const plugin = {
    setCredential: jest.fn(async ({ key, value }) => values.set(key, value)),
    getCredential: jest.fn(async ({ key }) => ({ value: values.get(key) || null })),
    removeCredential: jest.fn(async ({ key }) => values.delete(key)),
    request: jest.fn(async () => ({ status: 200, data: JSON.stringify({ session_token: 'fixture-native-session-token', token_type: 'Bearer', expires_in: 3600 }) })),
  };
  const browser = { open: jest.fn(async () => {}), close: jest.fn(async () => {}) };
  const create = () => createNativeAuthController({ plugin, browser, crypto: webcrypto, now: () => 1000 });
  const callback = () => `${NATIVE_AUTH_CALLBACK}?code=${'c'.repeat(43)}&state=${JSON.parse(values.get('pendingAuth')).state}`;
  return { values, plugin, browser, create, callback };
}

test('external browser receives only PKCE challenge, state and exact callback; pending secrets stay in native storage', async () => {
  const f = fixture(); await f.create().start();
  const pending = JSON.parse(f.values.get('pendingAuth'));
  const url = new URL(f.browser.open.mock.calls[0][0].url);
  expect(url.origin).toBe(NATIVE_CONTROL_PLANE);
  expect(url.pathname).toBe('/auth/mobile/start');
  expect(url.searchParams.get('callback')).toBe(NATIVE_AUTH_CALLBACK);
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(url.searchParams.get('code_challenge')).toHaveLength(43);
  expect(url.href).not.toContain(pending.verifier);
  expect(f.plugin.request).not.toHaveBeenCalled();
});

test('cold restart restores pending state; replay cannot re-exchange the consumed code', async () => {
  const f = fixture(); await f.create().start(); const callback = f.callback();
  expect(await f.create().complete(callback)).toBe(true);
  expect(f.values.has('pendingAuth')).toBe(false);
  expect(f.values.get('cpToken')).toBe('fixture-native-session-token');
  await expect(f.create().complete(callback)).rejects.toThrow('native_auth_state_mismatch');
  expect(f.plugin.request).toHaveBeenCalledTimes(1);
  expect(JSON.parse(f.plugin.request.mock.calls[0][0].body).callback).toBe(NATIVE_AUTH_CALLBACK);
});

test('wrong state, duplicate parameters, another callback or expired state cannot exchange', async () => {
  const f = fixture(); const controller = f.create(); await controller.start();
  await expect(controller.complete(f.callback().replace(/state=.*/, `state=${'x'.repeat(43)}`))).rejects.toThrow('native_auth_state_mismatch');
  await expect(controller.complete(`${f.callback()}&state=${'x'.repeat(43)}`)).rejects.toThrow('invalid_native_callback');
  expect(await controller.complete(f.callback().replace('singulance://auth', 'singulance://other'))).toBe(false);
  const pending = JSON.parse(f.values.get('pendingAuth')); pending.createdAt = -1000000; f.values.set('pendingAuth', JSON.stringify(pending));
  await expect(controller.complete(f.callback())).rejects.toThrow('native_auth_state_mismatch');
  expect(f.plugin.request).not.toHaveBeenCalled();
});

test('failed exchange does not save a token and cannot replay; logout clears native credentials even offline', async () => {
  const f = fixture(); const controller = f.create(); await controller.start();
  const callback = f.callback(); f.plugin.request.mockResolvedValueOnce({ status: 403, data: '{}' });
  await expect(controller.complete(callback)).rejects.toThrow('native_auth_exchange_failed');
  expect(f.values.has('cpToken')).toBe(false); expect(f.values.has('pendingAuth')).toBe(false);
  f.values.set('cpToken', 'old-session'); f.values.set('pendingAuth', 'old-pending');
  f.plugin.request.mockRejectedValueOnce(new Error('offline'));
  await expect(controller.logout()).rejects.toThrow('offline');
  expect(f.values.size).toBe(0);
});

test('failing secure storage prevents browser login and malformed exchange response cannot grant access', async () => {
  const f = fixture(); f.plugin.setCredential.mockRejectedValueOnce(new Error('locked'));
  await expect(f.create().start()).rejects.toThrow('locked'); expect(f.browser.open).not.toHaveBeenCalled();
  await f.create().start(); f.plugin.request.mockResolvedValueOnce({ status: 200, data: '{"token_type":"cookie"}' });
  await expect(f.create().complete(f.callback())).rejects.toThrow('invalid_native_session');
  expect(f.values.has('cpToken')).toBe(false);
});
