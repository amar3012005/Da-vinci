import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { confirmedIdentity, onIdentityChange, syncScope } from './index';
import { getPlatformAdapter } from './platform-adapter';

/**
 * Local-first read of one screen's data.
 *
 * The first render shows the copy kept on this device for the signed-in `company:user` (same frame when the copy is
 * already in memory, otherwise after one local read); the server read starts in parallel, replaces the copy when it
 * answers (server wins, a list that lost an item drops it) and is written back after paint. With nothing stored the
 * hook reports `loading` so the screen shows its normal loading UI. The app foreground and network return refresh
 * every opened list through the SyncEngine. Without a signed-in scope the hook only reads from the server.
 *
 * Stored value: one snapshot item `{ id: 'value', value }` per key, with `meta.at` the time of the server answer.
 */

const VALUE_ID = 'value';
const registry = new WeakMap();

/**
 * The person and company bootstrap confirmed. Both are undefined while signed out, which keeps a screen on plain server reads.
 * @returns {{ orgId?: string, userId?: string }} identity.
 */
function useIdentity() {
  const identity = useSyncExternalStore(onIdentityChange, confirmedIdentity, confirmedIdentity);
  return identity || {};
}

function bucket(engine) {
  let found = registry.get(engine);
  if (!found) { found = { loaders: new Map(), trims: new Map(), live: new Map(), entities: new Set() }; registry.set(engine, found); }
  return found;
}

/**
 * Byte length of the JSON form of a value.
 * @param {unknown} value - JSON-serializable value.
 * @returns {number} length in characters; Infinity when the value does not serialize.
 */
export function sizeOf(value) {
  try { return JSON.stringify(value)?.length ?? 0; } catch { return Infinity; }
}

/**
 * Declare an entity on an engine once; `load` for each key is looked up when the engine asks for a refresh.
 * @param {ReturnType<import('./sync-engine').createSyncEngine>} engine - scope engine.
 * @param {{ entity: string, maxBytes: number, maxKeys: number }} spec - catalog entry.
 * @returns {void}
 */
export function ensureEntity(engine, { entity, maxBytes, maxKeys }) {
  const state = bucket(engine);
  if (state.entities.has(entity)) return;
  state.entities.add(entity);
  engine.register(entity, {
    maxKeys,
    orderOf: () => 0,
    fetchSince: async (key, cursor, { signal } = {}) => {
      const id = `${entity}\u0000${key}`;
      const load = state.loaders.get(id);
      if (!load) throw new Error(`No loader for ${entity}`);
      const data = await load(signal);
      state.live.set(id, data);
      // A value above the cap is shown from memory but not stored.
      const slim = state.trims.get(id)?.(data) ?? data;
      const stored = sizeOf(slim) <= maxBytes ? slim : null;
      return { items: [{ id: VALUE_ID, value: stored }], replace: true, meta: { at: Date.now(), capped: stored === null && data != null } };
    },
  });
}

function valueOf(snapshot, live, restore) {
  if (live !== undefined) return live;
  const item = snapshot?.items?.find((row) => row?.id === VALUE_ID);
  if (!item) return undefined;
  return restore && item.value != null ? restore(item.value) : item.value;
}

/**
 * Read one value local-first.
 * @param {{ spec: { entity: string, maxBytes: number, maxKeys: number, staleAfterMs: number }, key?: string, load: (signal?: AbortSignal) => Promise<unknown>, trim?: (data: unknown) => unknown, persistTrim?: (data: unknown) => unknown, restore?: (stored: unknown) => unknown, persist?: boolean, enabled?: boolean }} options
 *   `spec` is a {@link LOCAL_FIRST} entry, `key` names the list (include request parameters), `load` is the existing
 *   network read, `trim` bounds the data before it is stored and shown, `persistTrim` bounds only what is stored
 *   (for example the first page of a long list), `persist=false` reads without storing (searches, later pages),
 *   `enabled=false` renders nothing yet.
 * @returns {{ data: unknown, loading: boolean, error: string|null, stale: boolean, source: 'none'|'cache'|'server', refetch: () => Promise<void> }} state. `loading` is true only while nothing (cached or fresh) can be shown. `error` is set only when there is nothing to show.
 */
