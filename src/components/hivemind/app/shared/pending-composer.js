/**
 * Shell-owned composer state for chat rooms that render before the runner
 * connection is ready (the phone room frame).
 *
 * The draft is kept in memory so typed text survives the frame's remount. A
 * send becomes a queued entry immediately and is delivered only after the room
 * client calls `attachComposerTransport(send)`; attaching flushes the queue in
 * order. Nothing is persisted: pending messages exist only for this document.
 */
import { createSendQueue } from './send-queue';
import { cacheKey } from './browser-cache';

export const COMPOSER_DRAFT_MESSAGE = 'hm:composer-draft';

let draft = '';
let attachedTransport = null;
const draftListeners = new Set();
const entryListeners = new Set();
const attachListeners = new Set();
const marked = new Set();

function emitDraft() {
  for (const listener of draftListeners) listener(draft);
}

function emitAttached() {
  for (const listener of attachListeners) listener(attachedTransport !== null);
}

function emitEntries() {
  const snapshot = queue.entries();
  for (const listener of entryListeners) listener(snapshot);
}

const queue = createSendQueue({
  // Deliver through whichever room client is attached. The queue is open only while one is attached.
  transport: (payload) => {
    if (!attachedTransport) throw new Error('composer_not_attached');
    return attachedTransport(payload);
  },
  onChange: emitEntries,
});

/**
 * Record a performance mark once per document. Used for the canary timing log.
 * @param {string} name - mark name, for example `hm:composer-visible`.
 * @returns {void}
 */
export function markOnce(name) {
  if (typeof performance === 'undefined' || typeof performance.mark !== 'function' || marked.has(name)) return;
  marked.add(name);
  performance.mark(name);
}

/** @returns {string} current draft text. */
export function getDraft() { return draft; }

/**
 * Replace the draft text.
 * @param {string} text - draft text, bounded to 4000 characters.
 * @returns {void}
 */
export function setDraft(text) {
  draft = String(text ?? '').slice(0, 4000);
  emitDraft();
}

/**
 * Subscribe to draft changes.
 * @param {(text: string) => void} listener - called with the new draft.
 * @returns {() => void} unsubscribe.
 */
export function subscribeDraft(listener) {
  draftListeners.add(listener);
  return () => draftListeners.delete(listener);
}

/**
 * Subscribe to queue entry changes.
 * @param {(entries: Array<{ id: string, payload: unknown, state: string, error?: string }>) => void} listener - called with a snapshot.
 * @returns {() => void} unsubscribe.
 */
export function subscribePendingEntries(listener) {
  entryListeners.add(listener);
  listener(queue.entries());
  return () => entryListeners.delete(listener);
}

/**
 * Queue the current draft. The draft clears synchronously, so a second call before the next render finds nothing to send.
 * @returns {string|null} queue entry id, or null when the draft is empty or no room client is attached.
 */
export function queueDraft() {
  const text = draft.trim();
  // Without an attached room client nothing could deliver the message, so the draft stays in the composer.
  if (!text || attachedTransport === null) return null;
  const { id } = queue.enqueue({ text });
  draft = '';
  emitDraft();
  markOnce('hm:first-send');
  return id;
}

/**
 * Attach the room client that delivers queued messages. Flushes anything waiting, in send order.
 * @param {(payload: { text: string }) => Promise<unknown>} send - delivers one message and resolves when the reply completes.
 * @returns {() => void} detach; the queue holds new messages until the next attach.
 */
export function attachComposerTransport(send) {
  attachedTransport = send;
  queue.open();
  emitAttached();
  return () => {
    if (attachedTransport === send) {
      attachedTransport = null;
      queue.close();
      emitAttached();
    }
  };
}

/**
 * Subscribe to attach changes. The listener is called once with the current state.
 * @param {(attached: boolean) => void} listener - receives whether a room client is attached.
 * @returns {() => void} unsubscribe.
 */
export function subscribeAttached(listener) {
  attachListeners.add(listener);
  listener(attachedTransport !== null);
  return () => attachListeners.delete(listener);
}

/**
 * Move the unsent draft into the native room client. Writes the draft to sessionStorage under
 * `hm:<tenant>:<user>:draft:<roomId>` and posts `{ type: 'hm:composer-draft', roomId, text }` to this window
 * and to same-origin iframes. The draft is cleared from the shell only after both writes are attempted.
 * @param {{ tenant: string, user: string, roomId: string }} target - tenant (organization id), user id and room id.
 * @returns {string|null} handed-off text, or null when there is no draft or no identity.
 */
export function handOffComposerDraft({ tenant, user, roomId }) {
  const text = draft.trim();
  const key = cacheKey({ tenant, user, kind: 'draft', id: roomId });
  if (!text || !key) return null;
  try { window.sessionStorage.setItem(key, text); } catch { /* Blocked storage: the message below still delivers the draft. */ }
  const message = { type: COMPOSER_DRAFT_MESSAGE, roomId, text };
  try { window.postMessage(message, window.location.origin); } catch { /* Unsupported messaging: the sessionStorage copy remains. */ }
  for (const frame of document.querySelectorAll('iframe')) {
    try { frame.contentWindow?.postMessage(message, window.location.origin); } catch { /* Cross-origin frame: skipped. */ }
  }
  setDraft('');
  return text;
}

/**
 * Whether a room client is attached and sends deliver now.
 * @returns {boolean} true while attached.
 */
export function isComposerAttached() {
  return attachedTransport !== null;
}
