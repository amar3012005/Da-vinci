import { initialNativePane } from '../shared/native-pane-protocol';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { parkNativeHarnessSeat, takeNativeHarnessSeat, clearNativeHarnessSeat } from '../shared/native-harness-seat';
import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';
import './HarnessSurface.css';
import './BrainChat.css';
import QueryStarters from './QueryStarters';
import ChatModelConnection from '../shared/ChatModelConnection';
import { isNativeApp } from '../shared/native-app';
import { nativePlugin } from '../shared/native-auth';
import { createNativeHarnessFetch, createNativeHarnessStream, createNativeSaveFile } from '../shared/native-harness-transport';
import { createNativeHarnessLoader } from '../shared/native-harness-loader';
import { normalizeHarnessInjections, selectHarnessFetch } from './harness-transport';
import { measureHarnessBoot } from '../shared/harness-boot-timing';
import { consumeHarnessExchange } from '../shared/harness-admission-handoff';

let nativeRuntime;
function harnessRuntime() {
  if (!isNativeApp()) return null;
  if (!nativeRuntime) {
    const fetchRunner = createNativeHarnessFetch(nativePlugin);
    const loader = createNativeHarnessLoader(fetchRunner);
    nativeRuntime = { fetch: fetchRunner, loader, hooks: { remoteHost: true, fetch: fetchRunner, openStream: createNativeHarnessStream(nativePlugin), loadBundle: loader.loadBundle, saveFile: createNativeSaveFile(nativePlugin) } };
  }
  return nativeRuntime;
}
function fetchHarness(input, init) { return harnessRuntime()?.fetch(input, init) || fetch(input, init); }

