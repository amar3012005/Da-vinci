/**
 * In-memory stale-while-revalidate cache for authenticated page reads.
 *
 * `read(key)` returns the last settled value immediately so a page can paint
 * cached data before its revalidation finishes. `load(key, fetcher)` shares one
 * in-flight promise per key, so concurrent callers never issue duplicate
 * requests. Values live only for the current document and are dropped when
 * the signed-in tenant changes.
 */

/**
 * Create one bounded cache.
 * @param {{ maxEntries?: number, now?: () => number }} [options] - entry bound and clock.
 * @returns {{ read: (key: string) => ({ value: unknown, at: number } | undefined), load: (key: string, fetcher: () => Promise<unknown>) => Promise<unknown>, pending: (key: string) => boolean, clear: () => void }} cache operations.
 */
export function createResourceCache({ maxEntries = 40, now = () => Date.now() } = {}) {
  const settled = new Map();
  const inflight = new Map();
  let generation = 0;
  const listeners = new Set();
  const remember = (key, value) => {
    const at = now();
    settled.delete(key);
    settled.set(key, { value, at });
    while (settled.size > maxEntries) settled.delete(settled.keys().next().value);
    for (const listener of listeners) listener(key, value, at);
  };
  return {
    read: key => settled.get(key),
    /** Current clear counter; a hydration that started under an older one must not seed. */
    generation: () => generation,
    /**
     * Seed a value restored from the device without overwriting a fresher one and without notifying listeners.
     * @param {string} key - cache key.
     * @param {unknown} value - restored value.
     * @param {number} at - time the value was fetched.
     * @param {number} [since] - generation read before the restore began; a clear in between drops the seed.
     */
    seed(key, value, at, since = generation) {
      if (since !== generation || settled.has(key)) return;
      settled.set(key, { value, at });
      while (settled.size > maxEntries) settled.delete(settled.keys().next().value);
    },
    /**
     * Listen for values the network just settled (not for seeds).
     * @param {(key: string, value: unknown, at: number) => void} listener - called after every settled load.
     * @returns {() => void} unsubscribe.
     */
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    pending: key => inflight.has(key),
    load(key, fetcher) {
      const existing = inflight.get(key);
      if (existing) return existing;
      const started = generation;
      let firstResult;
      try { firstResult = Promise.resolve(fetcher()); } catch (error) { firstResult = Promise.reject(error); }
      const request = firstResult.then(value => {
        if (started === generation) remember(key, value);
        return value;
      }).finally(() => {
        if (inflight.get(key) === request) inflight.delete(key);
      });
      inflight.set(key, request);
      return request;
    },
    clear() {
      generation += 1;
      settled.clear();
      inflight.clear();
    },
  };
}

/** Shared cache for Company HQ and Library reads; cleared on tenant change. */
export const pageCache = createResourceCache();

if (typeof window !== 'undefined') {
  window.addEventListener('hm:tenant-changed', () => pageCache.clear());
}
