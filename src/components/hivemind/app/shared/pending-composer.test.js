const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function loadStore() {
  jest.resetModules();
  return require('./pending-composer');
}

test('a queued draft is held until a room client attaches, then delivered once', async () => {
  const store = loadStore();
  store.setDraft('hello room');
  const id = store.queueDraft();
  expect(id).toBeTruthy();
  const send = jest.fn(async () => 'ok');
  store.attachComposerTransport(send);
  await flush();
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith({ text: 'hello room' });
});

test('the draft clears on queue so a second queue call cannot double-send', async () => {
  const store = loadStore();
  const send = jest.fn(async () => 'ok');
  store.attachComposerTransport(send);
  store.setDraft('once');
  store.queueDraft();
  expect(store.queueDraft()).toBeNull();
  await flush();
  expect(send).toHaveBeenCalledTimes(1);
});

test('an empty or whitespace draft queues nothing', () => {
  const store = loadStore();
  store.setDraft('   ');
  expect(store.queueDraft()).toBeNull();
});

test('messages queued before attach flush in send order', async () => {
  const store = loadStore();
  const order = [];
  store.setDraft('first'); store.queueDraft();
  store.setDraft('second'); store.queueDraft();
  store.attachComposerTransport(async ({ text }) => { order.push(text); return 'ok'; });
  await flush();
  expect(order).toEqual(['first', 'second']);
});

test('detaching holds later messages until the next attach', async () => {
  const store = loadStore();
  const send = jest.fn(async () => 'ok');
  const detach = store.attachComposerTransport(send);
  detach();
  expect(store.isComposerAttached()).toBe(false);
  store.setDraft('held'); store.queueDraft();
  await flush();
  expect(send).not.toHaveBeenCalled();
  store.attachComposerTransport(send);
  await flush();
  expect(send).toHaveBeenCalledTimes(1);
});

test('a stale detach from an earlier attach cannot close a newer attach', async () => {
  const store = loadStore();
  const first = store.attachComposerTransport(async () => 'a');
  store.attachComposerTransport(async () => 'b');
  first();
  expect(store.isComposerAttached()).toBe(true);
});

test('pending entries are reported to subscribers as they change', async () => {
  const store = loadStore();
  const snapshots = [];
  store.subscribePendingEntries((entries) => snapshots.push(entries.map((entry) => entry.state)));
  store.setDraft('x'); store.queueDraft();
  expect(snapshots[snapshots.length - 1]).toEqual(['queued']);
  store.attachComposerTransport(async () => 'ok');
  await flush();
  expect(snapshots[snapshots.length - 1]).toEqual(['sent']);
});

test('the draft survives a remount: subscribers read the latest value', () => {
  const store = loadStore();
  store.setDraft('keep me');
  const seen = [];
  const unsubscribe = store.subscribeDraft((text) => seen.push(text));
  unsubscribe();
  expect(store.getDraft()).toBe('keep me');
});

test('timing marks are recorded once per name', () => {
  const store = loadStore();
  // jsdom has no User Timing API; provide a stub for this test only.
  const original = performance.mark;
  performance.mark = jest.fn();
  try {
    store.markOnce('hm:composer-visible');
    store.markOnce('hm:composer-visible');
    expect(performance.mark).toHaveBeenCalledTimes(1);
    expect(performance.mark).toHaveBeenCalledWith('hm:composer-visible');
  } finally {
    performance.mark = original;
  }
});
