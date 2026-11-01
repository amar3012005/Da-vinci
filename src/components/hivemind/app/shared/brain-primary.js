import { useEffect, useState } from 'react';
import { isNativeApp } from './native-app';

/** Worker route that answers `{ primary: 'company' | 'harness' }` from the Cloudflare `brain-primary` flag. */
export const BRAIN_PRIMARY_ENDPOINT = '/__hivemind/feature-flags/brain-primary';
const NATIVE_ENDPOINT = `https://next.singulancelabs.com${BRAIN_PRIMARY_ENDPOINT}`;
const STORAGE_KEY = 'hm:brain-primary';
const TTL_MS = 30_000;
const TIMEOUT_MS = 2500;

let memory = null;
let inflight = null;
const listeners = new Set();

/**
 * @param {unknown} value - raw flag value.
 * @returns {'company'|'harness'} only the exact string "harness" selects the old Brain chat runner.
 */
export function normalizeBrainPrimary(value) {
  return value === 'harness' ? 'harness' : 'company';
}

function stored() {
  try { return normalizeBrainPrimary(window.localStorage.getItem(STORAGE_KEY)); } catch { return 'company'; }
}

/**
 * Last known primary Brain without waiting: the in-memory answer, else the one stored by the previous visit, else "company".
 * @returns {'company'|'harness'} the primary Brain.
 */
export function peekBrainPrimary() {
  return memory ? memory.value : stored();
}

/**
 * Resolves the primary Brain from the Worker flag route, cached for 30 s. Any failure (network, timeout, bad body)
 * resolves to the last known value, so an unreachable flag never opens the old runner by itself.
 * @param {{ fetcher?: typeof fetch, now?: () => number, native?: boolean }} [options] - test seams.
 * @returns {Promise<'company'|'harness'>} the primary Brain.
 */
export function brainPrimary({ fetcher, now = Date.now, native = isNativeApp() } = {}) {
  if (memory && memory.until > now()) return Promise.resolve(memory.value);
  if (inflight) return inflight;
  const request = fetcher || (typeof fetch === 'function' ? fetch : null);
  if (!request) return Promise.resolve(peekBrainPrimary());
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  inflight = Promise.resolve()
    .then(() => request(native ? NATIVE_ENDPOINT : BRAIN_PRIMARY_ENDPOINT, { cache: 'no-store', signal: controller?.signal }))
    .then(response => (response.ok ? response.json() : Promise.reject(new Error('flag_unavailable'))))
    .then(body => {
      const value = normalizeBrainPrimary(body?.primary);
      memory = { value, until: now() + TTL_MS };
      try { window.localStorage.setItem(STORAGE_KEY, value); } catch { /* Storage is a convenience; the next visit re-reads the flag. */ }
      listeners.forEach(listener => listener(value));
      return value;
    })
    .catch(() => peekBrainPrimary())
    .finally(() => { clearTimeout(timer); inflight = null; });
  return inflight;
}

/** Forgets the cached answer (tests). */
export function resetBrainPrimary() { memory = null; inflight = null; }

/**
 * React view of the primary Brain: the last known value at first paint, then the flag's current value.
 * @returns {'company'|'harness'} the primary Brain.
 */
export function useBrainPrimary() {
  const [value, setValue] = useState(peekBrainPrimary);
  useEffect(() => {
    let live = true;
    const listener = next => { if (live) setValue(next); };
    listeners.add(listener);
    brainPrimary().then(next => { if (live) setValue(next); });
    return () => { live = false; listeners.delete(listener); };
  }, []);
  return value;
}

/**
 * Whether a Brain chat entry opens the Company Brain on this surface. Pure routing rule shared by the web shell and the packaged apps.
 * @param {'company'|'harness'} primary - the flag value.
 * @returns {boolean} true when the Company Brain is primary.
 */
export function companyBrainIsPrimary(primary) {
  return normalizeBrainPrimary(primary) === 'company';
}
