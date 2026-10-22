import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { openDotEmployeeIdFromPath } from '../shared/open-dot-employee-route';
import { openDotRoomStatus } from '../shared/open-dot-room-status';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { buildOpenDotEmbedTarget } from '../shared/open-dot-embed-target';

const DOT_ORIGIN = 'https://runtime-runner.singulancelabs.com';
const READY_TIMEOUT_MS = 30000;

export function postToDotFrame(frame, message) {
  const target = frame?.contentWindow;
  if (!target) return;
  // The initial about:blank document and same-origin login redirects are not
  // the Dot application. Never send its handshake into those documents.
  try {
    if (target.location.origin !== DOT_ORIGIN || typeof target.location.pathname !== 'string'
      || !/^\/(?:employees\/|dots\/|apps(?:\/|$)|$)/.test(target.location.pathname)) return;
  }
  catch { /* Cross-origin window: the exact targetOrigin below enforces delivery. */ }
  target.postMessage(message, DOT_ORIGIN);
}

export default function OpenDotEntry({ apps = false, route, initialRoute, active = true }) {
  const location = useLocation();
  const { pathname, search } = route || location;
  const suffix = apps ? '/apps' : pathname.slice('/hivemind/app/employee/dots'.length);
  const src = useMemo(() => buildOpenDotEmbedTarget(suffix, search), [suffix, search]);
  const initialTarget = useRef(initialRoute ? buildOpenDotEmbedTarget(initialRoute.pathname.slice('/hivemind/app/employee/dots'.length), initialRoute.search) : src);
  const iframeRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [loadedFrameKey, setLoadedFrameKey] = useState(null);
  const [readyEmployee, setReadyEmployee] = useState(null);
  const employeeId = openDotEmployeeIdFromPath(pathname);
  const [attempt, setAttempt] = useState(0);
  const [readyFrameKey, setReadyFrameKey] = useState(null);
  const [timedOutFrameKey, setTimedOutFrameKey] = useState(null);
  const frameKey = `${initialTarget.current || 'invalid'}:${attempt}`;
  const ready = readyFrameKey === frameKey && (!employeeId || readyEmployee === employeeId);
  const timedOut = timedOutFrameKey === frameKey;

  useEffect(() => {
    if (!src) return undefined;
    const timer = window.setTimeout(() => { setTimedOutFrameKey(frameKey); window.clearInterval(probe); }, apps ? 15000 : READY_TIMEOUT_MS);
    const connect = () => { if (loadedFrameKey === frameKey) postToDotFrame(iframeRef.current, { type: 'hivemind.open-dot.connect', version: 1 }); };
    connect();
    const probe = window.setInterval(connect, 1000);
    const onMessage = event => {
      if (event.origin !== DOT_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'hivemind.open-dot.preview' && event.data.version === 1 && active) {
        window.dispatchEvent(new CustomEvent('hivemind:preview-visibility', {detail:{open:event.data.open === true}}));
        return;
      }
      const rooms = openDotRoomStatus(event.data, openDotEmployeeIdFromPath(pathname));
      if (rooms !== null) {
        window.dispatchEvent(new CustomEvent('hivemind:open-dot-rooms', { detail: { employeeId: openDotEmployeeIdFromPath(pathname), dotId: event.data.dotId, clear: event.data.connected === false, rooms, employees: event.data.employees } }));
        return;
      }
      if (event.data?.type !== 'hivemind.open-dot.ready' || event.data?.version !== 1) return;
      setLoaded(true);
      setReadyEmployee(event.data.employeeId || null);
      setReadyFrameKey(frameKey);
      window.clearTimeout(timer);
      window.clearInterval(probe);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(probe);
      window.removeEventListener('message', onMessage);
      if (active) window.dispatchEvent(new CustomEvent('hivemind:preview-visibility', {detail:{open:false}}));
    };
  }, [frameKey, loadedFrameKey, src, pathname, apps, active]);

  useEffect(() => {
    if (!active || !loaded || !employeeId || !src || readyEmployee === employeeId) return;
    postToDotFrame(iframeRef.current, { type: 'hivemind.open-dot.navigate', version: 1, employeeId, target: src });
  }, [active, loaded, employeeId, src, readyEmployee]);

  if (!src) return <main className="flex h-full min-h-0 items-center justify-center p-6 text-sm text-[#737373]">Invalid Dot address.</main>;

  return (
    <main className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white" aria-busy={!ready && !timedOut}>
      {!ready && !timedOut && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
          <AsciiWorkspaceLoading label="Connecting…" />
        </div>
      )}
      {timedOut && !ready && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center" role="alert">
          <p className="text-sm text-[#555]">The workspace hasn’t finished loading.</p>
          <button type="button" onClick={() => setAttempt(value => value + 1)} className="rounded-md border border-[#d4d4d4] px-3 py-2 text-sm text-[#333] hover:bg-[#f7f7f7]">Try again</button>
        </div>
      )}
      <iframe
        key={frameKey}
        ref={iframeRef}
        onLoad={() => setLoadedFrameKey(frameKey)}
        title={apps ? 'Apps' : 'Open Dot workspace'}
        src={initialTarget.current}
        allow="microphone; autoplay"
        className="h-full min-h-0 w-full flex-1 border-0"
      />
    </main>
  );
}
