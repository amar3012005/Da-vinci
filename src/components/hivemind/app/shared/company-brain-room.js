import { openDotLocale, withOpenDotLocale } from './open-dot-embed-target';

/** Origin that serves the Company Brain OpenDot employee; the Worker redirects every other room there to it. */
export const COMPANY_BRAIN_ORIGIN = 'https://brain-runner.singulancelabs.com';
export const COMPANY_BRAIN_DOT_ID = 'dot_company_brain';

/**
 * Whether the in-app address is a Brain chat entry that opens the Company Brain room: the bare overview and
 * `/overview/new`. Saved harness sessions (`/overview/session/:id`) and Dreaming keep their own pages.
 * @param {string} pathname - location pathname.
 * @returns {boolean} true for a Brain chat entry route.
 */
export function isCompanyBrainRoute(pathname) {
  return /^\/hivemind\/app\/overview(?:\/new)?\/?$/u.test(pathname || '');
}

/**
 * Embed address of the Company Brain room, carrying the interface language so the first paint is already in it.
 * @param {string|null|undefined} language - i18next language.
 * @returns {string} address on the brain-runner origin with `embed=hivemind`.
 */
export function buildCompanyBrainTarget(language) {
  const target = new URL(`/dots/${COMPANY_BRAIN_DOT_ID}`, COMPANY_BRAIN_ORIGIN);
  target.searchParams.set('embed', 'hivemind');
  return withOpenDotLocale(target.href, language);
}

/**
 * Post a host message into the Company Brain frame, only while it shows the Company Brain document.
 * @param {{ contentWindow: Window | null } | null} frame - iframe element.
 * @param {object} message - protocol message.
 * @returns {void}
 */
export function postToCompanyBrainFrame(frame, message) {
  const target = frame?.contentWindow;
  if (!target) return;
  try {
    // The initial about:blank document and login redirects are not the room; never send the handshake into them.
    if (target.location.origin !== COMPANY_BRAIN_ORIGIN || !/^\/dots\//.test(target.location.pathname)) return;
  } catch { /* Cross-origin window: the exact targetOrigin below enforces delivery. */ }
  target.postMessage(message, COMPANY_BRAIN_ORIGIN);
}

export { openDotLocale };
