jest.mock('../../native-auth', () => ({ nativePlugin: {} }));
jest.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.resolve({ remove() {} }) } }));
import { createLocalStore, createMemoryBackend, storeScope } from '../local-store';
import { createSyncEngine } from '../sync-engine';
import { feedRevision, readSinceFeed } from '../feeds';
import { NEEDS_YOU, NOTIFICATIONS, ROSTER, registerNeedsYou, registerNotifications, registerRoster } from '../entities';
import { adoptScope, localStore, syncScope, wipeAllScopes } from '..';

const A = storeScope('org-a', 'user-1');

describe('changes-since feeds', () => {
  it('reads pages until has_more is false and keeps the last cursor', async () => {
    const pages = {
      start: { items: [{ id: 'n1', revision: '1' }], deleted: [], next_cursor: 'c1', has_more: true },
      c1: { items: [{ id: 'n2', revision: '2' }], deleted: [{ id: 'n0', revision: '3' }], next_cursor: 'c2', has_more: false },
    };
    const page = await readSinceFeed(async (since) => pages[since], null);
    expect(page).toEqual({ items: [{ id: 'n1', revision: '1' }, { id: 'n2', revision: '2' }], deletes: ['n0'], cursor: 'c2', replace: true });
    const next = await readSinceFeed(async (since) => ({ items: [], deleted: [], next_cursor: `${since}+`, has_more: false }), 'c2');
    expect(next).toMatchObject({ cursor: 'c2+', replace: false });
  });

  it('treats a server without the feed as a complete list', async () => {
    const page = await readSinceFeed(async () => ({ items: [{ id: 'x' }], unread: 4 }), null, { metaOf: (body) => body.unread });
    expect(page).toEqual({ items: [{ id: 'x' }], deletes: [], cursor: null, replace: true, meta: 4 });
  });

  it('compares decimal revisions as integers', () => {
    expect(feedRevision({ revision: '10' }) > feedRevision({ revision: '9' })).toBe(true);
    expect(feedRevision({ revision: 'x' })).toBeUndefined();
  });
});

