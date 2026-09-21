import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../shared/api-client';
import './HarnessSurface.css';

const HARNESS_BOOT_PATH = '/api/hivemind/boot';
const HARNESS_SESSION_PATH = '/api/hivemind/session/establish';
const HARNESS_SHELL_PATH = '/assets/harness-shell.js';
const HARNESS_LIVENESS_INTERVAL_MS = 5000;
const HARNESS_OVERVIEW_PATH = '/hivemind/app/overview';

/** Resolve one release-stable module URL from the authenticated boot graph. */
export function harnessShellUrl(rows) {
  const graph = Array.isArray(rows)
    ? rows.find((row) => row?.kind === 'global' && row?.name === '__DSH_BOOT__')?.value
    : null;
  const revision = typeof graph?.rev === 'string' && graph.rev.length > 0 ? graph.rev : 'current';
  return `${HARNESS_SHELL_PATH}?rev=${encodeURIComponent(revision)}`;
}

/** Extract the revision that owns the in-page native module graph. */
export function harnessBootRevision(rows) {
  const graph = Array.isArray(rows)
    ? rows.find((row) => row?.kind === 'global' && row?.name === '__DSH_BOOT__')?.value
    : null;
  return typeof graph?.rev === 'string' && graph.rev.length > 0 ? graph.rev : null;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => { resolve = nextResolve; reject = nextReject; });
  return { promise, resolve, reject };
}
function executeExternalScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.dshNativeScript = src;
    script.addEventListener('load', () => { resolve(); }, { once: true });
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error(`Could not load Harness module: ${src}`));
    }, { once: true });
    document.head.append(script);
  });
}

