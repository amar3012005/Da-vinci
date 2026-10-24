import { bootCacheKey, readBootCache, writeBootCache, rememberTenant, readLastTenant, clearBootCache } from '../boot-cache';
import { clearUserScopedStorage } from '../user-storage';

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

describe('boot cache tenant isolation', () => {
  test('keys include org, user and resource so one tenant cannot read another', () => {
    const store = memoryStorage();
    writeBootCache('org-a', 'user-a', 'teams', { teams: [{ id: 'team-a' }] }, store);
    expect(readBootCache('org-a', 'user-a', 'teams', store).value).toEqual({ teams: [{ id: 'team-a' }] });
    expect(readBootCache('org-b', 'user-a', 'teams', store)).toBeUndefined();
    expect(readBootCache('org-a', 'user-b', 'teams', store)).toBeUndefined();
    expect(readBootCache('org-a', 'user-a', 'projects', store)).toBeUndefined();
    expect(bootCacheKey('org-a', 'user-a', 'teams')).not.toEqual(bootCacheKey('org-a', 'user-b', 'teams'));
  });

  test('an incomplete tenant never reads or writes an entry', () => {
    const store = memoryStorage();
    writeBootCache(null, 'user-a', 'teams', { teams: [] }, store);
    writeBootCache('org-a', undefined, 'teams', { teams: [] }, store);
    expect(store.length).toBe(0);
    expect(readBootCache('', 'user-a', 'teams', store)).toBeUndefined();
  });

  test('a cache entry from another version prefix is ignored', () => {
    const store = memoryStorage();
    store.setItem(bootCacheKey('org-a', 'user-a', 'employees'), JSON.stringify({ v: 'v0', at: 1, value: [{ id: 'old' }] }));
    expect(readBootCache('org-a', 'user-a', 'employees', store)).toBeUndefined();
  });
});

describe('boot cache sign-out and org switch', () => {
  test('clearBootCache removes boot entries and the last-tenant pointer but keeps unrelated keys', () => {
    const store = memoryStorage();
    store.setItem('hivemind:lang', 'de');
    writeBootCache('org-a', 'user-a', 'teams', { teams: [] }, store);
    rememberTenant('org-a', 'user-a', store);
    clearBootCache(store);
    expect(readBootCache('org-a', 'user-a', 'teams', store)).toBeUndefined();
    expect(readLastTenant(store)).toBeNull();
    expect(store.getItem('hivemind:lang')).toBe('de');
  });

  test('clearUserScopedStorage (sign-out and account switch) clears the boot cache', () => {
    const previous = window.localStorage;
    const store = memoryStorage();
    Object.defineProperty(window, 'localStorage', { value: store, configurable: true });
    try {
      writeBootCache('org-a', 'user-a', 'runtime-appearance', { character: 'orbit' }, store);
      rememberTenant('org-a', 'user-a', store);
      clearUserScopedStorage();
      expect(readBootCache('org-a', 'user-a', 'runtime-appearance', store)).toBeUndefined();
      expect(readLastTenant(store)).toBeNull();
    } finally {
      Object.defineProperty(window, 'localStorage', { value: previous, configurable: true });
    }
  });

  test('a tenant-changed event clears the cache', () => {
    const previous = window.localStorage;
    const store = memoryStorage();
    Object.defineProperty(window, 'localStorage', { value: store, configurable: true });
    try {
      writeBootCache('org-a', 'user-a', 'employees', [{ id: 'e1' }], store);
      window.dispatchEvent(new CustomEvent('hm:tenant-changed'));
      expect(readBootCache('org-a', 'user-a', 'employees', store)).toBeUndefined();
    } finally {
      Object.defineProperty(window, 'localStorage', { value: previous, configurable: true });
    }
  });
});

describe('boot cache stores display data only', () => {
  test('credential-looking fields are dropped before storage', () => {
    const store = memoryStorage();
    writeBootCache('org-a', 'user-a', 'employees', [{ id: 'e1', name: 'Ada', api_key: 'sk-secret', token: 't', nested: { password: 'p', avatar_url: 'https://x/a.png' } }], store);
    const raw = store.getItem(bootCacheKey('org-a', 'user-a', 'employees'));
    expect(raw).not.toMatch(/sk-secret|"token"|password/u);
    expect(readBootCache('org-a', 'user-a', 'employees', store).value).toEqual([{ id: 'e1', name: 'Ada', nested: { avatar_url: 'https://x/a.png' } }]);
  });
});

describe('boot cache storage failures', () => {
  test('blocked or throwing storage reads as a miss and never throws', () => {
    const blocked = {
      get length() { throw new Error('blocked'); },
      key: () => { throw new Error('blocked'); },
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(() => writeBootCache('org-a', 'user-a', 'teams', { teams: [] }, blocked)).not.toThrow();
    expect(readBootCache('org-a', 'user-a', 'teams', blocked)).toBeUndefined();
    expect(readLastTenant(blocked)).toBeNull();
    expect(() => clearBootCache(blocked)).not.toThrow();
  });

  test('corrupt JSON reads as a miss', () => {
    const store = memoryStorage();
    store.setItem(bootCacheKey('org-a', 'user-a', 'teams'), '{not json');
    expect(readBootCache('org-a', 'user-a', 'teams', store)).toBeUndefined();
  });
});
