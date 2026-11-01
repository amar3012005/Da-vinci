// The sidebar shell's last confirmed session bootstrap, kept for this browser tab so a reload of the page draws the sidebar at once while the
// real bootstrap refreshes in the background. Display data only: secrets are removed before anything is stored, the entry is read back only for
// the identity the host page named, and the live bootstrap still decides whether the session is valid.
const SECRET_KEY = /(api[_-]?key|token|secret|password|authorization|cookie|credential|session_)/i;
const MAX_BYTES = 32 * 1024;

function tabStorage() {
  try { return window.sessionStorage; } catch { return null; }
}

const keyFor = () => `hm.shell.bootstrap:${window.location.origin}`;

/**
 * Copy of a bootstrap payload without secret-looking fields at any depth.
 * @param {unknown} value - Bootstrap payload or a part of it.
 * @returns {unknown} Same data minus secrets.
 */
export function stripSecrets(value) {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([name]) => !SECRET_KEY.test(name)).map(([name, inner]) => [name, stripSecrets(inner)]));
  }
  return value;
}

/**
 * Remember a confirmed bootstrap for this tab.
 * @param {object} data - Bootstrap payload (an authenticated one).
 * @param {Storage | null} [storage] - Tab storage; defaults to sessionStorage.
 * @returns {void}
 */
export function writeShellBootstrap(data, storage = tabStorage()) {
  if (!storage || !data?.user?.id || !data?.organization?.id) return;
  try {
    const text = JSON.stringify({ user: stripSecrets(data.user), organization: stripSecrets(data.organization), onboarding: stripSecrets(data.onboarding ?? null), connectivity: stripSecrets(data.connectivity ?? null), client_support: stripSecrets(data.client_support ?? []) });
    if (text.length <= MAX_BYTES) storage.setItem(keyFor(), text);
  } catch { /* A full or blocked store only costs the next instant draw. */ }
}

/**
 * Forget this tab's bootstrap (signed out, or the session was rejected).
 * @param {Storage | null} [storage] - Tab storage.
 * @returns {void}
 */
export function clearShellBootstrap(storage = tabStorage()) {
  try { storage?.removeItem(keyFor()); } catch { /* Nothing to remove when storage is blocked. */ }
}

/**
 * The cached bootstrap, only for the identity the host page named.
 * @param {{ userId?: string, organizationId?: string } | undefined} identity - Identity the host verified.
 * @param {Storage | null} [storage] - Tab storage.
 * @returns {{ user: object, organization: object, onboarding: object | null, connectivity: object | null, client_support: string[] } | null} The cached data, or null.
 */
export function readShellBootstrap(identity, storage = tabStorage()) {
  if (!storage || !identity?.userId || !identity?.organizationId) return null;
  try {
    const raw = storage.getItem(keyFor());
    const value = raw ? JSON.parse(raw) : null;
    if (value?.user?.id !== identity.userId || value?.organization?.id !== identity.organizationId) return null;
    return { user: value.user, organization: value.organization, onboarding: value.onboarding ?? null, connectivity: value.connectivity ?? null, client_support: Array.isArray(value.client_support) ? value.client_support : [] };
  } catch { return null; }
}
