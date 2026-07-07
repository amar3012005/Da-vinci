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

const KEY = process.env.REACT_APP_POSTHOG_KEY || '';
const HOST = process.env.REACT_APP_POSTHOG_HOST || 'https://eu.i.posthog.com';

let started = false;

export function initPostHog() {
  if (started || !KEY || typeof window === 'undefined') return;
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
  });
}

export function isPostHogEnabled() { return !!KEY; }

export default posthog;
