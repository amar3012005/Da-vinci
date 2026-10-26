/**
 * Routes whose composer owns the bottom of the phone viewport.
 * Mirrors the native chat rooms that AppShell renders: the employee harness and the Brain overview chat.
 */
export function isNativeChatRoute(pathname) {
  return pathname.startsWith('/hivemind/app/employee/harness')
    || /^\/hivemind\/app(?:\/overview(?:\/(?:new|session\/[^/]+))?)?\/?$/u.test(pathname);
}

/**
 * Where the Getting Started pill renders.
 * 'top-bar' docks the compact chip beside the phone room bar; 'overlay' keeps the floating card.
 */
export function startPlacement({ pathname, phone }) {
  return phone && isNativeChatRoute(pathname) ? 'top-bar' : 'overlay';
}
