import { useAuth } from '../auth/AuthProvider';
import { openDotEmployeePath } from './open-dot-employee-route';

/** Runtime's session lives under this route; HyperAgent employee rooms of the native Harness share it. */
export const RUNTIME_SESSION_PATH = '/hivemind/app/employee/harness';
/** Where a company without Runtime lands when no employee room can be opened: the team's own pages. */
export const TEAM_PAGE_PATH = '/hivemind/app/employee/apps';

/**
 * Whether the company has Runtime (its AI Chief of Staff).
 * Control sends `runtime_enabled` with the organization; anything but an explicit false keeps Runtime.
 * @param {{ runtime_enabled?: boolean } | null | undefined} org - The bootstrap organization.
 * @returns {boolean} False only when an owner or admin switched Runtime off.
 */
export function runtimeEnabledFor(org) {
  return org?.runtime_enabled !== false;
}

/**
 * Reads the setting where a signed-in company may be absent (previews and isolated surfaces have no AuthProvider).
 * @returns {boolean} Whether the signed-in company has Runtime; true without a signed-in company.
 */
export function useRuntimeEnabled() {
  let auth = null;
  try { auth = useAuth(); } catch { /* No AuthProvider above this surface: Runtime stays on. */ }
  return runtimeEnabledFor(auth?.org);
}

/**
 * @param {string} pathname - A router pathname.
 * @returns {boolean} True for the Runtime session route and everything under it.
 */
export function isRuntimeSessionPath(pathname = '') {
  return pathname === RUNTIME_SESSION_PATH || pathname.startsWith(`${RUNTIME_SESSION_PATH}/`);
}

/** Set while the viewer deliberately opened a native-Harness employee room, which shares the Runtime route. */
let employeeRoomOpen = false;
/** @param {boolean} open - Whether an employee room (not Runtime) is the reason the viewer is on the Runtime route. */
export function setEmployeeRoomOpen(open) { employeeRoomOpen = open; }

/**
 * Whether a company without Runtime may stay on this location.
 * Only an employee room opened from the roster, or a return link that names an employee, may use the route.
 * @param {{ pathname: string, search?: string }} location - The router location.
 * @returns {boolean} True when the route is not Runtime's session or it hosts an employee room.
 */
export function runtimeRouteAllowed(location) {
  if (!isRuntimeSessionPath(location.pathname)) return true;
  const employee = new URLSearchParams(location.search || '').get('employee');
  return employeeRoomOpen || Boolean(employee && employee !== 'runtime');
}

/**
 * Where to send a viewer who asked for Runtime in a company without it.
 * @param {Array<object> | undefined} roster - The cached employee roster, if known.
 * @returns {string} The first employee's room, or the team page.
 */
export function runtimeDisabledDestination(roster) {
  for (const employee of roster || []) {
    const path = openDotEmployeePath(employee);
    if (path) return path;
  }
  return TEAM_PAGE_PATH;
}
