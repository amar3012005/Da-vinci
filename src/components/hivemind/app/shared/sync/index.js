/**
 * Local-first sync core shared by the web app and every app shell (iOS, Android, macOS, Windows).
 *
 * - `LocalStore` (local-store.js): app-private rows keyed `company:user | entity | id`; IndexedDB by default.
 * - `SyncEngine` (sync-engine.js): register entities, open a list from the local copy, refresh since a cursor, reconcile (server wins).
 * - `Outbox` (outbox.js): client-id operations sent at once, retried with backoff, kept across restarts.
 * - `PlatformAdapter` (platform-adapter.js): token store, preferences, rooms, workspace access, foreground and notifications per shell.
 *
 * `syncScope(orgId, userId)` returns the one engine and outbox of a signed-in person in a company. Sign-out, account
 * switch and company switch (`hm:tenant-changed`) close every scope and wipe the whole LocalStore, so nothing from the
 * previous person or company remains readable. Account erasure signs out and therefore wipes too.
 */

import { createLocalStore, storeScope } from './local-store';
import { createSyncEngine } from './sync-engine';
import { createOutbox } from './outbox';
import { getPlatformAdapter } from './platform-adapter';

export { createLocalStore, createIndexedDbBackend, createMemoryBackend, storeScope, rowKey } from './local-store';
export { createSyncEngine, reconcile } from './sync-engine';
export { createOutbox, isTransientFailure, retryDelay } from './outbox';
export { capacitorPlatformAdapter, getPlatformAdapter, setPlatformAdapter, webPlatformAdapter, NATIVE_PREFERENCE_KEYS } from './platform-adapter';

let sharedStore = null;
const scopes = new Map();

/**
 * Process-wide LocalStore.
 * @returns {ReturnType<typeof createLocalStore>} store.
 */
export function localStore() {
  sharedStore ||= createLocalStore();
  return sharedStore;
}

/**
 * Engine and outbox of one signed-in person in one company, created once per page.
 * @param {string} orgId - organization id.
 * @param {string} userId - user id.
 * @param {{ senders?: Record<string, Function> }} [options] - outbox senders, added to the scope's existing ones.
 * @returns {{ scope: string|null, engine: ReturnType<typeof createSyncEngine>, outbox: ReturnType<typeof createOutbox> }} scope bundle. With a missing id the scope is null and nothing is stored.
 */
export function syncScope(orgId, userId, { senders = {} } = {}) {
  const scope = storeScope(orgId, userId);
  const id = scope || '';
  if (!scopes.has(id)) {
    const allSenders = {};
    const engine = createSyncEngine({ store: localStore(), scope, adapter: getPlatformAdapter() });
    const outbox = createOutbox({ store: localStore(), scope, senders: allSenders });
    const stopForeground = engine.refreshOnForeground();
    const stopOutboxForeground = getPlatformAdapter().onForeground(() => { void outbox.flush(); });
    scopes.set(id, { scope, engine, outbox, senders: allSenders, stop: () => { stopForeground(); stopOutboxForeground(); } });
    if (scope) void outbox.resume();
  }
  const bundle = scopes.get(id);
  Object.assign(bundle.senders, senders);
  return { scope: bundle.scope, engine: bundle.engine, outbox: bundle.outbox };
}

/**
 * Close every scope and remove every stored row.
 * @returns {Promise<void>} resolves once the LocalStore is empty.
 */
export async function wipeAllScopes() {
  for (const bundle of scopes.values()) { bundle.stop(); bundle.engine.close(); bundle.outbox.close(); }
  scopes.clear();
  await localStore().wipeAll();
}

/**
 * Confirm the signed-in scope: rows of every other person or company are removed, including rows left by a
 * session that ended without a sign-out on this device.
 * @param {string} orgId - organization id confirmed by bootstrap.
 * @param {string} userId - user id confirmed by bootstrap.
 * @returns {Promise<void>} resolves once other scopes are gone.
 */
export async function adoptScope(orgId, userId) {
  const scope = storeScope(orgId, userId);
  if (!scope) return;
  for (const [id, bundle] of scopes) {
    if (id === scope) continue;
    bundle.stop(); bundle.engine.close(); bundle.outbox.close();
    scopes.delete(id);
  }
  await localStore().retainOnly(scope);
}

if (typeof window !== 'undefined') {
  window.addEventListener('hm:tenant-changed', () => { void wipeAllScopes(); });
}
