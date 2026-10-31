import { createLocalStore, createMemoryBackend, storeScope } from '../local-store';
import { createSyncEngine, reconcile } from '../sync-engine';
import { createOutbox, isTransientFailure, retryDelay } from '../outbox';

const A = storeScope('org-a', 'user-1');
const B = storeScope('org-b', 'user-1');

function memoryStore() { return createLocalStore({ backend: createMemoryBackend() }); }

describe('LocalStore', () => {
  it('keeps one company and user apart from every other', async () => {
    const store = memoryStore();
    await store.put(A, 'messages', 'c1', { text: 'a' });
    await store.put(B, 'messages', 'c1', { text: 'b' });
    expect((await store.get(A, 'messages', 'c1')).value).toEqual({ text: 'a' });
    expect((await store.list(B, 'messages')).map((row) => row.value)).toEqual([{ text: 'b' }]);
    expect(await store.get(storeScope('org-a', 'user-2'), 'messages', 'c1')).toBeUndefined();
  });

  it('cannot build a scope from a partial identity and stores nothing for it', async () => {
    const store = memoryStore();
    expect(storeScope('org-a', '')).toBeNull();
    await store.put(null, 'messages', 'c1', { text: 'x' });
    expect(await store.list(null, 'messages')).toEqual([]);
  });

  it('drops credential-looking fields before writing', async () => {
    const store = memoryStore();
    await store.put(A, 'settings', 'me', { name: 'Amar', access_token: 'secret', nested: { apiKey: 'k', ok: 1 } });
    expect((await store.get(A, 'settings', 'me')).value).toEqual({ name: 'Amar', nested: { ok: 1 } });
  });

  it('wipes one scope, retains only one scope, or wipes everything', async () => {
    const store = memoryStore();
    await store.put(A, 'x', '1', 1);
    await store.put(B, 'x', '1', 2);
    await store.wipe(A);
    expect(await store.get(A, 'x', '1')).toBeUndefined();
    expect(await store.get(B, 'x', '1')).toBeDefined();
    await store.put(A, 'x', '1', 1);
    await store.retainOnly(A);
    expect(await store.get(B, 'x', '1')).toBeUndefined();
    await store.wipeAll();
    expect(await store.list(A, 'x')).toEqual([]);
  });
});

describe('reconcile', () => {
  const at = (id, created, extra = {}) => ({ id, created_at: created, ...extra });

  it('merges by id, keeps order and the newest items within the limit', () => {
    const local = [at('1', 1), at('2', 2)];
    const merged = reconcile(local, { items: [at('3', 3), at('2', 2, { text: 'edited' })] }, { limit: 2 });
    expect(merged.map((item) => item.id)).toEqual(['2', '3']);
    expect(merged[0].text).toBe('edited');
  });

  it('lets the server win, except over a newer server revision already held', () => {
    const local = [at('1', 1, { revision: 5, text: 'new' })];
    expect(reconcile(local, { items: [at('1', 1, { revision: 4, text: 'stale' })] })[0].text).toBe('new');
    expect(reconcile(local, { items: [at('1', 1, { revision: 6, text: 'newer' })] })[0].text).toBe('newer');
    expect(reconcile([at('1', 1, { text: 'local' })], { items: [at('1', 1, { text: 'server' })] })[0].text).toBe('server');
  });

  it('removes tombstoned ids and replaces the list when the page is complete', () => {
    expect(reconcile([at('1', 1), at('2', 2)], { deletes: ['1'] }).map((item) => item.id)).toEqual(['2']);
    expect(reconcile([at('1', 1)], { items: [at('2', 2)], replace: true }).map((item) => item.id)).toEqual(['2']);
  });

  it('keeps an optimistic item until the server returns its client id', () => {
    const pending = { clientId: 'c-1', pending: true, text: 'hi' };
    expect(reconcile([pending], { items: [] }, { limit: 0 })).toEqual([pending]);
    expect(reconcile([pending], { items: [at('9', 9, { clientId: 'c-1', text: 'hi' })] })).toEqual([at('9', 9, { clientId: 'c-1', text: 'hi' })]);
  });
});

