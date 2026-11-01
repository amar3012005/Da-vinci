import { clearShellBootstrap, readShellBootstrap, stripSecrets, writeShellBootstrap } from './shell-bootstrap-cache';

const memory = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: k => void map.delete(k), map }; };
const data = { authenticated: true, session_api_key: 'sk_live_secret', user: { id: 'u', email: 'a@b.c', zitadel_user_id: 'z', access_token: 'tok' }, organization: { id: 'o', name: 'Org' }, onboarding: { needs_org_setup: false, has_api_key: true }, connectivity: { core_api_base_url: 'https://core', core_health: 'ok', service_token: 'x' }, client_support: ['claude'] };

test('secrets never reach the stored bootstrap, at any depth', () => {
  const store = memory();
  writeShellBootstrap(data, store);
  const text = [...store.map.values()][0];
  expect(text).not.toMatch(/sk_live_secret|tok|service_token|session_api_key|access_token/);
  expect(stripSecrets({ a: [{ api_key: 1, ok: 2 }] })).toEqual({ a: [{ ok: 2 }] });
});
test('the cached bootstrap is read back only for the identity the host named', () => {
  const store = memory();
  writeShellBootstrap(data, store);
  expect(readShellBootstrap({ userId: 'u', organizationId: 'o' }, store).user.id).toBe('u');
  expect(readShellBootstrap({ userId: 'other', organizationId: 'o' }, store)).toBeNull();
  expect(readShellBootstrap({ userId: 'u', organizationId: 'x' }, store)).toBeNull();
  expect(readShellBootstrap(undefined, store)).toBeNull();
  expect(readShellBootstrap({ userId: 'u', organizationId: 'o' }, null)).toBeNull();
  clearShellBootstrap(store);
  expect(readShellBootstrap({ userId: 'u', organizationId: 'o' }, store)).toBeNull();
});
test('an unauthenticated payload is never stored', () => {
  const store = memory();
  writeShellBootstrap({ authenticated: false }, store);
  expect(store.map.size).toBe(0);
});
