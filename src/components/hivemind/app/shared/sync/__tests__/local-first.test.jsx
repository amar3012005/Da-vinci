jest.mock('../../native-auth', () => ({ nativePlugin: {} }));
jest.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.resolve({ remove() {} }) } }));
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { adoptScope, confirmedIdentity, localStore, syncScope, wipeAllScopes } from '..';
import { storeScope } from '../local-store';
import { LOCAL_FIRST } from '../catalog';
import { useLocalCopy, useLocalFirst } from '../use-local-first';
import { createResourceCache } from '../../resource-cache';
import { bindPersistentCache, PAGE_CACHE_ENTITY } from '../page-cache-persistence';
import { firstPageOf } from '../trim';
import { createLocalStore, createMemoryBackend } from '../local-store';

const A = storeScope('org-a', 'user-1');
const B = storeScope('org-a', 'user-2');

/** Write a snapshot the way the engine does, as if an earlier launch had stored it. */
async function seed(scope, spec, key, value, at = Date.now()) {
  await localStore().put(scope, spec.entity, key, { v: 1, items: [{ id: 'value', value }], cursor: null, meta: { at } });
}
const deferred = () => { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

function Probe({ spec, keyName = 'main', load, persistTrim, persist }) {
  const state = useLocalFirst({ spec, key: keyName, load, persistTrim, persist });
  return <div data-testid="out" data-loading={String(state.loading)} data-source={state.source} data-stale={String(state.stale)} data-error={state.error || ''}>{state.data == null ? 'empty' : JSON.stringify(state.data)}</div>;
}

afterEach(async () => { await wipeAllScopes(); });

describe('useLocalFirst', () => {
  it('paints the stored copy while the server read is still pending, then replaces it (server wins)', async () => {
    await adoptScope('org-a', 'user-1');
    await seed(A, LOCAL_FIRST.calendar, 'k', { rows: ['cached'] });
    const read = deferred();
    render(<Probe spec={LOCAL_FIRST.calendar} keyName="k" load={() => read.promise} />);
    await waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent('cached'));
    expect(screen.getByTestId('out').dataset.source).toBe('cache');
    expect(screen.getByTestId('out').dataset.loading).toBe('false');
    await act(async () => { read.resolve({ rows: ['fresh'] }); await read.promise; });
    await waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent('fresh'));
    expect(screen.getByTestId('out')).not.toHaveTextContent('cached');
  });

  it('shows the normal loading state with nothing stored, then saves what the server answered', async () => {
    await adoptScope('org-a', 'user-1');
    const read = deferred();
    render(<Probe spec={LOCAL_FIRST.crm} load={() => read.promise} />);
    expect(screen.getByTestId('out').dataset.loading).toBe('true');
    await act(async () => { read.resolve({ list: [1, 2] }); await read.promise; });
    await waitFor(() => expect(screen.getByTestId('out').dataset.loading).toBe('false'));
    await waitFor(async () => expect((await localStore().get(A, LOCAL_FIRST.crm.entity, 'main'))?.value.items[0].value).toEqual({ list: [1, 2] }));
  });

  it('a list that lost an item on the server drops it from the screen and from the device', async () => {
    await adoptScope('org-a', 'user-1');
    await seed(A, LOCAL_FIRST.memories, 'k', { memories: [{ id: 'm1' }, { id: 'm2' }] });
    render(<Probe spec={LOCAL_FIRST.memories} keyName="k" load={async () => ({ memories: [{ id: 'm2' }] })} />);
    await waitFor(() => expect(screen.getByTestId('out').dataset.source).toBe('server'));
    expect(screen.getByTestId('out')).not.toHaveTextContent('m1');
    await waitFor(async () => expect(JSON.stringify((await localStore().get(A, LOCAL_FIRST.memories.entity, 'k')).value)).not.toContain('m1'));
  });

  it('keeps the stored copy when the server read fails, and marks an old copy stale', async () => {
    await adoptScope('org-a', 'user-1');
    await seed(A, LOCAL_FIRST.connectors, 'status', { apps: ['slack'] }, Date.now() - 60 * 60_000);
    render(<Probe spec={LOCAL_FIRST.connectors} keyName="status" load={() => Promise.reject(new Error('offline'))} />);
    await waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent('slack'));
    expect(screen.getByTestId('out').dataset.stale).toBe('true');
    expect(screen.getByTestId('out').dataset.error).toBe('');
  });

  it('never shows another person\'s or company\'s copy (scope isolation)', async () => {
    await adoptScope('org-a', 'user-1');
    await seed(B, LOCAL_FIRST.usage, 'page', { plan: 'someone-elses' });
    await seed(storeScope('org-b', 'user-1'), LOCAL_FIRST.usage, 'page', { plan: 'other-company' });
    const read = deferred();
    render(<Probe spec={LOCAL_FIRST.usage} keyName="page" load={() => read.promise} />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('out')).toHaveTextContent('empty');
    expect(screen.getByTestId('out').dataset.loading).toBe('true');
  });

  it('without a confirmed sign-in it only reads from the server and stores nothing', async () => {
    expect(confirmedIdentity()).toBeNull();
    const load = jest.fn().mockResolvedValue({ plan: 'free' });
    render(<Probe spec={LOCAL_FIRST.usage} keyName="page" load={load} />);
    await waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent('free'));
    expect(await localStore().list(A, LOCAL_FIRST.usage.entity)).toEqual([]);
  });

  it('wipes everything on sign-out, company switch and account erasure (hm:tenant-changed)', async () => {
    await adoptScope('org-a', 'user-1');
    await seed(A, LOCAL_FIRST.autonomy, 'level', { level: 2 });
    syncScope('org-a', 'user-1');
    window.dispatchEvent(new CustomEvent('hm:tenant-changed'));
    await waitFor(async () => expect(await localStore().list(A, LOCAL_FIRST.autonomy.entity)).toEqual([]));
    expect(confirmedIdentity()).toBeNull();
  });

  it('adopting another person removes the previous person\'s rows', async () => {
    await adoptScope('org-a', 'user-1');
    await seed(A, LOCAL_FIRST.calendar, 'k', { x: 1 });
    await adoptScope('org-a', 'user-2');
    expect(await localStore().list(A, LOCAL_FIRST.calendar.entity)).toEqual([]);
  });

  it('shows data above the byte cap from memory but does not store it', async () => {
    await adoptScope('org-a', 'user-1');
    const big = { text: 'x'.repeat(LOCAL_FIRST.usage.maxBytes + 10) };
    render(<Probe spec={LOCAL_FIRST.usage} keyName="big" load={async () => big} />);
    await waitFor(() => expect(screen.getByTestId('out').dataset.source).toBe('server'));
    expect(screen.getByTestId('out')).toHaveTextContent('xxxx');
    const row = await localStore().get(A, LOCAL_FIRST.usage.entity, 'big');
    expect(row.value.items[0].value).toBeNull();
  });

  it('persistTrim stores only the first page but the screen shows the whole answer', async () => {
    await adoptScope('org-a', 'user-1');
    const all = { documents: Array.from({ length: 100 }, (_, index) => ({ id: `d${index}` })), pagination: { total: 100 } };
    render(<Probe spec={LOCAL_FIRST.uploads} keyName="docs" load={async () => all} persistTrim={firstPageOf} />);
    await waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent('d99'));
    await waitFor(async () => expect((await localStore().get(A, LOCAL_FIRST.uploads.entity, 'docs'))?.value.items[0].value.documents).toHaveLength(40));
  });

  it('persist=false (searches) reads the server and stores nothing', async () => {
    await adoptScope('org-a', 'user-1');
    render(<Probe spec={LOCAL_FIRST.uploads} keyName="search:secret-term" persist={false} load={async () => ({ results: [{ id: 's1' }] })} />);
    await waitFor(() => expect(screen.getByTestId('out')).toHaveTextContent('s1'));
    expect(await localStore().list(A, LOCAL_FIRST.uploads.entity)).toEqual([]);
  });

  it('removes credential-looking fields before storing', async () => {
    await adoptScope('org-a', 'user-1');
    render(<Probe spec={LOCAL_FIRST.connectors} keyName="oauth" load={async () => ({ connectors: [{ id: 'g', access_token: 'SECRET', name: 'Google' }] })} />);
    await waitFor(() => expect(screen.getByTestId('out').dataset.source).toBe('server'));
    await waitFor(async () => expect(await localStore().list(A, LOCAL_FIRST.connectors.entity)).toHaveLength(1));
    const stored = JSON.stringify(await localStore().list(A, LOCAL_FIRST.connectors.entity));
    expect(stored).toContain('Google');
    expect(stored).not.toContain('SECRET');
  });
});

