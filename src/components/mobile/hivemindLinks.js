// This value is injected at build time. The Enigma Worker must never send a
// visitor to the production app merely because they opened the mobile cover.
const HIVEMIND_SITE_URL = process.env.REACT_APP_HIVEMIND_SITE_URL
  || `https://${process.env.REACT_APP_HIVEMIND_SITE_HOST || 'next.singulancelabs.com'}`;

export const HIVEMIND_URL = `${HIVEMIND_SITE_URL.replace(/\/$/, '')}/hivemind`;

export function hivemindHref(path = '') {
  return `${HIVEMIND_URL}${path}`;
}
