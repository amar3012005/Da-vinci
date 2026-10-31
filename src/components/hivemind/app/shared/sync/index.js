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
import { bindPersistentCache } from './page-cache-persistence';
import { PRELOAD_ENTITIES } from './catalog';
import { pageCache } from '../resource-cache';
import { readLastTenant } from '../boot-cache';

export { createLocalStore, createIndexedDbBackend, createMemoryBackend, storeScope, rowKey } from './local-store';
export { createSyncEngine, reconcile } from './sync-engine';
export { createOutbox, isTransientFailure, retryDelay } from './outbox';
export { LOCAL_FIRST, PRELOAD_ENTITIES } from './catalog';
export { capacitorPlatformAdapter, getPlatformAdapter, setPlatformAdapter, webPlatformAdapter, NATIVE_PREFERENCE_KEYS } from './platform-adapter';

let sharedStore = null;
let confirmed = null;
const scopeListeners = new Set();
function setConfirmed(next) {
  confirmed = next;
  for (const listener of scopeListeners) listener();
}

/**
 * Person and company confirmed by bootstrap, or null while signed out.
 * @returns {{ orgId: string, userId: string }|null} the confirmed identity. The object changes only when the identity does.
 */
export function confirmedIdentity() { return confirmed; }

/**
 * Listen for sign-in, switch and sign-out.
 * @param {() => void} listener - called after the confirmed identity changed.
 * @returns {() => void} unsubscribe.
 */
export function onIdentityChange(listener) { scopeListeners.add(listener); return () => { scopeListeners.delete(listener); }; }
const scopes = new Map();
const pagePersistence = bindPersistentCache(pageCache, { store: () => localStore() });

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
    if (scope) void preloadEngine(engine);
  }
  const bundle = scopes.get(id);
  Object.assign(bundle.senders, senders);
  return { scope: bundle.scope, engine: bundle.engine, outbox: bundle.outbox };
}

function preloadEngine(engine) {
  return engine.preload(PRELOAD_ENTITIES).catch(() => { /* The first paint then waits for the local read or the network. */ });
}

/**
 * Close every scope and remove every stored row.
 * @returns {Promise<void>} resolves once the LocalStore is empty.
 */
export async function wipeAllScopes() {
  for (const bundle of scopes.values()) { bundle.stop(); bundle.engine.close(); bundle.outbox.close(); }
  scopes.clear();
  setConfirmed(null);
  void pagePersistence.adopt(null);
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
  if (!confirmed || confirmed.orgId !== orgId || confirmed.userId !== userId) setConfirmed({ orgId, userId });
  for (const [id, bundle] of scopes) {
    if (id === scope) continue;
    bundle.stop(); bundle.engine.close(); bundle.outbox.close();
    scopes.delete(id);
  }
  await localStore().retainOnly(scope);
  syncScope(orgId, userId);
  await pagePersistence.adopt(scope);
}

/**
 * Start reading the device copy of the last signed-in person before bootstrap answers, so screens opened right after
 * it paint their last known data. {@link adoptScope} discards it when bootstrap names another person or company.
 * @returns {void}
 */
function warmFromLastTenant() {
  const hint = readLastTenant();
  const scope = hint ? storeScope(hint.orgId, hint.userId) : null;
  if (!scope) return;
  syncScope(hint.orgId, hint.userId);
  void pagePersistence.adopt(scope);
}

if (typeof window !== 'undefined') {
  try { warmFromLastTenant(); } catch { /* A blocked store leaves every screen on the network read. */ }
  window.addEventListener('hm:tenant-changed', () => { void wipeAllScopes(); });
}
