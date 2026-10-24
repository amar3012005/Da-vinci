import { readLastTenant, rememberTenant } from '../boot-cache';

function memoryStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    _map: map,
  };
}

describe('last signed-in shell hint', () => {
  test('stores only tenant ids and display labels', () => {
    const store = memoryStorage();
    rememberTenant('org-a', 'user-a', store, { displayName: '  Ada  ', orgName: 'Acme', email: 'ada@example.com', token: 't' });
    const raw = store.getItem([...store._map.keys()][0]);
    expect(JSON.parse(raw)).toEqual({ orgId: 'org-a', userId: 'user-a', displayName: 'Ada', orgName: 'Acme' });
    expect(raw).not.toContain('@');
    expect(raw).not.toContain('token');
  });

  test('caps display label length', () => {
    const store = memoryStorage();
    rememberTenant('org-a', 'user-a', store, { displayName: 'n'.repeat(500), orgName: 'o'.repeat(500) });
    const hint = readLastTenant(store);
    expect(hint.displayName).toHaveLength(120);
    expect(hint.orgName).toHaveLength(160);
  });

  test('a later remember replaces the hint for a new tenant', () => {
    const store = memoryStorage();
    rememberTenant('org-a', 'user-a', store, { displayName: 'Ada', orgName: 'Acme' });
    rememberTenant('org-b', 'user-a', store, { displayName: 'Ada', orgName: 'Other Co' });
    expect(readLastTenant(store)).toEqual({ orgId: 'org-b', userId: 'user-a', displayName: 'Ada', orgName: 'Other Co' });
  });

  test('missing labels read as empty strings and missing ids read as no hint', () => {
    const store = memoryStorage();
    rememberTenant('org-a', 'user-a', store);
    expect(readLastTenant(store)).toEqual({ orgId: 'org-a', userId: 'user-a', displayName: '', orgName: '' });
    rememberTenant('', 'user-a', store);
    expect(readLastTenant(store)).toEqual({ orgId: 'org-a', userId: 'user-a', displayName: '', orgName: '' });
  });

  test('malformed hint storage reads as no hint', () => {
    const store = memoryStorage();
    store.setItem('hivemind.boot.v1:last-tenant', '{not json');
    expect(readLastTenant(store)).toBeNull();
    expect(readLastTenant(null)).toBeNull();
  });
});