const HARNESS_BOOT_PATH = '/api/hivemind/boot';
const HARNESS_SESSION_PATH = '/api/hivemind/session/establish';
const HARNESS_SHELL_PATH = '/assets/harness-shell.js';
const HARNESS_LIVENESS_INTERVAL_MS = 60000;
const HARNESS_OVERVIEW_PATH = '/hivemind/app/overview';
const HARNESS_EMPLOYEE_PATH = '/hivemind/app/employee/harness';

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
export function executeExternalScript(src, { recoverRuntime = window.location.hostname === 'runtime-runner.singulancelabs.com' } = {}) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.dshNativeScript = src;
    script.addEventListener('load', () => { resolve(); }, { once: true });
    script.addEventListener('error', async () => {
      script.remove();
      if (recoverRuntime) {
        try {
          // Refresh the exact native URL without query mutations or executing
          // fetched text. This also recovers browsers without an active SW.
          const response = await fetch(src, { credentials: 'include', cache: 'reload' });
          if (!response.ok || !/(?:javascript|ecmascript)/i.test(response.headers.get('content-type') || '')) {
            throw new Error(`Could not refresh Harness module: HTTP ${response.status}`);
          }
          await response.arrayBuffer();
          await executeExternalScript(src, { recoverRuntime: false });
          resolve();
        } catch (error) { reject(error); }
        return;
      }
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

/** Fetch ahead without changing the boot table's execution order. */
function preloadHarnessAssets(rows, shellUrl) {
  const preload = (href, module = false) => {
    const marker = `${module ? 'module' : 'script'}:${href}`;
    if ([...document.head.querySelectorAll('link[data-hive-boot-preload]')]
      .some(link => link.dataset.hiveBootPreload === marker)) return;
    const link = document.createElement('link');
    link.rel = module ? 'modulepreload' : 'preload';
    if (!module) link.as = 'script';
    link.href = href;
    link.dataset.hiveBootPreload = marker;
    document.head.append(link);
  };
  for (const row of rows || []) {
    if (['script-src', 'script-preload'].includes(row?.kind) && typeof row.src === 'string') preload(row.src);
  }
  preload(shellUrl, true);
}

/** Execute the typed Harness boot table exactly as its static worker does. */
async function applyHarnessInjections(rows, nativeLoader) {
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
          if (nativeLoader) await nativeLoader.loadBundle(row.src);
          else await executeExternalScript(row.src);
          break;
        case 'script-preload': {
          if (nativeLoader) break;
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
  'Opening chat',
];

/** Show the current real boot boundary without a logo or simulated progress. */
export function LoadingSurface({ stage = 0, dreaming = false, reconnecting = false }) {
  return <div className="hm-chat-opening">
    <AsciiWorkspaceLoading label="Connecting…" />
    {reconnecting && <button type="button" onClick={() => window.location.reload()} className="rounded-md border border-black/10 px-3 py-2 text-[12px]">Try again</button>}
  </div>;
}

/** Past-session navigation is independent of the first interactive composer. */
export function nativeHarnessMounted(container, { dreaming = false, brain = false } = {}) {
  if (dreaming) return Boolean(container?.querySelector?.('[data-dreaming-ready="true"] [data-composer-seat]'));
  if (brain) return Boolean(container?.querySelector?.('[data-composer-seat][data-hivemind-composer-ready="true"]'));
  if (/^\/hivemind\/app\/employee\/harness(?:\/|$)/.test(window.location.pathname)) {
    return Boolean(container?.querySelector?.('[data-agent-room][data-phase="active"] [data-composer-seat], [data-agent-room][data-phase="hero"] [data-composer-seat]'));
  }
  return Boolean(container?.querySelector?.('[data-slot="root"]') || container?.querySelector?.('[data-composer-seat]'));
}

export function waitForNativeHarnessMount(container, signal, { brain = false, onSlow = () => {} } = {}) {
  if (signal?.aborted) return Promise.reject(new DOMException('Harness mount cancelled.', 'AbortError'));
  const dreaming = window.location.pathname === `${HARNESS_OVERVIEW_PATH}/dreaming`;
  const mounted = () => nativeHarnessMounted(container, { dreaming, brain });
  // AppWebEntry.run renders native failures instead of rejecting. Forward that
  // report; otherwise the host hides it forever waiting for a composer.
  const failure = () => {
    const boot = container?.querySelector?.('[data-dsh-boot]');
    return boot && !boot.querySelector('[data-dsh-boot-spinner]')
      ? boot.textContent?.replace(/^HARNESS\s*/, '').trim() : null;
  };
  if (failure()) return Promise.reject(new Error(failure()));
  if (mounted()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const error = failure();
      if (error) { cleanup(); reject(new Error(error)); return; }
      if (!mounted()) return;
      cleanup();
      resolve();
    });
    const timeout = window.setTimeout(() => {
      // The native connection still owns reconnect/backoff. Retain its mount
      // observer so a late transport recovery can reveal the existing chat.
      onSlow();
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
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-dreaming-ready', 'data-hivemind-composer-ready', 'data-phase'] });
    // A synchronous native insertion can occur between the first check and
    // observer registration.
    if (mounted()) {
      cleanup();
      resolve();
    }
  });
}

function isFreshHarnessRoute() {
  return window.location.pathname === `${HARNESS_OVERVIEW_PATH}/new`
    || window.location.pathname === `${HARNESS_EMPLOYEE_PATH}/new`;
}

export async function establishHarnessSession({ fresh = false } = {}) {
  const path = fresh ? '/v1/harness-chat/new-session' : '/v1/harness-chat/bootstrap';
  const { data: admission } = await measureHarnessBoot('admission-ticket', () => apiClient.controlPlane.post(path, {}));
  // The rollout is deliberately binary.  A user outside the Harness cohort
  // must stay on the existing LangGraph conversation surface, including when
  // they arrive through a stale /overview/new or /overview/session/:id URL.
  if (admission?.mode === 'legacy') {
    // Brain rollout eligibility cannot move an existing employee conversation
    // to another product or discard a pending native draft during recovery.
    if (/^\/hivemind\/app\/employee\/harness(?:\/|$)/.test(window.location.pathname)) {
      throw new Error('Runtime admission is temporarily unavailable. Your conversation is saved; retry this room.');
    }
    return { mode: 'legacy' };
  }
  if (admission?.mode !== 'harness') throw new Error('HIVEMIND could not open this session.');
  if (typeof admission.ticket !== 'string' || admission.ticket.length === 0) {
    throw new Error('HIVEMIND could not authorize this session.');
  }
  const established = await measureHarnessBoot('session-cookie', () => fetchHarness(HARNESS_SESSION_PATH, {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ticket: admission.ticket, request_id: crypto.randomUUID() }),
  }));
  if (!established.ok) throw new Error('Could not open your secure HIVEMIND session.');
  window.dispatchEvent(new Event('hivemind:session-established'));
  return { mode: 'harness' };
}

