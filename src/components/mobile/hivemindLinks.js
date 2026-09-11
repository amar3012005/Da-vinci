// Keep every cover-page CTA on the hostname the visitor is already using.
// This prevents dev, preview, and production deployments from ever sending a
// visitor to each other's app merely because a build-time environment changed.
const HIVEMIND_SITE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : (process.env.REACT_APP_HIVEMIND_SITE_URL
    || `https://${process.env.REACT_APP_HIVEMIND_SITE_HOST || 'next.singulancelabs.com'}`);

export const HIVEMIND_URL = `${HIVEMIND_SITE_URL.replace(/\/$/, '')}/hivemind`;

export function hivemindHref(path = '') {
  return `${HIVEMIND_URL}${path}`;
}
