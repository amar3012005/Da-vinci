import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { PANE_ORIGINS, PANE_EVENTS, PANE_REQUESTS, paneForPath, panePath, paneSource, validPaneMessage, rememberPaneRoute } from '../shared/native-pane-protocol';

export function nativePreviewExpanded(doc) { return Boolean(doc.querySelector('[data-sidebar-right-panel][data-sidebar-right-open]')); }

function NativePane({ mode, entry, active, route, scope, onRoute }) {
  const frame = useRef(null); const [identified, setIdentified] = useState(false); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  const latest = useRef({ active, route }); latest.current = { active, route };
  const nativePath = useRef(entry); const pending = useRef(new Map());
  useEffect(() => {
    if (identified) { setError(false); return undefined; }
    // The child's React bridge may install before or after window.load.
    // Repeat only the idempotent, scoped handshake; keep the document resident.
    const handshake = window.setInterval(() => send({ kind: 'hello' }), 1000);
    const timeout = window.setTimeout(() => { window.clearInterval(handshake); setError(true); }, 30000);
    return () => { window.clearTimeout(timeout); window.clearInterval(handshake); };
  }, [identified, retry, mode, scope]);
  const send = data => frame.current?.contentWindow?.postMessage({ type: 'hivemind.native-pane', version: 1, scope, ...data }, PANE_ORIGINS[mode]);
  useEffect(() => {
    let start;
    const receive = event => {
      if (!validPaneMessage(event, frame.current, mode, scope)) return;
      const data = event.data;
      if (['identity', 'ready'].includes(data.kind)) {
        setIdentified(true);
        const requested = panePath(latest.current.route, mode);
        if (latest.current.active && requested && requested !== nativePath.current) send({ kind: 'navigate', path: requested });
      }
      if (data.kind === 'ready' && mode === 'runtime') {
        start = id => new Promise(resolve => {
          const requestId = window.crypto.randomUUID();
          const timer = window.setTimeout(() => { pending.current.delete(requestId); resolve(false); }, 15000);
          pending.current.set(requestId, { resolve, timer }); send({ kind: 'start-agent', id, requestId });
        });
        start.nativePane = true; window.__HIVEMIND_START_AGENT__ = start;
      }
      if (data.kind === 'result') {
        const call = pending.current.get(data.requestId);
        if (call) { window.clearTimeout(call.timer); pending.current.delete(data.requestId); call.resolve(data.ok === true); }
      }
      if (data.kind === 'route' && panePath(data.path, mode)) {
        nativePath.current = panePath(data.path, mode); onRoute(mode, nativePath.current, latest.current.active);
      }
      if (data.kind === 'open-page' && latest.current.active && typeof data.path === 'string' && data.path.startsWith('/hivemind/app/') && !data.path.includes('\\')) onRoute(mode, data.path, true);
      if (data.kind === 'event' && PANE_EVENTS.includes(data.name) && (mode === 'runtime' || ['hivemind:close-sidebar', 'hivemind:open-sidebar'].includes(data.name)) && (latest.current.active || ['hivemind:agent-rooms', 'hivemind:agent-schedules', 'hivemind:runtime-get-started'].includes(data.name))) window.dispatchEvent(new CustomEvent(data.name, { detail: data.detail }));
    };
    const request = event => send({ kind: 'request', name: event.type });
    window.addEventListener('message', receive);
    if (mode === 'runtime') for (const name of PANE_REQUESTS) window.addEventListener(name, request);
    return () => {
      window.removeEventListener('message', receive);
      for (const name of PANE_REQUESTS) window.removeEventListener(name, request);
      if (window.__HIVEMIND_START_AGENT__ === start) delete window.__HIVEMIND_START_AGENT__;
      for (const call of pending.current.values()) { window.clearTimeout(call.timer); call.resolve(false); } pending.current.clear();
    };
  }, [mode, scope, onRoute]);
  useEffect(() => {
    const path = panePath(route, mode);
    if (active && identified && path && path !== nativePath.current) send({ kind: 'navigate', path });
  }, [active, identified, route, mode]);
  useEffect(() => {
    if (mode !== 'runtime' || !active || !identified) return undefined;
    let observer; let scheduled; let stopped = false; let last;
    const publish = open => { if (open !== last) { last = open; window.dispatchEvent(new CustomEvent('hivemind:preview-visibility', {detail:{open}})); } };
    const attach = () => {
      observer?.disconnect();
      let doc; try { doc = frame.current?.contentDocument; } catch { return; }
      if (!doc?.body) return;
      const update = () => {
        scheduled = undefined; if (stopped) return;
        publish(nativePreviewExpanded(doc));
      };
      observer = new MutationObserver(() => { if (!scheduled) scheduled = requestAnimationFrame(update); });
      observer.observe(doc.body, {subtree:true,childList:true,attributes:true,attributeFilter:['data-sidebar-right-open','data-sidebar-right-panel']});
      update();
    };
    const element = frame.current; element?.addEventListener('load',attach); attach();
    return () => { stopped=true; observer?.disconnect(); if (scheduled) cancelAnimationFrame(scheduled); element?.removeEventListener('load',attach); publish(false); };
  }, [mode, active, identified, route]);
  return <section hidden={!active} data-native-pane={mode} className="relative h-full min-h-0" style={{ display: active ? 'block' : 'none' }}>
    {!identified && <div className="absolute inset-0 grid place-items-center bg-[#faf9f4]">{error ? <div role="alert" className="max-w-sm text-center text-sm"><p>This conversation hasn’t connected yet. Your saved work is unchanged.</p><button className="mt-3 underline" onClick={() => { setError(false); setRetry(value => value + 1); frame.current.src = paneSource(nativePath.current || entry, mode); }}>Try again</button></div> : <AsciiWorkspaceLoading />}</div>}
    <iframe ref={frame} title={mode === 'brain' ? 'Brain conversation' : 'Runtime and HyperAgents conversation'} src={paneSource(entry, mode)} onLoad={() => send({ kind: 'hello' })} allow="microphone; autoplay; clipboard-write" referrerPolicy="strict-origin" className="h-full w-full border-0 bg-[#faf9f4]" style={{ visibility: identified ? 'visible' : 'hidden' }} />
  </section>;
}

// One shell, at most one native client document per runner, retained until identity changes.
export default function PersistentHarnessPanes() {
  const location = useLocation(); const navigate = useNavigate(); const navigateRef = useRef(navigate); navigateRef.current = navigate; const { user, org } = useAuth();
  const scope = `${user?.id || ''}:${org?.id || ''}`; const active = paneForPath(location.pathname);
  const path = location.pathname + location.search + location.hash;
  const [visited, setVisited] = useState(() => active ? { [active]: path } : {});
  const lastRoutes = useRef({}); const activePath = useRef(path); activePath.current = path;
  useLayoutEffect(() => { if (active) { lastRoutes.current[active] = path; setVisited(before => before[active] ? before : { ...before, [active]: path }); } }, [active, path]);
  // Stable callback: listeners and pending native commands survive parent route changes.
  const routeChanged = React.useCallback((mode, next, isActive) => {
    lastRoutes.current[mode] = next; rememberPaneRoute(mode, next, scope);
    if (isActive && next !== activePath.current) navigateRef.current(next, { replace: true });
  }, [scope]);
  return <>{Object.entries(visited).map(([mode, entry]) => <NativePane key={`${scope}:${mode}`} mode={mode} entry={entry} active={active === mode} route={active === mode ? path : lastRoutes.current[mode] || entry} scope={scope} onRoute={routeChanged} />)}</>;
}
