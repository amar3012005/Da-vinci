export const CONSENT_COOKIE = 'singulance_cookie_consent_v1';
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = 'singulance:consent-changed';
export const OPEN_CONSENT_EVENT = 'singulance:open-cookie-preferences';

const YEAR_SECONDS = 60 * 60 * 24 * 365;
/** Packaged-app copy of the choice: the WebView keeps no cookies for its own origin, so the choice lives in app storage. */
export const NATIVE_CONSENT_KEY = 'privacyChoice';

function packagedApp() {
  try { return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true; } catch { return false; }
}

function parseChoice(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CONSENT_VERSION || !parsed?.decidedAt) return null;
    return { ...defaultChoices(), ...parsed, necessary: true };
  } catch {
    return null;
  }
}

function localChoice() {
  try { return parseChoice(window.localStorage.getItem(`singulance:${NATIVE_CONSENT_KEY}`)); } catch { return null; }
}

const defaultChoices = () => ({
  version: CONSENT_VERSION,
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
  decidedAt: null,
});

export function readConsent() {
  if (typeof document === 'undefined') return null;
  if (packagedApp()) return localChoice();
  const row = document.cookie.split('; ').find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  if (!row) return null;
  try { return parseChoice(decodeURIComponent(row.slice(CONSENT_COOKIE.length + 1))); } catch { return null; }
}

/**
 * Packaged app only: the choice kept by the native shell (Keychain on iOS), which survives a reinstall. A found choice is
 * copied to the WebView so later reads are synchronous.
 * @returns {Promise<object|null>} the stored choice, or null on the web, before a choice, or with an older shell.
 */
export async function restoreConsent() {
  if (!packagedApp()) return null;
  const local = localChoice();
  if (local) return local;
  try {
    const { getPlatformAdapter } = await import('../components/hivemind/app/shared/sync/platform-adapter');
    const raw = await getPlatformAdapter().prefs.get(NATIVE_CONSENT_KEY);
    const choice = raw ? parseChoice(raw) : null;
    if (choice) window.localStorage.setItem(`singulance:${NATIVE_CONSENT_KEY}`, JSON.stringify(choice));
    return choice;
  } catch {
    return null;
  }
}

export function writeConsent(choices) {
  if (typeof document === 'undefined') return;
  const value = {
    ...defaultChoices(),
    ...choices,
    version: CONSENT_VERSION,
    necessary: true,
    decidedAt: new Date().toISOString(),
  };
  if (packagedApp()) {
    const raw = JSON.stringify(value);
    try { window.localStorage.setItem(`singulance:${NATIVE_CONSENT_KEY}`, raw); } catch { /* The native copy below still keeps it. */ }
    import('../components/hivemind/app/shared/sync/platform-adapter')
      .then(({ getPlatformAdapter }) => getPlatformAdapter().prefs.set(NATIVE_CONSENT_KEY, raw))
      .catch(() => { /* An older shell keeps the WebView copy only. */ });
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
    return;
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${YEAR_SECONDS}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

export function hasConsent(category) {
  if (category === 'necessary') return true;
  return readConsent()?.[category] === true;
}

export function openCookiePreferences() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

