import { haptic } from './platform-haptics';
/**
 * In-memory send queue for chat messages.
 *
 * `enqueue` records a message as `queued` and returns at once, so the caller can
 * show an optimistic bubble. Messages sent before the runner connection is open
 * stay queued and are delivered in FIFO order when `open()` is called. After the
 * connection is open, `enqueue` sends immediately. A failed delivery moves the
 * message to `failed`; `retry(id)` requeues it. Nothing is persisted: a queued
 * message exists only for the current document.
 */

/**
 * @typedef {'queued' | 'sending' | 'sent' | 'failed'} SendState
 * @typedef {{ id: string, payload: unknown, state: SendState, error?: string }} SendEntry
 */

/**
 * Create a queue bound to one transport.
 * @param {{ transport: (payload: unknown) => Promise<unknown>, onChange?: (entry: SendEntry) => void }} options - delivery function and state-change callback.
 * @returns {{ enqueue: (payload: unknown) => { id: string, done: Promise<unknown> }, open: () => void, close: () => void, retry: (id: string) => boolean, entries: () => SendEntry[], isOpen: () => boolean }} queue operations.
 */
export function createSendQueue({ transport, onChange = () => {} }) {
  let open = false;
  let sequence = 0;
  const entries = new Map();
  const waiters = new Map();

  const update = (entry, patch) => {
    Object.assign(entry, patch);
    onChange({ ...entry });
  };

  const deliver = (entry) => {
    update(entry, { state: 'sending', error: undefined });
    return Promise.resolve()
      .then(() => transport(entry.payload))
      .then((result) => {
        update(entry, { state: 'sent' });
        waiters.get(entry.id)?.resolve(result);
        return result;
      }, (error) => {
        update(entry, { state: 'failed', error: error?.message || 'send_failed' });
        waiters.get(entry.id)?.reject(error);
        throw error;
      });
  };

  const flush = () => {
    for (const entry of entries.values()) {
      if (entry.state === 'queued') deliver(entry).catch(() => {});
    }
  };

  return {
    enqueue(payload) {
      sequence += 1;
      haptic('light');
      const entry = { id: `send-${sequence}`, payload, state: 'queued' };
      entries.set(entry.id, entry);
      onChange({ ...entry });
      const done = new Promise((resolve, reject) => waiters.set(entry.id, { resolve, reject }));
      done.catch(() => {});
      if (open) deliver(entry).catch(() => {});
      return { id: entry.id, done };
    },
    open() {
      open = true;
      flush();
    },
    close() { open = false; },
    retry(id) {
      const entry = entries.get(id);
      if (!entry || entry.state !== 'failed') return false;
      update(entry, { state: 'queued', error: undefined });
      if (open) deliver(entry).catch(() => {});
      return true;
    },
    entries() { return [...entries.values()].map((entry) => ({ ...entry })); },
    isOpen() { return open; },
  };
}
