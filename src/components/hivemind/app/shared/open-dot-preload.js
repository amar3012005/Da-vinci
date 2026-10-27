import { openDotEmployeeIdFromPath, openDotEmployeePath } from './open-dot-employee-route';

const KEY_PREFIX = 'hivemind.open-dot.last-route.v1:';

function storage() {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

/**
 * Remember the last employee workspace the viewer opened, so the next session can preload it.
 * Only canonical employee routes are stored; the value carries no conversation data.
 * @param {string} scope - `${userId}:${orgId}` of the signed-in viewer.
 * @param {string} pathname - current in-app pathname.
 */
export function rememberOpenDotRoute(scope, pathname) {
  if (!scope || scope === ':' || !openDotEmployeeIdFromPath(pathname)) return;
  try { storage()?.setItem(KEY_PREFIX + scope, pathname.replace(/\/+$/, '')); } catch { /* Optional browser cache. */ }
}

/**
 * Choose the employee workspace to preload: the last one opened, else the first bound employee of the cached roster.
 * Reads only local state; it never starts a network request.
 * @param {string} scope - `${userId}:${orgId}` of the signed-in viewer.
 * @param {Array<object>|undefined} roster - cached roster profiles, if any.
 * @returns {string|null} in-app pathname, or null when no employee is known yet.
 */
export function openDotPreloadRoute(scope, roster) {
  if (!scope || scope === ':') return null;
  let remembered = null;
  try { remembered = storage()?.getItem(KEY_PREFIX + scope) ?? null; } catch { /* Optional browser cache. */ }
  if (remembered && openDotEmployeeIdFromPath(remembered)) return remembered;
  for (const employee of Array.isArray(roster) ? roster : []) {
    const route = openDotEmployeePath(employee);
    if (route) return route;
  }
  return null;
}

/**
 * Whether background preloading is acceptable on this connection.
 * @returns {boolean} false when the browser reports Data Saver or a 2G connection.
 */
export function preloadAllowed() {
  const connection = typeof navigator === 'undefined' ? null : navigator.connection;
  return !(connection?.saveData === true || /(^|-)2g$/.test(connection?.effectiveType || ''));
}

/**
 * Run a callback once the browser is idle, or after the timeout at the latest.
 * @param {() => void} callback - work to run.
 * @param {number} timeout - maximum wait in milliseconds.
 * @returns {() => void} cancel function.
 */
export function whenIdle(callback, timeout = 5000) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, Math.min(timeout, 1500));
  return () => window.clearTimeout(id);
}
