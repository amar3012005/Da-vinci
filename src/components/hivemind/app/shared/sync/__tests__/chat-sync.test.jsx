jest.mock('../../native-auth', () => ({ nativePlugin: {} }));
jest.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.resolve({ remove() {} }) } }));
jest.mock('../../runtime-admission', () => ({ fetchRuntime: (...args) => mockFetch(...args) }));
jest.mock('../../boot-cache', () => ({ ...jest.requireActual('../../boot-cache'), readLastTenant: () => mockLastTenant }));
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createLocalStore, createMemoryBackend, storeScope } from '../local-store';
import { createSyncEngine } from '../sync-engine';
import { createOutbox } from '../outbox';
import { COMPANY_BRAIN_DOT_ID } from '../../company-brain-room';
import { CHAT_SEND, bindChatOutbox, chatSenders, pendingMessages, sendChatMessage } from '../chat-outbox';
import { chatEntities, messagesReader, projectMessage, registerChat, requestJson } from '../chat-feed';
import { useChatThread } from '../use-chat-thread';
import { adoptScope, localStore, syncScope, wipeAllScopes } from '..';

let mockFetch;
let mockLastTenant = null;
const A = storeScope('org-a', 'user-1');
const B = storeScope('org-b', 'user-1');
const BRAIN = chatEntities('brain');
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const deferred = () => { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const memoryStore = () => createLocalStore({ backend: createMemoryBackend() });
const msg = (n, extra = {}) => ({ id: `m${n}`, dotId: COMPANY_BRAIN_DOT_ID, conversationId: 'conv_1', role: n % 2 ? 'user' : 'assistant', text: `text ${n}`, createdAt: 1000 + n, ...extra });

/** Routes a fetchRuntime call to a handler keyed by `METHOD path` (query string kept). */
function route(table) {
  mockFetch = jest.fn(async (path, init = {}) => {
    const key = `${init.method || 'GET'} ${path}`;
    const handler = table[key] ?? table[key.split('?')[0]];
    if (!handler) return json({ error: `no route ${key}` }, 404);
    return typeof handler === 'function' ? handler(init, path) : handler;
  });
}
const sentBodies = () => mockFetch.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => JSON.parse(init.body));

beforeEach(() => { mockLastTenant = null; });
afterEach(async () => { await wipeAllScopes(); });

