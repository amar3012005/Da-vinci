export const RUNTIME_ORIGIN = 'https://runtime-runner.singulancelabs.com';
export const DOT_APPS = `${RUNTIME_ORIGIN}/apps`;
export function dotAppsUrl(search = '', hash = '') {
  // Do not parse/re-serialize OAuth callback fields: their exact query survives.
  return DOT_APPS + (search.startsWith('?') ? search : search ? `?${search}` : '') + hash;
}
export function runtimeNavigation(to) {
  const raw = typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}${to.hash || ''}`;
  const url = new URL(raw, RUNTIME_ORIGIN);
  if (url.origin !== RUNTIME_ORIGIN || !url.pathname.startsWith('/hivemind/')) throw new Error('Invalid workspace destination');
  return url.pathname === '/hivemind/app/employee/apps' ? dotAppsUrl(url.search, url.hash) : url.href;
}
export function matchingShellIdentity(auth, expected) {
  return Boolean(expected?.userId && expected?.organizationId && auth?.user?.id === expected.userId && auth?.org?.id === expected.organizationId);
}
