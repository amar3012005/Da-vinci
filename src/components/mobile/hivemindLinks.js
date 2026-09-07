const PRODUCTION_HIVEMIND_URL = 'https://next.singulancelabs.com/hivemind';

export function resolveHivemindUrl(location = typeof window !== 'undefined' ? window.location : null) {
  if (location?.hostname === 'dev.next.singulancelabs.com') {
    return `${location.origin}/hivemind`;
  }

  return PRODUCTION_HIVEMIND_URL;
}

export const HIVEMIND_URL = resolveHivemindUrl();

export function hivemindHref(path = '') {
  return `${HIVEMIND_URL}${path}`;
}