describe('chat messages: device copy and cursor reads', () => {
  it('first read keeps the newest 50 messages, the feed position, and no card body', async () => {
    const tail = Array.from({ length: 30 }, (_, i) => msg(41 + i));
    const older = Array.from({ length: 40 }, (_, i) => msg(1 + i));
    tail[29] = { ...tail[29], card: { kind: 'secure', fields: [{ name: 'otp', value: '123456' }], title: 'Enter code' }, attachments: [{ id: 'f1', name: 'a.pdf', mime: 'application/pdf', size: 9, url: 'https://x/secret' }] };
    route({
      'GET /api/conversations/conv_1?since=now': json({ items: [], deleted: [], next_cursor: 'cur0', has_more: false }),
      'GET /api/conversations/conv_1': json({ messages: tail, nextCursor: 'm41' }),
      'GET /api/conversations/conv_1?before=m41': json({ messages: older, nextCursor: null }),
    });
    const page = await messagesReader(requestJson)('conv_1', null, {});
    expect(page.cursor).toBe('cur0');
    expect(page.replace).toBe(true);
    expect(page.items).toHaveLength(50);
    expect(page.items[0].id).toBe('m21');
    const last = page.items.at(-1);
    expect(last.cardKind).toBe('secure');
    expect(JSON.stringify(page.items)).not.toContain('123456');
    expect(last.attachments).toEqual([{ id: 'f1', name: 'a.pdf', mime: 'application/pdf', size: 9 }]);
    expect(JSON.stringify(page.items)).not.toContain('secret');
  });

  it('paints the stored conversation before the network answers, then reconciles by cursor (server wins, tombstones drop)', async () => {
    const store = memoryStore();
    route({
      'GET /api/conversations/conv_1?since=now': json({ items: [], deleted: [], next_cursor: 'cur0', has_more: false }),
      'GET /api/conversations/conv_1': json({ messages: [msg(1), msg(2), msg(3)], nextCursor: null }),
    });
    const first = createSyncEngine({ store, scope: A });
    registerChat(first);
    await first.refresh(BRAIN.messages, 'conv_1');

    // Relaunch: the network is slow, the screen still has the last 3 messages.
    const slow = deferred();
    route({ 'GET /api/conversations/conv_1?since=cur0&limit=200': () => slow.promise });
    const relaunched = createSyncEngine({ store, scope: A });
    registerChat(relaunched);
    const { snapshot, refreshed } = await relaunched.open(BRAIN.messages, 'conv_1');
    expect(snapshot.items.map((item) => item.text)).toEqual(['text 1', 'text 2', 'text 3']);
    expect(snapshot.cursor).toBe('cur0');

    slow.resolve(json({
      items: [{ ...msg(2), text: 'edited', revision: '12' }, { ...msg(4), revision: '13' }],
      deleted: [{ id: 'm1', revision: '14', deletedAt: 1 }],
      next_cursor: 'cur1', has_more: false,
    }));
    const next = await refreshed;
    expect(next.items.map((item) => item.text)).toEqual(['edited', 'text 3', 'text 4']);
    expect(next.cursor).toBe('cur1');
    // The newer server revision is not replaced by an older replayed copy.
    route({ 'GET /api/conversations/conv_1?since=cur1&limit=200': json({ items: [{ ...msg(2), text: 'stale replay', revision: '5' }], deleted: [], next_cursor: 'cur2', has_more: false }) });
    expect((await relaunched.refresh(BRAIN.messages, 'conv_1')).items.find((item) => item.id === 'm2').text).toBe('edited');
  });

  it('keeps 50 messages per conversation and 30 conversations, split by surface', async () => {
    const store = memoryStore();
    const engine = createSyncEngine({ store, scope: A });
    const rows = Array.from({ length: 70 }, (_, i) => ({ id: `conv_${i}`, dotId: i % 2 ? COMPANY_BRAIN_DOT_ID : 'dot_sales', title: `T${i}`, createdAt: i, updatedAt: 100 + i, revision: String(i + 1) }));
    route({ 'GET /api/conversations?since=start&limit=200': json({ items: rows, deleted: [], next_cursor: 'c', has_more: false }) });
    registerChat(engine);
    const brain = await engine.refresh(chatEntities('brain').recents, 'main');
    const runtime = await engine.refresh(chatEntities('runtime').recents, 'main');
    expect(brain.items.every((row) => row.dotId === COMPANY_BRAIN_DOT_ID)).toBe(true);
    expect(runtime.items.every((row) => row.dotId !== COMPANY_BRAIN_DOT_ID)).toBe(true);
    expect(runtime.items).toHaveLength(30);
    expect(brain.items).toHaveLength(30);
    expect(brain.items.at(-1).id).toBe('conv_69');
    const many = Array.from({ length: 70 }, (_, i) => msg(i));
    const reconciled = createSyncEngine({ store, scope: A });
    route({ 'GET /api/conversations/conv_9?since=now': json({ items: [], deleted: [], next_cursor: 'c', has_more: false }), 'GET /api/conversations/conv_9': json({ messages: many, nextCursor: null }) });
    registerChat(reconciled);
    expect((await reconciled.refresh(BRAIN.messages, 'conv_9')).items).toHaveLength(50);
  });

  it('a conversation the server no longer has empties its copy instead of failing', async () => {
    const store = memoryStore();
    const engine = createSyncEngine({ store, scope: A });
    registerChat(engine);
    await engine.put(BRAIN.messages, 'conv_gone', { items: [projectMessage(msg(1))], cursor: 'c' });
    route({ 'GET /api/conversations/conv_gone?since=c&limit=200': json({ error: 'Not found' }, 404) });
    expect((await engine.refresh(BRAIN.messages, 'conv_gone')).items).toEqual([]);
  });

  it('keeps the copy and reports an error when the server has no feed', async () => {
    const store = memoryStore();
    const engine = createSyncEngine({ store, scope: A });
    registerChat(engine);
    await engine.put(BRAIN.messages, 'conv_1', { items: [projectMessage(msg(1))], cursor: 'c' });
    route({ 'GET /api/conversations/conv_1?since=c&limit=200': json({ messages: [] }) });
    await expect(engine.refresh(BRAIN.messages, 'conv_1')).rejects.toThrow('sync_feed_unavailable');
    expect((await engine.read(BRAIN.messages, 'conv_1')).items).toHaveLength(1);
  });
});

