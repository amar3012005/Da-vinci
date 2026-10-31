/**
 * Adapters from server reads to SyncEngine pages.
 *
 * A "changes since" feed answers `{ items, deleted, next_cursor, has_more }` (Control and OpenDot sync API). Pages are
 * read until `has_more` is false and the last `next_cursor` is kept. A server that does not know `since` yet answers a
 * plain list; that answer replaces the stored list, so the same entity works before and after the sync API ships.
 */

/**
 * Read a changes-since feed, or a plain list from a server without one.
 * @param {(since: string, context: { signal?: AbortSignal }) => Promise<object>} readPage - one request with the `since` value (`start` for everything).
 * @param {unknown} cursor - stored cursor, or null for a first read.
 * @param {{ signal?: AbortSignal, listOf?: (body: object) => object[], metaOf?: (body: object) => unknown, maxPages?: number }} [options] - abort signal, plain-list reader, list metadata reader and page bound.
 * @returns {Promise<{ items: object[], deletes: string[], cursor: unknown, replace: boolean, meta?: unknown }>} SyncEngine page.
 */
export async function readSinceFeed(readPage, cursor, { signal, listOf = (body) => body?.items, metaOf, maxPages = 20 } = {}) {
  const items = [];
  const deletes = [];
  let since = typeof cursor === 'string' && cursor ? cursor : 'start';
  let last;
  for (let page = 0; page < maxPages; page += 1) {
    const body = await readPage(since, { signal });
    last = body;
    if (typeof body?.next_cursor !== 'string') {
      const list = listOf(body);
      return { items: Array.isArray(list) ? list : [], deletes: [], cursor: null, replace: true, ...(metaOf ? { meta: metaOf(body) } : {}) };
    }
    if (Array.isArray(body.items)) items.push(...body.items);
    if (Array.isArray(body.deleted)) deletes.push(...body.deleted.map((row) => String(row?.id)).filter(Boolean));
    since = body.next_cursor;
    if (!body.has_more) break;
  }
  return { items, deletes, cursor: since, replace: cursor === null || cursor === undefined, ...(metaOf ? { meta: metaOf(last) } : {}) };
}

/**
 * Revision order for sync API items: revisions are decimal strings compared as integers.
 * @param {object} item - feed item.
 * @returns {bigint|undefined} the revision, or undefined when absent or malformed.
 */
export function feedRevision(item) {
  const value = item?.revision;
  if (typeof value !== 'string' || !/^\d{1,30}$/u.test(value)) return undefined;
  return BigInt(value);
}
