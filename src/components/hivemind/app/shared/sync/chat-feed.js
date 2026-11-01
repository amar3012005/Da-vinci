/**
 * Chat conversations and messages as SyncEngine entities.
 *
 * Source: OpenDot's local-first sync API, read through `fetchRuntime` (docs/local-first-sync-api.md in OpenDot):
 * `GET /api/conversations?since=` lists the person's conversations and `GET /api/conversations/{id}` reads messages;
 * `?since=` on either returns only what changed after a cursor, with revisions and tombstones.
 *
 * Two surfaces share the feed. `brain` is the Company Brain room (dot `dot_company_brain`); `runtime` is every other
 * OpenDot employee room. The Runtime lead's own harness sessions are not OpenDot conversations and are not in this feed.
 *
 * What is kept on the device: the newest 30 conversations per surface (title and times) and the newest 50 messages of
 * each of the newest 30 conversations (text, role, times, attachment names). Cards are reduced to their kind: card
 * bodies can carry secure-input prompts, so none of their content is stored.
 */

import { LOCAL_FIRST } from './catalog';
import { feedRevision, readSinceFeed } from './feeds';
import { fetchRuntime } from '../runtime-admission';
import { COMPANY_BRAIN_DOT_ID } from '../company-brain-room';

export const CONVERSATION_LIMIT = 30;
export const MESSAGE_LIMIT = 50;
/** Key of the one conversation list a surface keeps. */
export const RECENTS_KEY = 'main';
const TEXT_LIMIT = 4000;
const TITLE_LIMIT = 200;
const FEED_PAGE = 200;

/**
 * Surface a conversation belongs to.
 * @param {string|null|undefined} dotId - employee id of the conversation.
 * @returns {'brain'|'runtime'} `brain` for the Company Brain, otherwise `runtime`.
 */
export function surfaceOfDot(dotId) { return dotId === COMPANY_BRAIN_DOT_ID ? 'brain' : 'runtime'; }

/**
 * Entity names of one surface.
 * @param {'brain'|'runtime'} surface - chat surface.
 * @returns {{ recents: string, messages: string }} LocalStore entity names (see catalog.js).
 */
export function chatEntities(surface) {
  return surface === 'brain'
    ? { recents: LOCAL_FIRST.brainRecents.entity, messages: LOCAL_FIRST.brainConversation.entity }
    : { recents: LOCAL_FIRST.runtimeRecents.entity, messages: LOCAL_FIRST.runtimeConversation.entity };
}

/**
 * Display copy of a conversation row.
 * @param {object} row - feed item.
 * @returns {{ id: string, dotId: string, title: string, createdAt: number, updatedAt: number, revision?: string }} stored conversation.
 */
export function projectConversation(row) {
  return {
    id: String(row.id),
    dotId: String(row.dotId ?? ''),
    title: String(row.title ?? '').slice(0, TITLE_LIMIT),
    createdAt: Number(row.createdAt) || 0,
    updatedAt: Number(row.updatedAt ?? row.createdAt) || 0,
    ...(row.revision !== undefined ? { revision: String(row.revision) } : {}),
  };
}

/**
 * Display copy of a message row: text, role, times and attachment names. The card body is dropped (only its kind stays).
 * @param {object} row - feed or page message.
 * @returns {object} stored message.
 */
export function projectMessage(row) {
  const attachments = Array.isArray(row.attachments)
    ? row.attachments.slice(0, 10).map((file) => ({ id: String(file?.id ?? ''), name: String(file?.name ?? '').slice(0, 200), mime: String(file?.mime ?? ''), size: Number(file?.size) || 0 }))
    : undefined;
  const cardKind = typeof row.card?.kind === 'string' ? row.card.kind : undefined;
  return {
    id: String(row.id),
    dotId: String(row.dotId ?? ''),
    conversationId: row.conversationId == null ? null : String(row.conversationId),
    role: String(row.role ?? ''),
    text: String(row.text ?? '').slice(0, TEXT_LIMIT),
    createdAt: Number(row.createdAt) || 0,
    ...(row.title ? { title: String(row.title).slice(0, TITLE_LIMIT) } : {}),
    ...(row.from ? { from: String(row.from) } : {}),
    ...(attachments?.length ? { attachments } : {}),
    ...(cardKind ? { cardKind } : {}),
    ...(row.clientId ? { clientId: String(row.clientId) } : {}),
    ...(row.revision !== undefined ? { revision: String(row.revision) } : {}),
  };
}

/**
 * JSON read of an OpenDot API path through the shell's Runtime transport (cookie on the web, native request in the app).
 * @param {string} path - `/api/...` path with query.
 * @param {{ signal?: AbortSignal }} [context] - abort signal.
 * @returns {Promise<object>} parsed body.
 * @throws {Error} with `status` when the server answers a non-2xx status or a body that is not JSON.
 */
