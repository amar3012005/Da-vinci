/** Employee rooms use native Harness on every device; Brain has its own mobile route. */
export function isEmployeeHarnessRoute(pathname) {
  return /^\/hivemind\/app\/employee\/harness(?:\/|$)/u.test(pathname);
}
