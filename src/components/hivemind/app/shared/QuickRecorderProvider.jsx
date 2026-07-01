import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, Sparkles, CheckCircle2, X } from 'lucide-react';
import apiClient from './api-client';

/**
 * QuickRecorderProvider — app-wide "record a meeting from anywhere" engine.
 * Mounted ABOVE the router (in AppShell) so recording + the floating notch
 * SURVIVE page navigation (true background). One-click start from mobile, the
 * talk-to-hive preview, or the desktop. On stop it transcribes → distills
 * insights → saves the meeting row → ingests hard-facts to HIVEMIND, then tells
 * the user to view results in desktop → Past meetings.
 *
 * Self-contained + mic-only (works on mobile/Safari). Reuses the exact backend
 * contract the desktop recorder uses: /api/meetings/transcribe · /segments ·
 * /api/meetings · /insights · /:id/ingest. Does NOT touch the desktop recorder.
 */
const Ctx = createContext(null);
export const useQuickRecorder = () => useContext(Ctx) || { status: 'idle', start: () => {}, supported: false };

const SEGMENT_MS = 10 * 60 * 1000; // 10-min segments → unbounded meeting length
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mp4;codecs=mp4a.40.2'];
function pickMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  for (const m of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(m)) return m;
  return '';
}
const SUPPORTED = typeof navigator !== 'undefined' && !!navigator.mediaDevices
  && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof MediaRecorder !== 'undefined';

