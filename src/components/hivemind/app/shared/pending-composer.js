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

let draft = '';
let attachedTransport = null;
const draftListeners = new Set();
const entryListeners = new Set();
const marked = new Set();

function emitDraft() {
  for (const listener of draftListeners) listener(draft);
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
 * @returns {string|null} queue entry id, or null when the draft is empty.
 */
export function queueDraft() {
  const text = draft.trim();
  if (!text) return null;
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
  return () => {
    if (attachedTransport === send) {
      attachedTransport = null;
      queue.close();
    }
  };
}

/**
 * Whether a room client is attached and sends deliver now.
 * @returns {boolean} true while attached.
 */
export function isComposerAttached() {
  return attachedTransport !== null;
}
