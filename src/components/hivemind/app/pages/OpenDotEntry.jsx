import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const DOT_ORIGIN = 'https://dots.singulancelabs.com';
const EMPLOYEE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOT_ID = /^dot_[a-zA-Z0-9_-]+$/;
const CONVERSATION_ID = /^conv_[a-zA-Z0-9_-]+$/;
const READY_TIMEOUT_MS = 30000;

export function buildOpenDotEmbedTarget(suffix, search = '') {
  const route = suffix.replace(/\/+$/, '');
  const query = new URLSearchParams(search);
  const conversation = query.get('c');
  if (conversation && !CONVERSATION_ID.test(conversation)) return null;

  let path;
  if (!route) path = '/';
  else if (route.startsWith('/employee/')) {
    const employeeId = route.slice('/employee/'.length);
    if (!EMPLOYEE_ID.test(employeeId)) return null;
    path = `/employees/${employeeId}`;
  } else if (route.startsWith('/dot_') && DOT_ID.test(route.slice(1))) {
    path = `/dots/${route.slice(1)}`;
  } else return null;

  const target = new URL(path, DOT_ORIGIN);
  target.searchParams.set('embed', 'hivemind');
  if (conversation) target.searchParams.set('c', conversation);
  return target.href;
}

export default function OpenDotEntry() {
  const { pathname, search } = useLocation();
  const suffix = pathname.slice('/hivemind/app/employee/dots'.length);
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
    const timer = window.setTimeout(() => setTimedOutFrameKey(frameKey), READY_TIMEOUT_MS);
    const onMessage = event => {
      if (event.origin !== DOT_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== 'hivemind.open-dot.ready' || event.data?.version !== 1) return;
      setReadyFrameKey(frameKey);
      window.clearTimeout(timer);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
  }, [frameKey, src]);

  if (!src) return <main className="flex h-full min-h-0 items-center justify-center p-6 text-sm text-[#737373]">Invalid Dot address.</main>;

  return (
    <main className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white" aria-busy={!ready}>
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
        title="Open Dot workspace"
        src={src}
        allow="microphone; autoplay"
        className="h-full min-h-0 w-full flex-1 border-0"
      />
    </main>
  );
}
