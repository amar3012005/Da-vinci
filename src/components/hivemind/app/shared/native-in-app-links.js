import { isNativeApp } from './native-app';

/** Hosts whose `/hivemind/` pages the packaged app shows itself instead of handing them to Safari. */
export const PRODUCT_HOSTS = new Set(['next.singulancelabs.com', 'runtime-runner.singulancelabs.com', 'singulancelabs.com', 'www.singulancelabs.com']);

/**
 * The packaged app's own path for a product page link.
 * @param {string|URL} href - absolute or relative link.
 * @param {{ native?: boolean, base?: string }} [options] - whether this is the packaged app (default: detected) and the base for relative links.
 * @returns {string|null} `/hivemind/...` path with query and hash, or null when the link is not a product page or this is not the packaged app.
 */
export function inAppPath(href, { native = isNativeApp(), base = 'https://next.singulancelabs.com' } = {}) {
  if (!native || !href) return null;
  let url;
  try { url = new URL(String(href), base); } catch { return null; }
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !PRODUCT_HOSTS.has(url.hostname)) return null;
  if (!url.pathname.startsWith('/hivemind/')) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Navigate to a product page: inside the packaged app by router path, otherwise as a document navigation.
 * @param {string} href - destination.
 * @param {(path: string) => void} [navigate] - router navigation; defaults to the one bound by {@link bindNativeInAppLinks}.
 * @returns {void}
 */
export function openProductPage(href, navigate = typeof window === 'undefined' ? undefined : window.__hmNativeNavigate) {
  const path = inAppPath(href);
  if (path && navigate) navigate(path);
  else window.location.assign(href);
}

/**
 * In the packaged app, product links (anchors to next., the Runtime host or the company site under `/hivemind/`) open
 * as app routes. The native shell calls `window.__hmNativeNavigate` for any other navigation to those pages.
 * @param {(path: string) => void} navigate - router navigation.
 * @param {Document} [doc] - document to listen on.
 * @returns {() => void} unbinds.
 */
export function bindNativeInAppLinks(navigate, doc = typeof document === 'undefined' ? null : document) {
  if (!doc || !isNativeApp()) return () => {};
  const click = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target?.closest?.('a[href]');
    const path = anchor ? inAppPath(anchor.getAttribute('href')) : null;
    if (!path || !/^https:/i.test(anchor.getAttribute('href'))) return;
    event.preventDefault();
    navigate(path);
  };
  doc.addEventListener('click', click, true);
  const view = doc.defaultView;
  if (view) view.__hmNativeNavigate = (path) => { const local = inAppPath(path, { native: true }); if (local) navigate(local); };
  return () => {
    doc.removeEventListener('click', click, true);
    if (view) delete view.__hmNativeNavigate;
  };
}
