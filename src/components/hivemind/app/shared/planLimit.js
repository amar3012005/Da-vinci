/**
 * Plan-limit detection helpers.
 *
 * Backend contract (backend produces, frontend detects):
 *   HTTP 402 (also tolerate 403/429) with body:
 *     { error, code: 'plan_limit_exceeded'|'quota_reached', message, resource,
 *       metric, plan, limit, current, remaining, estimated_pages,
 *       suggested_plan, upgrade_url }
 *
 * The axios response interceptors (shared/api-client.js) turn any matching
 * error into a global `window` CustomEvent('hm:plan-limit', { detail }) so a
 * single <PlanLimitModal> mounted in AppShell can react to it — while still
 * rejecting the promise so individual callers behave unchanged.
 */

export const PLAN_LIMIT_CODE = 'plan_limit_exceeded';
export const PLAN_LIMIT_EVENT = 'hm:plan-limit';

/**
 * True when an axios error is a plan-limit-exceeded response.
 * Primary signal is HTTP 402 + code, but we tolerate 403/429 carrying the
 * same machine code (backends sometimes reuse those statuses for quota).
 * @param {unknown} err
 * @returns {boolean}
 */
export function isPlanLimitError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const code = data?.code || data?.error;
  if (status !== 402 && status !== 403 && status !== 429) return false;
  return code === PLAN_LIMIT_CODE || code === 'quota_reached';
}

/**
 * Normalize a plan-limit error into the shape the modal consumes.
 * Tolerates both snake_case (backend contract) and camelCase.
 * @param {unknown} err
 * @returns {{ resource: (string|null), metric: (string|null), plan: (string|null), message: (string|null), limit: (number|null), current: (number|null), remaining: (number|null), estimatedPages: (number|null), suggestedPlan: (string|null), upgradeUrl: string }}
 */
export function extractPlanLimit(err) {
  const data = err?.response?.data || {};
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const rawMessage = data.message ?? data.detail ?? null;
  const message = /^(?:quota_reached|plan_limit_exceeded|limit_reached)$/i.test(String(rawMessage || '').trim())
    ? null
    : rawMessage;
  return {
    resource: data.resource ?? data.metric ?? null,
    metric: data.metric ?? null,
    plan: data.plan ?? null,
    message,
    limit: num(data.limit),
    current: num(data.current),
    remaining: num(data.remaining ?? data.remaining_capacity),
    estimatedPages: num(data.estimated_pages ?? data.estimatedPages ?? data.requested_pages),
    suggestedPlan: data.suggested_plan ?? data.suggestedPlan ?? null,
    upgradeUrl: data.upgrade_url ?? data.upgradeUrl ?? '/hivemind/app/billing',
  };
}

/**
 * Dispatch the global plan-limit event. Safe to call in any environment
 * (no-op when `window` is unavailable, e.g. SSR/tests).
 * @param {ReturnType<typeof extractPlanLimit>} detail
 */
export function emitPlanLimit(detail) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(PLAN_LIMIT_EVENT, { detail }));
  } catch {
    // Ignore dispatch failures — the caller still gets the rejected promise.
  }
}
