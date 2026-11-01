import apiClient from './api-client';

const RETRY_AFTER_MS = 300000;
let settled = null; // { ok, at } of the last finished probe
let pending = null;

/**
 * Whether the signed-in person can read web admin metrics. One request serves every sidebar mount; a negative answer
 * is reused for five minutes so a remounting sidebar or a failing endpoint does not issue a request per mount.
 * @returns {Promise<boolean>} True when the metrics read succeeded.
 */
export function probeWebAdmin() {
  if (settled && (settled.ok || Date.now() - settled.at < RETRY_AFTER_MS)) return Promise.resolve(settled.ok);
  if (pending) return pending;
  pending = apiClient.getWebAdminMetrics()
    .then(() => true, () => false)
    .then(ok => { settled = { ok, at: Date.now() }; pending = null; return ok; });
  return pending;
}

/** Forgets the probe result (tests, and tenant switches). */
export function resetWebAdminProbe() { settled = null; pending = null; }

if (typeof window !== 'undefined') window.addEventListener('hm:tenant-changed', resetWebAdminProbe);
