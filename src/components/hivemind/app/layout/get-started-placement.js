/**
 * Routes whose composer owns the bottom of the phone viewport.
 * Mirrors the native chat rooms that AppShell renders: the employee harness and the Brain overview chat.
 */
export function isNativeChatRoute(pathname) {
  return pathname.startsWith('/hivemind/app/employee/harness')
    || /^\/hivemind\/app(?:\/overview(?:\/(?:new|session\/[^/]+))?)?\/?$/u.test(pathname);
}

/**
 * Where the Getting Started card renders.
 * Phones show no Getting Started surface; larger viewports keep the floating card.
 */
export function startPlacement({ phone }) {
  return phone ? 'hidden' : 'overlay';
}