/**
 * Direct host for the complete native Harness browser graph. Da-vinci owns
 * only placement and HIVE authentication; the mounted client owns sessions,
 * streams, replay, nodes, tool cards, approvals, subagents and trajectory.
 */
export default function HarnessSurface({ sessionEstablished = false, brain = false } = {}) {
  const { user, org } = useAuth();
  const ownerScope = `${user?.id || ""}:${org?.id || ""}`;
  const mountRef = useRef(null);
  const [state, setState] = useState({ phase: 'loading', stage: 0, message: null });

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return undefined;
    const retained = takeNativeHarnessSeat(window.__DSH_EMBED_APP__, host, ownerScope);
    const mount = retained?.container || document.createElement('div');
    if (!retained) { mount.className = 'h-full min-h-0'; host.append(mount); }
    let cancelled = false;
    let recovering = false;
    let checkingSession = false;
    let livenessTimer;
    const readinessAbort = new AbortController();
    const onSessionOpenError = (event) => {
      const detail = event.detail;
      if (cancelled || detail?.path !== window.location.pathname) return;
      setState({ phase: 'error', stage: 0, message: String(detail.message || 'The chat could not be opened.') });
    };
    window.addEventListener('hivemind:session-open-error', onSessionOpenError);
    const request = { container: mount, cancelled: false };
    const onSlowMount = () => {
      if (!cancelled) setState({ phase: 'reconnecting', stage: HARNESS_BOOT_STAGES.length - 1, message: null });
    };
    const setLoadingStage = (stage) => {
      if (!cancelled) setState({ phase: 'loading', stage, message: null });
    };

    const recoverExpiredSession = async () => {
      if (cancelled || recovering || checkingSession || document.visibilityState === 'hidden') return;
      checkingSession = true;
      try {
        const response = await fetchHarness(HARNESS_BOOT_PATH, {
          method: 'HEAD', credentials: 'include', cache: 'no-store',
          signal: readinessAbort.signal,
        });
        if (response.status !== 401 && response.status !== 403) return;
        if (cancelled) return;
        recovering = true;
        await establishHarnessSession();
        if (!cancelled) window.location.reload();
      } catch {
        // A transient network outage remains owned by native Harness recovery.
        // Only an authoritative expired-session response triggers re-admission.
      } finally {
        recovering = false;
        checkingSession = false;
      }
    };

    const start = async () => {
      if (retained) {
        window.__DSH_EMBED_REQUEST__ = request;
        if (window.__DSH_EMBED_INITIAL_MOUNT__) await window.__DSH_EMBED_INITIAL_MOUNT__;
        window.dispatchEvent(new PopStateEvent('popstate'));
        await waitForNativeHarnessMount(mount, readinessAbort.signal, { brain, onSlow: onSlowMount });
        if (!cancelled) {
          setState({ phase: 'ready', stage: HARNESS_BOOT_STAGES.length - 1, message: null });
          livenessTimer = window.setInterval(() => { void recoverExpiredSession(); }, HARNESS_LIVENESS_INTERVAL_MS);
          window.addEventListener('online', recoverExpiredSession);
          document.addEventListener('visibilitychange', recoverExpiredSession);
        }
        return;
      }
      const runtime = harnessRuntime();
      if (runtime) {
        window.__DSH_TRANSPORT__ = runtime.hooks;
        window.__DSH_FILE_UPLOAD__ = { fetch: runtime.fetch };
      }
      const recentlyEstablished = sessionEstablished || consumeHarnessExchange(window.location.pathname);
      const admission = recentlyEstablished ? { mode: 'harness' }
        : await establishHarnessSession({ fresh: isFreshHarnessRoute() });
      if (admission.mode === 'legacy') {
        // Never render or boot the native client for a legacy user.  This
        // replaces the former "not admitted" dead end with the established
        // LangGraph/LangChain chat, retaining the feature flag as rollback.
        window.location.replace(HARNESS_OVERVIEW_PATH);
        return;
      }
      setLoadingStage(1);
      let bootResponse = await measureHarnessBoot('boot-graph', () => fetchHarness(HARNESS_BOOT_PATH, { credentials: 'include', cache: 'no-store' }));
      // Dreaming just established this cookie. If it expires before boot,
      // re-admit once; the runner remains the authentication authority.
      if (recentlyEstablished && [401, 403].includes(bootResponse.status)) {
        const renewed = await establishHarnessSession();
        if (renewed.mode !== 'harness') { window.location.replace(HARNESS_OVERVIEW_PATH); return; }
        bootResponse = await fetchHarness(HARNESS_BOOT_PATH, { credentials: 'include', cache: 'no-store' });
      }
      if (!bootResponse.ok) throw new Error('HIVEMIND could not verify your session.');
      const boot = await measureHarnessBoot('boot-body', () => bootResponse.json());
      if (cancelled) return;
      const bootRevision = harnessBootRevision(boot.injections);
      if (bootRevision === null) {
        throw new Error('HIVEMIND could not load its current application.');
      }
      const installedRevision = window.__HIVE_HARNESS_BOOT_REV__;
      if (typeof installedRevision === 'string' && installedRevision !== bootRevision) {
        window.location.reload();
        return;
      }
      let embeddedParentOrigin;
      if (initialNativePane) { try { embeddedParentOrigin = new URL(document.referrer).origin; } catch { embeddedParentOrigin = null; } }
      const styles = Array.isArray(boot.styles) ? boot.styles : [];
      if (styles.length === 0) throw new Error('HIVEMIND could not load the conversation appearance.');
      const shellUrl = harnessShellUrl(boot.injections);
      if (!runtime) preloadHarnessAssets(boot.injections, shellUrl);
      // Styles and ordered script execution are independent downloads. Wait
      // for both before mounting, avoiding flashes of unstyled conversation.
      await Promise.all([
        measureHarnessBoot('styles', () => Promise.all(styles.map(runtime ? runtime.loader.loadStyle : loadHarnessStylesheet))),
        measureHarnessBoot('ordered-injections', () => installedRevision !== bootRevision ? applyHarnessInjections(normalizeHarnessInjections(boot.injections, window.location.origin, embeddedParentOrigin), runtime?.loader) : Promise.resolve()),
        measureHarnessBoot('native-module-prepare', () => runtime ? runtime.loader.prepareModule(shellUrl) : Promise.resolve()),
      ]);
      if (installedRevision !== bootRevision) window.__HIVE_HARNESS_BOOT_REV__ = bootRevision;
      setLoadingStage(2);
      if (cancelled) return;
      // The native mux uses the document base by default. This surface can be
      // mounted beneath a nested SPA route, so root browser RPC URLs at the app
      // origin while retaining any shell-owned authenticated fetch carrier.
      const appOrigin = window.location.origin;
      const existingTransport = window.__DSH_TRANSPORT__ || {};
      window.__DSH_TRANSPORT__ = {
        ...existingTransport,
        fetch: selectHarnessFetch(appOrigin, existingTransport.fetch, window.fetch.bind(window)),
        streamBaseUrl: existingTransport.streamBaseUrl ?? appOrigin,
      };
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
      if (cancelled) return;
      // A fast OS → BRAIN transition can create the next host while the
      // previous native app is still disposing. Wait for that teardown before
      // remounting the cached module, otherwise the old dispose can erase the
      // new DOM and leave a blank Overview canvas.
      const pendingDispose = window.__HIVE_HARNESS_DISPOSE_PROMISE__;
      if (pendingDispose && typeof pendingDispose.then === 'function') await measureHarnessBoot('previous-dispose', () => pendingDispose);
      if (cancelled) return;
      window.__DSH_EMBED_REQUEST__ = request;
      setLoadingStage(3);
      // The module URL changes only when the authenticated Harness release
      // graph changes. Re-entering Overview reuses the parsed module and calls
      // its explicit mount entry instead of downloading ~500 KiB again.
      await measureHarnessBoot('shell-import', () => runtime ? runtime.loader.importModule(shellUrl) : import(/* webpackIgnore: true */ shellUrl));
      if (cancelled) return;
      if (window.__DSH_EMBED_APP__ === undefined) {
        if (typeof window.__DSH_EMBED_MOUNT__ !== 'function') {
          throw new Error('HIVEMIND could not reopen this conversation.');
        }
        await measureHarnessBoot('native-mount', () => window.__DSH_EMBED_MOUNT__());
      } else {
        await measureHarnessBoot('native-initial-mount', () => window.__DSH_EMBED_INITIAL_MOUNT__);
      }
      await measureHarnessBoot('visible-chat', () => waitForNativeHarnessMount(mount, readinessAbort.signal, { brain, onSlow: onSlowMount }));
      if (!cancelled) {
        setState({ phase: 'ready', stage: HARNESS_BOOT_STAGES.length - 1, message: null });
        livenessTimer = window.setInterval(() => { void recoverExpiredSession(); }, HARNESS_LIVENESS_INTERVAL_MS);
        window.addEventListener('online', recoverExpiredSession);
        document.addEventListener('visibilitychange', recoverExpiredSession);
      }
    };

    start().catch((error) => {
      if (!cancelled) setState({ phase: 'error', stage: 0, message: error instanceof Error ? error.message : 'Could not open HIVEMIND chat.' });
    });

    return () => {
      cancelled = true;
      if (livenessTimer !== undefined) window.clearInterval(livenessTimer);
      window.removeEventListener('online', recoverExpiredSession);
      document.removeEventListener('visibilitychange', recoverExpiredSession);
      request.cancelled = true;
      readinessAbort.abort();
      window.removeEventListener('hivemind:session-open-error', onSessionOpenError);
      // An already-started shell import can evaluate after route exit. Keep its
      // cancelled seat visible: absent request means standalone mode to native
      // main.ts, which would mount into the outer React #root. The next embed
      // replaces this tombstone only after the previous app has disposed.
      const currentApp = window.__DSH_EMBED_APP__;
      if (parkNativeHarnessSeat(currentApp, mount, window.location.pathname, ownerScope)) return;
      clearNativeHarnessSeat();
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
    };
  }, [sessionEstablished, ownerScope]);

  if (state.phase === 'error') {
    return <div className="h-full min-h-[420px] grid place-items-center bg-[#faf9f4] px-6">
      <div className="max-w-md text-center">
        <p className="text-[14px] font-semibold text-[#0a0a0a]">HIVE-MIND chat is unavailable</p>
        <p className="mt-2 text-[12px] leading-5 text-[#737373]">{state.message}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-md bg-[#117dff] px-3 py-2 text-[12px] font-medium text-white">Try again</button>
      </div>
    </div>;
  }

  return <div className="relative h-full min-h-0 bg-[#faf9f4]" data-hivemind-harness-surface data-brain-chat={brain ? '' : undefined}>
    {(state.phase === 'loading' || state.phase === 'reconnecting') && <div className="absolute inset-0 z-10"><LoadingSurface stage={state.stage} reconnecting={state.phase === 'reconnecting'} dreaming={window.location.pathname === `${HARNESS_OVERVIEW_PATH}/dreaming`} /></div>}
    <div ref={mountRef} className="h-full min-h-0" style={{ visibility: state.phase === 'ready' ? 'visible' : 'hidden' }} />
    {brain && <ChatModelConnection />}
    <QueryStarters mount={mountRef.current} ready={state.phase === 'ready'} />
  </div>;
}
