// Per-tenant, per-user dismissal of onboarding introductions. Keys come from the
// browser-cache key format: hm:<tenant>:<user>:onboarding:<step>.

import { cacheKey } from './browser-cache';

/**
 * Storage key for one introduction step.
 * @param {{ tenant?: string, user?: string, step: string }} parts - organization id, user id and step id.
 * @returns {string|null} key, or null when the tenant or user is missing (the intro then never persists).
 */
export function introDismissalKey({ tenant, user, step }) {
  return cacheKey({ tenant, user, kind: 'onboarding', id: step });
}

/**
 * Whether the introduction for this key was dismissed.
 * @param {string|null} key - key from introDismissalKey, or null.
 * @returns {boolean} true only when a dismissal was stored; blocked storage reads as not dismissed.
 */
export function isIntroDismissed(key) {
  if (!key) return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * Record that the introduction for this key was dismissed.
 * @param {string|null} key - key from introDismissalKey, or null.
 * @returns {void}
 */
export function markIntroDismissed(key) {
  if (!key) return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Blocked storage: the introduction reopens on the next visit.
  }
}
