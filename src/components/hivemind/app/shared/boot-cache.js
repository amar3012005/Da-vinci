/**
 * Per-tenant, display-only cache for boot reads (roster, teams, projects,
 * Runtime appearance). Entries render the last known state on reload while the
 * network read revalidates.
 *
 * Entries are keyed by org and user, so one tenant's entry is unreachable from
 * another tenant's session. Values must be non-secret display data: no tokens,
 * cookies, API keys or permission grants. Server authorization still gates every
 * protected request.
 */

export const BOOT_CACHE_VERSION = 'v1';
const PREFIX = `hivemind.boot.${BOOT_CACHE_VERSION}:`;
const LAST_TENANT_KEY = `${PREFIX}last-tenant`;

function defaultStorage() {
  try { return window.localStorage; } catch { return null; }
}

/**
 * Storage key for one tenant and resource.
 * @param {string} orgId - organization id of the signed-in tenant.
 * @param {string} userId - user id of the signed-in account.
 * @param {string} resource - resource name, for example `teams` or `runtime-appearance`.
 * @returns {string|null} key, or null when the tenant is incomplete.
 */
export function bootCacheKey(orgId, userId, resource) {
  if (!orgId || !userId || !resource) return null;
  return `${PREFIX}${orgId}:${userId}:${resource}`;
}

/**
 * Read a cached entry for one tenant. Storage failures and malformed entries read as a miss.
 * @param {string} orgId - organization id of the tenant.
 * @param {string} userId - user id of the account.
 * @param {string} resource - resource name.
 * @param {Storage|null} [store] - storage to read; defaults to localStorage.
 * @returns {{ value: unknown, at: number } | undefined} cached value and its write time.
 */
export function readBootCache(orgId, userId, resource, store = defaultStorage()) {
  const key = bootCacheKey(orgId, userId, resource);
  if (!key || !store) return undefined;
  try {
    const entry = JSON.parse(store.getItem(key) || 'null');
    if (entry?.v !== BOOT_CACHE_VERSION || !('value' in entry)) return undefined;
    return { value: entry.value, at: Number(entry.at) || 0 };
  } catch {
    // Blocked or corrupt storage: the caller renders from the network instead.
    return undefined;
  }
}

// Field names that can carry credentials. They are dropped from every entry, so a
// broad API payload cannot persist a secret even if a caller passes it through.
const SECRET_FIELD = /token|secret|passw|api[_-]?key|apikey|credential|cookie|authoriz|(?:^|[_-])key(?:$|[_-])/iu;

function withoutSecretFields(key, value) {
  return SECRET_FIELD.test(key) ? undefined : value;
}

/**
 * Write a display value for one tenant. Storage failures are ignored.
 * Fields whose names look like credentials are removed before storage.
 * @param {string} orgId - organization id of the tenant.
 * @param {string} userId - user id of the account.
 * @param {string} resource - resource name.
 * @param {unknown} value - JSON-serializable display data.
 * @param {Storage|null} [store] - storage to write; defaults to localStorage.
 * @returns {void}
 */
export function writeBootCache(orgId, userId, resource, value, store = defaultStorage()) {
  const key = bootCacheKey(orgId, userId, resource);
  if (!key || !store) return;
  try {
    store.setItem(key, JSON.stringify({ v: BOOT_CACHE_VERSION, at: Date.now(), value }, withoutSecretFields));
  } catch {
    // Quota or blocked storage: the page still renders from the network.
  }
}

// Display-only labels for the optimistic shell. Lengths are capped; no email, token or cookie is accepted.
const HINT_NAME_LIMIT = 120;
const HINT_ORG_LIMIT = 160;

function hintText(value, limit) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

/**
 * Record the last signed-in shell hint: tenant ids plus display labels. The next
 * load paints the cached shell from this hint while bootstrap confirms the identity.
 * @param {string} orgId - organization id of the tenant.
 * @param {string} userId - user id of the account.
 * @param {Storage|null} [store] - storage to write; defaults to localStorage.
 * @param {{ displayName?: string, orgName?: string }} [names] - display labels only.
 * @returns {void}
 */
export function rememberTenant(orgId, userId, store = defaultStorage(), names = {}) {
  if (!orgId || !userId || !store) return;
  const hint = {
    orgId,
    userId,
    displayName: hintText(names.displayName, HINT_NAME_LIMIT),
    orgName: hintText(names.orgName, HINT_ORG_LIMIT),
  };
  try { store.setItem(LAST_TENANT_KEY, JSON.stringify(hint)); } catch { /* Blocked storage: no optimistic shell on reload. */ }
}

/**
 * Shell hint recorded by the last confirmed session.
 * @param {Storage|null} [store] - storage to read; defaults to localStorage.
 * @returns {{ orgId: string, userId: string, displayName: string, orgName: string } | null} hint, or null.
 */
export function readLastTenant(store = defaultStorage()) {
  if (!store) return null;
  try {
    const tenant = JSON.parse(store.getItem(LAST_TENANT_KEY) || 'null');
    if (!tenant?.orgId || !tenant?.userId) return null;
    return {
      orgId: tenant.orgId,
      userId: tenant.userId,
      displayName: hintText(tenant.displayName, HINT_NAME_LIMIT),
      orgName: hintText(tenant.orgName, HINT_ORG_LIMIT),
    };
  } catch {
    return null;
  }
}

/**
 * Remove every boot-cache entry, including the last-tenant pointer.
 * Called on sign-out, account switch and organization switch.
 * @param {Storage|null} [store] - storage to clear; defaults to localStorage.
 * @returns {void}
 */
export function clearBootCache(store = defaultStorage()) {
  if (!store) return;
  try {
    const doomed = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key && key.startsWith(PREFIX)) doomed.push(key);
    }
    doomed.forEach((key) => store.removeItem(key));
  } catch {
    // Blocked storage has nothing to clear.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hm:tenant-changed', () => clearBootCache());
}
