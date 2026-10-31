/**
 * Device persistence for the in-memory page cache (`pageCache`: Library, Company HQ and other reads).
 *
 * Values settled by the network are copied to the LocalStore under the signed-in scope; on the next launch they are
 * seeded back into the cache before the page reads it, so the page paints its last known data and revalidates.
 * Nothing is written without a scope, values above the byte cap are skipped, and the entity keeps at most `maxKeys` keys.
 */

export const PAGE_CACHE_ENTITY = 'page-cache';

/**
 * Bind a resource cache to the LocalStore.
 * @param {ReturnType<import('../resource-cache').createResourceCache>} cache - cache to persist.
 * @param {{ store: () => ReturnType<import('./local-store').createLocalStore>, maxBytes?: number, maxKeys?: number }} options - LocalStore getter, per-value byte cap and key cap.
 * @returns {{ scope: () => string|null, adopt: (scope: string|null) => Promise<void> }} binding. `adopt(scope)` points writes at the scope and seeds its saved values.
 */
export function bindPersistentCache(cache, { store, maxBytes = 300_000, maxKeys = 24 }) {
  let current = null;
  let hydrating = null;
  const keep = async (scope) => {
    const rows = await store().list(scope, PAGE_CACHE_ENTITY);
    if (rows.length <= maxKeys) return;
    const doomed = rows.sort((a, b) => a.at - b.at).slice(0, rows.length - maxKeys);
    await Promise.all(doomed.map((row) => store().delete(scope, PAGE_CACHE_ENTITY, row.id)));
  };
  cache.subscribe((key, value, at) => {
    const scope = current;
    if (!scope) return;
    let encoded;
    try { encoded = JSON.stringify(value); } catch { return; /* Values that do not serialize stay in memory only. */ }
    if (encoded === undefined || encoded.length > maxBytes) return;
    store().put(scope, PAGE_CACHE_ENTITY, key, { value, fetchedAt: at }).then(() => keep(scope)).catch(() => { /* Blocked storage: the page still renders from the network. */ });
  });
  return {
    scope: () => current,
    adopt(scope) {
      if (scope === current) return hydrating || Promise.resolve();
      if (current !== null) cache.clear();
      current = scope;
      if (!scope) return Promise.resolve();
      const since = cache.generation();
      hydrating = store().list(scope, PAGE_CACHE_ENTITY).then((rows) => {
        if (current !== scope) return;
        for (const row of rows) cache.seed(row.id, row.value?.value, Number(row.value?.fetchedAt) || row.at, since);
      }).catch(() => { /* A failed read leaves the page to the network. */ });
      return hydrating;
    },
  };
}
