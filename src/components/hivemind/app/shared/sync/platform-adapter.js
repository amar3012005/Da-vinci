/**
 * PlatformAdapter: what the sync core needs from the shell it runs in.
 *
 * The web build uses browser defaults. The Capacitor shells (iOS, Android) implement the same methods in
 * their `SingulanceNative` plugin. Electron injects its adapter as `window.__HM_PLATFORM_ADAPTER__` from
 * its preload script before the frontend loads.
 *
 * @typedef {object} PlatformAdapter
 * @property {'web'|'capacitor'|'electron'|string} name - shell identifier, for diagnostics only.
 * @property {{ get: (key: string) => Promise<string|null>, set: (key: string, value: string) => Promise<void>, remove: (key: string) => Promise<void> }|null} tokenStore
 *   OS-protected session credential (Keychain, Android Keystore, Electron safeStorage); null on the web, where the session is an HttpOnly cookie.
 * @property {{ get: (key: string) => Promise<string|null>, set: (key: string, value: string) => Promise<void>, remove: (key: string) => Promise<void> }} prefs
 *   Small non-secret settings (cookie choice, language). Native shells keep them where an app reinstall or WebView data purge does not lose them.
 * @property {((employeeId: string) => Promise<void>)|null} openRoom - shows one employee room in a native view; null when rooms render in the page.
 * @property {(() => Promise<void>)|null} closeRoom - closes the native room without a `roomClosed` event; null with `openRoom`.
 * @property {() => Promise<{ enabled: boolean }>} workspaceAccess - workspace-mode verdict for the signed-in account.
 * @property {(listener: () => void) => () => void} onForeground - calls `listener` whenever the app returns to the foreground or the network returns; returns the unsubscribe function.
 * @property {(notice: { title: string, body?: string, tag?: string }) => Promise<void>} notify - shows a local notification when allowed; resolves without effect otherwise.
 */

import { App } from '@capacitor/app';
import { isNativeApp } from '../native-app';
import { nativePlugin } from '../native-auth';

/** Preference keys the native shells accept. Any other key is refused by the native side. */
export const NATIVE_PREFERENCE_KEYS = Object.freeze(['privacyChoice']);

function localPrefs(storage) {
  return {
    async get(key) { try { return storage?.getItem(key) ?? null; } catch { return null; } },
    async set(key, value) { try { storage?.setItem(key, value); } catch { /* Blocked storage keeps the choice for this page only. */ } },
    async remove(key) { try { storage?.removeItem(key); } catch { /* Blocked storage has nothing to remove. */ } },
  };
}

function browserForeground(target) {
  return (listener) => {
    if (!target?.addEventListener) return () => {};
    const visible = () => { if (target.document?.visibilityState !== 'hidden') listener(); };
    target.addEventListener('online', listener);
    target.document?.addEventListener('visibilitychange', visible);
    return () => {
      target.removeEventListener('online', listener);
      target.document?.removeEventListener('visibilitychange', visible);
    };
  };
}

/**
 * Browser defaults.
 * @param {{ window?: Window, fetch?: typeof fetch }} [deps] - globals; injectable for tests.
 * @returns {PlatformAdapter} adapter.
 */
export function webPlatformAdapter({ window: target = typeof window === 'undefined' ? undefined : window, fetch: fetchImpl = typeof fetch === 'undefined' ? undefined : fetch } = {}) {
  let storage = null;
  try { storage = target?.localStorage ?? null; } catch { storage = null; }
  return {
    name: 'web',
    tokenStore: null,
    prefs: localPrefs(storage),
    openRoom: null,
    closeRoom: null,
    async workspaceAccess() {
      const response = await fetchImpl('/__hivemind/account-mode-access', { credentials: 'include', cache: 'no-store' });
      const body = response.ok ? await response.json() : null;
      if (typeof body?.enabled !== 'boolean') throw new Error('workspace_access_unavailable');
      return { enabled: body.enabled };
    },
    onForeground: browserForeground(target),
    async notify({ title, body, tag }) {
      const Notice = target?.Notification;
      if (!Notice || Notice.permission !== 'granted' || target.document?.visibilityState === 'visible') return;
      try { new Notice(title, { body, tag }); } catch { /* Notifications are best effort. */ }
    },
  };
}

