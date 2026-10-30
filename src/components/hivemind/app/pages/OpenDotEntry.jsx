import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { openDotEmployeeIdFromPath } from '../shared/open-dot-employee-route';
import { openDotRoomStatus } from '../shared/open-dot-room-status';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buildOpenDotEmbedTarget, openDotLocale, withOpenDotLocale } from '../shared/open-dot-embed-target';
import { registerOpenDotFrame } from '../shared/open-dot-frames';

const DOT_ORIGIN = 'https://runtime-runner.singulancelabs.com';
const READY_TIMEOUT_MS = 30000;
const NAVIGATE_RETRY_MS = 1000;
// A retained document that has not acknowledged the new employee by now is replaced by a frame opened on it.
const NAVIGATE_UNACKNOWLEDGED_MS = 6000;

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
  const { i18n } = useTranslation();
  const language = openDotLocale(i18n.language);
  const languageRef = useRef(language);
  languageRef.current = language;
  // The first address carries the interface language so OpenDot's first paint is already in it; later changes arrive as a message.
  const initialTarget = useRef(withOpenDotLocale(initialRoute ? buildOpenDotEmbedTarget(initialRoute.pathname.slice('/hivemind/app/employee/dots'.length), initialRoute.search) : src, i18n.language));
  // Starts on the first employee; follows the current employee when the retained document never acknowledges a switch.
  const [forcedTarget, setForcedTarget] = useState(null);
  const frameTarget = forcedTarget || initialTarget.current;
  const iframeRef = useRef(null);
  const frameRegistration = useRef(null);
  // Registers each mounted iframe for sign-out; the disposer runs when React replaces or unmounts it.
  const attachFrame = useCallback(node => {
    iframeRef.current = node;
    frameRegistration.current?.();
    frameRegistration.current = node ? registerOpenDotFrame(node) : null;
  }, []);
  const [loaded, setLoaded] = useState(false);
  const [loadedFrameKey, setLoadedFrameKey] = useState(null);
  const [readyEmployee, setReadyEmployee] = useState(null);
  const employeeId = openDotEmployeeIdFromPath(pathname);
  const [attempt, setAttempt] = useState(0);
  const [readyFrameKey, setReadyFrameKey] = useState(null);
  const [timedOutFrameKey, setTimedOutFrameKey] = useState(null);
  const frameKey = `${frameTarget || 'invalid'}:${attempt}`;
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
      // The person changed the language inside OpenDot: the shell follows, so both stay on one language.
      if (event.data?.type === 'hivemind.open-dot.locale' && event.data.version === 1 && typeof event.data.locale === 'string') {
        const next = openDotLocale(event.data.locale);
        if (next && next !== languageRef.current && (i18n.options?.supportedLngs || []).includes(next)) i18n.changeLanguage(next);
        return;
      }
      if (event.data?.type === 'hivemind.open-dot.back' && event.data.version === 1 && active) {
        window.dispatchEvent(new CustomEvent('hivemind:open-dot-team'));
        return;
      }
      // The room's employee was deleted (or its address no longer resolves): the sidebar drops it and opens another room.
      if (event.data?.type === 'hivemind.open-dot.employee-removed' && event.data.version === 1 && typeof event.data.employeeId === 'string' && active) {
        window.dispatchEvent(new CustomEvent('hivemind:employee-removed', { detail: { employeeId: event.data.employeeId } }));
        return;
      }
      if (event.data?.type === 'hivemind.open-dot.preview' && event.data.version === 1 && active) {
        window.dispatchEvent(new CustomEvent('hivemind:preview-visibility', {detail:{open:event.data.open === true}}));
        return;
      }
      // A room report for the current employee proves the frame shows it, even when its ready message was missed.
      if (employeeId && event.data?.type === 'hivemind.open-dot.room-status' && event.data.version === 1 && event.data.employeeId === employeeId) {
        setLoaded(true);
        setReadyEmployee(employeeId);
        setReadyFrameKey(frameKey);
        window.clearTimeout(timer);
        window.clearInterval(probe);
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
  }, [frameKey, loadedFrameKey, src, pathname, apps, active, i18n, employeeId]);

  // Tell the frame the shell's language once it is ready and whenever the person changes it here.
  useEffect(() => {
    if (!language || readyFrameKey !== frameKey) return;
    postToDotFrame(iframeRef.current, { type: 'hivemind.open-dot.locale', version: 1, locale: language });
  }, [language, readyFrameKey, frameKey]);

  useEffect(() => {
    if (!active || !loaded || !employeeId || !src || readyEmployee === employeeId) return undefined;
    const navigate = () => postToDotFrame(iframeRef.current, { type: 'hivemind.open-dot.navigate', version: 1, employeeId, target: src });
    navigate();
    const retry = window.setInterval(navigate, NAVIGATE_RETRY_MS);
    const replace = window.setTimeout(() => {
      setReadyEmployee(null);
      setForcedTarget(withOpenDotLocale(src, languageRef.current));
    }, NAVIGATE_UNACKNOWLEDGED_MS);
    return () => { window.clearInterval(retry); window.clearTimeout(replace); };
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
        ref={attachFrame}
        onLoad={() => setLoadedFrameKey(frameKey)}
        title={apps ? 'Apps' : 'HyperAgent workspace'}
        src={frameTarget}
        allow="microphone; autoplay"
        className="h-full min-h-0 w-full flex-1 border-0"
      />
    </main>
  );
}
