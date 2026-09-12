import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../shared/api-client';

const HARNESS_BOOT_PATH = '/api/hivemind/boot';
const HARNESS_SESSION_PATH = '/api/hivemind/session/establish';
const HARNESS_SHELL_PATH = '/assets/harness-shell.js';

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
    script.addEventListener('load', () => { script.remove(); resolve(); }, { once: true });
    script.addEventListener('error', () => { script.remove(); reject(new Error(`Could not load Harness module: ${src}`)); }, { once: true });
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
  const ready = window.__DSH_BOOT_READY__ || deferred();
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

function LoadingSurface() {
  return (
    <div className="h-full min-h-[420px] grid place-items-center bg-[#faf9f4]" aria-live="polite">
      <div className="flex items-center gap-3 text-[13px] text-[#737373]">
        <span className="h-5 w-5 rounded-full border-2 border-[#dbeafe] border-t-[#117dff] animate-spin" />
        <span>Opening your HIVE-MIND workspace…</span>
      </div>
    </div>
  );
}

/**
 * Direct host for the complete native Harness browser graph. Da-vinci owns
 * only placement and HIVE authentication; the mounted client owns sessions,
 * streams, replay, nodes, tool cards, approvals, subagents and trajectory.
 */
export default function HarnessSurface() {
  const mountRef = useRef(null);
  const [state, setState] = useState({ phase: 'loading', message: null });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let cancelled = false;
    const request = { container: mount, cancelled: false };

    const start = async () => {
      const { data: admission } = await apiClient.controlPlane.post("/v1/harness-chat/bootstrap", {});
      if (admission?.mode !== 'harness' && admission?.mode !== 'preview') {
        throw new Error('Harness chat is not admitted for this account yet.');
      }
      if (typeof admission.ticket !== 'string' || admission.ticket.length === 0) {
        throw new Error('Harness admission did not return a session ticket.');
      }
      const established = await fetch(HARNESS_SESSION_PATH, {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ticket: admission.ticket, request_id: crypto.randomUUID() }),
      });
      if (!established.ok) throw new Error('Could not establish the secure Harness session.');
      const bootResponse = await fetch(HARNESS_BOOT_PATH, { credentials: 'include', cache: 'no-store' });
      if (!bootResponse.ok) throw new Error('Harness did not accept the authenticated browser session.');
      const boot = await bootResponse.json();
      if (cancelled) return;
      const styles = Array.isArray(boot.styles) ? boot.styles : [];
      if (styles.length === 0) throw new Error('Harness returned no native styles.');
      await Promise.all(styles.map(loadHarnessStylesheet));
      if (cancelled) return;
      await applyHarnessInjections(boot.injections);
      if (cancelled) return;
      window.__DSH_EMBED_REQUEST__ = request;
      // A unique module URL makes a later visit to Overview mount again while
      // all hashed Harness chunks stay cached by the browser.
      await import(/* webpackIgnore: true */ `${HARNESS_SHELL_PATH}?mount=${encodeURIComponent(crypto.randomUUID())}`);
      if (!cancelled) setState({ phase: 'ready', message: null });
    };

    start().catch((error) => {
      if (!cancelled) setState({ phase: 'error', message: error instanceof Error ? error.message : 'Could not open Harness chat.' });
    });

    return () => {
      cancelled = true;
      request.cancelled = true;
      if (window.__DSH_EMBED_REQUEST__ === request) window.__DSH_EMBED_REQUEST__ = undefined;
      const app = window.__DSH_EMBED_APP__;
      window.__DSH_EMBED_APP__ = undefined;
      if (app) void app.dispose();
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
    {state.phase === 'loading' && <div className="absolute inset-0 z-10"><LoadingSurface /></div>}
    <div ref={mountRef} className="h-full min-h-0" />
  </div>;
}