/**
 * Capacitor shells (iOS and Android) backed by the `SingulanceNative` plugin and `@capacitor/app`.
 * Preferences are mirrored: localStorage answers at once, the native store survives WebView data loss and,
 * on iOS, app reinstall. A shell without the preference methods leaves the localStorage copy as the only one.
 * @param {{ plugin: object, app?: { addListener: Function }, window?: Window }} deps - native plugin, Capacitor App plugin and globals.
 * @returns {PlatformAdapter} adapter.
 */
export function capacitorPlatformAdapter({ plugin, app = null, window: target = typeof window === 'undefined' ? undefined : window }) {
  const web = webPlatformAdapter({ window: target });
  const nativePref = (key) => NATIVE_PREFERENCE_KEYS.includes(key);
  return {
    name: 'capacitor',
    tokenStore: {
      async get(key) { return (await plugin.getCredential({ key }))?.value ?? null; },
      async set(key, value) { await plugin.setCredential({ key, value }); },
      async remove(key) { await plugin.removeCredential({ key }); },
    },
    prefs: {
      async get(key) {
        const local = await web.prefs.get(key);
        if (local !== null || !nativePref(key)) return local;
        try {
          const value = (await plugin.getPreference({ key }))?.value ?? null;
          if (value !== null) await web.prefs.set(key, value);
          return value;
        } catch { return null; }
      },
      async set(key, value) {
        await web.prefs.set(key, value);
        if (nativePref(key)) await plugin.setPreference({ key, value }).catch(() => { /* Older shells keep only the WebView copy. */ });
      },
      async remove(key) {
        await web.prefs.remove(key);
        if (nativePref(key)) await plugin.removePreference({ key }).catch(() => { /* Older shells keep only the WebView copy. */ });
      },
    },
    async openRoom(employeeId) { await plugin.openRoom({ path: `/employees/${employeeId}` }); },
    async closeRoom() { await plugin.closeRoom(); },
    async workspaceAccess() {
      const result = await plugin.workspaceAccess();
      if (result?.status !== 200 || typeof result.enabled !== 'boolean') throw new Error('workspace_access_unavailable');
      return { enabled: result.enabled };
    },
    onForeground(listener) {
      const stopWeb = web.onForeground(listener);
      let handle = null;
      let stopped = false;
      Promise.resolve(app?.addListener?.('appStateChange', (state) => { if (state?.isActive) listener(); }))
        .then((registered) => { if (stopped) registered?.remove?.(); else handle = registered; })
        .catch(() => { /* The visibility listener still covers foreground returns. */ });
      return () => { stopped = true; stopWeb(); handle?.remove?.(); };
    },
    notify: web.notify,
  };
}

let current = null;

/**
 * The adapter for this shell: an Electron-injected adapter, the Capacitor adapter, or browser defaults.
 * @returns {PlatformAdapter} adapter, created once per page.
 */
export function getPlatformAdapter() {
  if (current) return current;
  const injected = typeof window !== 'undefined' ? window.__HM_PLATFORM_ADAPTER__ : null;
  if (injected) current = injected;
  else if (isNativeApp()) current = capacitorPlatformAdapter({ plugin: nativePlugin, app: App });
  else current = webPlatformAdapter();
  return current;
}

/**
 * Replace the adapter (tests, or a shell that installs its adapter after load).
 * @param {PlatformAdapter|null} adapter - adapter; null restores detection on the next read.
 * @returns {void}
 */
export function setPlatformAdapter(adapter) { current = adapter; }
