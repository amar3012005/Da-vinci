/** Hosts that serve the app with the Worker's same-origin session endpoints (`/__hivemind/bootstrap`) instead of the control plane's cross-origin ones. */
export const SAME_ORIGIN_SESSION_HOSTS = ['runtime-runner.singulancelabs.com', 'brain-runner.singulancelabs.com'];

/**
 * Whether the page is served from a runner host (Runtime, or the Company Brain page on brain-runner).
 * @param {string} hostname - `location.hostname`.
 * @returns {boolean} True for a runner host.
 */
export function isRunnerHost(hostname) {
  return SAME_ORIGIN_SESSION_HOSTS.includes(hostname);
}
