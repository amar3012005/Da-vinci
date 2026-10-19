import {isCompanyOnboardingPath} from './workspace-mode-policy.mjs';
/** One route-derived mode for the shell, selector and sidebar. */
export function workspaceModeForPath(pathname = '') {
  if (/^\/hivemind\/app\/tara(?:\/|$)/.test(pathname)) return 'tara';
  if (/^\/hivemind\/app\/(?:employee\/(?:harness|dots|create|apps)|employees)(?:\/|$)/.test(pathname) || pathname === '/hivemind/app/crm') return 'hyperagents';
  return 'hivemind';
}

/** Each workspace mode opens on its owning production frontend origin. */
export function workspaceModeDestination(pathname, currentOrigin) {
  const brainOrigin = 'https://next.singulancelabs.com';
  const runtimeOrigin = 'https://runtime-runner.singulancelabs.com';
  if (![brainOrigin, runtimeOrigin].includes(currentOrigin)) return pathname;
  const mode = workspaceModeForPath(pathname);
  const owner = mode === 'hyperagents' && !isCompanyOnboardingPath(pathname) ? runtimeOrigin : brainOrigin;
  return owner === currentOrigin ? pathname : `${owner}${pathname}`;
}

/** Reopening Apps preserves the original employee return destination. */
export function employeeAppsPath(location) {
  const apps = '/hivemind/app/employee/apps';
  if (location.pathname.replace(/\/+$/, '') === apps) return apps + (location.search || '');
  return `${apps}?return_to=${encodeURIComponent(location.pathname + (location.search || ''))}`;
}