function loadHarnessStylesheet(href) {
  return new Promise((resolve, reject) => {
    const existing = document.head.querySelector(`link[data-dsh-native-style="${href}"]`);
    if (existing) {
      if (existing.sheet) resolve(existing);
      else {
        existing.addEventListener('load', () => resolve(existing), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Could not load Harness stylesheet: ${href}`)), { once: true });
      }
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.dshNativeStyle = href;
    link.addEventListener('load', () => resolve(link), { once: true });
    link.addEventListener('error', () => { link.remove(); reject(new Error(`Could not load Harness stylesheet: ${href}`)); }, { once: true });
    document.head.append(link);
  });
}

/** Execute the typed Harness boot table exactly as its static worker does. */
async function applyHarnessInjections(rows) {
  if (!Array.isArray(rows)) throw new Error('Harness returned an invalid boot graph.');
  // One document installs one signed boot graph. Same-revision SPA remounts
  // reuse the live module system; a new revision gets a full document reload.
  const ready = deferred();
  window.__DSH_BOOT_READY__ = ready;
  try {
    for (const row of rows) {
      if (!row || typeof row.kind !== 'string') throw new Error('Harness returned an invalid boot row.');
      switch (row.kind) {
        case 'global':
          window[row.name] = row.value;
          break;
        case 'script': {
          const script = document.createElement('script');
          script.textContent = row.text;
          (row.placement === 'body' ? document.body : document.head).append(script);
          break;
        }
        case 'script-src':
          await executeExternalScript(row.src);
          break;
        case 'script-preload': {
          const preload = document.createElement('link');
          preload.rel = 'preload';
          preload.as = 'script';
          preload.href = row.src;
          document.head.append(preload);
          break;
        }
        case 'style': {
          const style = document.createElement('style');
          style.textContent = row.text;
          document.head.append(style);
          break;
        }
        case 'html':
          (row.placement === 'body' ? document.body : document.head).insertAdjacentHTML('beforeend', row.html);
          break;
        default:
          throw new Error(`Harness returned an unsupported boot row: ${row.kind}`);
      }
    }
    ready.resolve();
  } catch (error) {
    ready.reject(error);
    throw error;
  }
}

export const HARNESS_BOOT_STAGES = [
  'Securing your session',
  'Loading your workspace',
  'Preparing the native chat',
  'Restoring your conversation',
];

/**
 * A compact, milestone-driven boot indicator. Unlike a timer-based progress
 * bar, each advance corresponds to a completed browser or runner boundary.
 */
export function LoadingSurface({ stage = 0 }) {
  const safeStage = Math.max(0, Math.min(stage, HARNESS_BOOT_STAGES.length - 1));
  const completed = safeStage + 1;
  const width = 20;
  const filled = Math.round((completed / HARNESS_BOOT_STAGES.length) * width);
  const bar = `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
  return (
    <div className="h-full min-h-[420px] grid place-items-center bg-[#faf9f4] px-6" aria-live="polite">
      <div className="w-[300px] max-w-full rounded-2xl border border-[#ece9e2] bg-white/80 px-6 py-5 shadow-[0_10px_30px_rgba(20,20,20,0.04)]">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#8b857d]">
          <span>hive-mind</span>
          <span className="tabular-nums">{completed}/{HARNESS_BOOT_STAGES.length}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Opening HIVE-MIND workspace"
          aria-valuemin={0}
          aria-valuemax={HARNESS_BOOT_STAGES.length}
          aria-valuenow={completed}
          className="mt-2 font-mono text-[13px] leading-none tracking-tight text-[#117dff]"
          style={{ animation: 'hm-harness-tqdm-shimmer 1.6s ease-in-out infinite' }}
        >
          {bar}
        </div>
        <p className="mt-3 text-[13px] font-medium text-[#252525]">{HARNESS_BOOT_STAGES[safeStage]}</p>
        <p className="mt-1 text-[11px] text-[#8b857d]">Opening your HIVE-MIND workspace</p>
      </div>
    </div>
  );
}

/** The host loader ends only when native Harness has painted an interactive seat. */
export function nativeHarnessMounted(container) {
  return Boolean(
    container?.querySelector?.('[data-composer-seat]')
    && container?.querySelector?.('aside[aria-label="HIVE chat sessions"]'),
  );
}

function waitForNativeHarnessMount(container, signal) {
  if (nativeHarnessMounted(container)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (!nativeHarnessMounted(container)) return;
      cleanup();
      resolve();
    });
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Harness did not finish rendering the chat interface.'));
    }, 30000);
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Harness mount cancelled.', 'AbortError'));
    };
    const cleanup = () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    observer.observe(container, { childList: true, subtree: true });
    // A synchronous native insertion can occur between the first check and
    // observer registration.
    if (nativeHarnessMounted(container)) {
      cleanup();
      resolve();
    }
  });
}

function isFreshHarnessRoute() {
  return window.location.pathname === `${HARNESS_OVERVIEW_PATH}/new`;
}

async function establishHarnessSession({ fresh = false } = {}) {
  const path = fresh ? '/v1/harness-chat/new-session' : '/v1/harness-chat/bootstrap';
  const { data: admission } = await apiClient.controlPlane.post(path, {});
  // The rollout is deliberately binary.  A user outside the Harness cohort
  // must stay on the existing LangGraph conversation surface, including when
  // they arrive through a stale /overview/new or /overview/session/:id URL.
  if (admission?.mode === 'legacy') return { mode: 'legacy' };
  if (admission?.mode !== 'harness') throw new Error('Harness admission returned an unsupported mode.');
  if (typeof admission.ticket !== 'string' || admission.ticket.length === 0) {
    throw new Error('Harness admission did not return a session ticket.');
  }
  const established = await fetch(HARNESS_SESSION_PATH, {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ticket: admission.ticket, request_id: crypto.randomUUID() }),
  });
  if (!established.ok) throw new Error('Could not establish the secure Harness session.');
  return { mode: 'harness' };
}

/**
 * Direct host for the complete native Harness browser graph. Da-vinci owns
 * only placement and HIVE authentication; the mounted client owns sessions,
 * streams, replay, nodes, tool cards, approvals, subagents and trajectory.
 */