describe('useLocalCopy', () => {
  function CopyProbe({ onReady }) {
    const copy = useLocalCopy({ spec: LOCAL_FIRST.calendar, key: 'week:0' });
    onReady(copy);
    return <div data-testid="copy">{copy.cached ? JSON.stringify(copy.cached.data) : 'none'}</div>;
  }
  it('restores what the screen saved and replaces it on the next save', async () => {
    await adoptScope('org-a', 'user-1');
    let handle;
    const { unmount } = render(<CopyProbe onReady={(copy) => { handle = copy; }} />);
    await waitFor(() => expect(handle.ready).toBe(true));
    await act(async () => { handle.save({ items: [1, 2] }); await new Promise((resolve) => setTimeout(resolve, 10)); });
    unmount();
    render(<CopyProbe onReady={(copy) => { handle = copy; }} />);
    expect(screen.getByTestId('copy')).toHaveTextContent('"items":[1,2]');
    await act(async () => { handle.save({ items: [2] }); await new Promise((resolve) => setTimeout(resolve, 10)); });
    const row = await localStore().get(A, LOCAL_FIRST.calendar.entity, 'week:0');
    expect(row.value.items[0].value).toEqual({ items: [2] });
  });
});

describe('persistent page cache (Library, Company HQ)', () => {
  const make = (scopeStore = createLocalStore({ backend: createMemoryBackend() })) => {
    const cache = createResourceCache();
    const binding = bindPersistentCache(cache, { store: () => scopeStore, maxBytes: 200, maxKeys: 2 });
    return { cache, binding, scopeStore };
  };
  it('seeds saved pages before the page reads them and keeps the stored time', async () => {
    const first = make();
    await first.binding.adopt(A);
    await first.cache.load('hq:work', async () => ({ rows: [1] }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = make(first.scopeStore);
    await second.binding.adopt(A);
    expect(second.cache.read('hq:work').value).toEqual({ rows: [1] });
  });
  it('does not seed another scope, and drops the cache when the scope changes', async () => {
    const first = make();
    await first.binding.adopt(A);
    await first.cache.load('hq:work', async () => ({ rows: [1] }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const other = make(first.scopeStore);
    await other.binding.adopt(B);
    expect(other.cache.read('hq:work')).toBeUndefined();
    await first.binding.adopt(B);
    expect(first.cache.read('hq:work')).toBeUndefined();
  });
  it('skips values above the byte cap and keeps at most maxKeys keys', async () => {
    const { cache, binding, scopeStore } = make();
    await binding.adopt(A);
    await cache.load('big', async () => ({ text: 'x'.repeat(500) }));
    for (const key of ['a', 'b', 'c']) { await cache.load(key, async () => ({ key })); await new Promise((resolve) => setTimeout(resolve, 3)); }
    await new Promise((resolve) => setTimeout(resolve, 10));
    const rows = await scopeStore.list(A, PAGE_CACHE_ENTITY);
    expect(rows.map((row) => row.id)).not.toContain('big');
    expect(rows.length).toBeLessThanOrEqual(2);
  });
  it('stores nothing after sign-out (scope null)', async () => {
    const { cache, binding, scopeStore } = make();
    await binding.adopt(A);
    await binding.adopt(null);
    await cache.load('late', async () => ({ ok: true }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await scopeStore.list(A, PAGE_CACHE_ENTITY)).toEqual([]);
  });
});
