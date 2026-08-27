/**
 * useUsage — single cached fetch of platform usage, shared across all
 * <UsageTracker> instances so the meters on every page read from ONE
 * network call rather than N.
 *
 * Source of truth: apiClient.getUsage() → GET /v1/proxy/billing/usage →
 * core planEnforcer.getUsageSummary(orgId), which reads the plan LIMITS
 * from core/src/billing/plans.js. The frontend NEVER hardcodes a limit —
 * every limit surfaced here comes straight off that response.
 *
 * Shape (per resource key): { used:number, limit:number(-1=unlimited), isDaily?:boolean }
 * Keys the FE consumes: memories, kbPages, connectors,
 * deepResearch, webIntel, searches, tokens (uploads kept for back-compat).
 *
 * Refreshes on:
 *   • first mount (lazy — only when a tracker actually mounts)
 *   • window 'hm:usage-changed'  (after an upload / new memory / new room)
 *   • window 'hm:plan-limit'     (after the backend rejects for quota)
 */
import { useState, useEffect, useCallback } from 'react';
import apiClient from './api-client';
import { PLAN_LIMIT_EVENT } from './planLimit';

export const USAGE_CHANGED_EVENT = 'hm:usage-changed';

// ── Module-level cache shared by every subscriber ──
let cache = null; // last successful usage payload (or null)
let loading = false; // an in-flight fetch is running
let inflight = null; // the in-flight promise (dedupes concurrent callers)
const subscribers = new Set(); // Set<() => void>

function notify() {
  subscribers.forEach((fn) => {
    try {
      fn();
    } catch {
      // A single bad subscriber must not break the fan-out.
    }
  });
}

/**
 * Fetch (or re-fetch) usage. Concurrent callers share one request.
 * @param {boolean} force  when false, an existing in-flight fetch is reused
 * @returns {Promise<object|null>}
 */
export async function fetchUsage(force = false) {
  if (inflight && !force) return inflight;
  loading = true;
  notify();
  inflight = (async () => {
    try {
      const data = await apiClient.getUsage();
      cache = data || null;
      return cache;
    } catch {
      // Keep the last-known-good cache on failure; a tracker just shows stale
      // or a skeleton. Usage display must never throw into the page.
      return cache;
    } finally {
      loading = false;
      inflight = null;
      notify();
    }
  })();
  return inflight;
}

// Wire the global refresh triggers exactly once per browser tab.
let wired = false;
function wireGlobalEvents() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  const onChanged = () => {
    fetchUsage(true).catch(() => {});
  };
  window.addEventListener(USAGE_CHANGED_EVENT, onChanged);
  window.addEventListener(PLAN_LIMIT_EVENT, onChanged);
  window.addEventListener('hm:tenant-changed', () => {
    // Never retain an organization-scoped meter across account/org switches.
    cache = null; inflight = null; loading = false; notify();
  });
}

/**
 * Dispatch the global 'hm:usage-changed' event so mounted trackers refresh.
 * Safe to call anywhere (no-op without window).
 */
export function emitUsageChanged() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(USAGE_CHANGED_EVENT));
  } catch {
    // best-effort — never let a UI-refresh signal break the caller
  }
}

/**
 * React hook: subscribe to the shared usage cache.
 * @returns {{ usage: (object|null), loading: boolean, refresh: () => Promise<object|null> }}
 */
export function useUsage() {
  const [, setTick] = useState(0);

  useEffect(() => {
    wireGlobalEvents();
    const rerender = () => setTick((n) => n + 1);
    subscribers.add(rerender);
    // Lazy first load: only fetch when nothing is cached and nothing is running.
    if (cache === null && !loading) {
      fetchUsage(false).catch(() => {});
    }
    return () => {
      subscribers.delete(rerender);
    };
  }, []);

  const refresh = useCallback(() => fetchUsage(true), []);

  return { usage: cache, loading, refresh };
}

export default useUsage;
