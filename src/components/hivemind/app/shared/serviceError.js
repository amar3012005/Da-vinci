/**
 * Service-error detection helpers (mirrors planLimit.js).
 *
 * A genuine server failure (HTTP 5xx) or a network/timeout error is NOT a
 * plan-limit and NOT a caller-specific 4xx — historically these failed SILENTLY
 * (e.g. the mycompany openTask `catch {}`), so the user saw only a raw console
 * "503 (Service Unavailable)" and a page that "didn't respond".
 *
 * The axios response interceptor (shared/api-client.js) turns any matching error
 * into a global window CustomEvent('hm:service-error', { detail }) so a single
 * <ServiceErrorToast> mounted in AppShell can surface a friendly, dismissible
 * notice — while still rejecting the promise so individual callers behave unchanged.
 *
 * Deliberately NARROW so it never competes with existing handling:
 *   • plan-limit (402/…) → planLimit.js + <PlanLimitModal> (not here)
 *   • 400/401/403/404    → caller-specific handling (not a service outage)
 *   • 5xx / network      → here (the service is down / unreachable)
 */

export const SERVICE_ERROR_EVENT = 'hm:service-error';

/** True for a 5xx server error or a network/timeout failure (no response). */
export function isServiceError(err) {
  const status = err?.response?.status;
  if (typeof status === 'number') return status >= 500 && status <= 599;
  // No response but a request was made → network error / timeout / CORS / DNS.
  return Boolean(err?.request) && !err?.response;
}

/** Normalize into { status, message } for the toast. */
export function extractServiceError(err) {
  const status = err?.response?.status ?? null;
  const serverMsg = err?.response?.data?.error || err?.response?.data?.message;
  const message = status
    ? (serverMsg || 'The service is temporarily unavailable. Please try again in a moment.')
    : 'Network connection lost — check your connection and try again.';
  return { status, message };
}

/** Dispatch the global service-error event (no-op when window is unavailable). */
export function emitServiceError(detail) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(SERVICE_ERROR_EVENT, { detail }));
  } catch {
    // Ignore dispatch failures — the caller still gets the rejected promise.
  }
}