describe('chat outbox', () => {
  const fixedTimers = () => { const queue = []; return { queue, set: (run, ms) => { queue.push({ run, ms }); return queue.length; }, clear: () => {} }; };

  it('stores the send before any network call and shows it as sending', async () => {
    const store = memoryStore();
    const gate = deferred();
    route({ 'POST /api/conversations/conv_1': () => gate.promise });
    const engine = createSyncEngine({ store, scope: A });
    const outbox = createOutbox({ store, scope: A, senders: chatSenders });
    bindChatOutbox({ engine, outbox });
    const started = performance.now();
    const op = await sendChatMessage({ outbox }, { conversationId: 'conv_1', dotId: COMPANY_BRAIN_DOT_ID, text: ' hello ' });
    expect(performance.now() - started).toBeLessThan(50);
    expect((await store.get(A, '__outbox', op.clientId)).value.payload.text).toBe('hello');
    expect(pendingMessages(outbox, 'conv_1')).toEqual([expect.objectContaining({ pending: true, state: 'sending', text: 'hello', clientId: op.clientId })]);
    gate.resolve(json({ ok: true, message: msg(9, { text: 'hello', role: 'user' }), clientId: op.clientId, revision: '30', replayed: false }));
    await waitFor(() => expect(outbox.pending('conv_1')).toEqual([]));
    await waitFor(async () => expect((await engine.read(BRAIN.messages, 'conv_1'))?.items.map((m) => m.text)).toEqual(['hello']));
    expect((await store.list(A, '__outbox'))).toEqual([]);
  });

  it('retries a transient failure with the same client id and delivers one message', async () => {
    const store = memoryStore();
    let attempt = 0;
    route({ 'POST /api/conversations/conv_1': () => { attempt += 1; return attempt === 1 ? json({ error: 'busy' }, 503) : json({ ok: true, message: msg(9, { text: 'hi' }), clientId: 'x', revision: '3', replayed: attempt > 2 }); } });
    const timers = fixedTimers();
    let clock = 1000;
    const outbox = createOutbox({ store, scope: A, senders: chatSenders, now: () => clock, timers });
    const engine = createSyncEngine({ store, scope: A });
    bindChatOutbox({ engine, outbox });
    const op = await sendChatMessage({ outbox }, { conversationId: 'conv_1', dotId: COMPANY_BRAIN_DOT_ID, text: 'hi' });
    await waitFor(() => expect(outbox.pending('conv_1')[0]?.attempts).toBe(1));
    expect(pendingMessages(outbox, 'conv_1')[0].state).toBe('queued');
    expect(timers.queue.at(-1).ms).toBe(1000);
    clock += 1000;
    await outbox.flush();
    await waitFor(() => expect(outbox.pending('conv_1')).toEqual([]));
    const bodies = sentBodies();
    expect(bodies).toHaveLength(2);
    expect(new Set(bodies.map((body) => body.requestId))).toEqual(new Set([op.clientId]));
    expect(bodies[0]).toEqual({ dotId: COMPANY_BRAIN_DOT_ID, text: 'hi', attachments: [], requestId: op.clientId });
  });

  it('survives an app restart and sends once; a replayed answer does not duplicate the message', async () => {
    const store = memoryStore();
    route({ 'POST /api/conversations/conv_1': () => { throw new TypeError('network down'); } });
    const first = createOutbox({ store, scope: A, senders: chatSenders, timers: fixedTimers() });
    const op = await sendChatMessage({ outbox: first }, { conversationId: 'conv_1', dotId: COMPANY_BRAIN_DOT_ID, text: 'offline note' });
    await waitFor(async () => expect((await store.get(A, '__outbox', op.clientId)).value.attempts).toBe(1));
    first.close();

    // The first attempt reached the server although the answer was lost: the repeat is a replay of the same message.
    route({ 'POST /api/conversations/conv_1': json({ ok: true, message: msg(5, { text: 'offline note', role: 'user' }), clientId: op.clientId, revision: '7', replayed: true }) });
    const engine = createSyncEngine({ store, scope: A });
    const second = createOutbox({ store, scope: A, senders: chatSenders, timers: fixedTimers() });
    bindChatOutbox({ engine, outbox: second });
    await second.resume();
    await waitFor(async () => expect((await engine.read(BRAIN.messages, 'conv_1'))?.items).toHaveLength(1));
    expect(sentBodies().at(-1).requestId).toBe(op.clientId);
    expect(second.pending()).toEqual([]);
    // The cursor feed later returns the same message by id: still one.
    await engine.apply(BRAIN.messages, 'conv_1', { items: [{ ...projectMessage(msg(5, { text: 'offline note', role: 'user' })), revision: '7' }] });
    expect((await engine.read(BRAIN.messages, 'conv_1')).items).toHaveLength(1);
  });

  it('a refused send (409 or 404) is marked failed, kept for retry or discard, and not resent by itself', async () => {
    const store = memoryStore();
    route({ 'POST /api/conversations/conv_1': json({ error: 'request id reused' }, 409) });
    const outbox = createOutbox({ store, scope: A, senders: chatSenders, timers: fixedTimers() });
    await sendChatMessage({ outbox }, { conversationId: 'conv_1', dotId: COMPANY_BRAIN_DOT_ID, text: 'x' });
    await waitFor(() => expect(pendingMessages(outbox, 'conv_1')[0]?.state).toBe('failed'));
    await outbox.flush();
    expect(sentBodies()).toHaveLength(1);
    await outbox.discard(outbox.pending()[0].clientId);
    expect(outbox.pending()).toEqual([]);
  });

  it('the first message of a new Company Brain chat posts to the employee route and refreshes the list', async () => {
    const store = memoryStore();
    const engine = createSyncEngine({ store, scope: A });
    route({
      [`POST /api/dots/${COMPANY_BRAIN_DOT_ID}/conversations`]: json({ ok: true, conversationId: 'conv_new', clientId: 'c', replayed: false }),
      'GET /api/conversations?since=start&limit=200': json({ items: [{ id: 'conv_new', dotId: COMPANY_BRAIN_DOT_ID, title: 'New', createdAt: 1, updatedAt: 2, revision: '1' }], deleted: [], next_cursor: 'c1', has_more: false }),
    });
    const outbox = createOutbox({ store, scope: A, senders: chatSenders, timers: fixedTimers() });
    bindChatOutbox({ engine, outbox });
    const op = await sendChatMessage({ outbox }, { dotId: COMPANY_BRAIN_DOT_ID, text: 'first' });
    expect(op.kind).not.toBe(CHAT_SEND);
    await waitFor(async () => expect((await engine.read(BRAIN.recents, 'main'))?.items.map((c) => c.id)).toEqual(['conv_new']));
  });

  it('an empty text or a missing employee queues nothing', async () => {
    const outbox = createOutbox({ store: memoryStore(), scope: A, senders: chatSenders, timers: fixedTimers() });
    expect(await sendChatMessage({ outbox }, { conversationId: 'c', dotId: 'd', text: '   ' })).toBeNull();
    expect(await sendChatMessage({ outbox }, { conversationId: 'c', text: 'x' })).toBeNull();
    expect(outbox.pending()).toEqual([]);
  });
});

