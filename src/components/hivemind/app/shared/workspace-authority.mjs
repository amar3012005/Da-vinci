export const MAIN_ORIGIN = 'https://next.singulancelabs.com';
export const RUNTIME_ORIGIN = 'https://runtime-runner.singulancelabs.com';
export function isEmployeePage(path) {
  return /^\/hivemind\/app\/employee(?:\/|$)/.test(path);
}
// Only document navigation changes authority. Transport, assets and OAuth
// callback endpoints retain their existing owners.
export function workspaceDocumentRedirect(input) {
  const url = new URL(input);
  if (url.origin !== RUNTIME_ORIGIN) return null;
  if (isEmployeePage(url.pathname) || url.pathname === '/hivemind/apps/connected') return null;
  if (url.pathname !== '/' && !/^\/hivemind(?:\/|$)/.test(url.pathname)) return null;
  url.host = new URL(MAIN_ORIGIN).host;
  url.searchParams.delete('native_pane');
  if (url.pathname === '/' || url.pathname === '/hivemind') url.pathname = '/hivemind/app/overview/new';
  return url.href;
}
export function runtimeLoginUrl(input) {
  const target = new URL(input);
  const login = new URL('/hivemind/login', MAIN_ORIGIN);
  if (target.origin === RUNTIME_ORIGIN && isEmployeePage(target.pathname)) {
    target.searchParams.delete('native_pane');
    login.searchParams.set('runtime_return_to', target.href);
  }
  return login.href;
}
export function trustedRuntimeReturn(search) {
  try {
    const value = new URLSearchParams(search).get('runtime_return_to');
    if (!value) return null;
    const target = new URL(value);
    if (target.origin !== RUNTIME_ORIGIN || target.username || target.password || !isEmployeePage(target.pathname)) return null;
    target.searchParams.delete('native_pane');
    target.searchParams.set('auth', 'callback');
    return target.href;
  } catch { return null; }
}
