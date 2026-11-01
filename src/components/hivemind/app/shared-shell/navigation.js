import { brainRoomUrl } from './brain-room';
export const RUNTIME_ORIGIN = 'https://runtime-runner.singulancelabs.com';
export const DOT_APPS = `${RUNTIME_ORIGIN}/hivemind/app/employee/apps`;
export function dotAppsUrl(search = '', hash = '') {
  // Do not parse/re-serialize OAuth callback fields: their exact query survives.
  return DOT_APPS + (search.startsWith('?') ? search : search ? `?${search}` : '') + hash;
}
export function runtimeNavigation(to) {
  const raw = typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}${to.hash || ''}`;
  const url = new URL(raw, RUNTIME_ORIGIN);
  if (url.origin !== RUNTIME_ORIGIN || !(url.pathname.startsWith('/hivemind/') || url.pathname === '/apps')) throw new Error('Invalid workspace destination');
  return url.pathname === '/hivemind/app/employee/apps' ? dotAppsUrl(url.search, url.hash) : url.href;
}
export function matchingShellIdentity(auth, expected) {
  return Boolean(expected?.userId && expected?.organizationId && auth?.user?.id === expected.userId && auth?.org?.id === expected.organizationId);
}

export const NEXT_ORIGIN = 'https://next.singulancelabs.com';
const BRAIN_CHAT_PATH = /^\/hivemind\/app\/overview(?:\/new)?\/?$/;
/**
 * Destination of a Brain sidebar link on the Company Brain page: Chat is the room itself (reopening the cached conversation),
 * Runtime pages go to Runtime, every other Brain page goes to the Brain host.
 * @param {string | { pathname?: string, search?: string, hash?: string }} to - Router destination.
 * @param {string | null} [conversationId] - Conversation cached on this device.
 * @returns {string} Absolute URL.
 */
export function brainNavigation(to, conversationId = null) {
  const raw = typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}${to.hash || ''}`;
  const url = new URL(raw, NEXT_ORIGIN);
  if (url.origin !== NEXT_ORIGIN) throw new Error('Invalid workspace destination');
  if (BRAIN_CHAT_PATH.test(url.pathname)) return brainRoomUrl(conversationId, url.search);
  if (/^\/hivemind\/app\/employees?(?:\/|$)/.test(url.pathname)) return runtimeNavigation(raw);
  if (!url.pathname.startsWith('/hivemind/')) throw new Error('Invalid workspace destination');
  return url.href;
}
