import { NEW_WORKSPACE_LANDING } from '../shared/routes';

// Keep the post-auth landing decision in one place. This runs before the
// desktop app shell is mounted, so mobile users never flash the OS section.
export function isMobileAuthClient() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('desktop') === '1') return false;
  const narrowViewport = typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 768px)').matches;
  const uaDataMobile = Boolean(navigator.userAgentData?.mobile);
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i.test(navigator.userAgent || '');
  return narrowViewport || uaDataMobile || uaMobile;
}

export function defaultAuthReturnUrl(origin = window.location.origin) {
  const path = isMobileAuthClient() ? '/hivemind/m/chat' : '/hivemind/app/overview';
  return `${origin}${path}?auth=callback`;
}

export function defaultAuthenticatedPath() {
  return isMobileAuthClient() ? '/hivemind/m/chat' : '/hivemind/app/overview';
}

export function newWorkspaceLanding(isMobile = isMobileAuthClient()) {
  return isMobile ? '/hivemind/m/chat' : NEW_WORKSPACE_LANDING;
}
