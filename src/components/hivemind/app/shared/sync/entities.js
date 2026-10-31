/**
 * Tier-1 entities of the local-first apps, registered on a scope's SyncEngine by the screens that show them.
 * Each entity keeps a bounded, display-only copy; the screen paints it at once and the refresh replaces it.
 */

import { feedRevision, readSinceFeed } from './feeds';

const createdAt = (item) => item?.createdAt ?? item?.created_at ?? 0;

/** Bell notifications: newest 50, unread count kept as list metadata. */
export const NOTIFICATIONS = 'notifications';
/** Needs you cards: every open card; the person's action is always re-checked by the server. */
export const NEEDS_YOU = 'needs-you';

/**
 * Register the bell list.
 * @param {ReturnType<import('./sync-engine').createSyncEngine>} engine - scope engine.
 * @param {{ controlPlane: { get: Function } }} apiClient - authenticated Control client.
 * @returns {() => void} unregisters.
 */
export function registerNotifications(engine, apiClient) {
  return engine.register(NOTIFICATIONS, {
    limit: 50,
    maxKeys: 1,
    orderOf: createdAt,
    revisionOf: feedRevision,
    // A full read until Control's changes-since feed ships; readSinceFeed then switches to cursors without a client change.
    fetchSince: (key, cursor, { signal }) => readSinceFeed(
      async (since) => (await apiClient.controlPlane.get('/v1/workspace/notifications', { signal, params: cursor ? { since, limit: 50 } : { limit: 30 } })).data,
      cursor,
      { signal, metaOf: (body) => ({ unread: Number.isFinite(Number(body?.unread)) ? Number(body.unread) : null }) },
    ),
  });
}

/**
 * Register the Needs you list.
 * @param {ReturnType<import('./sync-engine').createSyncEngine>} engine - scope engine.
 * @param {(signal?: AbortSignal) => Promise<object[]>} fetchCards - the current full read of open cards.
 * @returns {() => void} unregisters.
 */
export function registerNeedsYou(engine, fetchCards) {
  return engine.register(NEEDS_YOU, {
    maxKeys: 1,
    orderOf: createdAt,
    fetchSince: async (key, cursor, { signal }) => ({ items: await fetchCards(signal), replace: true }),
  });
}
