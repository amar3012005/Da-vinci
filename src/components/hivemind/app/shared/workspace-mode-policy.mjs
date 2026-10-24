/**
 * Canonical form used for workspace-mode path decisions. The SPA router matches
 * routes case-insensitively, so the gate compares on a decoded, lowercased path
 * with repeated slashes collapsed.
 * @param {string} pathname Request or router pathname.
 * @returns {string} The normalized pathname.
 */
export function normalizeWorkspacePath(pathname = '') {
  let path = String(pathname ?? '');
  for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(path); i++) {
    try { path = decodeURIComponent(path); } catch { break; } // Malformed escapes keep the last decodable form; the comparison below still runs.
  }
  return path.replace(/\\/g, '/').replace(/\/{2,}/g, '/').toLowerCase();
}
/** Company onboarding is available to every signed-in account, independently of optional modes. */
export function isCompanyOnboardingPath(pathname = '') {
  return /^\/hivemind\/app\/employees(?:\/mycompany)?\/?$/.test(normalizeWorkspacePath(pathname));
}
export function requiresWorkspaceModeAccess(pathname = '') {
  return !isCompanyOnboardingPath(pathname) && /^\/hivemind\/app\/(?:employee(?:\/|$)|employees(?:\/|$)|crm(?:\/|$)|tara(?:\/|$))/.test(normalizeWorkspacePath(pathname));
}