describe('SyncEngine', () => {
  function messagesEngine(store, scope, fetchSince) {
    const engine = createSyncEngine({ store, scope });
    engine.register('messages', { fetchSince, limit: 50, maxKeys: 2 });
    return engine;
  }

  it('renders the stored copy before the server answers, then reconciles', async () => {
    const store = memoryStore();
    await store.put(A, 'messages', 'conv', { v: 1, items: [{ id: '1', created_at: 1, text: 'cached' }], cursor: 'c1' });
    let answer;
    const fetchSince = jest.fn(() => new Promise((resolve) => { answer = resolve; }));
    const engine = messagesEngine(store, A, fetchSince);
    const seen = [];
    engine.subscribe('messages', 'conv', (snapshot) => seen.push(snapshot.items.map((item) => item.text)));
    const { snapshot, refreshed } = await engine.open('messages', 'conv');
    expect(snapshot.items.map((item) => item.text)).toEqual(['cached']);
    expect(engine.peek('messages', 'conv').items).toHaveLength(1);
    await Promise.resolve();
    expect(fetchSince).toHaveBeenCalledWith('conv', 'c1', expect.any(Object));
    answer({ items: [{ id: '2', created_at: 2, text: 'fresh' }], cursor: 'c2' });
    await refreshed;
    expect(seen.at(-1)).toEqual(['cached', 'fresh']);
    expect((await store.get(A, 'messages', 'conv')).value.cursor).toBe('c2');
  });

  it('never reads another scope and stops writing after close', async () => {
    const store = memoryStore();
    await store.put(B, 'messages', 'conv', { v: 1, items: [{ id: 'b', created_at: 1 }], cursor: null });
    const engine = messagesEngine(store, A, async () => ({ items: [] }));
    expect(await engine.read('messages', 'conv')).toBeUndefined();
    engine.close();
    await engine.refresh('messages', 'conv');
    expect(await store.get(A, 'messages', 'conv')).toBeUndefined();
  });

  it('keeps the local copy when the refresh fails', async () => {
    const store = memoryStore();
    await store.put(A, 'messages', 'conv', { v: 1, items: [{ id: '1', created_at: 1 }], cursor: null });
    const engine = messagesEngine(store, A, async () => { throw new Error('offline'); });
    const onError = jest.fn();
    const { snapshot, refreshed } = await engine.open('messages', 'conv', { onError });
    await refreshed;
    expect(snapshot.items).toHaveLength(1);
    expect(onError).toHaveBeenCalled();
    expect((await engine.read('messages', 'conv')).items).toHaveLength(1);
  });

  it('bounds the number of stored lists and applies optimistic items', async () => {
    const store = memoryStore();
    const engine = messagesEngine(store, A, async (key) => ({ items: [{ id: `${key}-1`, created_at: 1 }] }));
    for (const key of ['c1', 'c2', 'c3']) await engine.refresh('messages', key);
    expect((await store.list(A, 'messages')).map((row) => row.id).sort()).toEqual(['c2', 'c3']);
    await engine.apply('messages', 'c3', { items: [{ clientId: 'x', pending: true, created_at: 2 }] });
    expect(engine.peek('messages', 'c3').items.map((item) => item.clientId || item.id)).toEqual(['c3-1', 'x']);
    await engine.apply('messages', 'c3', { items: [{ id: 'c3-2', clientId: 'x', created_at: 2 }] });
    expect(engine.peek('messages', 'c3').items.map((item) => item.id)).toEqual(['c3-1', 'c3-2']);
  });

  it('refreshes opened lists when the app returns to the foreground', async () => {
    let foreground;
    const adapter = { onForeground: (listener) => { foreground = listener; return () => {}; } };
    const fetchSince = jest.fn(async () => ({ items: [] }));
    const engine = createSyncEngine({ store: memoryStore(), scope: A, adapter });
    engine.register('notifications', { fetchSince });
    engine.refreshOnForeground();
    await (await engine.open('notifications', 'bell')).refreshed;
    foreground();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchSince).toHaveBeenCalledTimes(2);
  });
});

