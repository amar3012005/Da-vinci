/** Company onboarding is available to every signed-in account, independently of optional modes. */
export function isCompanyOnboardingPath(pathname = '') {
  return /^\/hivemind\/app\/employees(?:\/mycompany)?\/?$/.test(pathname);
}
export function requiresWorkspaceModeAccess(pathname = '') {
  return !isCompanyOnboardingPath(pathname) && /^\/hivemind\/app\/(?:employee(?:\/|$)|employees(?:\/|$)|crm(?:\/|$)|tara(?:\/|$))/.test(pathname);
}