describe('tier-1 entities', () => {
  it('the bell renders its last list from the local copy before the network answers', async () => {
    const store = createLocalStore({ backend: createMemoryBackend() });
    const first = createSyncEngine({ store, scope: A });
    const get = jest.fn().mockResolvedValue({ data: { items: [{ id: 'n1', createdAt: '2026-10-31T10:00:00Z' }, { id: 'n0', createdAt: '2026-10-30T10:00:00Z' }], unread: 1 } });
    registerNotifications(first, { controlPlane: { get } });
    await first.refresh(NOTIFICATIONS, 'bell');

    const relaunched = createSyncEngine({ store, scope: A });
    let answer;
    registerNotifications(relaunched, { controlPlane: { get: () => new Promise((resolve) => { answer = resolve; }) } });
    const { snapshot, refreshed } = await relaunched.open(NOTIFICATIONS, 'bell');
    expect(snapshot.items.map((item) => item.id)).toEqual(['n0', 'n1']);
    expect(snapshot.meta).toEqual({ unread: 1 });
    answer({ data: { items: [{ id: 'n2', createdAt: '2026-10-31T11:00:00Z' }], unread: 2 } });
    expect((await refreshed).items.map((item) => item.id)).toEqual(['n2']);
  });

  it('Needs you reads by cursor: resolved cards leave, the plain list of an older server replaces the copy', async () => {
    const store = createLocalStore({ backend: createMemoryBackend() });
    const engine = createSyncEngine({ store, scope: A });
    const card = (id, createdAt, extra = {}) => ({ id, employeeId: 'e1', dotId: 'dot_a', conversationId: 'conv_a', createdAt, kind: 'approval', title: id, quickApprove: false, state: 'pending', ...extra });
    const pages = {
      start: { items: [card('msg_a', 1, { revision: '1' }), card('msg_b', 2, { revision: '2' })], deleted: [], next_cursor: 'n1', has_more: false },
      n1: { items: [card('msg_a', 1, { state: 'resolved', revision: '3' }), card('msg_c', 3, { revision: '4' })], deleted: [], next_cursor: 'n2', has_more: false },
    };
    const readPage = jest.fn(async (since) => pages[since]);
    registerNeedsYou(engine, readPage);
    expect((await engine.refresh(NEEDS_YOU, 'open')).items.map((c) => c.id)).toEqual(['msg_a', 'msg_b']);
    expect((await engine.refresh(NEEDS_YOU, 'open')).items.map((c) => c.id)).toEqual(['msg_b', 'msg_c']);
    expect(readPage.mock.calls.map(([since]) => since)).toEqual(['start', 'n1']);

    const older = createSyncEngine({ store: createLocalStore({ backend: createMemoryBackend() }), scope: A });
    const plain = jest.fn()
      .mockResolvedValueOnce({ version: 1, cards: [card('msg_a', 1), card('msg_b', 2)] })
      .mockResolvedValueOnce({ version: 1, cards: [card('msg_b', 2)] });
    registerNeedsYou(older, plain);
    await older.refresh(NEEDS_YOU, 'open');
    expect((await older.refresh(NEEDS_YOU, 'open')).items.map((c) => c.id)).toEqual(['msg_b']);
  });

  it('Needs you reads the whole list again after ten minutes so a missed removal cannot linger', async () => {
    const engine = createSyncEngine({ store: createLocalStore({ backend: createMemoryBackend() }), scope: A });
    let clock = 0;
    const card = (id) => ({ id, employeeId: 'e1', dotId: 'dot_a', conversationId: 'conv_a', createdAt: 1, kind: 'question', title: id, state: 'pending', revision: '1' });
    const readPage = jest.fn()
      .mockResolvedValueOnce({ items: [card('msg_a'), card('msg_b')], deleted: [], next_cursor: 'n1', has_more: false })
      .mockResolvedValueOnce({ items: [card('msg_b')], deleted: [], next_cursor: 'n2', has_more: false });
    registerNeedsYou(engine, readPage, () => clock);
    await engine.refresh(NEEDS_YOU, 'open');
    clock = 11 * 60_000;
    expect((await engine.refresh(NEEDS_YOU, 'open')).items.map((c) => c.id)).toEqual(['msg_b']);
    expect(readPage.mock.calls[1][0]).toBe('start');
  });

  it('the roster reads employees by cursor, drops removed and archived ones, and keeps only display fields', async () => {
    const engine = createSyncEngine({ store: createLocalStore({ backend: createMemoryBackend() }), scope: A });
    const employee = (id, extra = {}) => ({ id, name: id, roleArchetype: 'ops', status: 'active', persona: 'SECRET PERSONA', tools: ['x'], policyRules: { open_dot_employee: { version: 1, dot_id: `dot_${id}`, state: 'ready', secret: 's' }, appearance: { look: 1 }, other: 'drop' }, createdAt: 1, revision: '1', ...extra });
    const get = jest.fn()
      .mockResolvedValueOnce({ data: { items: [employee('ana'), employee('bo')], deleted: [], next_cursor: 'r1', has_more: false } })
      .mockResolvedValueOnce({ data: { items: [employee('ana', { name: 'Ana B', revision: '5' })], deleted: [{ id: 'bo', revision: '6', deletedAt: 1, reason: 'archived' }], next_cursor: 'r2', has_more: false } });
    registerRoster(engine, { controlPlane: { get } });
    const first = await engine.refresh(ROSTER, 'main');
    expect(JSON.stringify(first)).not.toContain('SECRET');
    expect(first.items[0].policyRules).toEqual({ open_dot_employee: { version: 1, dot_id: 'dot_ana', state: 'ready' }, appearance: { look: 1 } });
    const second = await engine.refresh(ROSTER, 'main');
    expect(second.items.map((e) => `${e.id}:${e.name}`)).toEqual(['ana:Ana B']);
    expect(get.mock.calls[1][1].params).toEqual({ since: 'r1', limit: 200 });
    expect(get.mock.calls[0][1].params).toEqual({ since: 'start', limit: 200 });
  });

  it('the roster falls back to the plain employee list of a Control without the feed', async () => {
    const engine = createSyncEngine({ store: createLocalStore({ backend: createMemoryBackend() }), scope: A });
    const get = jest.fn().mockResolvedValueOnce({ data: { employees: [{ id: 'ana', name: 'Ana' }, { id: 'bo', name: 'Bo' }] } }).mockResolvedValueOnce({ data: { employees: [{ id: 'bo', name: 'Bo' }] } });
    registerRoster(engine, { controlPlane: { get } });
    await engine.refresh(ROSTER, 'main');
    expect((await engine.refresh(ROSTER, 'main')).items.map((e) => e.id)).toEqual(['bo']);
  });
});
