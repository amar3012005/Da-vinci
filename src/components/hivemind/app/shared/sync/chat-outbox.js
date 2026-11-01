/**
 * Chat sends through the persisted Outbox.
 *
 * A send is stored with its client id before any network call, so it survives an app close or a lost connection, is
 * retried with backoff by the Outbox, and is never created twice: every attempt carries the same `requestId`, which
 * OpenDot's send routes treat as the idempotency key (`POST /api/conversations/{id}` and
 * `POST /api/dots/{id}/conversations`; a repeat answers the first message with `replayed: true`, a changed text with
 * the same id is a 409 and the Outbox marks it failed).
 *
 * The screen shows an unsent message from the Outbox itself ({@link pendingMessages}), so a stored operation is the only
 * copy of "sending"; nothing optimistic is written into the synced lists. When the server acknowledges, the saved
 * message is written into the conversation's list and the operation disappears from the Outbox.
 */

import { chatEntities, projectMessage, registerChat, requestJson, surfaceOfDot, RECENTS_KEY } from './chat-feed';
import { fetchRuntime } from '../runtime-admission';

export const CHAT_SEND = 'chat-send';
export const CHAT_START = 'chat-start';

async function post(path, body) {
  const response = await fetchRuntime(path, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let reply = null;
  try { reply = await response.json(); } catch { /* A non-JSON body is reported by its status below. */ }
  if (!response.ok || !reply || reply.ok === false) throw Object.assign(new Error(reply?.error || `HTTP ${response.status}`), { status: response.status >= 400 ? response.status : 400 });
  return reply;
}

/**
 * Outbox senders for chat. `payload` holds only what the person typed: `{ conversationId, dotId, text }` or `{ dotId, text }`.
 * @type {Record<string, (payload: object, context: { clientId: string }) => Promise<object>>}
 */
export const chatSenders = {
  [CHAT_SEND]: (payload, { clientId }) => post(`/api/conversations/${encodeURIComponent(payload.conversationId)}`, { dotId: payload.dotId, text: payload.text, attachments: [], requestId: clientId }),
  [CHAT_START]: (payload, { clientId }) => post(`/api/dots/${encodeURIComponent(payload.dotId)}/conversations`, { text: payload.text, attachments: [], requestId: clientId }),
};

/**
 * Write acknowledged sends into the synced lists. Call once per scope.
 * @param {{ engine: ReturnType<import('./sync-engine').createSyncEngine>, outbox: ReturnType<import('./outbox').createOutbox>, request?: Function }} scope - engine and outbox of one scope.
 * @returns {() => void} stops listening.
 */
export function bindChatOutbox({ engine, outbox, request = requestJson }) {
  registerChat(engine, { request });
  return outbox.subscribe((event) => {
    if (event.type !== 'sent') return;
    const { op, result } = event;
    if (op.kind === CHAT_SEND && result?.message) {
      const entity = chatEntities(surfaceOfDot(op.payload.dotId)).messages;
      const saved = { ...projectMessage(result.message), clientId: op.clientId, ...(result.revision != null ? { revision: String(result.revision) } : {}) };
      engine.apply(entity, op.payload.conversationId, { items: [saved] }).catch(() => { /* The next cursor read brings the saved message. */ });
    } else if (op.kind === CHAT_START) {
      engine.refresh(chatEntities(surfaceOfDot(op.payload.dotId)).recents, RECENTS_KEY).catch(() => { /* The next foreground read brings the new conversation. */ });
    }
  });
}

/**
 * Unsent messages of a conversation as list items, from the stored Outbox operations.
 * @param {ReturnType<import('./outbox').createOutbox>} outbox - scope outbox.
 * @param {string} target - conversation id, or `new:<dotId>` for a first message.
 * @returns {object[]} items with `pending: true` and `state` of `sending`, `queued` (waiting to retry) or `failed`, oldest first.
 */
export function pendingMessages(outbox, target) {
  return outbox.pending(target).filter((op) => op.kind === CHAT_SEND || op.kind === CHAT_START).map((op) => ({
    id: `pending:${op.clientId}`,
    clientId: op.clientId,
    pending: true,
    state: op.state === 'failed' ? 'failed' : op.attempts > 0 ? 'queued' : 'sending',
    role: 'user',
    text: String(op.payload?.text ?? ''),
    createdAt: op.createdAt,
  }));
}

/**
 * Write a message to the Outbox and start sending it. Resolves as soon as the operation is stored (the screen shows it
 * from the Outbox), not when the server answers.
 * @param {{ outbox: ReturnType<import('./outbox').createOutbox> }} scope - scope bundle.
 * @param {{ conversationId?: string|null, dotId: string, text: string }} message - target conversation (or employee for a first message) and text. Never a password, code or secure-input value.
 * @returns {Promise<object|null>} the stored operation, or null for an empty text.
 */
export async function sendChatMessage({ outbox }, { conversationId, dotId, text }) {
  const body = String(text ?? '').trim();
  if (!body || !dotId) return null;
  if (conversationId) return outbox.enqueue(CHAT_SEND, { conversationId, dotId, text: body }, { target: conversationId });
  return outbox.enqueue(CHAT_START, { dotId, text: body }, { target: `new:${dotId}` });
}