describe('sign-out, switch and tenant isolation', () => {
  it('one company and user can never read another one\'s chat copy', async () => {
    const store = memoryStore();
    const a = createSyncEngine({ store, scope: A });
    const b = createSyncEngine({ store, scope: B });
    registerChat(a); registerChat(b);
    await a.put(BRAIN.messages, 'conv_1', { items: [projectMessage(msg(1))] });
    expect(await b.read(BRAIN.messages, 'conv_1')).toBeUndefined();
    expect((await store.list(B, BRAIN.messages))).toEqual([]);
  });

  it('confirming another company removes the previous one\'s messages and unsent sends from the device', async () => {
    route({ 'POST /api/conversations/conv_1': () => { throw new TypeError('offline'); } });
    await adoptScope('org-a', 'user-1');
    const { engine, outbox } = syncScope('org-a', 'user-1');
    registerChat(engine);
    await engine.put(BRAIN.messages, 'conv_1', { items: [projectMessage(msg(1))] });
    const op = await sendChatMessage({ outbox }, { conversationId: 'conv_1', dotId: COMPANY_BRAIN_DOT_ID, text: 'private' });
    await waitFor(async () => expect((await localStore().get(A, '__outbox', op.clientId))?.value.attempts).toBe(1));
    await adoptScope('org-b', 'user-1');
    expect(await localStore().list(A, BRAIN.messages)).toEqual([]);
    expect(await localStore().list(A, '__outbox')).toEqual([]);
  });

  it('sign-out (tenant change) wipes every chat row and the outbox', async () => {
    route({ 'POST /api/conversations/conv_1': () => { throw new TypeError('offline'); } });
    await adoptScope('org-a', 'user-1');
    const { engine, outbox } = syncScope('org-a', 'user-1');
    registerChat(engine);
    await engine.put(BRAIN.recents, 'main', { items: [{ id: 'conv_1', dotId: COMPANY_BRAIN_DOT_ID, title: 't', createdAt: 1, updatedAt: 1 }] });
    await engine.put(BRAIN.messages, 'conv_1', { items: [projectMessage(msg(1))] });
    await sendChatMessage({ outbox }, { conversationId: 'conv_1', dotId: COMPANY_BRAIN_DOT_ID, text: 'draft' });
    await act(async () => { window.dispatchEvent(new Event('hm:tenant-changed')); await new Promise((resolve) => setTimeout(resolve, 20)); });
    for (const entity of [BRAIN.recents, BRAIN.messages, '__outbox']) expect(await localStore().list(A, entity)).toEqual([]);
  });

  it('stored rows hold no credential-looking fields', async () => {
    await adoptScope('org-a', 'user-1');
    const { engine } = syncScope('org-a', 'user-1');
    registerChat(engine);
    await engine.put(BRAIN.messages, 'conv_1', { items: [{ ...projectMessage(msg(1)), access_token: 'abc', apiKey: 'k' }] });
    const raw = JSON.stringify(await localStore().list(A, BRAIN.messages));
    expect(raw).not.toContain('abc');
    expect(raw).not.toContain('apiKey');
  });
});

