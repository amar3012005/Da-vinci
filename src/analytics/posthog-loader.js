import { CONSENT_EVENT, hasConsent } from '../privacy/consent';
import { clearLegacyPostHogPersistence } from './posthog-persistence';

let loading = null;
let listening = false;

function loadClient() {
  if (loading || !process.env.REACT_APP_POSTHOG_KEY || !hasConsent('analytics')) return;
  loading = import('./posthog').then(({ initConsentAwarePostHog }) => {
    // Consent may have been revoked while this chunk was downloading. The
    // existing initializer checks current consent before starting the client.
    initConsentAwarePostHog();
    window.removeEventListener(CONSENT_EVENT, onConsent);
  }).catch(() => {
    // Optional analytics must never block navigation; a later consent event
    // can try loading again after a temporary network failure.
    loading = null;
  });
}

function onConsent() {
  if (hasConsent('analytics')) loadClient();
  else clearLegacyPostHogPersistence();
}

export function initConsentAwarePostHog() {
  if (typeof window === 'undefined' || listening) return;
  listening = true;
  window.addEventListener(CONSENT_EVENT, onConsent);
  onConsent();
}
