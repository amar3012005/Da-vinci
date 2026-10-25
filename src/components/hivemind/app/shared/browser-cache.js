/**
 * Browser-wide stale-while-revalidate cache for display reads (identity, session
 * list, room list, per-room recent history).
 *
 * Keys follow `hm:<tenant>:<user>:<kind>:<id>`. Every part is URI-encoded, so a
 * colon in an id cannot make one tenant's key a prefix of another's. Entries
 * never reach a key built for a different tenant or user. Values are display
 * data only; no token, cookie or API key is stored.
 *
 * `load` returns the stored value at once when one exists and starts a single
 * shared revalidation. Concurrent callers for one key share one in-flight request.
 * Writes are broadcast on `hm-cache` so other tabs update their view without a
 * second fetch.
 */

export const CACHE_KEY_PREFIX = 'hm';
export const CACHE_CHANNEL = 'hm-cache';
export const DEFAULT_MAX_AGE_MS = 10 * 60_000;

/**
 * Build the shared cache key.
 * @param {{ tenant: string, user: string, kind: string, id?: string }} parts - tenant (organization id), user id, resource kind, and optional resource id.
 * @returns {string|null} key, or null when the tenant or user is missing, so an incomplete identity is never cached.
 */
export function cacheKey({ tenant, user, kind, id = '' }) {
  if (!tenant || !user || !kind) return null;
  return [CACHE_KEY_PREFIX, tenant, user, kind, id].map((part) => encodeURIComponent(String(part))).join(':');
}

/**
 * Key prefix that covers every entry for one tenant (and optionally one user).
 * @param {string} tenant - organization id.
 * @param {string} [user] - user id; omit to cover all users of the tenant.
 * @returns {string} prefix ending in ':' so that one tenant never matches another.
 */
export function cacheScopePrefix(tenant, user) {
  const parts = [CACHE_KEY_PREFIX, encodeURIComponent(String(tenant))];
  if (user) parts.push(encodeURIComponent(String(user)));
  return `${parts.join(':')}:`;
}

/**
 * In-memory store, used for tests and when IndexedDB is unavailable.
 * @returns {{ get: (key: string) => Promise<object|undefined>, set: (key: string, record: object) => Promise<void>, remove: (predicate: (key: string) => boolean) => Promise<void> }} store.
 */
export function createMemoryStore() {
  const rows = new Map();
  return {
    async get(key) { return rows.get(key); },
    async set(key, record) { rows.set(key, record); },
    async remove(predicate) { for (const key of [...rows.keys()]) if (predicate(key)) rows.delete(key); },
  };
}

/**
 * IndexedDB-backed store. Every operation resolves to a miss or no-op when the
 * database cannot open (private windows, blocked storage).
 * @param {IDBFactory|undefined} [indexedDBImpl] - factory; defaults to the global one.
 * @returns {{ get: Function, set: Function, remove: Function }} store with the same surface as createMemoryStore.
 */
export function createIndexedDbStore(indexedDBImpl = typeof indexedDB !== 'undefined' ? indexedDB : undefined) {
  let dbPromise = null;
  const open = () => {
    if (!indexedDBImpl) return Promise.reject(new Error('indexeddb_unavailable'));
    dbPromise ||= new Promise((resolve, reject) => {
      const request = indexedDBImpl.open('hm-browser-cache', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('rows');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  };
  const transact = async (mode, run) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('rows', mode);
      const result = run(tx.objectStore('rows'));
      tx.oncomplete = () => resolve(result?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  };
  return {
    async get(key) {
      try { return await transact('readonly', (store) => store.get(key)); } catch { return undefined; }
    },
    async set(key, record) {
      try { await transact('readwrite', (store) => store.put(record, key)); } catch { /* Storage blocked: the page still renders from the network. */ }
    },
    async remove(predicate) {
      try {
        const keys = await transact('readonly', (store) => store.getAllKeys());
        const doomed = (keys || []).filter((key) => predicate(String(key)));
        if (doomed.length) await transact('readwrite', (store) => { doomed.forEach((key) => store.delete(key)); });
      } catch { /* Storage blocked: nothing persisted to clear. */ }
    },
  };
}

/**
 * Create a cache instance.
 * @param {{ store?: ReturnType<typeof createMemoryStore>, channel?: { postMessage: Function, onmessage: Function|null } | null, now?: () => number, maxAgeMs?: number }} [options] - storage, cross-tab channel, clock and age limit.
 * @returns {{ subscribe: (listener: (key: string) => void) => () => void, read: (key: string) => Promise<{ value: unknown, at: number, fresh: boolean } | undefined>, load: (key: string, fetcher: () => Promise<unknown>) => Promise<unknown>, clearTenant: (tenant: string, user?: string) => Promise<void>, clearAll: () => Promise<void>, close: () => void }} cache operations.
 */
export function createBrowserCache({
  store = createMemoryStore(),
  channel = null,
  now = () => Date.now(),
  maxAgeMs = DEFAULT_MAX_AGE_MS,
} = {}) {
  const inflight = new Map();
  let generation = 0;

  const write = async (key, value) => {
    await store.set(key, { value, at: now() });
    try { channel?.postMessage({ type: 'set', key }); } catch { /* A closed channel only loses cross-tab sync. */ }
  };

  const listeners = new Set();
  if (channel) {
    // Another tab wrote this key. Listeners read the shared store; in-flight requests here are unaffected.
    channel.onmessage = (event) => {
      if (event?.data?.type !== 'set' || typeof event.data.key !== 'string') return;
      for (const listener of listeners) listener(event.data.key);
    };
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async read(key) {
      if (!key) return undefined;
      const record = await store.get(key);
      if (!record) return undefined;
      return { value: record.value, at: record.at, fresh: now() - record.at <= maxAgeMs };
    },
    load(key, fetcher) {
      if (!key) return Promise.resolve().then(fetcher);
      const existing = inflight.get(key);
      if (existing) return existing;
      const started = generation;
      const request = Promise.resolve()
        .then(fetcher)
        .then(async (value) => {
          if (started === generation) await write(key, value);
          return value;
        })
        .finally(() => { if (inflight.get(key) === request) inflight.delete(key); });
      inflight.set(key, request);
      return request;
    },
    async clearTenant(tenant, user) {
      generation += 1;
      const prefix = cacheScopePrefix(tenant, user);
      inflight.clear();
      await store.remove((key) => key.startsWith(prefix));
    },
    async clearAll() {
      generation += 1;
      inflight.clear();
      await store.remove((key) => key.startsWith(`${CACHE_KEY_PREFIX}:`));
    },
    close() { if (channel && typeof channel.close === 'function') channel.close(); },
  };
}

let shared = null;

/**
 * Process-wide cache wired to IndexedDB and the cross-tab channel. Created on first use.
 * @returns {ReturnType<typeof createBrowserCache>} shared cache.
 */
export function getSharedBrowserCache() {
  if (!shared) {
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CACHE_CHANNEL) : null;
    shared = createBrowserCache({ store: createIndexedDbStore(), channel });
  }
  return shared;
}

if (typeof window !== 'undefined') {
  // Sign-out and account switch both dispatch this event; drop every tenant's rows.
  window.addEventListener('hm:tenant-changed', () => { void getSharedBrowserCache().clearAll(); });
}
