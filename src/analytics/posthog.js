/**
 * PostHog — product analytics + session replay, wired frontend-wide (e2e).
 *
 * Safe no-op until REACT_APP_POSTHOG_KEY (the PUBLIC project key, phc_…) is set
 * at build time — never embed a personal phx_ key here. Host defaults to EU
 * cloud (SINGULANCE is EU-sovereign). Autocapture (clicks/inputs/pageviews via
 * history) + session recording are on; SPA route changes are tracked by
 * posthog's history-based pageview capture, no manual wiring per route.
 */
import posthog from 'posthog-js';
import { CONSENT_EVENT, hasConsent } from '../privacy/consent';

const KEY = process.env.REACT_APP_POSTHOG_KEY || '';
const HOST = process.env.REACT_APP_POSTHOG_HOST || 'https://eu.i.posthog.com';

let started = false;

function clearLegacyPostHogPersistence() {
  try {
    Object.keys(window.localStorage).filter((key) => key.startsWith('ph_')).forEach((key) => window.localStorage.removeItem(key));
    document.cookie.split(';').map((part) => part.trim().split('=')[0]).filter((name) => name.startsWith('ph_')).forEach((name) => {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    });
  } catch { /* storage controls can be unavailable in hardened browsers */ }
}

export function initPostHog() {
  if (started || !KEY || typeof window === 'undefined' || !hasConsent('analytics')) return;
  started = true;
  posthog.init(KEY, {
    api_host: HOST,
    defaults: '2025-05-24',              // modern autocapture + $pageview on history changes
    capture_pageview: 'history',         // SPA-correct pageviews across React Router
    capture_pageleave: true,
    autocapture: true,                   // clicks, form interactions
    disable_session_recording: false,    // session replay ON
    person_profiles: 'identified_only',  // don't create a profile for every anon hit
    persistence: 'localStorage+cookie',
    loaded: (client) => client.opt_in_capturing(),
  });
}

export function initConsentAwarePostHog() {
  if (typeof window === 'undefined') return;
  if (hasConsent('analytics')) initPostHog();
  else clearLegacyPostHogPersistence();
  window.addEventListener(CONSENT_EVENT, (event) => {
    if (event.detail?.analytics) {
      initPostHog();
      if (started) posthog.opt_in_capturing();
      return;
    }
    if (started) {
      posthog.opt_out_capturing({ clear_persistence: true });
      posthog.reset(true);
    } else clearLegacyPostHogPersistence();
  });
}

export function isPostHogEnabled() { return !!KEY && started && hasConsent('analytics'); }

export default posthog;
