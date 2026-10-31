/**
 * Outbox: user actions (sends, read marks, approvals) that must reach the server exactly once.
 *
 * `enqueue` persists the operation with a fresh `clientId` and sends it at once. A transient failure (network,
 * 408, 425, 429, 5xx) schedules a retry with exponential backoff; operations survive an app restart through the
 * LocalStore and resume on `resume()`. Every retry reuses the same `clientId`, so an idempotent server endpoint
 * creates one record however often the request repeats. Other 4xx answers mark the operation `failed`; it stays
 * until the person retries or discards it. Operations for one target (one conversation) are sent in order.
 */

const ENTITY = '__outbox';

/**
 * Whether a failed send should be retried.
 * @param {unknown} error - rejection from a sender; `status` or `response.status` carries the HTTP status.
 * @returns {boolean} true for network errors, 408, 425, 429 and 5xx.
 */
export function isTransientFailure(error) {
  const status = Number(error?.status ?? error?.response?.status);
  if (!Number.isFinite(status) || status === 0) return true;
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

/**
 * Delay before the next attempt.
 * @param {number} attempts - attempts made so far (1 after the first failure).
 * @param {{ baseMs?: number, maxMs?: number }} [rules] - first delay and ceiling.
 * @returns {number} milliseconds.
 */
export function retryDelay(attempts, { baseMs = 1000, maxMs = 60000 } = {}) {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempts - 1));
}

/**
 * Create an outbox for one scope.
 * @param {{
 *   store: ReturnType<import('./local-store').createLocalStore>,
 *   scope: string|null,
 *   senders: Record<string, (payload: unknown, context: { clientId: string }) => Promise<unknown>>,
 *   now?: () => number,
 *   uuid?: () => string,
 *   timers?: { set: (run: () => void, ms: number) => unknown, clear: (handle: unknown) => void },
 *   backoff?: { baseMs?: number, maxMs?: number },
 * }} options - LocalStore, scope, one sender per operation kind (resolves with the server's answer), clock, id source, timers and backoff.
 * @returns {object} outbox; see the methods below.
 */
export function createOutbox({
  store,
  scope,
  senders,
  now = () => Date.now(),
  uuid = () => globalThis.crypto.randomUUID(),
  timers = { set: (run, ms) => setTimeout(run, ms), clear: (handle) => clearTimeout(handle) },
  backoff = {},
}) {
  const ops = new Map();
  const listeners = new Set();
  const sending = new Set();
  let timer = null;
  let closed = false;

  const emit = (event) => { for (const listener of listeners) listener(event); };
  const persist = (op) => store.put(scope, ENTITY, op.clientId, op);
  const ordered = () => [...ops.values()].sort((a, b) => a.createdAt - b.createdAt);

  const schedule = () => {
    if (timer !== null) { timers.clear(timer); timer = null; }
    if (closed) return;
    const waiting = ordered().filter((op) => op.state === 'queued');
    if (!waiting.length) return;
    const next = Math.min(...waiting.map((op) => op.nextAt));
    timer = timers.set(() => { timer = null; void outbox.flush(); }, Math.max(0, next - now()));
  };

  const sendOne = async (op) => {
    sending.add(op.clientId);
    try {
      const result = await senders[op.kind](op.payload, { clientId: op.clientId });
      if (closed) return true;
      ops.delete(op.clientId);
      await store.delete(scope, ENTITY, op.clientId);
      emit({ type: 'sent', op, result });
      return true;
    } catch (error) {
      if (closed) return false;
      const attempts = op.attempts + 1;
      const next = isTransientFailure(error)
        ? { ...op, attempts, state: 'queued', nextAt: now() + retryDelay(attempts, backoff) }
        : { ...op, attempts, state: 'failed', nextAt: Infinity };
      ops.set(op.clientId, next);
      await persist(next);
      emit({ type: next.state === 'failed' ? 'failed' : 'retry', op: next, error });
      return false;
    } finally {
      sending.delete(op.clientId);
    }
  };

  const outbox = {
    /**
     * Persist and send one operation.
     * @param {string} kind - operation kind; must have a sender.
     * @param {unknown} payload - JSON-serializable request data. Never a password, code or secure-input value.
     * @param {{ target?: string }} [options] - ordering group, for example a conversation id.
     * @returns {Promise<{ clientId: string, kind: string, payload: unknown, target: string, state: string, attempts: number, createdAt: number, nextAt: number }>} the queued operation, after it is stored and its first send has started.
     */
    async enqueue(kind, payload, { target = '' } = {}) {
      if (typeof senders[kind] !== 'function') throw new Error(`No outbox sender for ${kind}`);
      const op = { clientId: uuid(), kind, payload, target, state: 'queued', attempts: 0, createdAt: now(), nextAt: now() };
      ops.set(op.clientId, op);
      emit({ type: 'queued', op });
      await persist(op);
      void outbox.flush();
      return op;
    },
    /**
     * Send every due operation. The oldest operation of a target blocks later ones of the same target.
     * @returns {Promise<void>} resolves when this pass has finished.
     */
    async flush() {
      if (closed) return;
      const blocked = new Set();
      for (const op of ordered()) {
        if (blocked.has(op.target)) continue;
        // A failed operation waits for the person; it does not hold back later sends.
        if (op.state === 'failed') continue;
        if (sending.has(op.clientId)) { if (op.target) blocked.add(op.target); continue; }
        if (op.nextAt > now()) { if (op.target) blocked.add(op.target); continue; }
        const sent = await sendOne(op);
        if (!sent && op.target) blocked.add(op.target);
      }
      schedule();
    },
    /**
     * Load operations stored by an earlier session and send the due ones.
     * @returns {Promise<void>} resolves after the first send pass.
     */
    async resume() {
      const rows = await store.list(scope, ENTITY);
      for (const { value } of rows) {
        if (value?.clientId && !ops.has(value.clientId)) ops.set(value.clientId, { ...value, nextAt: value.state === 'queued' ? Math.min(value.nextAt ?? 0, now()) : Infinity });
      }
      await outbox.flush();
    },
    /**
     * Queue a failed or waiting operation for an immediate attempt.
     * @param {string} clientId - operation id.
     * @returns {Promise<void>} resolves after the send pass.
     */
    async retry(clientId) {
      const op = ops.get(clientId);
      if (!op) return;
      const next = { ...op, state: 'queued', nextAt: now() };
      ops.set(clientId, next);
      await persist(next);
      await outbox.flush();
    },
    /**
     * Drop an operation without sending it.
     * @param {string} clientId - operation id.
     * @returns {Promise<void>} resolves after removal.
     */
    async discard(clientId) {
      const op = ops.get(clientId);
      ops.delete(clientId);
      await store.delete(scope, ENTITY, clientId);
      if (op) emit({ type: 'discarded', op });
      schedule();
    },
    /**
     * Operations not yet acknowledged.
     * @param {string} [target] - only this ordering group.
     * @returns {object[]} operations, oldest first.
     */
    pending(target) { return ordered().filter((op) => target === undefined || op.target === target); },
    /**
     * Listen for `queued`, `sent`, `retry`, `failed` and `discarded` events.
     * @param {(event: { type: string, op: object, result?: unknown, error?: unknown }) => void} listener - event callback.
     * @returns {() => void} unsubscribe.
     */
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    /**
     * Stop sending and cancel the retry timer. Stored operations stay for `resume` unless the scope is wiped.
     * @returns {void}
     */
    close() { closed = true; if (timer !== null) timers.clear(timer); timer = null; listeners.clear(); },
  };
  return outbox;
}
