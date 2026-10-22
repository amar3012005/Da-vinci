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

/** Reopening Apps preserves the original employee return destination. */
export function employeeAppsPath(location) {
  const apps = '/hivemind/app/employee/apps';
  if (location.pathname.replace(/\/+$/, '') === apps) return apps + (location.search || '');
  return `${apps}?return_to=${encodeURIComponent(location.pathname + (location.search || ''))}`;
}