export default function HarnessSurface() {
  const mountRef = useRef(null);
  const [state, setState] = useState({ phase: 'loading', stage: 0, message: null });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let cancelled = false;
    let recovering = false;
    let livenessTimer;
    const readinessAbort = new AbortController();
    const request = { container: mount, cancelled: false };
    const setLoadingStage = (stage) => {
      if (!cancelled) setState({ phase: 'loading', stage, message: null });
    };

    const recoverExpiredSession = async () => {
      if (cancelled || recovering || document.visibilityState === 'hidden') return;
      try {
        const response = await fetch(HARNESS_BOOT_PATH, {
          method: 'HEAD', credentials: 'include', cache: 'no-store',
        });
        if (response.status !== 401 && response.status !== 403) return;
        recovering = true;
        await establishHarnessSession();
        if (!cancelled) window.location.reload();
      } catch {
        // A transient network outage remains owned by native Harness recovery.
        // Only an authoritative expired-session response triggers re-admission.
      } finally {
        recovering = false;
      }
    };

    const start = async () => {
      const admission = await establishHarnessSession({ fresh: isFreshHarnessRoute() });
      if (admission.mode === 'legacy') {
        // Never render or boot the native client for a legacy user.  This
        // replaces the former "not admitted" dead end with the established
        // LangGraph/LangChain chat, retaining the feature flag as rollback.
        window.location.replace(HARNESS_OVERVIEW_PATH);
        return;
      }
      setLoadingStage(1);
      const bootResponse = await fetch(HARNESS_BOOT_PATH, { credentials: 'include', cache: 'no-store' });
      if (!bootResponse.ok) throw new Error('Harness did not accept the authenticated browser session.');
      const boot = await bootResponse.json();
      if (cancelled) return;
      const bootRevision = harnessBootRevision(boot.injections);
      if (bootRevision === null) {
        throw new Error('Harness returned a boot graph without a release revision.');
      }
      const installedRevision = window.__HIVE_HARNESS_BOOT_REV__;
      if (typeof installedRevision === 'string' && installedRevision !== bootRevision) {
        window.location.reload();
        return;
      }
      const styles = Array.isArray(boot.styles) ? boot.styles : [];
      if (styles.length === 0) throw new Error('Harness returned no native styles.');
      await Promise.all(styles.map(loadHarnessStylesheet));
      setLoadingStage(2);
      if (cancelled) return;
      // Reuse the exact authenticated speech-to-text transport used by
      // /hivemind/m/chat and AI Meeting Notes. The native Harness composer owns
      // draft state; Da-vinci owns only the authenticated audio transport.
      const transcribeAudio = async (blob) => {
        const { data } = await apiClient.core.post(
          `/api/meetings/transcribe?diarize=false&prompt=${encodeURIComponent('Spoken message to an AI assistant.')}`,
          blob,
          {
            // Keep the browser on the authenticated application origin. The
            // preview Worker forwards this one canonical endpoint to Core,
            // avoiding CORS while preserving Core's Meeting Notes STT route,
            // provider, model selection, and API-key headers.
            baseURL: window.location.origin,
            headers: { 'Content-Type': blob.type || 'audio/webm' },
            timeout: 120000,
          },
        );
        return String(data?.text || data?.transcript || '').trim();
      };
      window.__HIVEMIND_TRANSCRIBE_AUDIO__ = transcribeAudio;
      window.__HIVEMIND_DELETE_SESSION__ = async (sessionId) => {
        await apiClient.controlPlane.delete(`/v1/harness-chat/sessions/${encodeURIComponent(sessionId)}`);
      };
      const shellUrl = harnessShellUrl(boot.injections);
      if (installedRevision !== bootRevision) {
        await applyHarnessInjections(boot.injections);
        window.__HIVE_HARNESS_BOOT_REV__ = bootRevision;
      }
      if (cancelled) return;
      // A fast OS → BRAIN transition can create the next host while the
      // previous native app is still disposing. Wait for that teardown before
      // remounting the cached module, otherwise the old dispose can erase the
      // new DOM and leave a blank Overview canvas.
      const pendingDispose = window.__HIVE_HARNESS_DISPOSE_PROMISE__;
      if (pendingDispose && typeof pendingDispose.then === 'function') await pendingDispose;
      if (cancelled) return;
      window.__DSH_EMBED_REQUEST__ = request;
      setLoadingStage(3);
      // The module URL changes only when the authenticated Harness release
      // graph changes. Re-entering Overview reuses the parsed module and calls
      // its explicit mount entry instead of downloading ~500 KiB again.
      await import(/* webpackIgnore: true */ shellUrl);
      if (window.__DSH_EMBED_APP__ === undefined) {
        if (typeof window.__DSH_EMBED_MOUNT__ !== 'function') {
          throw new Error('Harness shell did not publish its remount capability.');
        }
        await window.__DSH_EMBED_MOUNT__();
      } else {
        await window.__DSH_EMBED_INITIAL_MOUNT__;
      }
      await waitForNativeHarnessMount(mount, readinessAbort.signal);
      if (!cancelled) {
        setState({ phase: 'ready', stage: HARNESS_BOOT_STAGES.length - 1, message: null });
        livenessTimer = window.setInterval(() => { void recoverExpiredSession(); }, HARNESS_LIVENESS_INTERVAL_MS);
        window.addEventListener('online', recoverExpiredSession);
        document.addEventListener('visibilitychange', recoverExpiredSession);
      }
    };

    start().catch((error) => {
      if (!cancelled) setState({ phase: 'error', stage: 0, message: error instanceof Error ? error.message : 'Could not open Harness chat.' });
    });

    return () => {
      cancelled = true;
      if (livenessTimer !== undefined) window.clearInterval(livenessTimer);
      window.removeEventListener('online', recoverExpiredSession);
      document.removeEventListener('visibilitychange', recoverExpiredSession);
      request.cancelled = true;
      readinessAbort.abort();
      if (window.__DSH_EMBED_REQUEST__ === request) window.__DSH_EMBED_REQUEST__ = undefined;
      window.__HIVEMIND_TRANSCRIBE_AUDIO__ = undefined;
      window.__HIVEMIND_DELETE_SESSION__ = undefined;
      const app = window.__DSH_EMBED_APP__;
      window.__DSH_EMBED_APP__ = undefined;
      if (app) {
        const disposePromise = Promise.resolve()
          .then(() => app.dispose())
          .catch(() => undefined)
          .finally(() => {
            if (window.__HIVE_HARNESS_DISPOSE_PROMISE__ === disposePromise) {
              window.__HIVE_HARNESS_DISPOSE_PROMISE__ = undefined;
            }
          });
        window.__HIVE_HARNESS_DISPOSE_PROMISE__ = disposePromise;
      }
      mount.replaceChildren();
    };
  }, []);

  if (state.phase === 'error') {
    return <div className="h-full min-h-[420px] grid place-items-center bg-[#faf9f4] px-6">
      <div className="max-w-md text-center">
        <p className="text-[14px] font-semibold text-[#0a0a0a]">HIVE-MIND chat is unavailable</p>
        <p className="mt-2 text-[12px] leading-5 text-[#737373]">{state.message}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-md bg-[#117dff] px-3 py-2 text-[12px] font-medium text-white">Try again</button>
      </div>
    </div>;
  }

  return <div className="relative h-full min-h-0 bg-[#faf9f4]" data-hivemind-harness-surface>
    {state.phase === 'loading' && <div className="absolute inset-0 z-10"><LoadingSurface stage={state.stage} /></div>}
    <div ref={mountRef} className="h-full min-h-0" />
  </div>;
}
