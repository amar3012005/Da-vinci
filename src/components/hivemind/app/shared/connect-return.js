/**
 * Where a person lands after authorizing an app at the provider.
 *
 * Providers redirect to a public https page (`/hivemind/connect-return`). That
 * page works without a session, so a desktop or mobile app whose consent ran in
 * the system browser can hand the person back with a `singulance://` link. The
 * app then reloads the page the person started from.
 */

export const CONNECT_RETURN_PATH = '/hivemind/connect-return';
export const CONNECT_RETURN_SCHEME = 'singulance://connect-return';
export const PRODUCT_ORIGIN = 'https://next.singulancelabs.com';
const FALLBACK_RETURN = '/hivemind/app/connectors';

/** @returns {string} a same-origin app path, or the Connectors page when `value` is anything else */
export function safeReturnPath(value, fallback = FALLBACK_RETURN) {
  const path = typeof value === 'string' ? value.trim() : '';
  if (!/^\/hivemind\/(app|m)(\/|\?|$)/.test(path) || path.includes('\\') || path.startsWith('//')) return fallback;
  return path;
}

/** @returns {'desktop'|'native'|'web'} the app container the connect started in */
export function connectClient(browser = typeof window === 'undefined' ? null : window) {
  if (browser?.electron?.isElectron === true) return 'desktop';
  try { if (browser?.Capacitor?.isNativePlatform?.() === true) return 'native'; } catch { /* no bridge */ }
  return 'web';
}

/**
 * The callback URL passed to the connect endpoint. It always names a public
 * first-party https origin: a Capacitor webview origin is not reachable from a
 * provider redirect.
 */
export function connectReturnUrl({ origin, toolkit, returnPath, client = 'web' }) {
  const base = /^https:\/\//.test(origin || '') ? origin : PRODUCT_ORIGIN;
  const url = new URL(CONNECT_RETURN_PATH, base);
  url.searchParams.set('composio_toolkit', toolkit);
  url.searchParams.set('return', safeReturnPath(returnPath));
  if (client !== 'web') url.searchParams.set('client', client);
  return url.toString();
}

/** @returns {string} the app path (with the provider's result as query parameters) to load after connecting */
export function returnTarget({ toolkit, status, connectedAccountId, returnPath }) {
  const target = new URL(safeReturnPath(returnPath), 'https://app.invalid');
  if (toolkit) target.searchParams.set('composio_toolkit', toolkit);
  if (status) target.searchParams.set('status', status);
  if (connectedAccountId) target.searchParams.set('connected_account_id', connectedAccountId);
  return `${target.pathname}${target.search}`;
}

/** Reads the provider's result from the landing page's query string. */
export function parseConnectReturn(search) {
  const params = new URLSearchParams(search);
  const connectedAccountId = params.get('connected_account_id') || params.get('connectedAccountId') || '';
  return {
    toolkit: params.get('composio_toolkit') || '',
    status: params.get('status') || (connectedAccountId ? 'success' : ''),
    connectedAccountId,
    returnPath: safeReturnPath(params.get('return')),
    client: ['desktop', 'native'].includes(params.get('client')) ? params.get('client') : 'web',
  };
}

/** The deep link that returns the system browser to the desktop or mobile app. */
export function appReturnLink(result) {
  const url = new URL(CONNECT_RETURN_SCHEME);
  if (result.toolkit) url.searchParams.set('composio_toolkit', result.toolkit);
  if (result.status) url.searchParams.set('status', result.status);
  if (result.connectedAccountId) url.searchParams.set('connected_account_id', result.connectedAccountId);
  url.searchParams.set('return', safeReturnPath(result.returnPath));
  return url.toString();
}

/** @returns {string|null} the app path to load for a `singulance://connect-return` link, or null for any other URL */
export function targetFromAppLink(link) {
  let url;
  try { url = new URL(link); } catch { return null; }
  if (url.protocol !== 'singulance:' || url.hostname !== 'connect-return' || url.username || url.password) return null;
  const result = parseConnectReturn(url.search);
  return returnTarget(result);
}

/**
 * Listens for the return deep link in the desktop app (Electron preload) and
 * the mobile app (Capacitor) and loads the starting page, which reloads its
 * connection list. Returns the unsubscribe function.
 */
export function bindConnectReturnLinks({ browser = window, load = (path) => browser.location.assign(path), capacitorApp = null } = {}) {
  const handle = (link) => { const target = targetFromAppLink(link); if (target) load(target); };
  const disposers = [];
  const off = browser.electron?.onDeepLink?.(handle);
  if (typeof off === 'function') disposers.push(off);
  let cancelled = false;
  if (capacitorApp) {
    Promise.resolve(capacitorApp.addListener('appUrlOpen', ({ url }) => handle(url)))
      .then((listener) => { if (cancelled) listener.remove(); else disposers.push(() => listener.remove()); })
      .catch(() => { /* no native bridge in this container */ });
  }
  return () => { cancelled = true; disposers.forEach((dispose) => dispose()); };
}
