import { openDotEmployeeIdFromPath } from '../shared/open-dot-employee-route';
import { openDotRoomStatus } from '../shared/open-dot-room-status';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { buildOpenDotEmbedTarget } from '../shared/open-dot-embed-target';

const DOT_ORIGIN = 'https://dots.singulancelabs.com';
const READY_TIMEOUT_MS = 30000;

export default function OpenDotEntry({ apps = false }) {
  const { pathname, search } = useLocation();
  const suffix = apps ? '/apps' : pathname.slice('/hivemind/app/employee/dots'.length);
  const src = useMemo(() => buildOpenDotEmbedTarget(suffix, search), [suffix, search]);
  const iframeRef = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [readyFrameKey, setReadyFrameKey] = useState(null);
  const [timedOutFrameKey, setTimedOutFrameKey] = useState(null);
  const frameKey = `${src || 'invalid'}:${attempt}`;
  const ready = readyFrameKey === frameKey;
  const timedOut = timedOutFrameKey === frameKey;

  useEffect(() => {
    if (!src) return undefined;
    const timer = window.setTimeout(() => setTimedOutFrameKey(frameKey), apps ? 15000 : READY_TIMEOUT_MS);
    const onMessage = event => {
      if (event.origin !== DOT_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      const rooms = openDotRoomStatus(event.data, openDotEmployeeIdFromPath(pathname));
      if (rooms !== null) {
        window.dispatchEvent(new CustomEvent('hivemind:open-dot-rooms', { detail: { employeeId: openDotEmployeeIdFromPath(pathname), dotId: event.data.dotId, rooms, employees: event.data.employees } }));
        return;
      }
      if (event.data?.type !== 'hivemind.open-dot.ready' || event.data?.version !== 1) return;
      setReadyFrameKey(frameKey);
      window.clearTimeout(timer);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      window.dispatchEvent(new CustomEvent('hivemind:open-dot-rooms', { detail: { clear: true } }));
    };
  }, [frameKey, src, pathname, apps]);

  if (!src) return <main className="flex h-full min-h-0 items-center justify-center p-6 text-sm text-[#737373]">Invalid Dot address.</main>;

  return (
    <main className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white" aria-busy={!ready && !timedOut}>
      {!ready && !timedOut && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white" role="status" aria-live="polite">
          <span className="flex items-center gap-3 text-sm text-[#737373]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4d4d4] border-t-[#333333]" />Opening workspace…</span>
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
        title={apps ? 'Apps' : 'Open Dot workspace'}
        src={src}
        allow="microphone; autoplay"
        className="h-full min-h-0 w-full flex-1 border-0"
      />
    </main>
  );
}
