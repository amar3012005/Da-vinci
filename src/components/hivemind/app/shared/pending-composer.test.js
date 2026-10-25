const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function loadStore() {
  jest.resetModules();
  return require('./pending-composer');
}

test('without an attached room client, a draft is not queued and stays in the composer', () => {
  const store = loadStore();
  store.setDraft('keep me');
  expect(store.queueDraft()).toBeNull();
  expect(store.getDraft()).toBe('keep me');
});

test('an attached room client receives a queued draft exactly once', async () => {
  const store = loadStore();
  const send = jest.fn(async () => 'ok');
  store.attachComposerTransport(send);
  store.setDraft('hello room');
  expect(store.queueDraft()).toBeTruthy();
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
  store.attachComposerTransport(async () => 'ok');
  store.setDraft('   ');
  expect(store.queueDraft()).toBeNull();
});

test('messages are delivered in send order', async () => {
  const store = loadStore();
  const order = [];
  store.attachComposerTransport(async ({ text }) => { order.push(text); return 'ok'; });
  store.setDraft('first'); store.queueDraft();
  store.setDraft('second'); store.queueDraft();
  await flush();
  expect(order).toEqual(['first', 'second']);
});

test('detaching stops delivery and refuses new drafts until the next attach', async () => {
  const store = loadStore();
  const send = jest.fn(async () => 'ok');
  const detach = store.attachComposerTransport(send);
  detach();
  expect(store.isComposerAttached()).toBe(false);
  store.setDraft('held');
  expect(store.queueDraft()).toBeNull();
  await flush();
  expect(send).not.toHaveBeenCalled();
});

test('a stale detach from an earlier attach cannot close a newer attach', () => {
  const store = loadStore();
  const first = store.attachComposerTransport(async () => 'a');
  store.attachComposerTransport(async () => 'b');
  first();
  expect(store.isComposerAttached()).toBe(true);
});

test('subscribeAttached reports the current state and each change', () => {
  const store = loadStore();
  const states = [];
  store.subscribeAttached((attached) => states.push(attached));
  const detach = store.attachComposerTransport(async () => 'ok');
  detach();
  expect(states).toEqual([false, true, false]);
});

test('pending entries are reported to subscribers as they change', async () => {
  const store = loadStore();
  const snapshots = [];
  store.subscribePendingEntries((entries) => snapshots.push(entries.map((entry) => entry.state)));
  store.attachComposerTransport(async () => 'ok');
  store.setDraft('x'); store.queueDraft();
  await flush();
  expect(snapshots[snapshots.length - 1]).toEqual(['sent']);
});

test('handing off a draft writes sessionStorage under the tenant key and posts the message', () => {
  const store = loadStore();
  const post = jest.spyOn(window, 'postMessage').mockImplementation(() => {});
  store.setDraft('  to the native room  ');
  const text = store.handOffComposerDraft({ tenant: 'org-1', user: 'user-1', roomId: 'runtime' });
  expect(text).toBe('to the native room');
  expect(window.sessionStorage.getItem('hm:org-1:user-1:draft:runtime')).toBe('to the native room');
  expect(post).toHaveBeenCalledWith({ type: 'hm:composer-draft', roomId: 'runtime', text: 'to the native room' }, window.location.origin);
  expect(store.getDraft()).toBe('');
  post.mockRestore();
  window.sessionStorage.clear();
});

test('a handoff with no draft or no identity does nothing', () => {
  const store = loadStore();
  const post = jest.spyOn(window, 'postMessage').mockImplementation(() => {});
  expect(store.handOffComposerDraft({ tenant: 'org-1', user: 'user-1', roomId: 'brain' })).toBeNull();
  store.setDraft('draft');
  expect(store.handOffComposerDraft({ tenant: '', user: 'user-1', roomId: 'brain' })).toBeNull();
  expect(store.getDraft()).toBe('draft');
  expect(post).not.toHaveBeenCalled();
  post.mockRestore();
});

test('the draft survives a remount: subscribers read the latest value', () => {
  const store = loadStore();
  store.setDraft('keep me');
  const unsubscribe = store.subscribeDraft(() => {});
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