export function useLocalFirst({ spec, key = 'main', load, trim, persistTrim, restore, persist = true, enabled = true }) {
  const { orgId, userId } = useIdentity();
  const engine = useMemo(() => (enabled && persist && orgId && userId ? syncScope(orgId, userId).engine : null), [enabled, persist, orgId, userId]);
  const loadRef = useRef(load);
  loadRef.current = load;
  const trimRef = useRef(trim);
  trimRef.current = trim;
  const persistTrimRef = useRef(persistTrim);
  persistTrimRef.current = persistTrim;
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const restoreStored = useCallback((value) => (restoreRef.current ? restoreRef.current(value) : value), []);
  const storeTrim = useCallback((data) => (persistTrimRef.current ? persistTrimRef.current(data) : data), []);
  const read = useCallback(async (signal) => {
    const data = await loadRef.current(signal);
    return trimRef.current ? trimRef.current(data) : data;
  }, []);

  const fromEngine = () => {
    if (!engine) return { data: undefined, at: 0, source: 'none' };
    const snapshot = engine.peek(spec.entity, key);
    return snapshot ? { data: valueOf(snapshot, undefined, restoreStored), at: snapshot.meta?.at || 0, source: 'cache' } : { data: undefined, at: 0, source: 'none' };
  };
  const [state, setState] = useState(() => ({ ...fromEngine(), error: null, settled: false }));

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (!enabled) { setState({ data: undefined, at: 0, source: 'none', error: null, settled: false }); return undefined; }
    if (!engine) {
      read(controller.signal)
        .then((data) => { if (active) setState({ data, at: Date.now(), source: 'server', error: null, settled: true }); })
        .catch((error) => { if (active) setState((current) => ({ ...current, error: error?.response?.data?.error || error?.message || 'error', settled: true })); });
      return () => { active = false; controller.abort(); };
    }
    ensureEntity(engine, spec);
    const id = `${spec.entity}\u0000${key}`;
    const { loaders, trims, live } = bucket(engine);
    loaders.set(id, read);
    trims.set(id, storeTrim);
    const stop = engine.subscribe(spec.entity, key, (snapshot) => {
      if (active) setState({ data: valueOf(snapshot, live.get(id), restoreStored), at: snapshot.meta?.at || Date.now(), source: 'server', error: null, settled: true });
    });
    engine.open(spec.entity, key, {
      signal: controller.signal,
      onError: (error) => { if (active) setState((current) => ({ ...current, error: error?.response?.data?.error || error?.message || 'error', settled: true })); },
    }).then(({ snapshot }) => {
      if (!active || !snapshot) return;
      setState((current) => (current.source === 'server' ? current : { data: valueOf(snapshot, undefined, restoreStored), at: snapshot.meta?.at || 0, source: 'cache', error: null, settled: false }));
    }).catch(() => { /* The server read fills the screen. */ });
    return () => { active = false; stop(); controller.abort(); live.delete(id); };
  }, [engine, enabled, key, spec, read, storeTrim, restoreStored]);

  const refetch = useCallback(async () => {
    if (!engine) return;
    try { await engine.refresh(spec.entity, key); } catch (error) {
      setState((current) => ({ ...current, error: error?.response?.data?.error || error?.message || 'error' }));
    }
  }, [engine, spec, key]);

  const hasData = state.data !== undefined && state.data !== null;
  const stale = state.source === 'cache' && state.at > 0 && Date.now() - state.at > spec.staleAfterMs;
  return {
    data: hasData ? state.data : (state.settled ? state.data ?? null : null),
    loading: enabled && !hasData && !state.error && !state.settled,
    error: hasData ? null : state.error,
    stale,
    source: state.source,
    refetch,
  };
}

/**
 * Local copy for a screen that keeps its own fetch and state machine (polling, filters, silent refresh).
 * `cached` is the stored value for first paint (same frame when already in memory); `save` writes the value the
 * screen just received from the server (replacing the copy, so deleted items disappear); `onForeground` runs when
 * the app returns to the foreground or the network returns.
 * @param {{ spec: { entity: string, maxBytes: number, maxKeys: number, staleAfterMs: number }, key?: string, onForeground?: () => void, enabled?: boolean }} options - catalog entry, key (include request parameters) and optional refresh callback.
 * @returns {{ cached: { data: unknown, at: number, stale: boolean }|null, ready: boolean, save: (data: unknown) => void }} `ready` turns true once the local read finished, whether or not it found a copy.
 */
export function useLocalCopy({ spec, key = 'main', onForeground, persistTrim, restore, enabled = true }) {
  const { orgId, userId } = useIdentity();
  const engine = useMemo(() => (enabled && orgId && userId ? syncScope(orgId, userId).engine : null), [enabled, orgId, userId]);
  if (engine) ensureEntity(engine, spec);
  const read = (snapshot) => {
    if (!snapshot) return null;
    const data = valueOf(snapshot, undefined, restore);
    if (data === undefined || data === null) return null;
    const at = snapshot.meta?.at || 0;
    return { data, at, stale: at > 0 && Date.now() - at > spec.staleAfterMs };
  };
  const [state, setState] = useState(() => ({ cached: engine ? read(engine.peek(spec.entity, key)) : null, ready: !engine || Boolean(engine.peek(spec.entity, key)) }));
  useEffect(() => {
    let active = true;
    if (!engine) { setState({ cached: null, ready: true }); return undefined; }
    engine.read(spec.entity, key)
      .then((snapshot) => { if (active) setState((current) => ({ cached: current.cached || read(snapshot), ready: true })); })
      .catch(() => { if (active) setState((current) => ({ ...current, ready: true })); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, spec.entity, key]);
  const callback = useRef(onForeground);
  callback.current = onForeground;
  useEffect(() => getPlatformAdapter().onForeground(() => { callback.current?.(); }), []);
  const save = useCallback((data) => {
    if (!engine) return;
    const slim = persistTrim ? persistTrim(data) : data;
    const stored = sizeOf(slim) <= spec.maxBytes ? slim : null;
    engine.put(spec.entity, key, { items: [{ id: VALUE_ID, value: stored }], meta: { at: Date.now() } }).catch(() => { /* Blocked storage: the screen still shows the server answer. */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, spec.entity, spec.maxBytes, key]);
  return { cached: state.cached, ready: state.ready, save };
}
