import { isNativeApp } from './native-app';

/** Published list of the newest app versions; static file served with `cache-control: no-store`. */
export const APP_VERSIONS_URL = '/app-versions.json';
const DISMISS_PREFIX = 'hm:update-dismissed:';
const POLL_MS = 10 * 60 * 1000;

/**
 * Which build this document runs in.
 * @param {object} [win] - window-like object.
 * @returns {'macos'|'ios'|'web'} `macos` for the Electron app, `ios` for the packaged Capacitor app, `web` otherwise.
 */
export function detectPlatform(win = typeof window === 'undefined' ? {} : window) {
  if (win.electron?.isElectron) return 'macos';
  if (isNativeApp(win)) return 'ios';
  return 'web';
}

/**
 * Compares dotted numeric versions; non-numeric parts count as 0.
 * @param {string} a - first version.
 * @param {string} b - second version.
 * @returns {number} negative when `a` is older than `b`, 0 when equal, positive when newer.
 */
export function compareVersions(a, b) {
  const parts = value => String(value ?? '').split(/[.+-]/).map(part => Number.parseInt(part, 10) || 0);
  const left = parts(a);
  const right = parts(b);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

/** Content-hashed main bundle path (`/static/js/main.<hash>.js`) of a CRA `asset-manifest.json`, or `''`. */
export function mainBundleFromManifest(manifest) {
  const file = manifest?.files?.['main.js'] ?? manifest?.files?.main;
  return typeof file === 'string' && /main\.[a-z0-9]+\.js/i.test(file) ? file.replace(/^.*(\/static\/js\/main\.[a-z0-9]+\.js).*$/i, '$1') : '';
}

/** Main bundle path of the running document, read from its script tags (`''` in development builds). */
export function runningMainBundle(doc = typeof document === 'undefined' ? null : document) {
  const scripts = [...(doc?.scripts || [])];
  const match = scripts.map(script => script.getAttribute?.('src') || script.src || '').find(src => /\/static\/js\/main\.[a-z0-9]+\.js/i.test(src));
  return match ? match.replace(/^.*(\/static\/js\/main\.[a-z0-9]+\.js).*$/i, '$1') : '';
}

/**
 * Decides what the update control offers.
 * @param {object} input - `platform`; `running` (`{version, build}` of the packaged iOS app); `published` (parsed app-versions.json);
 *   `desktop` (`{state, version, percent}` from Electron); `webBundle` (`{running, latest}` main bundle paths).
 * @returns {null|{kind: string, version: string, percent?: number, url?: string}} `null` when up to date, otherwise
 *   `kind` is `reload` (web), `install`/`download` (macOS) or `store` (iOS).
 */
export function decideUpdate({ platform, running = {}, published = null, desktop = null, webBundle = null } = {}) {
  if (platform === 'macos') {
    const state = desktop?.state ?? desktop?.status;
    if (state === 'downloaded') return { kind: 'install', version: String(desktop.version || published?.macos?.version || '') };
    if (state === 'downloading') return { kind: 'download', version: String(desktop.version || ''), percent: Math.max(0, Math.min(100, Math.round(Number(desktop.percent) || 0))) };
    return null;
  }
  if (platform === 'ios') {
    const latest = published?.ios;
    if (!latest?.version || typeof latest.url !== 'string' || !/^https:\/\//.test(latest.url)) return null;
    const newer = compareVersions(latest.version, running.version) > 0
      || (compareVersions(latest.version, running.version) === 0 && Number(latest.build) > Number(running.build));
    return newer ? { kind: 'store', version: `${latest.version}${latest.build ? ` (${latest.build})` : ''}`, url: latest.url } : null;
  }
  if (webBundle?.running && webBundle?.latest && webBundle.running !== webBundle.latest) {
    const hash = webBundle.latest.match(/main\.([a-z0-9]+)\.js/i)?.[1] || webBundle.latest;
    return { kind: 'reload', version: hash };
  }
  return null;
}

/** True when this update version was dismissed in this browser. Storage failures count as not dismissed. */
export function isDismissed(version, storage = typeof window === 'undefined' ? null : window.localStorage) {
  try { return storage?.getItem(DISMISS_PREFIX + version) === '1'; } catch { return false; }
}

/** Remembers that the person dismissed this update version; storage failures are ignored. */
export function rememberDismissal(version, storage = typeof window === 'undefined' ? null : window.localStorage) {
  try { storage?.setItem(DISMISS_PREFIX + version, '1'); } catch { /* Private mode: the card simply opens again next load. */ }
}

/** Fetches a JSON document bypassing every cache; resolves to `null` on any failure. */
export async function fetchFresh(url, fetchImpl = typeof fetch === 'undefined' ? null : fetch) {
  try {
    const response = await fetchImpl(url, { cache: 'no-store', credentials: 'omit' });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

/**
 * Update state shared by every mounted control: one poll for the whole document.
 * @param {object} [env] - `win`, `doc`, `fetch`, `appInfo` (async `{version, build}` of the packaged app) for tests.
 * @returns {{ subscribe: Function, snapshot: Function, refresh: Function }} external store.
 */
export function createUpdateStore(env = {}) {
  const win = env.win || (typeof window === 'undefined' ? {} : window);
  const doc = env.doc || (typeof document === 'undefined' ? null : document);
  const listeners = new Set();
  let state = { update: null, platform: detectPlatform(win), running: {} };
  let timer = null;
  let offDesktop = null;
  let desktop = null;
  let published = null;
  let latestBundle = '';
  const emit = () => {
    const next = { ...state, update: decideUpdate({
      platform: state.platform, running: state.running, published, desktop,
      webBundle: { running: runningMainBundle(doc), latest: latestBundle },
    }) };
    if (JSON.stringify(next) !== JSON.stringify(state)) { state = next; listeners.forEach(listener => listener()); }
  };
  const refresh = async () => {
    const fetchImpl = env.fetch || (typeof fetch === 'undefined' ? null : fetch.bind(win));
    if (state.platform === 'web') latestBundle = mainBundleFromManifest(await fetchFresh('/asset-manifest.json', fetchImpl));
    else {
      published = await fetchFresh(APP_VERSIONS_URL, fetchImpl);
      if (state.platform === 'macos') win.electron?.checkForUpdates?.();
    }
    emit();
  };
  const start = async () => {
    if (state.platform === 'macos' && typeof win.electron?.onUpdateStatus === 'function') {
      offDesktop = win.electron.onUpdateStatus(status => { desktop = status; emit(); });
    }
    if (state.platform === 'ios') {
      try { state = { ...state, running: await (env.appInfo || (async () => (await import('@capacitor/app')).App.getInfo()))() }; } catch { /* No version: the store link is not offered. */ }
    }
    await refresh();
    timer = setInterval(refresh, POLL_MS);
    win.addEventListener?.('focus', refresh);
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) void start();
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { clearInterval(timer); win.removeEventListener?.('focus', refresh); if (typeof offDesktop === 'function') offDesktop(); offDesktop = null; }
      };
    },
    snapshot: () => state,
    refresh,
  };
}

let sharedStore = null;
/** The document-wide update store. */
export function sharedUpdateStore() { return sharedStore || (sharedStore = createUpdateStore()); }
