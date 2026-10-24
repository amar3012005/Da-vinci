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
  const remember = (key, value) => {
    settled.delete(key);
    settled.set(key, { value, at: now() });
    while (settled.size > maxEntries) settled.delete(settled.keys().next().value);
  };
  return {
    read: key => settled.get(key),
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
