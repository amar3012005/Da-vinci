/**
 * Language detection settings shared by the Brain shell (next.singulancelabs.com) and the Runtime shell (runtime-runner.singulancelabs.com).
 * localStorage is per origin, so a language chosen on one host never reached the other: opening an employee room moved the person to the
 * Runtime host, which started in English. A cookie on the parent domain is the one place both hosts read.
 */
const SHARED_DOMAIN = 'singulancelabs.com';
export const LANGUAGE_COOKIE = 'hivemind_lang';

/**
 * @param {string} [hostname] - `location.hostname` of the current document.
 * @param {string} [protocol] - `location.protocol` of the current document.
 * @returns {object} The `detection` option for i18next-browser-languagedetector: the shared cookie first, then this origin's storage.
 */
export function languageDetection(hostname = '', protocol = '') {
  const shared = hostname === SHARED_DOMAIN || hostname.endsWith(`.${SHARED_DOMAIN}`);
  return {
    order: ['cookie', 'localStorage', 'navigator', 'htmlTag'],
    caches: ['cookie', 'localStorage'],
    lookupCookie: LANGUAGE_COOKIE,
    lookupLocalStorage: 'hivemind:lang',
    cookieMinutes: 60 * 24 * 365,
    // Without a domain the cookie stays on this host (local development, previews), which is all those can share.
    ...(shared ? { cookieDomain: `.${SHARED_DOMAIN}` } : {}),
    cookieOptions: { path: '/', sameSite: 'lax', ...(protocol === 'https:' ? { secure: true } : {}) },
  };
}