describe('Outbox', () => {
  function fakeTimers() {
    let clock = 0;
    const pending = [];
    return {
      now: () => clock,
      timers: { set: (run, ms) => { const handle = { run, at: clock + ms }; pending.push(handle); return handle; }, clear: (handle) => { const index = pending.indexOf(handle); if (index >= 0) pending.splice(index, 1); } },
      async advance(ms) { clock += ms; for (const handle of [...pending].filter((item) => item.at <= clock)) { pending.splice(pending.indexOf(handle), 1); handle.run(); } await new Promise((resolve) => setTimeout(resolve, 0)); },
    };
  }
  let ids = 0;
  const uuid = () => `client-${++ids}`;

  it('classifies failures and backs off exponentially', () => {
    expect(isTransientFailure(new TypeError('network'))).toBe(true);
    expect(isTransientFailure({ status: 503 })).toBe(true);
    expect(isTransientFailure({ response: { status: 429 } })).toBe(true);
    expect(isTransientFailure({ status: 400 })).toBe(false);
    expect([1, 2, 3, 10].map((attempt) => retryDelay(attempt))).toEqual([1000, 2000, 4000, 60000]);
  });

  it('sends at once with a client id and forgets the operation once acknowledged', async () => {
    const store = memoryStore();
    const send = jest.fn(async (payload, { clientId }) => ({ id: 'server-1', clientId }));
    const outbox = createOutbox({ store, scope: A, senders: { message: send }, uuid });
    const events = [];
    outbox.subscribe((event) => events.push(event.type));
    const op = await outbox.enqueue('message', { text: 'Reply with OK only' }, { target: 'conv' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(send).toHaveBeenCalledWith({ text: 'Reply with OK only' }, { clientId: op.clientId });
    expect(events).toEqual(['queued', 'sent']);
    expect(await store.list(A, '__outbox')).toEqual([]);
  });

  it('retries a transient failure with the same client id and survives a restart', async () => {
    const store = memoryStore();
    const time = fakeTimers();
    const send = jest.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue({ id: 's' });
    const first = createOutbox({ store, scope: A, senders: { message: send }, uuid, now: time.now, timers: time.timers });
    const op = await first.enqueue('message', { text: 'hi' }, { target: 'conv' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(first.pending()[0]).toMatchObject({ state: 'queued', attempts: 1, nextAt: 1000 });
    first.close();
    const restarted = createOutbox({ store, scope: A, senders: { message: send }, uuid, now: time.now, timers: time.timers });
    await restarted.resume();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map((call) => call[1].clientId)).toEqual([op.clientId, op.clientId]);
    expect(restarted.pending()).toEqual([]);
  });

  it('marks a rejected operation failed without blocking later sends', async () => {
    const store = memoryStore();
    const send = jest.fn(async (payload) => { if (payload.bad) throw Object.assign(new Error('bad'), { status: 400 }); return {}; });
    const outbox = createOutbox({ store, scope: A, senders: { message: send }, uuid });
    await outbox.enqueue('message', { bad: true }, { target: 'conv' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await outbox.enqueue('message', { bad: false }, { target: 'conv' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(outbox.pending().map((op) => op.state)).toEqual(['failed']);
    await outbox.discard(outbox.pending()[0].clientId);
    expect(await store.list(A, '__outbox')).toEqual([]);
  });

  it('keeps sends to one conversation in order while one waits for a retry', async () => {
    const store = memoryStore();
    const time = fakeTimers();
    const order = [];
    let failOnce = true;
    const send = jest.fn(async (payload) => { if (payload.n === 1 && failOnce) { failOnce = false; throw new TypeError('offline'); } order.push(payload.n); return {}; });
    const outbox = createOutbox({ store, scope: A, senders: { message: send }, uuid, now: time.now, timers: time.timers });
    await outbox.enqueue('message', { n: 1 }, { target: 'conv' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await outbox.enqueue('message', { n: 2 }, { target: 'conv' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(order).toEqual([]);
    await time.advance(1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(order).toEqual([1, 2]);
  });
});