function Thread({ onSend }) {
  const thread = useChatThread({ surface: 'brain' });
  return (
    <div>
      <ul data-testid="list" data-source={thread.source}>{thread.messages.map((m) => <li key={m.id} data-state={m.state || ''}>{m.text}</li>)}</ul>
      <button type="button" onClick={() => { onSend?.(); void thread.send('typed'); }}>send</button>
    </div>
  );
}

describe('useChatThread', () => {
  it('paints the last conversation from the device copy in the first render pass and sends through the outbox', async () => {
    mockLastTenant = { orgId: 'org-a', userId: 'user-1' };
    await localStore().put(A, BRAIN.recents, 'main', { v: 1, items: [{ id: 'conv_1', dotId: COMPANY_BRAIN_DOT_ID, title: 'Old', createdAt: 1, updatedAt: 5 }], cursor: 'c', meta: null });
    await localStore().put(A, BRAIN.messages, 'conv_1', { v: 1, items: [projectMessage(msg(1)), projectMessage(msg(2))], cursor: 'c', meta: null });
    const gate = deferred();
    route({ 'POST /api/conversations/conv_1': () => gate.promise });
    render(<Thread />);
    await waitFor(() => expect(screen.getByTestId('list')).toHaveTextContent('text 1'));
    expect(screen.getByTestId('list').dataset.source).toBe('cache');
    expect(mockFetch).not.toHaveBeenCalled();

    act(() => { screen.getByText('send').click(); });
    await waitFor(() => expect(screen.getByText('typed')).toHaveAttribute('data-state', 'sending'));
    gate.resolve(json({ ok: true, message: msg(3, { text: 'typed', role: 'user' }), clientId: 'c', revision: '9', replayed: false }));
    await waitFor(() => expect(screen.getByText('typed')).toHaveAttribute('data-state', ''));
    expect(screen.getAllByText('typed')).toHaveLength(1);
  });

  it('shows nothing and sends nothing when no employee is known (Runtime lead has no feed conversation)', async () => {
    mockLastTenant = { orgId: 'org-a', userId: 'user-1' };
    function RuntimeThread() { const t = useChatThread({ surface: 'runtime' }); return <p data-testid="out">{`${t.messages.length}:${t.canSend}`}</p>; }
    route({});
    render(<RuntimeThread />);
    expect(screen.getByTestId('out')).toHaveTextContent('0:false');
  });
});
