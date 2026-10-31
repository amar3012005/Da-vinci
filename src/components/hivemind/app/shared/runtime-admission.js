import { fetchHarness } from './harness-fetch';
import { isNativeApp } from './native-app';
import { nativePlugin } from './native-auth';
import { base64ToBytes, nativeRequestBody } from './native-body';

const RUNTIME_ORIGIN = 'https://runtime-runner.singulancelabs.com';
/** After an admission that did not authorize the retried read, further reads skip admission for this long. */
export const ADMISSION_COOLDOWN_MS = 5 * 60_000;

let admission = null;
let uselessAdmissionAt = -Infinity;
let runtimeHostUnsupported = false;

/**
 * Runtime-host read through the packaged app's native transport: the plugin sends it to the Runtime host with Control's
 * session cookie, the same credential the employee room uses. The cookie never reaches JavaScript.
 * @param {RequestInfo|URL} input - same-origin `/api/` path.
 * @param {RequestInit} [init] - method, headers, body and signal.
 * @param {object} [plugin] - SingulanceNative plugin.
 * @returns {Promise<Response>} the Runtime host's answer.
 * @throws {Error} `runtime_host_unsupported` when the installed shell predates Runtime-host requests.
 */
export async function nativeRuntimeFetch(input, init = {}, plugin = nativePlugin) {
  if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const url = new URL(String(input), RUNTIME_ORIGIN);
  if (url.origin !== RUNTIME_ORIGIN && url.protocol !== 'capacitor:') throw new Error('untrusted_runtime_origin');
  if (!url.pathname.startsWith('/api/')) throw new Error('untrusted_runtime_path');
  const headers = new Headers(init.headers);
  const { contentType, ...body } = await nativeRequestBody(init.body, headers.get('content-type'));
  let result;
  try {
    result = await plugin.request({ url: `${RUNTIME_ORIGIN}${url.pathname}${url.search}`, method: init.method || 'GET', headers: { Accept: headers.get('accept') || 'application/json', ...(contentType ? { 'Content-Type': contentType } : {}) }, ...body, responseType: 'base64', authorize: false });
  } catch (error) {
    if (/not allowed/i.test(String(error?.message || error))) throw new Error('runtime_host_unsupported');
    throw error;
  }
  if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const payload = [204, 205, 304].includes(result.status) || init.method === 'HEAD' ? null : result.encoding === 'base64' ? base64ToBytes(result.data) : result.data;
  return new Response(payload, { status: result.status, headers: result.headers });
}

/**
 * Fetch a Runtime API.
 * The packaged app reads the Runtime host through its native transport. A browser on the Runtime host without a Runtime
 * principal yet (401) performs the one-time Harness admission the Runtime chat uses, then retries once; an admission
 * that does not authorize the retry is not repeated for {@link ADMISSION_COOLDOWN_MS}, so listeners of
 * `hivemind:session-established` cannot drive an admission loop. Concurrent callers share one admission.
 * @param {RequestInfo|URL} input - same-origin `/api/` path.
 * @param {RequestInit} [init] - request options.
 * @param {() => number} [now] - clock.
 * @returns {Promise<Response>} the answer; a failed admission returns the original 401.
 */
export async function fetchWithRuntimeAdmission(input, init, now = Date.now) {
  if (isNativeApp() && !runtimeHostUnsupported) {
    try { return await nativeRuntimeFetch(input, init); } catch (error) {
      if (error?.message !== 'runtime_host_unsupported') throw error;
      runtimeHostUnsupported = true;
    }
  }
  const response = await fetchHarness(input, init);
  if (response.status !== 401 || typeof window === 'undefined' || (!isNativeApp() && window.location.hostname !== 'runtime-runner.singulancelabs.com')) return response;
  if (now() - uselessAdmissionAt < ADMISSION_COOLDOWN_MS) return response;
  admission ||= import('../pages/HarnessSurface').then(module => module.establishHarnessSession()).finally(() => { admission = null; });
  try { await admission; } catch { return response; }
  const retried = await fetchHarness(input, init);
  if (retried.status === 401) uselessAdmissionAt = now();
  return retried;
}

/**
 * A same-origin Runtime API read: unchanged `fetch` in a browser, the Runtime host through the native transport in the packaged app.
 * @param {RequestInfo|URL} input - `/api/` path.
 * @param {RequestInit} [init] - request options.
 * @returns {Promise<Response>} the answer.
 */
export function fetchRuntime(input, init) {
  return isNativeApp() ? fetchWithRuntimeAdmission(input, init) : fetch(input, init);
}

/** Test hook: forget the cooldown and the shell capability. */
export function resetRuntimeAdmissionForTests() { uselessAdmissionAt = -Infinity; runtimeHostUnsupported = false; admission = null; }
