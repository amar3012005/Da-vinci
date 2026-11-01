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

/** Runner hosts whose Worker proxies only `/__hivemind/bootstrap`; the control plane's `/v1/proxy/*` reads are cross-origin there and CORS-blocked. */
export const PROXY_READ_BLOCKED_HOSTS = ['brain-runner.singulancelabs.com'];

/**
 * Whether control-plane `/v1/proxy/*` reads (plan usage, admin metrics) cannot succeed from this page.
 * @param {string} hostname - `location.hostname`.
 * @returns {boolean} True on the Company Brain runner host.
 */
export function proxyReadsBlocked(hostname) {
  return PROXY_READ_BLOCKED_HOSTS.includes(hostname);
}
