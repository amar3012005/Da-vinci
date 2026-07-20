// Per-account browser-storage identity. Fixes the cross-account cache leak:
// chat history (desktop Chat, mobile Talk-to-HIVE, Overview) was stored under
// an 'anon' / unkeyed slot because nothing ever wrote `hivemind:user`, so a
// second account on the same device saw the first account's conversations.
//
// AuthProvider calls setStorageUser() on every auth resolution:
//   • same user  → no-op
//   • different user (or logout) → purge every user-scoped key first
// Pages derive their storage keys via userScopedKey(base).

const USER_KEY = 'hivemind:user';

// Prefixes owned by user-scoped features. Anything matching is purged on
// account switch/logout. App-level flags (theme, i18n, splash-seen) survive.
const SCOPED_PREFIXES = [
  'hivemind:talk-to-hive:',
  'hm.overviewChat',
];

export function getStorageUserId() {
  try {
    const raw = window.localStorage.getItem(USER_KEY) || '';
    if (!raw) return 'anon';
    if (raw.startsWith('{')) {
      const u = JSON.parse(raw);
      return u?.id || u?.user_id || u?.email || 'anon';
    }
    return raw;
  } catch { return 'anon'; }
}

export const userScopedKey = (base) => `${base}:${getStorageUserId()}`;

function purgeScopedKeys(storage) {
  try {
    const doomed = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k && SCOPED_PREFIXES.some((p) => k.startsWith(p))) doomed.push(k);
    }
    doomed.forEach((k) => storage.removeItem(k));
  } catch { /* private mode / blocked storage — nothing to purge */ }
}

export function clearUserScopedStorage() {
  purgeScopedKeys(window.localStorage);
  purgeScopedKeys(window.sessionStorage);
}

// Record the signed-in user. Returns true when the account CHANGED (caller
// may want to reset in-memory state too). Purges scoped storage on change so
// the next account never reads this one's conversations.
export function setStorageUser(user) {
  try {
    const nextId = user?.id || user?.user_id || user?.email || null;
    const prevId = getStorageUserId();
    if (!nextId) {
      clearUserScopedStorage();
      window.localStorage.removeItem(USER_KEY);
      return prevId !== 'anon';
    }
    if (prevId !== 'anon' && prevId !== nextId) clearUserScopedStorage();
    window.localStorage.setItem(USER_KEY, JSON.stringify({ id: nextId, email: user?.email || '' }));
    return prevId !== 'anon' && prevId !== nextId;
  } catch { return false; }
}