export async function requestJson(path, { signal } = {}) {
  const response = await fetchRuntime(path, { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' }, signal });
  let body = null;
  try { body = await response.json(); } catch { /* A non-JSON body is handled as a failed status below. */ }
  if (!response.ok || body === null) throw Object.assign(new Error(body?.error || `HTTP ${response.status}`), { status: response.status || 502 });
  return body;
}

const feedMissing = () => { throw Object.assign(new Error('sync_feed_unavailable'), { status: 502 }); };

/**
 * Read page for a conversation list: the cursor feed. A server without the feed raises instead of emptying the list.
 * @param {(path: string, context?: object) => Promise<object>} request - JSON reader.
 * @param {'brain'|'runtime'} surface - which conversations to keep.
 * @returns {(key: string, cursor: unknown, context: { signal?: AbortSignal }) => Promise<object>} SyncEngine `fetchSince`.
 */
export function conversationsReader(request, surface) {
  return async (key, cursor, { signal } = {}) => {
    const page = await readSinceFeed((since) => request(`/api/conversations?since=${encodeURIComponent(since)}&limit=${FEED_PAGE}`, { signal }), cursor, { signal, listOf: feedMissing });
    return { ...page, items: page.items.filter((row) => surfaceOfDot(row.dotId) === surface).map(projectConversation) };
  };
}

/**
 * Read page for the messages of one conversation. The first read takes the feed position (`since=now`) and then the
 * newest messages by the existing page route, so nothing written in between is missed; later reads are cursor reads.
 * A conversation the server no longer knows (404) empties its copy.
 * @param {(path: string, context?: object) => Promise<object>} request - JSON reader.
 * @returns {(key: string, cursor: unknown, context: { signal?: AbortSignal }) => Promise<object>} SyncEngine `fetchSince`.
 */
export function messagesReader(request) {
  return async (conversationId, cursor, { signal } = {}) => {
    const base = `/api/conversations/${encodeURIComponent(conversationId)}`;
    try {
      if (typeof cursor === 'string' && cursor) {
        const page = await readSinceFeed((since) => request(`${base}?since=${encodeURIComponent(since)}&limit=${FEED_PAGE}`, { signal }), cursor, { signal, listOf: feedMissing });
        return { ...page, items: page.items.map(projectMessage) };
      }
      const head = await request(`${base}?since=now`, { signal });
      if (typeof head?.next_cursor !== 'string') feedMissing();
      const tail = await request(base, { signal });
      let messages = Array.isArray(tail?.messages) ? tail.messages : [];
      if (messages.length < MESSAGE_LIMIT && typeof tail?.nextCursor === 'string') {
        const older = await request(`${base}?before=${encodeURIComponent(tail.nextCursor)}`, { signal });
        messages = [...(Array.isArray(older?.messages) ? older.messages : []), ...messages];
      }
      return { items: messages.slice(-MESSAGE_LIMIT).map(projectMessage), deletes: [], cursor: head.next_cursor, replace: true };
    } catch (error) {
      if (error?.status === 404) return { items: [], deletes: [], cursor: null, replace: true };
      throw error;
    }
  };
}

const registered = new WeakSet();

/**
 * Declare the four chat entities on an engine (once per engine).
 * @param {ReturnType<import('./sync-engine').createSyncEngine>} engine - scope engine.
 * @param {{ request?: (path: string, context?: object) => Promise<object> }} [options] - JSON reader; defaults to {@link requestJson}.
 * @returns {void}
 */
export function registerChat(engine, { request = requestJson } = {}) {
  if (registered.has(engine)) return;
  registered.add(engine);
  for (const surface of ['brain', 'runtime']) {
    const names = chatEntities(surface);
    const catalog = surface === 'brain' ? LOCAL_FIRST.brainRecents : LOCAL_FIRST.runtimeRecents;
    const messages = surface === 'brain' ? LOCAL_FIRST.brainConversation : LOCAL_FIRST.runtimeConversation;
    engine.register(names.recents, {
      limit: CONVERSATION_LIMIT, maxKeys: catalog.maxKeys, orderOf: (row) => row.updatedAt, revisionOf: feedRevision,
      fetchSince: conversationsReader(request, surface),
    });
    engine.register(names.messages, {
      limit: MESSAGE_LIMIT, maxKeys: messages.maxKeys, orderOf: (row) => row.createdAt, revisionOf: feedRevision,
      fetchSince: messagesReader(request),
    });
  }
}

/**
 * Newest conversation of a surface, optionally of one employee.
 * @param {object[]} conversations - stored conversations, oldest update first.
 * @param {{ dotId?: string }} [filter] - restrict to one employee.
 * @returns {object|undefined} the most recently updated conversation.
 */
export function latestConversation(conversations, { dotId } = {}) {
  const rows = (conversations || []).filter((row) => !dotId || row.dotId === dotId);
  return rows.reduce((best, row) => (!best || row.updatedAt >= best.updatedAt ? row : best), undefined);
}
