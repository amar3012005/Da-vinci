export const CONSENT_COOKIE = 'singulance_cookie_consent_v1';
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = 'singulance:consent-changed';
export const OPEN_CONSENT_EVENT = 'singulance:open-cookie-preferences';

const YEAR_SECONDS = 60 * 60 * 24 * 365;

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
  const row = document.cookie.split('; ').find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  if (!row) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(row.slice(CONSENT_COOKIE.length + 1)));
    if (parsed?.version !== CONSENT_VERSION || !parsed?.decidedAt) return null;
    return { ...defaultChoices(), ...parsed, necessary: true };
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

