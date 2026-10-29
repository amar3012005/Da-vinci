/**
 * Last known saved appearance per employee id, so an avatar keeps the look the person set while a roster is
 * loading, was cached without policy, or arrives as an older snapshot. Control's `policy_rules.appearance` stays the
 * source of truth: a cached look is replaced only by a newer profile revision, never by a default or generated look.
 *
 * The map lives in the boot cache namespace, so sign-out and account or organization switches clear it with the rest.
 */

export const EMPLOYEE_APPEARANCE_CACHE_KEY = 'hivemind.boot.v1:employee-appearances';
const MAX_ENTRIES = 200;
const listeners = new Set();
/** @type {Map<string, { appearance: object, revision: number | undefined }> | null} */
let entries = null;

function storage() {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

/** Cheap structural check; the catalog parts are validated where the look is drawn (`knownEmployeeAppearance`). */
function savedAppearance(agent) {
  const value = (agent?.policyRules || agent?.policy_rules)?.appearance;
  return value && typeof value === 'object' && value.version === 1 && value.provider === 'humation'
    && typeof value.seed === 'string' && value.selections && typeof value.selections === 'object'
    && value.colors && typeof value.colors === 'object' ? value : null;
}

/**
 * Profile revision of an employee object, from either field convention.
 * @param {object} agent - employee or roster profile.
 * @returns {number | undefined} revision, or undefined when the profile does not carry one.
 */
export function appearanceRevision(agent) {
  const revision = (agent?.policyRules || agent?.policy_rules)?.native_lifecycle?.profile_revision;
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : undefined;
}

function load() {
  if (entries) return entries;
  entries = new Map();
  try {
    const saved = JSON.parse(storage()?.getItem(EMPLOYEE_APPEARANCE_CACHE_KEY) || 'null');
    if (saved?.version === 1 && Array.isArray(saved.entries)) {
      for (const [id, entry] of saved.entries) {
        const appearance = typeof id === 'string' ? savedAppearance({ policyRules: { appearance: entry?.appearance } }) : null;
        if (appearance) entries.set(id, { appearance, revision: Number.isSafeInteger(entry.revision) ? entry.revision : undefined });
      }
    }
  } catch { /* A missing or unreadable browser cache is a cache miss. */ }
  return entries;
}

function persist() {
  try { storage()?.setItem(EMPLOYEE_APPEARANCE_CACHE_KEY, JSON.stringify({ version: 1, entries: [...load()] })); } catch { /* Optional browser cache. */ }
}

/**
 * Remember an employee's saved appearance when the profile is newer than what is cached.
 * @param {object} agent - employee or roster profile carrying `policyRules.appearance`.
 * @returns {boolean} whether the cache changed.
 */
export function rememberEmployeeAppearance(agent) {
  const id = agent?.id;
  const appearance = typeof id === 'string' ? savedAppearance(agent) : null;
  if (!appearance) return false;
  const revision = appearanceRevision(agent);
  const map = load();
  const known = map.get(id);
  if (known) {
    // A profile without a revision cannot prove it is newer; only a revised profile replaces a revised cache entry.
    if (revision === undefined && known.revision !== undefined) return false;
    if (revision !== undefined && known.revision !== undefined && revision < known.revision) return false;
    if (JSON.stringify(known.appearance) === JSON.stringify(appearance) && known.revision === revision) return false;
  }
  map.delete(id);
  map.set(id, { appearance, revision });
  while (map.size > MAX_ENTRIES) map.delete(map.keys().next().value);
  persist();
  for (const listener of listeners) listener();
  return true;
}

/**
 * Remember every profile of a roster.
 * @param {object[]} profiles - employee profiles.
 * @returns {void}
 */
export function rememberEmployeeAppearances(profiles) {
  if (Array.isArray(profiles)) for (const profile of profiles) rememberEmployeeAppearance(profile);
}

/**
 * @param {string | undefined} id - employee id.
 * @returns {{ appearance: object, revision: number | undefined } | undefined} cached entry; the object is stable until replaced.
 */
export function cachedEmployeeAppearance(id) {
  return typeof id === 'string' ? load().get(id) : undefined;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Subscribe to cache changes.
 * @param {() => void} listener - called after the cache changes.
 * @returns {() => void} unsubscribe.
 */
export function subscribeEmployeeAppearances(listener) { return subscribe(listener); }

if (typeof window !== 'undefined') {
  window.addEventListener('hm:tenant-changed', () => { entries = new Map(); for (const listener of listeners) listener(); });
}

/** Test hook: forget the in-memory map so the next read hydrates from storage again. */
export function resetEmployeeAppearanceCacheForTests() { entries = null; }
