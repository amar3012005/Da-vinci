jest.mock('../../native-auth', () => ({ nativePlugin: {} }));
jest.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.resolve({ remove() {} }) } }));
import { createLocalStore, createMemoryBackend, storeScope } from '../local-store';
import { createSyncEngine } from '../sync-engine';
import { feedRevision, readSinceFeed } from '../feeds';
import { NEEDS_YOU, NOTIFICATIONS, registerNeedsYou, registerNotifications } from '../entities';
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

  it('Needs you keeps only the cards the server still lists', async () => {
    const store = createLocalStore({ backend: createMemoryBackend() });
    const engine = createSyncEngine({ store, scope: A });
    const cards = jest.fn().mockResolvedValueOnce([{ id: 'msg_a', createdAt: 1 }, { id: 'msg_b', createdAt: 2 }]).mockResolvedValueOnce([{ id: 'msg_b', createdAt: 2 }]);
    registerNeedsYou(engine, cards);
    await engine.refresh(NEEDS_YOU, 'open');
    expect((await engine.refresh(NEEDS_YOU, 'open')).items.map((card) => card.id)).toEqual(['msg_b']);
  });
});

describe('scopes', () => {
  afterEach(() => wipeAllScopes());

  it('sign-out, account switch and company switch leave nothing readable', async () => {
    const { engine } = syncScope('org-a', 'user-1');
    registerNeedsYou(engine, async () => [{ id: 'msg_a', createdAt: 1 }]);
    await engine.refresh(NEEDS_YOU, 'open');
    expect(await localStore().list(A, NEEDS_YOU)).toHaveLength(1);
    window.dispatchEvent(new CustomEvent('hm:tenant-changed'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await localStore().list(A, NEEDS_YOU)).toEqual([]);
  });

  it('a confirmed scope removes rows another person or company left on the device', async () => {
    await localStore().put(storeScope('org-b', 'user-2'), NEEDS_YOU, 'open', { v: 1, items: [] });
    await localStore().put(A, NEEDS_YOU, 'open', { v: 1, items: [] });
    await adoptScope('org-a', 'user-1');
    expect(await localStore().get(storeScope('org-b', 'user-2'), NEEDS_YOU, 'open')).toBeUndefined();
    expect(await localStore().get(A, NEEDS_YOU, 'open')).toBeDefined();
  });
});
