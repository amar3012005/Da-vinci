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

/** Employee pages without a composer; every other `/hivemind/app/employee/…` route is a room with one. */
const EMPLOYEE_PAGES_WITHOUT_COMPOSER = /^\/hivemind\/app\/employee\/(?:apps|library|artifacts|calendar)(?:\/|$)/u;

/**
 * Whether a route shows a chat composer (an employee room, the Runtime room or a Brain chat).
 * @param {string} pathname
 * @returns {boolean}
 */
export function isComposerRoute(pathname) {
  if (isNativeChatRoute(pathname)) return true;
  return /^\/hivemind\/app\/(?:employee|employees)\/[^/]/u.test(pathname) && !EMPLOYEE_PAGES_WITHOUT_COMPOSER.test(pathname);
}

/**
 * Where the HyperAgents Get Started checklist renders. It never covers a composer:
 * phones keep it on the home screen; desktop rooms show it as a chip in the sidebar; other desktop pages float the card.
 * @param {{ pathname: string, phone: boolean }} input
 * @returns {'home'|'sidebar'|'overlay'}
 */
export function hyperAgentsStartPlacement({ pathname, phone }) {
  if (phone) return 'home';
  return isComposerRoute(pathname) ? 'sidebar' : 'overlay';
}
