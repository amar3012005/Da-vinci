/**
 * Where Brain's bare overview URL lands, decided before any page mounts so opening Brain is one navigation.
 * Companies outside the Harness cohort stay on the legacy overview; the first visit that learns this sets
 * `hm.brainLegacy` so the bare URL is never rewritten into a route that sends them straight back.
 */
export const LAST_HARNESS_SESSION_KEY = 'hm.lastHarnessSession';
export const BRAIN_LEGACY_KEY = 'hm.brainLegacy';
export const BRAIN_OVERVIEW_PATH = '/hivemind/app/overview';
export const BRAIN_NEW_PATH = `${BRAIN_OVERVIEW_PATH}/new`;
export const HARNESS_SESSION_ROUTE = /^\/hivemind\/app\/overview\/session\/[^/]+$/u;

/** @param {string} pathname - location pathname. @returns {boolean} true for the bare overview document. */
export function isBareOverview(pathname) {
  return /^\/hivemind\/app\/overview\/?$/u.test(pathname || '');
}

function read(storage, key) {
  try { return storage.getItem(key) || ''; } catch { return ''; /* Storage can be unavailable; the caller falls back to the default route. */ }
}

/**
 * The final Brain route for the bare overview URL.
 * @param {Storage|undefined} [storage] - session storage holding the last session and the legacy marker.
 * @returns {string|null} the remembered session, else the new-chat route; null when this company is on the legacy overview.
 */
export function brainLandingPath(storage = typeof window === 'undefined' ? undefined : window.sessionStorage) {
  if (!storage) return BRAIN_NEW_PATH;
  if (read(storage, BRAIN_LEGACY_KEY) === '1') return null;
  const cached = read(storage, LAST_HARNESS_SESSION_KEY);
  return HARNESS_SESSION_ROUTE.test(cached) ? cached : BRAIN_NEW_PATH;
}

/**
 * Records which overview this company gets, as learned from Harness admission.
 * @param {boolean} legacy - true when admission returned the legacy mode.
 * @param {Storage|undefined} [storage] - session storage.
 * @returns {void}
 */
export function rememberBrainMode(legacy, storage = typeof window === 'undefined' ? undefined : window.sessionStorage) {
  if (!storage) return;
  try {
    if (legacy) storage.setItem(BRAIN_LEGACY_KEY, '1');
    else storage.removeItem(BRAIN_LEGACY_KEY);
  } catch { /* Storage can be unavailable; the next visit asks admission again. */ }
}

/**
 * Rewrites a cold-loaded bare overview URL to its final route before the router reads it (no history entry, no page).
 * @param {Window} [win] - browser window.
 * @returns {boolean} true when the URL was rewritten.
 */
export function normalizeBrainEntry(win = typeof window === 'undefined' ? null : window) {
  if (!win || !isBareOverview(win.location.pathname)) return false;
  const target = brainLandingPath(win.sessionStorage);
  if (!target) return false;
  try {
    win.history.replaceState(win.history.state, '', `${target}${win.location.search}${win.location.hash}`);
    return true;
  } catch { return false; /* A sandboxed frame may refuse history writes; the route resolves client-side instead. */ }
}
