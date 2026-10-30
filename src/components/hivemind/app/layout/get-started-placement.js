/**
 * Routes whose composer owns the bottom of the phone viewport.
 * Mirrors the native chat rooms that AppShell renders: the employee harness and the Brain overview chat.
 */
export function isNativeChatRoute(pathname) {
  return pathname.startsWith('/hivemind/app/employee/harness')
    || /^\/hivemind\/app(?:\/overview(?:\/(?:new|session\/[^/]+))?)?\/?$/u.test(pathname);
}

/**
 * Where the Get Started checklist renders.
 * Phones show it as a chip on the home screen (the team roster) that opens a bottom sheet, never over a room; larger
 * viewports keep the floating card.
 * @param {{ phone: boolean }} input
 * @returns {'home'|'overlay'}
 */
export function startPlacement({ phone }) {
  return phone ? 'home' : 'overlay';
}
