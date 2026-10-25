import { MAIN_ORIGIN, RUNTIME_ORIGIN, isEmployeePage } from './workspace-authority.mjs';
/** One route-derived mode for the shell, selector and sidebar. */
export function workspaceModeForPath(pathname = '') {
  if (/^\/hivemind\/app\/tara(?:\/|$)/.test(pathname)) return 'tara';
  if (/^\/hivemind\/app\/(?:employee\/(?:harness|dots|create|apps|library)|employees)(?:\/|$)/.test(pathname) || pathname === '/hivemind/app/crm') return 'hyperagents';
  return 'hivemind';
}

/** Navigate each workspace to its owning service; retain local/native app routing. */
export function workspaceModeDestination(pathname, currentOrigin) {
  const workspaceOrigin = 'https://next.singulancelabs.com';
  const runtimeOrigin = 'https://runtime-runner.singulancelabs.com';
  if (![workspaceOrigin, runtimeOrigin].includes(currentOrigin)) return pathname;
  const targetOrigin = workspaceModeForPath(pathname.split(/[?#]/)[0]) === 'hyperagents' ? runtimeOrigin : workspaceOrigin;
  return currentOrigin === targetOrigin ? pathname : `${targetOrigin}${pathname}`;
}

/**
 * Runtime-owned destination of an in-app link followed on the Brain host. Document authority
 * (workspace-authority.mjs) gives the Runtime host only employee pages (rooms, Library, Apps), so a
 * client-side route to one of them on next.singulancelabs.com must become a page load there.
 * @param {string} href - The link's resolved href.
 * @param {string} currentOrigin - The page's origin.
 * @returns {string | null} The Runtime URL to load, or null when the link may route in place.
 */
export function runtimeHostLink(href, currentOrigin) {
  let url;
  try { url = new URL(href, currentOrigin); } catch { return null; }
  if (url.origin !== currentOrigin) return null;
  return currentOrigin === MAIN_ORIGIN && isEmployeePage(url.pathname) ? `${RUNTIME_ORIGIN}${url.pathname}${url.search}${url.hash}` : null;
}

/** Reopening Apps preserves the original employee return destination. */
export function employeeAppsPath(location) {
  const apps = '/hivemind/app/employee/apps';
  if (location.pathname.replace(/\/+$/, '') === apps) return apps + (location.search || '');
  return `${apps}?return_to=${encodeURIComponent(location.pathname + (location.search || ''))}`;
}
