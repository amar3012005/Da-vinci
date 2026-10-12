/** Employee rooms use native Harness on every device; Brain has its own mobile route. */
export function isEmployeeHarnessRoute(pathname) {
  return /^\/hivemind\/app\/employee\/harness(?:\/|$)/u.test(pathname);
}

/** Mobile Brain can occupy Overview without mounting native agent navigation. */
export function needsAgentHarnessNavigation(pathname, startAgent) {
  if (isEmployeeHarnessRoute(pathname)) return false;
  const overview = /^\/hivemind\/app\/overview(?:\/|$)/u.test(pathname);
  return !overview || typeof startAgent !== 'function';
}
