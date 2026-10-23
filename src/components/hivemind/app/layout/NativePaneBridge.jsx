import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialNativePane, PANE_ORIGINS, PANE_EVENTS, PANE_REQUESTS, panePath } from '../shared/native-pane-protocol';

// UI navigation/status only. No tokens, model requests or execution authority cross this bridge.
export default function NativePaneBridge({ scope }) {
  const navigate = useNavigate(); const navigation = useRef(navigate); navigation.current = navigate;
  useEffect(() => {
    if (!initialNativePane || window.parent === window || !scope || scope === ':') return undefined;
    let parentOrigin;
    try { parentOrigin = new URL(document.referrer).origin; } catch { return undefined; }
    if (!Object.values(PANE_ORIGINS).includes(parentOrigin)) return undefined;
    const send = data => window.parent.postMessage({ type: 'hivemind.native-pane', version: 1, scope, ...data }, parentOrigin);
    let lastPath; let ready = false; let scheduled; let rosterPending = false; let stopped = false;
    const publishRoster = async () => {
      if (initialNativePane !== 'runtime' || rosterPending) return;
      rosterPending = true;
      try {
        const response = await fetch('/api/hivemind/employees', {credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
        if (!response.ok) return;
        const value = await response.json();
        if (!stopped && Array.isArray(value.profiles)) send({kind:'roster',profiles:value.profiles});
      } catch { /* Native admission or a later ready message retries this read. */ }
      finally { rosterPending = false; }
    };
    const inspect = () => {
      scheduled = undefined;
      const path = panePath(window.location.pathname + window.location.search + window.location.hash, initialNativePane);
      if (path && path !== lastPath) {
        lastPath = path;
        const own = new URL(window.location.href); own.searchParams.set('native_pane', '1');
        if (own.href !== window.location.href) window.history.replaceState(window.history.state, '', own);
        send({ kind: 'route', path });
      }
      if (!ready && document.querySelector('[data-composer-seat]')) {
        ready = true; send({ kind: 'ready', path: lastPath });
        for (const name of PANE_REQUESTS) window.dispatchEvent(new Event(name));
      }
    };
    const changed = () => { if (!scheduled) scheduled = requestAnimationFrame(inspect); };
    const observer = new MutationObserver(changed); observer.observe(document.body, { childList: true, subtree: true });
    const receive = async event => {
      const data = event.data;
      if (event.source !== window.parent || event.origin !== parentOrigin || data?.type !== 'hivemind.native-pane' || data?.version !== 1 || data.scope !== scope) return;
      if (data.kind === 'hello') { send({ kind: 'identity', path: lastPath }); if (ready) send({ kind: 'ready', path: lastPath }); }
      else if (data.kind === 'navigate') {
        const path = panePath(data.path, initialNativePane);
        if (path && path !== lastPath) { const url = new URL(path, window.location.origin); url.searchParams.set('native_pane', '1'); navigation.current(url.pathname + url.search + url.hash); window.dispatchEvent(new PopStateEvent('popstate')); }
      } else if (data.kind === 'request' && data.name === 'hivemind:request-agent-roster') { await publishRoster(); }
      else if (data.kind === 'request' && PANE_REQUESTS.includes(data.name)) window.dispatchEvent(new Event(data.name));
      else if (data.kind === 'start-agent' && initialNativePane === 'runtime' && typeof data.id === 'string' && data.id.length < 200) {
        try { const start = await runtimeStartHook(); const ok = start !== undefined && await start(data.id); send({ kind: 'result', requestId: data.requestId, ok: Boolean(ok) }); } catch { send({ kind: 'result', requestId: data.requestId, ok: false }); }
      }
    };
    // Runtime publishes its start hook when its client plugins start; a request
    // that arrives first waits for it for as long as this document lives.
    const runtimeStartHook = async () => {
      while (!stopped) {
        if (typeof window.__HIVEMIND_START_AGENT__ === 'function') return window.__HIVEMIND_START_AGENT__;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      return undefined;
    };
    const forward = event => send({ kind: 'event', name: event.type, detail: event.detail });
    const link = event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target?.closest?.('a[href]'); if (!anchor || anchor.target === '_blank' || anchor.download) return;
      const target = new URL(anchor.href, window.location.origin);
      if (target.origin !== window.location.origin || !target.pathname.startsWith('/hivemind/app/') || panePath(target.pathname + target.search, initialNativePane)) return;
      event.preventDefault(); send({ kind: 'open-page', path: target.pathname + target.search + target.hash });
    };
    window.addEventListener('message', receive); window.addEventListener('popstate', changed); document.addEventListener('click', link, true);
    for (const name of PANE_EVENTS) window.addEventListener(name, forward);
    send({ kind: 'identity', path: panePath(window.location.pathname + window.location.search, initialNativePane) }); inspect();
    return () => { stopped = true; observer.disconnect(); cancelAnimationFrame(scheduled); window.removeEventListener('message', receive); window.removeEventListener('popstate', changed); document.removeEventListener('click', link, true); for (const name of PANE_EVENTS) window.removeEventListener(name, forward); };
  }, [scope]);
  return null;
}
