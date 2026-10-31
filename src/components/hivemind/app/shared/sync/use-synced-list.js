import { useCallback, useEffect, useState } from 'react';

/**
 * Render-from-cache hook: the first render shows the in-memory snapshot when one exists, the next shows the local
 * copy, and the server refresh replaces it when it arrives.
 * @param {ReturnType<import('./sync-engine').createSyncEngine>|null} engine - scope engine; null renders nothing (no signed-in scope).
 * @param {string} entity - registered entity name.
 * @param {string|null} key - list key; null renders nothing.
 * @returns {{ items: object[], source: 'none'|'cache'|'server', error: unknown, refresh: () => Promise<void> }} items, where they came from, the last refresh failure and a manual refresh.
 */
export function useSyncedList(engine, entity, key) {
  const [state, setState] = useState(() => {
    const snapshot = engine && key ? engine.peek(entity, key) : undefined;
    return { items: snapshot?.items || [], source: snapshot ? 'cache' : 'none', error: null };
  });
  useEffect(() => {
    if (!engine || !key) { setState({ items: [], source: 'none', error: null }); return undefined; }
    let active = true;
    const controller = new AbortController();
    const stop = engine.subscribe(entity, key, (snapshot) => { if (active) setState({ items: snapshot.items, source: 'server', error: null }); });
    engine.open(entity, key, { signal: controller.signal, onError: (error) => { if (active) setState((current) => ({ ...current, error })); } })
      .then(({ snapshot }) => { if (active && snapshot) setState((current) => (current.source === 'server' ? current : { items: snapshot.items, source: 'cache', error: null })); })
      .catch((error) => { if (active) setState((current) => ({ ...current, error })); });
    return () => { active = false; stop(); controller.abort(); };
  }, [engine, entity, key]);
  const refresh = useCallback(async () => {
    if (!engine || !key) return;
    try { await engine.refresh(entity, key); } catch (error) { setState((current) => ({ ...current, error })); }
  }, [engine, entity, key]);
  return { ...state, refresh };
}
