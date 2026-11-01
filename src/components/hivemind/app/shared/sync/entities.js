/**
 * Tier-1 entities of the local-first apps, registered on a scope's SyncEngine by the screens that show them.
 * Each entity keeps a bounded, display-only copy; the screen paints it at once and the refresh replaces it.
 */

import { feedRevision, readSinceFeed } from './feeds';
import { fetchNeedsYouPage, needsYouFeedPage, parseNeedsYou } from '../needs-you';

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

/** A cursor read can miss a card the server removed without a tombstone, so the list is read whole again after this long. */
const NEEDS_YOU_FULL_READ_MS = 10 * 60_000;

/**
 * Register the Needs you list. It reads `GET /api/hivemind/needs-you?since=`: answered cards and cards of paused or archived
 * employees come back as `resolved` and are removed; a server without the feed answers the plain list, which replaces the copy.
 * @param {ReturnType<import('./sync-engine').createSyncEngine>} engine - scope engine.
 * @param {(since: string, context: { signal?: AbortSignal }) => Promise<object>} [readPage] - one request of the feed.
 * @param {() => number} [now] - clock.
 * @returns {() => void} unregisters.
 */
export function registerNeedsYou(engine, readPage = fetchNeedsYouPage, now = Date.now) {
  let fullReadAt = -Infinity;
  return engine.register(NEEDS_YOU, {
    maxKeys: 1,
    orderOf: createdAt,
    revisionOf: feedRevision,
    fetchSince: async (key, cursor, { signal }) => {
      const full = !cursor || now() - fullReadAt > NEEDS_YOU_FULL_READ_MS;
      const page = needsYouFeedPage(await readSinceFeed((since) => readPage(since, { signal }), full ? null : cursor, { signal, listOf: parseNeedsYou }));
      if (full) fullReadAt = now();
      return full ? { ...page, replace: true } : page;
    },
  });
}

/** Employees of the roster: the people-facing copy of Control's employee list. */
export const ROSTER = 'roster';
const ROSTER_FIELDS = ['id', 'name', 'slug', 'roleArchetype', 'status', 'avatarUrl', 'scope', 'teamId', 'revision'];

/**
 * Register the employee roster from Control's `GET /v1/employees?since=`. Removed or archived employees come back as
 * tombstones and leave the list; a server without the feed answers `{ employees }`, which replaces the copy.
 * Only display fields are kept (name, role, status, avatar, saved look and lifecycle revision); persona, tools and the rest of the policy are dropped.
 * @param {ReturnType<import('./sync-engine').createSyncEngine>} engine - scope engine.
 * @param {{ controlPlane: { get: Function } }} apiClient - authenticated Control client.
 * @returns {() => void} unregisters.
 */
export function registerRoster(engine, apiClient) {
  const slim = (employee) => {
    const rules = employee?.policyRules;
    const policyRules = {
      ...(rules?.open_dot_employee?.dot_id ? { open_dot_employee: { version: rules.open_dot_employee.version, dot_id: rules.open_dot_employee.dot_id, state: rules.open_dot_employee.state } } : {}),
      ...(rules?.appearance ? { appearance: rules.appearance } : {}),
      ...(Number.isSafeInteger(rules?.native_lifecycle?.profile_revision) ? { native_lifecycle: { profile_revision: rules.native_lifecycle.profile_revision } } : {}),
    };
    return { ...Object.fromEntries(ROSTER_FIELDS.filter((field) => employee?.[field] !== undefined).map((field) => [field, employee[field]])), policyRules };
  };
  return engine.register(ROSTER, {
    maxKeys: 1,
    orderOf: createdAt,
    revisionOf: feedRevision,
    fetchSince: async (key, cursor, { signal }) => {
      const page = await readSinceFeed(
        async (since) => (await apiClient.controlPlane.get('/v1/employees', { signal, params: { since, limit: 200 } })).data,
        cursor,
        { signal, listOf: (body) => body?.employees },
      );
      return { ...page, items: page.items.map(slim) };
    },
  });
}
