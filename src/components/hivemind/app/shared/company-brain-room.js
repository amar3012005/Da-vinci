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
 * Top-level address of the Company Brain room: the page the Worker redirects Overview and New chat to.
 * @param {string|null|undefined} language - i18next language, carried so the first paint is in it.
 * @returns {string} room address on the brain-runner origin without the embed marker.
 */
export function buildCompanyBrainPage(language) {
  return withOpenDotLocale(new URL(`/dots/${COMPANY_BRAIN_DOT_ID}`, COMPANY_BRAIN_ORIGIN).href, language);
}

/**
 * Leave this document for the Company Brain room (top-level, no iframe).
 * @param {string|null|undefined} language - i18next language.
 * @returns {void}
 */
export function navigateToCompanyBrain(language) {
  window.location.assign(buildCompanyBrainPage(language));
}

/**
 * Whether a click on an in-app link should leave for the Company Brain: a plain primary click on a same-origin
 * anchor whose address is a Brain chat entry. Modified clicks, new-tab targets and downloads keep the browser default.
 * @param {MouseEvent} event - click event (capture phase).
 * @returns {boolean} true when the click is a Brain chat link.
 */
export function isBrainChatLinkClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const anchor = event.target?.closest?.('a[href]');
  if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return false;
  try {
    const url = new URL(anchor.getAttribute('href'), window.location.href);
    return url.origin === window.location.origin && isCompanyBrainRoute(url.pathname);
  } catch { return false; }
}

export { openDotLocale };
