// Each native client keeps its own document, cookies, module graph and transport.
export const PANE_ORIGINS = { brain: 'https://next.singulancelabs.com', runtime: 'https://runtime-runner.singulancelabs.com' };
export const PANE_EVENTS = ['hivemind:runtime-appearance-saved', 'hivemind:agent-rooms', 'hivemind:agent-selected', 'hivemind:agent-schedules', 'hivemind:runtime-get-started', 'hivemind:close-sidebar', 'hivemind:open-sidebar'];
export const PANE_REQUESTS = ['hivemind:request-agent-rooms', 'hivemind:request-agent-schedules', 'hivemind:request-get-started'];
export function paneForPath(path = '') {
  if (/^\/hivemind\/app\/overview(?:\/(?:new|dreaming|session\/[A-Za-z0-9_-]+))?\/?$/.test(path)) return 'brain';
  if (/^\/hivemind\/app\/employee\/harness(?:\/(?:new|session\/[A-Za-z0-9_-]+))?\/?$/.test(path)) return 'runtime';
  return null;
}
export function panePath(input, mode) {
  if (typeof input !== 'string' || input.length > 2048 || !input.startsWith('/') || input.startsWith('//')) return null;
  const url = new URL(input, PANE_ORIGINS[mode]);
  if (url.origin !== PANE_ORIGINS[mode] || paneForPath(url.pathname) !== mode) return null;
  url.searchParams.delete('native_pane');
  return url.pathname + url.search + url.hash;
}
export function paneSource(path, mode) {
  const clean = panePath(path, mode);
  if (!clean) throw new Error('Invalid native pane route');
  const url = new URL(clean, PANE_ORIGINS[mode]); url.searchParams.set('native_pane', '1'); return url.href;
}
export function validPaneMessage(event, frame, mode, scope) {
  return event.source === frame?.contentWindow && event.origin === PANE_ORIGINS[mode]
    && event.data?.type === 'hivemind.native-pane' && event.data?.version === 1 && event.data?.scope === scope;
}
// Embedded presentation only; account scope is still verified by the message bridge.
// Redirects/reloads may lose the query marker, but must never nest the app shell.
export function detectNativePane(location, embedded, referrer = '') {
  const mode = paneForPath(location.pathname);
  if (!mode || location.origin !== PANE_ORIGINS[mode]) return null;
  if (new URLSearchParams(location.search).get('native_pane') === '1') return mode;
  if (!embedded) return null;
  try { return Object.values(PANE_ORIGINS).includes(new URL(referrer).origin) ? mode : null; }
  catch { return null; }
}
export const initialNativePane = typeof window !== 'undefined'
  ? detectNativePane(window.location, window.parent !== window, document.referrer) : null;
export function persistentShellEnabled() {
  return !initialNativePane && typeof window !== 'undefined' && Object.values(PANE_ORIGINS).includes(window.location.origin);
}

export function rememberPaneRoute(mode, path, scope) {
  const clean = panePath(path, mode); if (!clean || !scope || scope === ':') return;
  const key = `hivemind.native-pane:${scope}:${mode}`;
  try { sessionStorage.setItem(key, clean); } catch { /* Optional navigation cache. */ }
  // Keep only opaque, scoped routes. Native Session Controller checks ownership
  // before showing any conversation; browser storage never contains messages.
  try {
    localStorage.setItem(key, clean);
    if (mode === 'runtime' && /\/session\//.test(clean)) {
      const recentKey = `hivemind.native-pane-recents.v1:${scope}:${mode}`;
      const saved = JSON.parse(localStorage.getItem(recentKey) || '[]');
      const valid = Array.isArray(saved) ? saved.filter(value => panePath(value, mode) && value !== clean) : [];
      localStorage.setItem(recentKey, JSON.stringify([clean, ...valid].slice(0, 10)));
    }
  } catch { /* Optional browser cache. */ }
}
export function recalledPaneRoute(mode, scope) {
  if (!scope || scope === ':') return null;
  const key = `hivemind.native-pane:${scope}:${mode}`;
  try { return panePath(sessionStorage.getItem(key), mode) || panePath(localStorage.getItem(key), mode); } catch { return null; }
}
