export const HEALTH_FAILURE_THRESHOLD = 3;

export function nextHealthObservation(failures, succeeded, threshold = HEALTH_FAILURE_THRESHOLD) {
  if (succeeded) return { failures: 0, healthy: true };
  const nextFailures = Math.max(0, Number(failures) || 0) + 1;
  return {
    failures: nextFailures,
    healthy: nextFailures >= threshold ? false : null,
  };
}
