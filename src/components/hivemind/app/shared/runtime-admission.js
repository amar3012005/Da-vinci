import { fetchHarness } from './harness-fetch';

let admission = null;

/**
 * Fetch a Runtime API and, when the browser has no Runtime principal yet (401),
 * perform the same one-time Harness admission the Runtime chat uses, then retry once.
 * A phone that opens a HyperAgent room first has never booted the Runtime chat, so
 * team, autonomy and similar sidebar reads would otherwise fail until it does.
 * Concurrent callers share one admission; a failed admission returns the original 401.
 */
export async function fetchWithRuntimeAdmission(input, init) {
  const response = await fetchHarness(input, init);
  if (response.status !== 401 || typeof window === 'undefined' || window.location.hostname !== 'runtime-runner.singulancelabs.com') return response;
  admission ||= import('../pages/HarnessSurface').then(module => module.establishHarnessSession()).finally(() => { admission = null; });
  try { await admission; } catch { return response; }
  return fetchHarness(input, init);
}
