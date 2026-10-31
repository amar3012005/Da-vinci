/**
 * SyncEngine: render from the local copy at once, fetch from the server in parallel, reconcile, persist.
 *
 * An entity is a kind of list (`conversations`, `messages`, `notifications`, ...). Each entity holds one
 * snapshot per list key (for example one conversation id). A snapshot is `{ items, cursor }`, stored as one
 * LocalStore row so a list is always read and written whole.
 *
 * Reconciliation is by id. Between two server copies of one item the higher revision wins; an item without a
 * revision is replaced by the newer server copy. Local optimistic items (`pending: true` with a `clientId`) are
 * kept until the server returns an item with the same `clientId`, which replaces them. The server is the source
 * of truth: it wins over every local copy.
 */

const SNAPSHOT_VERSION = 1;

const defaultId = (item) => item?.id;
const defaultRevision = (item) => item?.revision ?? item?.rev ?? item?.updated_at ?? item?.updatedAt;
const defaultOrder = (item) => item?.created_at ?? item?.createdAt ?? item?.timestamp ?? 0;

function compareValues(left, right) {
  if (left === right) return 0;
  if (left === undefined || left === null) return -1;
  if (right === undefined || right === null) return 1;
  const a = typeof left === 'string' && !Number.isNaN(Date.parse(left)) ? Date.parse(left) : left;
  const b = typeof right === 'string' && !Number.isNaN(Date.parse(right)) ? Date.parse(right) : right;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Merge a server page into a local list.
 * @param {object[]} local - current items, oldest first.
 * @param {{ items?: object[], deletes?: string[], replace?: boolean }} incoming - server items, ids removed on the server, and whether the page is the complete list.
 * @param {{ limit?: number, idOf?: Function, revisionOf?: Function, orderOf?: Function }} [rules] - size limit (newest kept) and field readers.
 * @returns {object[]} reconciled items, oldest first. Pending local items are never dropped by the limit.
 */
export function reconcile(local, incoming, { limit = Infinity, idOf = defaultId, revisionOf = defaultRevision, orderOf = defaultOrder } = {}) {
  const serverItems = Array.isArray(incoming?.items) ? incoming.items : [];
  const confirmed = new Set(serverItems.map((item) => item?.clientId).filter(Boolean));
  const deletes = new Set((incoming?.deletes || []).map(String));
  const byId = new Map();
  const pending = [];
  for (const item of local || []) {
    if (item?.pending) { if (!confirmed.has(item.clientId)) pending.push(item); continue; }
    if (incoming?.replace) continue;
    const id = idOf(item);
    if (id !== undefined && id !== null) byId.set(String(id), item);
  }
  for (const item of serverItems) {
    const id = idOf(item);
    if (id === undefined || id === null) continue;
    const key = String(id);
    const existing = byId.get(key);
    const older = existing && compareValues(revisionOf(item), revisionOf(existing)) < 0 && revisionOf(item) !== undefined;
    if (!older) byId.set(key, item);
  }
  for (const id of deletes) byId.delete(id);
  const sorted = [...byId.values()].sort((a, b) => compareValues(orderOf(a), orderOf(b)));
  const kept = Number.isFinite(limit) && sorted.length > limit ? sorted.slice(sorted.length - limit) : sorted;
  return [...kept, ...pending];
}

/**
 * Create a sync engine for one scope.
 * @param {{ store: ReturnType<import('./local-store').createLocalStore>, scope: string|null, adapter?: import('./platform-adapter').PlatformAdapter|null }} options - LocalStore, `company:user` scope (null keeps nothing on disk) and platform adapter for foreground refresh.
 * @returns {object} engine; see the methods below.
 */
export function createSyncEngine({ store, scope, adapter = null }) {
  const entities = new Map();
  const memory = new Map();
  const listeners = new Map();
  const inflight = new Map();
  const opened = new Set();
  let closed = false;

  const memoryKey = (entity, key) => `${entity}\u0000${key}`;
  const definition = (entity) => {
    const found = entities.get(entity);
    if (!found) throw new Error(`Unregistered sync entity: ${entity}`);
    return found;
  };
  const emit = (entity, key, snapshot) => {
    for (const listener of listeners.get(memoryKey(entity, key)) || []) listener(snapshot);
  };
  const evict = async (entity) => {
    const { maxKeys } = definition(entity);
    if (!Number.isFinite(maxKeys)) return;
    const rows = await store.list(scope, entity);
    if (rows.length <= maxKeys) return;
    const doomed = rows.sort((a, b) => a.at - b.at).slice(0, rows.length - maxKeys);
    await Promise.all(doomed.map((row) => store.delete(scope, entity, row.id)));
    doomed.forEach((row) => memory.delete(memoryKey(entity, row.id)));
  };
  const save = async (entity, key, snapshot) => {
    if (closed) return;
    memory.set(memoryKey(entity, key), snapshot);
    emit(entity, key, snapshot);
    await store.put(scope, entity, key, { v: SNAPSHOT_VERSION, items: snapshot.items, cursor: snapshot.cursor ?? null, meta: snapshot.meta ?? null });
    await evict(entity);
  };

  const engine = {
    /**
     * Declare an entity.
     * @param {string} entity - entity name.
     * @param {{ fetchSince: (key: string, cursor: unknown, context: { signal?: AbortSignal }) => Promise<{ items?: object[], deletes?: string[], cursor?: unknown, replace?: boolean, meta?: unknown }>, applyEvent?: (event: unknown, key: string) => ({ items?: object[], deletes?: string[] }|null), limit?: number, maxKeys?: number, idOf?: Function, revisionOf?: Function, orderOf?: Function }} spec
     *   `fetchSince` returns changes after `cursor` (null asks for the latest page); `replace` marks a complete list.
     *   `limit` bounds items per key (newest kept); `maxKeys` bounds stored keys (least recently written evicted).
     * @returns {() => void} unregisters the entity.
     */
    register(entity, spec) {
      if (typeof spec?.fetchSince !== 'function') throw new Error(`Sync entity ${entity} needs fetchSince`);
      entities.set(entity, { limit: Infinity, maxKeys: Infinity, ...spec });
      return () => entities.delete(entity);
    },
    /**
     * Snapshot already in memory, for the first render frame.
     * @param {string} entity - entity name.
     * @param {string} key - list key.
     * @returns {{ items: object[], cursor: unknown }|undefined} snapshot, or undefined before the first read.
     */
    peek(entity, key) { return memory.get(memoryKey(entity, key)); },
    /**
     * Snapshot from memory or the LocalStore. Snapshots of another format version read as a miss.
     * @param {string} entity - entity name.
     * @param {string} key - list key.
     * @returns {Promise<{ items: object[], cursor: unknown }|undefined>} snapshot.
     */
    async read(entity, key) {
      definition(entity);
      const hit = memory.get(memoryKey(entity, key));
      if (hit) return hit;
      const row = await store.get(scope, entity, key);
      if (closed || row?.value?.v !== SNAPSHOT_VERSION || !Array.isArray(row.value.items)) return undefined;
      const snapshot = { items: row.value.items, cursor: row.value.cursor ?? null, meta: row.value.meta ?? null };
      if (!memory.has(memoryKey(entity, key))) memory.set(memoryKey(entity, key), snapshot);
      return memory.get(memoryKey(entity, key));
    },
    /**
     * Ask the server for changes since the stored cursor and merge them. Concurrent calls for one list share one request.
     * @param {string} entity - entity name.
     * @param {string} key - list key.
     * @param {{ signal?: AbortSignal }} [context] - abort signal handed to `fetchSince`.
     * @returns {Promise<{ items: object[], cursor: unknown }>} reconciled snapshot.
     */
    refresh(entity, key, context = {}) {
      const spec = definition(entity);
      const id = memoryKey(entity, key);
      if (inflight.has(id)) return inflight.get(id);
      const request = (async () => {
        const before = await engine.read(entity, key);
        const page = await spec.fetchSince(key, before?.cursor ?? null, context);
        const current = memory.get(id) || before;
        const items = reconcile(current?.items, page, spec);
        const snapshot = { items, cursor: page?.cursor !== undefined ? page.cursor : current?.cursor ?? null, meta: page?.meta !== undefined ? page.meta : current?.meta ?? null };
        await save(entity, key, snapshot);
        return snapshot;
      })().finally(() => inflight.delete(id));
      inflight.set(id, request);
      return request;
    },
    /**
     * Open a list: resolve with the local copy as soon as it is read and start the server refresh in parallel.
     * Subscribers receive the refreshed snapshot. A failed refresh leaves the local copy in place.
     * @param {string} entity - entity name.
     * @param {string} key - list key.
     * @param {{ signal?: AbortSignal, onError?: (error: unknown) => void }} [context] - abort signal and refresh failure callback.
     * @returns {Promise<{ snapshot: { items: object[], cursor: unknown }|undefined, refreshed: Promise<object|undefined> }>} local snapshot and the pending refresh.
     */
    async open(entity, key, context = {}) {
      opened.add(memoryKey(entity, key));
      const snapshot = await engine.read(entity, key);
      const refreshed = engine.refresh(entity, key, context).catch((error) => { context.onError?.(error); return undefined; });
      return { snapshot, refreshed };
    },
    /**
     * Apply a live event (stream push or an optimistic local item) to one list.
     * @param {string} entity - entity name.
     * @param {string} key - list key.
     * @param {unknown} event - raw event for the entity's `applyEvent`, or `{ items, deletes }` when it has none.
     * @returns {Promise<{ items: object[], cursor: unknown }|undefined>} new snapshot, or undefined when the event does not apply.
     */
    async apply(entity, key, event) {
      const spec = definition(entity);
      const change = spec.applyEvent ? spec.applyEvent(event, key) : event;
      if (!change) return undefined;
      const current = await engine.read(entity, key);
      const optimistic = (change.items || []).filter((item) => item?.pending);
      const replaced = new Set(optimistic.map((item) => item.clientId));
      const local = [...(current?.items || []).filter((item) => !(item?.pending && replaced.has(item.clientId))), ...optimistic];
      const server = { items: (change.items || []).filter((item) => !item?.pending), deletes: change.deletes };
      const snapshot = { items: reconcile(local, server, spec), cursor: current?.cursor ?? null, meta: current?.meta ?? null };
      await save(entity, key, snapshot);
      return snapshot;
    },
    /**
     * Listen for new snapshots of one list.
     * @param {string} entity - entity name.
     * @param {string} key - list key.
     * @param {(snapshot: { items: object[], cursor: unknown }) => void} listener - called after every save.
     * @returns {() => void} unsubscribe.
     */
    subscribe(entity, key, listener) {
      const id = memoryKey(entity, key);
      if (!listeners.has(id)) listeners.set(id, new Set());
      listeners.get(id).add(listener);
      return () => { listeners.get(id)?.delete(listener); };
    },
    /**
     * Refresh every opened list whenever the app returns to the foreground or the network returns.
     * @returns {() => void} stops listening.
     */
    refreshOnForeground() {
      if (!adapter?.onForeground) return () => {};
      return adapter.onForeground(() => {
        for (const id of opened) {
          const [entity, key] = id.split('\u0000');
          if (entities.has(entity)) engine.refresh(entity, key).catch(() => { /* The next foreground or open retries. */ });
        }
      });
    },
    /**
     * Stop writing. Called when the scope ends (sign-out, company switch); pending refreshes resolve without saving.
     * @returns {void}
     */
    close() { closed = true; listeners.clear(); memory.clear(); opened.clear(); },
  };
  return engine;
}
