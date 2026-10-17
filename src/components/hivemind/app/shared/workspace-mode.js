/** One route-derived mode for the shell, selector and sidebar. */
export function workspaceModeForPath(pathname = '') {
  if (/^\/hivemind\/app\/tara(?:\/|$)/.test(pathname)) return 'tara';
  if (/^\/hivemind\/app\/(?:employee\/(?:harness|dots|create|apps)|employees)(?:\/|$)/.test(pathname) || pathname === '/hivemind/app/crm') return 'hyperagents';
  return 'hivemind';
}

/** The outer shell stays put; isolated native panes retain runner ownership. */
export function workspaceModeDestination(pathname, currentOrigin) {
  const brainOrigin = 'https://next.singulancelabs.com';
  const runtimeOrigin = 'https://runtime-runner.singulancelabs.com';
  if (![brainOrigin, runtimeOrigin].includes(currentOrigin)) return pathname;
  const mode = workspaceModeForPath(pathname);
  if (mode === 'hyperagents' || mode === 'hivemind') return pathname;
  const owner = mode === 'hyperagents' ? runtimeOrigin : brainOrigin;
  return owner === currentOrigin ? pathname : `${owner}${pathname}`;
}