export function QuickRecorderProvider({ children }) {
  const [status, setStatus] = useState('idle'); // idle | recording | transcribing | analyzing | done | error
  const [elapsed, setElapsed] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);
  const [savedMeetingId, setSavedMeetingId] = useState(null);

  const streamRef = useRef(null);
  const recRef = useRef(null);
  const segChunksRef = useRef([]);
  const segIdxRef = useRef(0);
  const segTextsRef = useRef({});
  const segPromisesRef = useRef([]);
  const sessionIdRef = useRef(null);
  const langRef = useRef(null);
  const finalizingRef = useRef(false);
  const segTimerRef = useRef(null);
  const clockRef = useRef(null);

  const cleanup = useCallback(() => {
    if (segTimerRef.current) { clearInterval(segTimerRef.current); segTimerRef.current = null; }
    if (clockRef.current) { clearInterval(clockRef.current); clockRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((tr) => tr.stop()); streamRef.current = null; }
  }, []);

  const transcribeSegment = useCallback((idx, blob) => {
    const p = apiClient.core.post('/api/meetings/transcribe?diarize=false', blob, {
      headers: { 'Content-Type': blob.type || 'audio/webm' }, timeout: 300000,
    }).then((tr) => {
      const txt = tr.data?.transcript || '';
      segTextsRef.current[idx] = txt;
      if (tr.data?.language && !langRef.current) langRef.current = tr.data.language;
      if (sessionIdRef.current && txt.trim()) {
        apiClient.core.post('/api/meetings/segments', { session_id: sessionIdRef.current, idx, text: txt }).catch(() => {});
      }
    }).catch(() => { if (segTextsRef.current[idx] === undefined) segTextsRef.current[idx] = ''; });
    segPromisesRef.current.push(p);
  }, []);

  const rollSegment = useCallback(() => {
    const stream = streamRef.current; if (!stream) return;
    const mime = pickMime();
    segChunksRef.current = [];
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size) segChunksRef.current.push(e.data); };
    rec.onstop = () => {
      const idx = segIdxRef.current++;
      const blob = new Blob(segChunksRef.current, { type: rec.mimeType || mime || 'audio/webm' });
      if (blob.size > 1024) transcribeSegment(idx, blob); else segIdxRef.current--;
      if (!finalizingRef.current) rollSegment();
    };
    rec.start(1000);
  }, [transcribeSegment]);

  const finalize = useCallback(async (mTitle) => {
    setError(null); setStatus('transcribing');
    try {
      await Promise.allSettled(segPromisesRef.current);
      const idxs = Object.keys(segTextsRef.current).map(Number).sort((a, b) => a - b);
      const text = idxs.map((i) => segTextsRef.current[i]).filter(Boolean).join('\n').trim();
      if (!text) { setStatus('error'); setError('No speech detected.'); return; }
      setStatus('analyzing');
      let insights = null;
      try {
        const ins = await apiClient.core.post('/api/meetings/insights', { transcript: text }, { timeout: 240000 });
        insights = ins.data?.insights || null;
      } catch { /* insights optional — still save the transcript */ }
      const row = await apiClient.core.post('/api/meetings', {
        title: mTitle || insights?.title || `Quick note ${new Date().toLocaleString()}`,
        transcript: text, insights: insights || {}, language: langRef.current,
        session_id: sessionIdRef.current || undefined,
      }, { timeout: 60000 });
      const mid = row.data?.id || null;
      setSavedMeetingId(mid);
      if (mid) apiClient.core.post(`/api/meetings/${mid}/ingest`, {}, { timeout: 180000 }).catch(() => {});
      setStatus('done');
    } catch (e) {
      setStatus('error'); setError(e?.response?.data?.error || e?.message || 'Processing failed.');
    }
  }, []);

  const start = useCallback(async (opts = {}) => {
    if (!SUPPORTED) { setError('Recording not supported on this device.'); setStatus('error'); return; }
    if (status === 'recording') { setMinimized(false); return; } // already live → just surface it
    setError(null); setSavedMeetingId(null); setElapsed(0); setMinimized(false);
    setTitle(opts.title || '');
    segIdxRef.current = 0; segChunksRef.current = []; segPromisesRef.current = [];
    segTextsRef.current = {}; langRef.current = null; finalizingRef.current = false;
    sessionIdRef.current = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : null;
    let mic;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch { setError('Microphone permission denied.'); setStatus('error'); return; }
    streamRef.current = mic;
    rollSegment(); setStatus('recording');
    segTimerRef.current = setInterval(() => {
      if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
    }, SEGMENT_MS);
    clockRef.current = setInterval(() => setElapsed((x) => x + 1), 1000);
  }, [status, rollSegment]);

  const stop = useCallback(() => {
    finalizingRef.current = true;
    if (segTimerRef.current) { clearInterval(segTimerRef.current); segTimerRef.current = null; }
    if (clockRef.current) { clearInterval(clockRef.current); clockRef.current = null; }
    const rec = recRef.current;
    const mTitle = title;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = () => {
        const idx = segIdxRef.current++;
        const blob = new Blob(segChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size > 1024) transcribeSegment(idx, blob); else segIdxRef.current--;
        cleanup(); finalize(mTitle);
      };
      rec.stop();
    } else { cleanup(); finalize(mTitle); }
  }, [title, transcribeSegment, cleanup, finalize]);

  const dismiss = useCallback(() => { setStatus('idle'); setError(null); setSavedMeetingId(null); }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const active = status !== 'idle';
  const recording = status === 'recording';
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const overlay = active ? createPortal(
    <AnimatePresence>
      <motion.div key="qr-notch" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 bg-white border border-[#e3e0db] rounded-full shadow-lg pl-3.5 pr-2 py-1.5 max-w-[92vw]">
        {recording ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 font-['Space_Grotesk'] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
          </span>
        ) : status === 'done' ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 font-['Space_Grotesk']"><CheckCircle2 size={12} /> Saved</span>
        ) : status === 'error' ? (
          <span className="text-[11px] font-semibold text-red-600 font-['Space_Grotesk']">Error</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 font-['Space_Grotesk']"><Sparkles size={11} /> {status === 'transcribing' ? 'Transcribing…' : 'Analyzing…'}</span>
        )}
        {recording && <span className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] tabular-nums">{mm}:{ss}</span>}
        {status === 'done' ? (
          <>
            <span className="text-[12px] text-[#525252] font-['Space_Grotesk'] max-w-[46vw] truncate">Open desktop → Past meetings to see insights.</span>
            <button onClick={dismiss} className="w-7 h-7 grid place-items-center rounded-full text-[#737373] hover:bg-[#faf9f4]"><X size={14} /></button>
          </>
        ) : status === 'error' ? (
          <>
            <span className="text-[12px] text-[#dc2626] font-['Space_Grotesk'] max-w-[46vw] truncate">{error}</span>
            <button onClick={dismiss} className="w-7 h-7 grid place-items-center rounded-full text-[#737373] hover:bg-[#faf9f4]"><X size={14} /></button>
          </>
        ) : recording ? (
          <button onClick={stop} title="Stop" className="w-7 h-7 grid place-items-center rounded-full bg-red-500 text-white hover:bg-red-600"><Square size={11} fill="currentColor" /></button>
        ) : (
          <span className="w-7 h-7 grid place-items-center"><span className="w-3 h-3 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" /></span>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  ) : null;

  return (
    <Ctx.Provider value={{ status, elapsed, minimized, error, savedMeetingId, supported: SUPPORTED, start, stop, dismiss, recording, active }}>
      {children}
      {overlay}
    </Ctx.Provider>
  );
}

export default QuickRecorderProvider;
