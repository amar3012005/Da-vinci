import { finalDocumentHref } from './workspace-authority.mjs';
import { openProductPage } from './native-in-app-links';

/**
 * Opens a notification, announcement or card link on its final URL in one navigation. The packaged app routes product
 * pages in place; a browser loads the owning host's address, so an employee link written with Brain's host does not
 * pass through the Worker's host redirect.
 * @param {string} href - absolute or app-relative link.
 * @param {{ win?: Window, open?: (href: string) => void }} [options] - window and the navigation used in the packaged app.
 * @returns {void}
 */
export function openFinalLink(href, { win = window, open = openProductPage } = {}) {
  let final;
  try { final = finalDocumentHref(href, win.location.href, { embedded: win.parent !== win }); } catch { final = href; /* Not a URL; let the browser resolve it. */ }
  if (/^https:\/\/(?:next|runtime-runner)\.singulancelabs\.com\//i.test(final)) { open(final); return; }
  win.location.assign(final);
}
