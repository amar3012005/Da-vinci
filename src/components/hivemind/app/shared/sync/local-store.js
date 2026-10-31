/**
 * LocalStore: the app-private view cache of the local-first apps.
 *
 * Every row belongs to one scope (`company:user`), one entity (for example `messages`) and one id.
 * Keys are `<scope>|<entity>|<id>` with every part URI-encoded, so no id can make one scope or
 * entity a prefix of another. A read built for one scope can never return a row of another.
 *
 * Values are display data only. Object fields whose names look like credentials are removed before
 * storage (the boot-cache pattern), so a broad API payload cannot persist a secret.
 *
 * The default backend is IndexedDB (`hm-local-store`). When IndexedDB cannot open (private windows,
 * blocked storage, tests) the store falls back to memory and every operation still succeeds.
 */

import { stripSecretFields } from '../browser-cache';

export const LOCAL_STORE_DB = 'hm-local-store';
const ROWS = 'rows';
const SEPARATOR = '|';

/**
 * Scope string for one signed-in person in one company.
 * @param {string} orgId - organization id.
 * @param {string} userId - user id.
 * @returns {string|null} `company:user`, or null when either id is missing (nothing is stored without a full scope).
 */
export function storeScope(orgId, userId) {
  if (!orgId || !userId) return null;
  return `${encodeURIComponent(String(orgId))}:${encodeURIComponent(String(userId))}`;
}

/**
 * Row key for one scope, entity and id.
 * @param {string} scope - value of {@link storeScope}.
 * @param {string} entity - entity name.
 * @param {string} [id] - row id; empty builds the entity prefix.
 * @returns {string} storage key.
 */
export function rowKey(scope, entity, id = '') {
  return [scope, encodeURIComponent(String(entity)), encodeURIComponent(String(id))].join(SEPARATOR);
}

function entityPrefix(scope, entity) {
  return `${scope}${SEPARATOR}${encodeURIComponent(String(entity))}${SEPARATOR}`;
}

/**
 * In-memory backend with the IndexedDB backend's surface.
 * @returns {{ get: (key: string) => Promise<object|undefined>, put: (key: string, row: object) => Promise<void>, delete: (key: string) => Promise<void>, entries: (prefix: string) => Promise<Array<[string, object]>>, deleteWhere: (predicate: (key: string) => boolean) => Promise<void> }} backend.
 */
export function createMemoryBackend() {
  const rows = new Map();
  return {
    async get(key) { return rows.get(key); },
    async put(key, row) { rows.set(key, row); },
    async delete(key) { rows.delete(key); },
    async entries(prefix) { return [...rows.entries()].filter(([key]) => key.startsWith(prefix)); },
    async deleteWhere(predicate) { for (const key of [...rows.keys()]) if (predicate(key)) rows.delete(key); },
  };
}

/**
 * IndexedDB backend. A database that cannot open makes the caller fall back to memory.
 * @param {IDBFactory|undefined} [factory] - IndexedDB factory; defaults to the global one.
 * @returns {ReturnType<typeof createMemoryBackend>} backend.
 */
export function createIndexedDbBackend(factory = typeof indexedDB !== 'undefined' ? indexedDB : undefined) {
  let opening = null;
  const open = () => {
    if (!factory) return Promise.reject(new Error('indexeddb_unavailable'));
    opening ||= new Promise((resolve, reject) => {
      const request = factory.open(LOCAL_STORE_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(ROWS);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    opening.catch(() => { opening = null; });
    return opening;
  };
  const run = async (mode, work) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ROWS, mode);
      const request = work(tx.objectStore(ROWS));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  };
  const range = (prefix) => IDBKeyRange.bound(prefix, `${prefix}￿`);
  return {
    get: (key) => run('readonly', (rows) => rows.get(key)),
    put: async (key, row) => { await run('readwrite', (rows) => rows.put(row, key)); },
    delete: async (key) => { await run('readwrite', (rows) => rows.delete(key)); },
    async entries(prefix) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const found = [];
        const tx = db.transaction(ROWS, 'readonly');
        const cursor = tx.objectStore(ROWS).openCursor(range(prefix));
        cursor.onsuccess = () => {
          const current = cursor.result;
          if (!current) return;
          found.push([String(current.key), current.value]);
          current.continue();
        };
        tx.oncomplete = () => resolve(found);
        tx.onerror = () => reject(tx.error);
      });
    },
    async deleteWhere(predicate) {
      const keys = await run('readonly', (rows) => rows.getAllKeys());
      const doomed = (keys || []).map(String).filter(predicate);
      if (doomed.length) await run('readwrite', (rows) => { doomed.forEach((key) => rows.delete(key)); });
    },
  };
}

/**
 * Backend that uses IndexedDB and switches to memory for the rest of the session after its first failure.
 * @param {ReturnType<typeof createMemoryBackend>} primary - preferred backend.
 * @returns {ReturnType<typeof createMemoryBackend>} backend.
 */
function withMemoryFallback(primary) {
  const memory = createMemoryBackend();
  let active = primary;
  const guard = (name) => async (...args) => {
    try { return await active[name](...args); } catch {
      // IndexedDB refused (private window, quota, blocked storage); this session keeps its rows in memory.
      active = memory;
      return memory[name](...args);
    }
  };
  return { get: guard('get'), put: guard('put'), delete: guard('delete'), entries: guard('entries'), deleteWhere: guard('deleteWhere') };
}

/**
 * Create a LocalStore.
 * @param {{ backend?: ReturnType<typeof createMemoryBackend>, now?: () => number }} [options] - backend (defaults to IndexedDB with a memory fallback) and clock.
 * @returns {{
 *   get: (scope: string, entity: string, id: string) => Promise<{ value: unknown, at: number }|undefined>,
 *   put: (scope: string, entity: string, id: string, value: unknown) => Promise<void>,
 *   delete: (scope: string, entity: string, id: string) => Promise<void>,
 *   list: (scope: string, entity: string) => Promise<Array<{ id: string, value: unknown, at: number }>>,
 *   wipe: (scope: string) => Promise<void>,
 *   wipeAll: () => Promise<void>,
 *   retainOnly: (scope: string) => Promise<void>,
 * }} store. Every method resolves without effect when `scope` is null.
 */
export function createLocalStore({ backend = withMemoryFallback(createIndexedDbBackend()), now = () => Date.now() } = {}) {
  return {
    async get(scope, entity, id) {
      if (!scope) return undefined;
      const row = await backend.get(rowKey(scope, entity, id));
      return row ? { value: row.value, at: row.at } : undefined;
    },
    async put(scope, entity, id, value) {
      if (!scope) return;
      await backend.put(rowKey(scope, entity, id), { value: stripSecretFields(value), at: now() });
    },
    async delete(scope, entity, id) {
      if (!scope) return;
      await backend.delete(rowKey(scope, entity, id));
    },
    async list(scope, entity) {
      if (!scope) return [];
      const prefix = entityPrefix(scope, entity);
      const rows = await backend.entries(prefix);
      return rows.map(([key, row]) => ({ id: decodeURIComponent(key.slice(prefix.length)), value: row.value, at: row.at }));
    },
    async wipe(scope) {
      if (!scope) return;
      await backend.deleteWhere((key) => key.startsWith(`${scope}${SEPARATOR}`));
    },
    async wipeAll() {
      await backend.deleteWhere(() => true);
    },
    async retainOnly(scope) {
      if (!scope) return;
      await backend.deleteWhere((key) => !key.startsWith(`${scope}${SEPARATOR}`));
    },
  };
}
