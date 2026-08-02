import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MonitorUp, Pause, Play, Square, Sparkles, CheckCircle2, X, Users, FolderOpen, NotebookPen, ChevronRight, ChevronLeft, Minimize2, ListChecks, Lightbulb, HelpCircle, Quote, AlignLeft, Save, AlertTriangle, ArrowUpRight } from 'lucide-react';
import apiClient from './api-client';
import { useAuth } from '../auth/AuthProvider';
import { emitUsageChanged } from './useUsage';

/**
 * QuickRecorderProvider — app-wide "record a meeting from anywhere" engine.
 * Mounted ABOVE the router so recording + the floating chip SURVIVE navigation.
 *
 * Flow: mic click → step wizard (Participants → Save to → Context) → record
 * (live wave) → Stop → transcribe+analyze (shimmer wave) → meeting ROW saved
 * (visible in desktop Past meetings) → FULL-SCREEN sectioned results popup.
 * NO auto-ingest: the user decides via "Save to HIVEMIND memory" (top-right,
 * left of the X). Collapse chip: | @Today 11:18 PM | — top-right on mobile
 * (below the navbar), bottom-center on desktop.
 */
const Ctx = createContext(null);
export const useQuickRecorder = () => useContext(Ctx) || { status: 'idle', start: () => {}, openConfig: () => {}, supported: false };

const SEGMENT_MS = 10 * 60 * 1000;
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mp4;codecs=mp4a.40.2'];
function pickMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  for (const m of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(m)) return m;
  return '';
}
const SUPPORTED = typeof navigator !== 'undefined' && !!navigator.mediaDevices
  && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof MediaRecorder !== 'undefined';

/* ── Refresh-survival ────────────────────────────────────────────────────
   An in-flight recording session is persisted so a reload / accidental back
   never silently kills it: session META in localStorage, raw audio CHUNKS of
   the current (not-yet-transcribed) segment in IndexedDB, transcribed text on
   the server (per-segment POST). On mount we rebuild all three and either
   auto-resume the mic or park in an explicit "interrupted" state. Recording
   ends ONLY on the user's Stop. */
const LS_PREFIX = 'hm_qrec_session_v2';
const readSession = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const writeSession = (key, value) => {
  try { value ? localStorage.setItem(key, JSON.stringify(value)) : localStorage.removeItem(key); } catch { /* noop */ }
};

const IDB_NAME = 'hm-qrec'; const IDB_STORE = 'chunks';
function idbOpen() {
  return new Promise((resolve, reject) => {
    try {
      const rq = indexedDB.open(IDB_NAME, 1);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { autoIncrement: true }).createIndex('sid', 'sid');
        }
      };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    } catch (e) { reject(e); }
  });
}
async function idbAddChunk(sid, seg, blob) {
  try { const db = await idbOpen(); db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).add({ sid, seg, blob, t: Date.now() }); } catch { /* best effort */ }
}
async function idbTakeChunks(sid, seg = null) {
  try {
    const db = await idbOpen();
    return await new Promise((resolve) => {
      const st = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE);
      const out = [];
      st.openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if (!c) return resolve(out);
        if (c.value?.sid === sid && (seg === null || c.value?.seg === seg)) { out.push(c.value); c.delete(); }
        c.continue();
      };
    });
  } catch { return []; }
}
async function idbReadChunks(sid, seg = null) {
  try {
    const db = await idbOpen();
    return await new Promise((resolve) => {
      const st = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE);
      const out = [];
      st.openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if (!c) return resolve(out);
        if (c.value?.sid === sid && (seg === null || c.value?.seg === seg)) out.push(c.value);
        c.continue();
      };
    });
  } catch { return []; }
}
async function idbClear(sid) { await idbTakeChunks(sid); }
const isMobile = () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false);

function atNow() {
  const d = new Date();
  return `@Today ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

/* Live wave — audio-reactive bars while recording (Web Audio analyser on the
   live stream), calm sine shimmer while transcribing/analyzing. Compact port
   of the MeetingNotes LiveWave. */
function QuickWave({ stream, mode }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf; let analyser = null; let actx = null; let data = null; let t = 0;
    if (stream && mode === 'record') {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = actx.createAnalyser(); analyser.fftSize = 128;
        actx.createMediaStreamSource(stream).connect(analyser);
        data = new Uint8Array(analyser.frequencyBinCount);
      } catch { analyser = null; }
    }
    const draw = () => {
      const w = canvas.width = canvas.offsetWidth * 2;
      const h = canvas.height = canvas.offsetHeight * 2;
      ctx.clearRect(0, 0, w, h);
      const bars = 48; const bw = w / bars * 0.55; const gap = w / bars;
      t += 0.05;
      for (let i = 0; i < bars; i++) {
        let v;
        if (analyser && data) { analyser.getByteFrequencyData(data); v = (data[Math.floor(i / bars * data.length)] || 0) / 255; }
        else v = 0.18 + 0.14 * Math.abs(Math.sin(t + i * 0.45));
        const bh = Math.max(h * 0.06, v * h * 0.9);
        ctx.fillStyle = mode === 'record' ? 'rgba(17,125,255,0.92)' : 'rgba(17,125,255,0.45)';
        ctx.beginPath();
        ctx.roundRect(i * gap + (gap - bw) / 2, (h - bh) / 2, bw, bh, bw / 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); try { actx && actx.close(); } catch { /* noop */ } };
  }, [stream, mode]);
  return <canvas ref={canvasRef} className="w-full h-[54px]" />;
}

const SCOPES = [
  { id: 'personal', label: 'Personal' },
  { id: 'project', label: 'Project' },
  { id: 'team', label: 'Team' },
  { id: 'organization', label: 'Org' },
];

export function QuickRecorderProvider({ children }) {
  const { org, user } = useAuth();
  const recoveryKey = `${LS_PREFIX}:${org?.id || 'none'}:${user?.id || 'none'}`;
  const readRecovery = useCallback(() => readSession(recoveryKey), [recoveryKey]);
  const writeRecovery = useCallback((value) => writeSession(recoveryKey, value), [recoveryKey]);
  const [status, setStatus] = useState('idle'); // idle | config | recording | transcribing | analyzing | done | error
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(null);
  const [startedAtLabel, setStartedAtLabel] = useState('');
  // config
  const [participants, setParticipants] = useState([]);
  const [pName, setPName] = useState('');
  const [scope, setScope] = useState('personal');
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [notes, setNotes] = useState('');
  // results
  const [insights, setInsights] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [meetingId, setMeetingId] = useState(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingested, setIngested] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [captureMode, setCaptureMode] = useState('mic');
  const [remainingSeconds, setRemainingSeconds] = useState(-1);
  const [paused, setPaused] = useState(false);
  const [, forceTick] = useState(0); // re-render for stream-attach

  const streamRef = useRef(null);
  const recRef = useRef(null);
  const segChunksRef = useRef([]);
  const segIdxRef = useRef(0);
  const segTextsRef = useRef({});
  const segPromisesRef = useRef([]);
  const pendingSegRef = useRef(new Map()); // idx → text, windows not yet confirmed server-side
  const sessionIdRef = useRef(null);
  const langRef = useRef(null);
  const finalizingRef = useRef(false);
  const segTimerRef = useRef(null);
  const clockRef = useRef(null);
  const stopRef = useRef(null);
  const teardownRef = useRef([]);
  const cfgRef = useRef({ participants: [], scope: 'personal', projectId: null, notes: '' });

  const cleanup = useCallback(() => {
    if (segTimerRef.current) { clearInterval(segTimerRef.current); segTimerRef.current = null; }
    if (clockRef.current) { clearInterval(clockRef.current); clockRef.current = null; }
    teardownRef.current.forEach((stopTrack) => { try { stopTrack(); } catch { /* ignore */ } });
    teardownRef.current = [];
    if (streamRef.current) { streamRef.current.getTracks().forEach((tr) => tr.stop()); streamRef.current = null; }
  }, []);

  // Durable segment persistence: POST each transcribed window to the server so
  // a tab crash / connection loss never loses more than the current 10-min
  // window. The server upsert is idempotent on (session_id, idx), so retrying —
  // and re-flushing a still-pending window later — can never duplicate a row.
  const persistSegment = useCallback(async (idx, text, attempt = 0) => {
    const sid = sessionIdRef.current;
    if (!sid || !text || !text.trim()) return;
    try {
      await apiClient.core.post('/api/meetings/segments', { session_id: sid, idx, text });
      pendingSegRef.current.delete(idx);
      await idbTakeChunks(sid, idx);
      const saved = readRecovery();
      if (saved) writeRecovery({
        ...saved,
        segIdx: Math.max(Number(saved.segIdx) || 0, idx + 1),
        transcriptSegments: { ...(saved.transcriptSegments || {}), [idx]: text },
      });
    } catch {
      // Keep the window queued and retry with backoff; also flushed on the next
      // segment tick and once more before finalize. Bounded so it can't spin.
      pendingSegRef.current.set(idx, text);
      if (attempt < 4) {
        setTimeout(() => persistSegment(idx, text, attempt + 1), Math.min(2000 * 2 ** attempt, 30000));
      }
    }
  }, [readRecovery, writeRecovery]);

  // Re-attempt any windows whose server write hasn't confirmed yet.
  const flushPendingSegments = useCallback(() => {
    for (const [idx, text] of pendingSegRef.current) persistSegment(idx, text, 0);
  }, [persistSegment]);

  const transcribeSegment = useCallback((idx, blob) => {
    const names = cfgRef.current.participants.join(', ');
    const hint = [cfgRef.current.notes, names ? `Participants: ${names}` : ''].filter(Boolean).join(' — ').slice(0, 800);
    const p = apiClient.core.post(`/api/meetings/transcribe?diarize=false&prompt=${encodeURIComponent(hint)}`, blob, {
      headers: { 'Content-Type': blob.type || 'audio/webm' }, timeout: 300000,
    }).then((tr) => {
      const txt = tr.data?.transcript || '';
      segTextsRef.current[idx] = txt;
      if (tr.data?.language && !langRef.current) langRef.current = tr.data.language;
      // Persist THIS window (retrying on failure) and re-flush any earlier
      // window still unconfirmed — so the server transcript stays complete.
      if (txt.trim()) { pendingSegRef.current.set(idx, txt); persistSegment(idx, txt, 0); }
      flushPendingSegments();
    }).catch(() => { if (segTextsRef.current[idx] === undefined) segTextsRef.current[idx] = ''; });
    segPromisesRef.current.push(p);
  }, [persistSegment, flushPendingSegments]);

  const rollSegment = useCallback(() => {
    const stream = streamRef.current; if (!stream) return;
    const mime = pickMime();
    segChunksRef.current = [];
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recRef.current = rec;
    rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      segChunksRef.current.push(e.data);
      // Refresh-survival: mirror every 1s chunk into IndexedDB so a reload
      // mid-segment loses at most ~1s of audio (recovered + transcribed on mount).
      if (sessionIdRef.current) idbAddChunk(sessionIdRef.current, segIdxRef.current, e.data);
    };
    rec.onstop = () => {
      const idx = segIdxRef.current++;
      const blob = new Blob(segChunksRef.current, { type: rec.mimeType || mime || 'audio/webm' });
      if (blob.size > 1024) transcribeSegment(idx, blob); else segIdxRef.current--;
      // Keep cached audio until persistSegment confirms the transcript is
      // durable. Starting an STT request is not an acknowledgement.
      if (sessionIdRef.current) {
        const s = readRecovery(); if (s) writeRecovery({ ...s, segIdx: segIdxRef.current });
      }
      if (!finalizingRef.current) rollSegment();
    };
    rec.start(1000);
  }, [readRecovery, transcribeSegment, writeRecovery]);

  // Stop → stitch → analyze → save the meeting ROW (Past meetings) — NO ingest.
  // The user decides in the results popup via "Save to HIVEMIND memory".
  const finalize = useCallback(async () => {
    setError(null); setStatus('transcribing'); setCollapsed(false);
    const cfg = cfgRef.current;
    // The recording has ended, but its final row is not durable yet. A reload
    // must reopen this as a recovery task, never resume the microphone.
    const savedSession = readRecovery();
    if (savedSession) writeRecovery({ ...savedSession, finalizing: true, elapsed });
    try {
      await Promise.allSettled(segPromisesRef.current);
      // Last-chance flush of any window whose durable write never confirmed —
      // idempotent upsert makes this safe even if it already landed.
      flushPendingSegments();
      const idxs = Object.keys(segTextsRef.current).map(Number).sort((a, b) => a - b);
      const text = idxs.map((i) => segTextsRef.current[i]).filter(Boolean).join('\n').trim();
      if (!text) { setStatus('error'); setError('No speech detected.'); return; }
      setTranscript(text);
      setStatus('analyzing');
      let ins = null;
      try {
        const r = await apiClient.core.post('/api/meetings/insights', {
          transcript: text, notes: cfg.notes || undefined, participants: cfg.participants,
        }, { timeout: 240000 });
        ins = r.data?.insights || null;
      } catch { /* insights optional */ }
      setInsights(ins);
      const row = await apiClient.core.post('/api/meetings', {
        title: ins?.title || `Meeting ${new Date().toLocaleString()}`,
        transcript: text, insights: ins || {}, language: langRef.current,
        notes: cfg.notes || null,
        participants: cfg.participants.map((n) => ({ type: 'external', name: n })),
        scope: cfg.scope, project_id: cfg.scope === 'project' ? cfg.projectId : null,
        session_id: sessionIdRef.current || undefined,
        duration_sec: elapsed,
        consent: true,
      }, { timeout: 60000 });
      const savedMeetingId = row.data?.id || null;
      setMeetingId(savedMeetingId);
      emitUsageChanged();
      if (savedMeetingId && cfg.autoSave !== false) {
        try {
          await apiClient.core.post(`/api/meetings/${savedMeetingId}/ingest`, {}, { timeout: 180000 });
          setIngested(true);
          emitUsageChanged();
        } catch {
          setError('Meeting saved. HIVEMIND memory sync failed; retry it from the report.');
        }
      }
      // Only discard recovery material after the Past Meeting row is durable.
      // A 5xx here used to erase the only client-side recovery handle.
      writeRecovery(null);
      if (sessionIdRef.current) idbClear(sessionIdRef.current);
      setStatus('done');
    } catch (e) {
      setStatus('error'); setError(e?.response?.data?.error || e?.message || 'Processing failed.');
    }
  }, [elapsed, flushPendingSegments, readRecovery, writeRecovery]);

  const retryMeetingSave = useCallback(async () => {
    const text = transcript.trim();
    if (!text) return;
    const cfg = cfgRef.current;
    setError(null); setStatus('analyzing');
    try {
      const row = await apiClient.core.post('/api/meetings', {
        title: insights?.title || `Meeting ${new Date().toLocaleString()}`,
        transcript: text, insights: insights || {}, language: langRef.current,
        notes: cfg.notes || null,
        participants: cfg.participants.map((n) => ({ type: 'external', name: n })),
        scope: cfg.scope, project_id: cfg.scope === 'project' ? cfg.projectId : null,
        session_id: sessionIdRef.current || undefined,
        duration_sec: elapsed,
        consent: true,
      }, { timeout: 60000 });
      const savedMeetingId = row.data?.id || null;
      setMeetingId(savedMeetingId);
      emitUsageChanged();
      if (savedMeetingId && cfg.autoSave !== false) {
        try {
          await apiClient.core.post(`/api/meetings/${savedMeetingId}/ingest`, {}, { timeout: 180000 });
          setIngested(true);
          emitUsageChanged();
        } catch {
          setError('Meeting saved. HIVEMIND memory sync failed; retry it from the report.');
        }
      }
      writeRecovery(null);
      if (sessionIdRef.current) idbClear(sessionIdRef.current);
      setStatus('done');
    } catch (e) {
      setStatus('error'); setError(e?.response?.data?.error || e?.message || 'Meeting save failed. Your transcript is still recoverable.');
    }
  }, [elapsed, insights, transcript, writeRecovery]);

  const openConfig = useCallback(() => {
    if (!SUPPORTED) { setError('Recording not supported on this device.'); setStatus('error'); return; }
    if (status === 'recording' || status === 'done') { setCollapsed(false); return; }
    setStep(0); setError(null); setIngested(false); setIngesting(false); setInsights(null); setMeetingId(null); setTranscript('');
    setStatus('config');
    apiClient.core.get('/api/team/projects').then(({ data }) => setProjects(data?.projects || [])).catch(() => {});
  }, [status]);

  const start = useCallback(async () => {
    cfgRef.current = { participants: participants.slice(0, 12), scope, projectId, notes, autoSave, captureMode };
    setError(null); setElapsed(0); setCollapsed(false);
    segIdxRef.current = 0; segChunksRef.current = []; segPromisesRef.current = [];
    segTextsRef.current = {}; langRef.current = null; finalizingRef.current = false;
    const displayPromise = captureMode === 'tab' && navigator.mediaDevices?.getDisplayMedia
      ? navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      : null;
    try {
      if (navigator.storage?.persist) await navigator.storage.persist();
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        const available = Number(estimate.quota || 0) - Number(estimate.usage || 0);
        if (estimate.quota && available < 50 * 1024 * 1024) {
          setError('Less than 50 MB of browser recovery storage is available. Free space before recording.');
          setStatus('error');
          return;
        }
      }
    } catch { /* browser storage checks are best-effort */ }
    let allowance = -1;
    try {
      const admission = await apiClient.core.post('/api/meetings/sessions', { consent: true });
      sessionIdRef.current = admission.data?.session_id || null;
      allowance = Number(admission.data?.remaining_seconds ?? -1);
      setRemainingSeconds(allowance);
    } catch (e) {
      if (displayPromise) displayPromise.then((stream) => stream.getTracks().forEach((track) => track.stop())).catch(() => {});
      setError(e?.response?.data?.message || e?.response?.data?.error || 'Unable to start a meeting.');
      setStatus('error');
      return;
    }
    let mic;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      if (displayPromise) displayPromise.then((stream) => stream.getTracks().forEach((track) => track.stop())).catch(() => {});
      setError('Microphone permission denied.'); setStatus('error'); return;
    }
    let recordingStream = mic;
    teardownRef.current.push(() => mic.getTracks().forEach((track) => track.stop()));
    if (displayPromise) {
      try {
        const display = await displayPromise;
        const displayAudio = display.getAudioTracks();
        if (!displayAudio.length) {
          display.getTracks().forEach((track) => track.stop());
          cleanup();
          setError('Share a browser tab with “Share tab audio” enabled.');
          setStatus('error');
          return;
        }
        const context = new AudioContext();
        const destination = context.createMediaStreamDestination();
        context.createMediaStreamSource(mic).connect(destination);
        context.createMediaStreamSource(new MediaStream(displayAudio)).connect(destination);
        recordingStream = destination.stream;
        teardownRef.current.push(() => display.getTracks().forEach((track) => track.stop()));
        teardownRef.current.push(() => context.close());
        display.getVideoTracks().forEach((track) => { track.onended = () => stopRef.current?.(); });
      } catch {
        cleanup();
        setError('Tab audio sharing was cancelled.');
        setStatus('error');
        return;
      }
    }
    streamRef.current = recordingStream;
    const label = atNow();
    setStartedAtLabel(label);
    // Persist session meta — a reload/back must NOT kill the recording.
    writeRecovery({
      sessionId: sessionIdRef.current, startedAt: Date.now(), label, segIdx: 0,
      cfg: cfgRef.current, owner: { orgId: org?.id || null, userId: user?.id || null },
      remainingSeconds: allowance, elapsed: 0,
    });
    rollSegment(); setStatus('recording'); forceTick((x) => x + 1);
    setPaused(false);
    segTimerRef.current = setInterval(() => {
      if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
    }, SEGMENT_MS);
    clockRef.current = setInterval(() => setElapsed((x) => x + 1), 1000);
  }, [participants, scope, projectId, notes, autoSave, captureMode, org?.id, user?.id, cleanup, rollSegment, writeRecovery]);

  const stop = useCallback(() => {
    finalizingRef.current = true;
    if (segTimerRef.current) { clearInterval(segTimerRef.current); segTimerRef.current = null; }
    if (clockRef.current) { clearInterval(clockRef.current); clockRef.current = null; }
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = () => {
        const idx = segIdxRef.current++;
        const blob = new Blob(segChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size > 1024) transcribeSegment(idx, blob); else segIdxRef.current--;
        cleanup(); finalize();
      };
      rec.stop();
    } else { cleanup(); finalize(); }
  }, [transcribeSegment, cleanup, finalize]);
  stopRef.current = stop;

  const togglePause = useCallback(() => {
    const recorder = recRef.current;
    if (!recorder || status !== 'recording') return;
    if (recorder.state === 'recording') {
      recorder.pause();
      if (clockRef.current) { clearInterval(clockRef.current); clockRef.current = null; }
      if (segTimerRef.current) { clearInterval(segTimerRef.current); segTimerRef.current = null; }
      setPaused(true);
      return;
    }
    if (recorder.state === 'paused') {
      recorder.resume();
      clockRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
      segTimerRef.current = setInterval(() => {
        if (recRef.current?.state === 'recording') recRef.current.stop();
      }, SEGMENT_MS);
      setPaused(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'recording' && remainingSeconds >= 0 && elapsed >= remainingSeconds) stop();
  }, [elapsed, remainingSeconds, status, stop]);

  useEffect(() => {
    if (status !== 'recording' || elapsed % 5 !== 0) return;
    const saved = readRecovery();
    if (saved) writeRecovery({ ...saved, elapsed });
  }, [elapsed, readRecovery, status, writeRecovery]);

  /* ── Resume after reload / back-navigation ──────────────────────────────
     Rebuild the session (meta from localStorage, transcribed text from the
     server, un-transcribed audio from IndexedDB) and re-open the mic. If the
     browser refuses getUserMedia without a gesture, park in 'interrupted' —
     the notch offers Resume / Stop, and Stop still processes everything
     captured so far. Recording ONLY ends on the user's explicit Stop. */
  const resumeMic = useCallback(async () => {
    let mic;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch { setError('Microphone permission needed to resume.'); return; }
    setError(null);
    streamRef.current = mic;
    finalizingRef.current = false;
    rollSegment(); setStatus('recording'); forceTick((x) => x + 1);
    if (!segTimerRef.current) segTimerRef.current = setInterval(() => {
      if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
    }, SEGMENT_MS);
    if (!clockRef.current) clockRef.current = setInterval(() => setElapsed((x) => x + 1), 1000);
  }, [rollSegment]);

  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !SUPPORTED) return;
    resumedRef.current = true;
    const s = readRecovery();
    if (!s || !s.sessionId) return;
    if (s.owner && (s.owner.orgId !== (org?.id || null) || s.owner.userId !== (user?.id || null))) {
      idbClear(s.sessionId);
      writeRecovery(null);
      return;
    }
    (async () => {
      sessionIdRef.current = s.sessionId;
      cfgRef.current = s.cfg || cfgRef.current;
      setAutoSave(s.cfg?.autoSave !== false);
      setRemainingSeconds(Number(s.remainingSeconds ?? -1));
      segIdxRef.current = s.segIdx || 0;
      setStartedAtLabel(s.label || atNow());
      setElapsed(Math.max(0, Number(s.elapsed) || 0));
      setCollapsed(true);
      for (const [idx, text] of Object.entries(s.transcriptSegments || {})) {
        segTextsRef.current[Number(idx)] = String(text || '');
      }
      // 1) already-transcribed segments live on the server
      try {
        const { data } = await apiClient.core.get(`/api/meetings/session/${s.sessionId}/segments`);
        for (const row of data?.segments || []) {
          segTextsRef.current[row.idx] = row.text || '';
          segIdxRef.current = Math.max(segIdxRef.current, Number(row.idx) + 1);
        }
      } catch { /* keep what we have */ }
      if (s.finalizing) {
        const restored = Object.keys(segTextsRef.current).map(Number).sort((a, b) => a - b)
          .map((idx) => segTextsRef.current[idx]).filter(Boolean).join('\n').trim();
        setTranscript(restored);
        setStatus('error');
        setError(restored
          ? 'Meeting processing was interrupted before it was saved. Retry the save to keep this meeting.'
          : 'Meeting processing was interrupted before any transcript could be recovered.');
        return;
      }
      // 2) the interrupted segment's raw audio lives in IndexedDB — rescue it
      try {
        const cached = await idbReadChunks(s.sessionId);
        const bySeg = new Map();
        for (const c of cached) { if (!bySeg.has(c.seg)) bySeg.set(c.seg, []); bySeg.get(c.seg).push(c.blob); }
        for (const [seg, blobs] of bySeg) {
          const idx = Math.max(seg, segIdxRef.current);
          segIdxRef.current = idx + 1;
          const blob = new Blob(blobs, { type: blobs[0]?.type || 'audio/webm' });
          if (blob.size > 1024) transcribeSegment(idx, blob);
        }
      } catch { /* best effort */ }
      // 3) re-open the mic. Chrome grants silently when permission persists;
      //    otherwise the user resumes with one tap from the notch.
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        streamRef.current = mic;
        rollSegment(); setStatus('recording'); forceTick((x) => x + 1);
        segTimerRef.current = setInterval(() => {
          if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
        }, SEGMENT_MS);
        clockRef.current = setInterval(() => setElapsed((x) => x + 1), 1000);
      } catch {
        setStatus('interrupted');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, readRecovery, user?.id, writeRecovery]);

  const saveToHivemind = useCallback(async () => {
    if (!meetingId || ingesting || ingested) return;
    setIngesting(true);
    try {
      await apiClient.core.post(`/api/meetings/${meetingId}/ingest`, {}, { timeout: 180000 });
      setIngested(true);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Save failed.');
    } finally { setIngesting(false); }
  }, [meetingId, ingesting, ingested]);

  const dismiss = useCallback(() => {
    writeRecovery(null);
    if (sessionIdRef.current) idbClear(sessionIdRef.current);
    setStatus('idle'); setError(null); setCollapsed(false);
    setParticipants([]); setPName(''); setScope('personal'); setProjectId(null); setNotes('');
    setCaptureMode('mic'); setAutoSave(true); setRemainingSeconds(-1);
    setPaused(false);
    setInsights(null); setMeetingId(null); setTranscript(''); setIngested(false); setIngesting(false);
  }, [writeRecovery]);

  useEffect(() => () => cleanup(), [cleanup]);

  const recording = status === 'recording';
  const busy = status === 'transcribing' || status === 'analyzing';
  const active = status !== 'idle';
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const mob = isMobile();

  const addParticipant = () => {
    const n = pName.trim();
    if (n && !participants.includes(n)) setParticipants((p) => [...p, n].slice(0, 12));
    setPName('');
  };

  /* ── Collapsed chip — mobile: top-right BELOW the navbar; desktop: bottom-center */
  const chip = (
    <motion.button key="qr-chip" initial={{ opacity: 0, y: mob ? -16 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: mob ? -16 : 16 }}
      onClick={() => setCollapsed(false)}
      className={`fixed flex items-stretch bg-white border border-[#e3e0db] rounded-[10px] shadow-lg overflow-hidden ${mob ? 'top-[72px] right-3 z-20' : 'bottom-4 left-1/2 -translate-x-1/2 z-[70]'}`}
      title="Expand recorder">
      <span className={`w-[3px] ${recording ? 'bg-red-500' : busy ? 'bg-[#117dff]' : status === 'interrupted' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      <span className="flex items-center gap-2 px-3 py-1.5 font-['Space_Grotesk']">
        {recording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
        {status === 'interrupted' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
        <span className="text-[13px] font-semibold text-[#525252]">{startedAtLabel.split(' ')[0] || '@Today'}</span>
        <span className="text-[13px] font-semibold text-[#b9b5ae] tabular-nums">{startedAtLabel.split(' ').slice(1).join(' ')}</span>
        {recording && <span className="text-[12px] text-[#0a0a0a] font-semibold tabular-nums ml-0.5">{mm}:{ss}</span>}
        {status === 'interrupted' && <span className="text-[11px] text-amber-600 font-semibold">resume</span>}
        {busy && <span className="w-3 h-3 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />}
        {status === 'done' && <CheckCircle2 size={13} className="text-emerald-600" />}
      </span>
      <span className={`w-[3px] ${recording ? 'bg-red-500' : busy ? 'bg-[#117dff]' : status === 'interrupted' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
    </motion.button>
  );

  const stepDefs = [
    { key: 'participants', label: 'Participants', icon: Users },
    { key: 'saveto', label: 'Save memories to', icon: FolderOpen },
    { key: 'context', label: 'Meeting context', icon: NotebookPen },
  ];
  const StepIcon = stepDefs[step]?.icon || Users;

  /* ── Config / recording / busy card ── */
  const card = (
    <motion.div key="qr-card" initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      className="bg-[#fbfaf7] border border-[#d8d5cf] rounded-[12px] shadow-[0_24px_70px_rgba(10,10,10,0.16)] w-full max-w-[560px] overflow-hidden pointer-events-auto">
      <div className="h-12 px-4 flex items-center justify-between border-b border-[#e3e0db] bg-white/80">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="w-3 h-3 rounded-full bg-[#ef6258]" />
          <span className="w-3 h-3 rounded-full bg-[#f4bd4f]" />
          <span className="w-3 h-3 rounded-full bg-[#58c653]" />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#a3a3a3]">meeting · intelligence</span>
        <span className="w-[52px]" aria-hidden="true" />
      </div>
      <div className="p-5 md:p-6">
      <div className="flex items-center justify-between">
        {recording ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-semibold text-red-600 font-['Space_Grotesk'] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
          </span>
        ) : busy ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700 font-['Space_Grotesk']">
            <Sparkles size={11} /> {status === 'transcribing' ? 'Transcribing…' : 'Analyzing…'}
          </span>
        ) : status === 'error' ? (
          <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-semibold text-red-600 font-['Space_Grotesk']">Error</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-[#117dff] font-['Space_Grotesk']">
            <Mic size={11} /> New meeting
          </span>
        )}
        <div className="flex items-center gap-1">
          {(recording || busy) && (
            <button onClick={() => setCollapsed(true)} title="Collapse"
              className="w-7 h-7 grid place-items-center rounded-lg text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4]"><Minimize2 size={14} /></button>
          )}
          {(status === 'config' || status === 'error') && (
            <button onClick={dismiss} title="Close"
              className="w-7 h-7 grid place-items-center rounded-lg text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4]"><X size={14} /></button>
          )}
        </div>
      </div>

      <div className="mt-2.5 font-['Space_Grotesk'] leading-none">
        <span className="text-[26px] font-semibold text-[#525252]">{(recording || busy ? startedAtLabel : atNow()).split(' ')[0]}</span>
        <span className="text-[26px] font-semibold text-[#b9b5ae] ml-2 tabular-nums">{(recording || busy ? startedAtLabel : atNow()).split(' ').slice(1).join(' ')}</span>
      </div>

      {status === 'config' && (
        <>
          <div className="flex items-center gap-1.5 mt-3">
            {stepDefs.map((s, i) => (
              <button key={s.key} onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-[#117dff]' : 'w-3 bg-[#e3e0db]'}`} aria-label={s.label} />
            ))}
            <span className="ml-2 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3]">
              <StepIcon size={12} className="text-[#117dff]" /> {stepDefs[step].label}
            </span>
          </div>

          <div className="mt-3 min-h-[120px]">
            {step === 0 && (
              <div>
                <div className="flex gap-2">
                  <input value={pName} onChange={(e) => setPName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addParticipant(); }}
                    placeholder="Add participant name…"
                    className="flex-1 px-3 py-2 rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] text-[13px] outline-none focus:border-[#117dff]" />
                  <button onClick={addParticipant} className="px-3 py-2 rounded-[8px] bg-[#117dff] text-white text-[12px] font-semibold">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {participants.map((n) => (
                    <span key={n} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#faf9f4] border border-[#e3e0db] text-[12px]">
                      {n}<button onClick={() => setParticipants((p) => p.filter((x) => x !== n))} className="text-[#a3a3a3] hover:text-[#dc2626]"><X size={11} /></button>
                    </span>
                  ))}
                  {!participants.length && <span className="text-[11px] text-[#a3a3a3]">Optional — names help label speakers + spell them right.</span>}
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <div className="grid grid-cols-4 gap-1.5">
                  {SCOPES.map((s) => (
                    <button key={s.id} onClick={() => setScope(s.id)}
                      className={`px-2 py-2 rounded-[8px] border text-[12px] font-semibold transition-colors ${scope === s.id ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'bg-white text-[#525252] border-[#e3e0db] hover:border-[#0a0a0a]'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {scope === 'project' && (
                  <select value={projectId || ''} onChange={(e) => setProjectId(e.target.value || null)}
                    className="mt-2.5 w-full px-3 py-2 rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] text-[13px] outline-none">
                    <option value="">Pick a project…</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                <p className="text-[11px] text-[#a3a3a3] mt-2">Where the meeting's memories are saved.</p>
              </div>
            )}
            {step === 2 && (
              <div>
                <div className="grid grid-cols-2 gap-1.5 mb-2.5" aria-label="Recording source">
                  <button type="button" onClick={() => setCaptureMode('mic')}
                    className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-[8px] border text-[11px] font-semibold ${captureMode === 'mic' ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white' : 'border-[#e3e0db] text-[#525252]'}`}>
                    <Mic size={12} /> Microphone
                  </button>
                  <button type="button" onClick={() => setCaptureMode('tab')}
                    className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-[8px] border text-[11px] font-semibold ${captureMode === 'tab' ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white' : 'border-[#e3e0db] text-[#525252]'}`}>
                    <MonitorUp size={12} /> Tab + microphone
                  </button>
                </div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                  placeholder="Topic, who is speaking (names), companies, key terms…"
                  className="w-full px-3 py-2 rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] text-[13px] outline-none focus:border-[#117dff] resize-none" />
                <p className="text-[11px] text-[#a3a3a3] mt-1.5">Crucial — used to spell names right + sharpen insights.</p>
                <label className="mt-3 flex items-center justify-between gap-3 rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 cursor-pointer">
                  <span>
                    <span className="block text-[12px] font-semibold text-[#0a0a0a]">Save to HIVEMIND</span>
                    <span className="block text-[10px] text-[#737373]">Create searchable meeting memories automatically.</span>
                  </span>
                  <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} className="accent-[#117dff]" />
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-[8px] text-[12px] font-semibold text-[#525252] hover:bg-[#faf9f4] disabled:opacity-30">
              <ChevronLeft size={14} /> Back
            </button>
            {step < 2 ? (
              <button onClick={() => setStep((s) => Math.min(2, s + 1))}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-[8px] bg-[#0a0a0a] text-white text-[12px] font-semibold">
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={start} disabled={scope === 'project' && !projectId}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#117dff] text-white text-[12px] font-semibold disabled:opacity-40">
                <Mic size={13} /> Start meeting
              </button>
            )}
          </div>
        </>
      )}

      {(recording || busy) && (
        <div className="mt-3">
          {recording && (
            <div className="text-[40px] font-['Space_Grotesk'] leading-none mb-3">
              <span className="font-semibold text-[#d4d0ca]">{mm}:</span><span className="font-semibold text-[#0a0a0a] tabular-nums">{ss}</span>
            </div>
          )}
          {recording && remainingSeconds >= 0 && remainingSeconds - elapsed <= 60 && (
            <p className="mb-2 text-[11px] font-medium text-amber-700">{Math.max(0, remainingSeconds - elapsed)} seconds remain in this month's meeting allowance.</p>
          )}
          {/* live wave — reactive while recording, shimmer while analyzing */}
          <div className="rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] px-2 py-1.5">
            <QuickWave stream={recording ? streamRef.current : null} mode={recording ? 'record' : 'analyze'} />
          </div>
          <div className="flex items-center justify-between mt-3.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#a3a3a3]">Meeting notes</span>
            {recording ? (
              <div className="flex items-center gap-2">
                <button onClick={togglePause} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] border border-[#e3e0db] text-[#525252] text-[12px] font-semibold hover:border-[#0a0a0a]">
                  {paused ? <Play size={12} /> : <Pause size={12} />} {paused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={stop} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600">
                  <Square size={11} fill="currentColor" /> Stop
                </button>
              </div>
            ) : (
              <span className="text-[12px] text-[#525252]">You can collapse this and keep working.</span>
            )}
          </div>
        </div>
      )}
      {status === 'interrupted' && (
        <div className="mt-3">
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3">
            <p className="text-[13px] font-semibold text-amber-800">Recording paused by a page reload</p>
            <p className="text-[12px] text-amber-700/80 mt-0.5">Everything captured so far is safe. Resume the mic to keep going, or stop to process the meeting now.</p>
          </div>
          {error && <p className="mt-2 text-[12px] text-[#dc2626]">{error}</p>}
          <div className="flex items-center justify-end gap-2 mt-3.5">
            <button onClick={stop} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] border border-[#e3e0db] text-[#525252] text-[13px] font-semibold hover:border-[#0a0a0a] hover:text-[#0a0a0a]">
              <Square size={11} fill="currentColor" /> Stop & process
            </button>
            <button onClick={resumeMic} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#117dff] text-white text-[13px] font-semibold hover:bg-[#0066e0]">
              Resume recording
            </button>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-[#dc2626]">{error}</p>
          {transcript.trim() && (
            <button onClick={retryMeetingSave} className="shrink-0 px-3 py-1.5 rounded-[8px] bg-[#117dff] text-white text-[12px] font-semibold hover:bg-[#0066e0]">
              Retry saving meeting
            </button>
          )}
        </div>
      )}
      </div>
    </motion.div>
  );

  /* ── Full-screen sectioned RESULTS popup (done) ── */
  const ins = insights || {};
  const arr = (v) => (Array.isArray(v) ? v : []);
  const sections = [
    { key: 'overview', title: 'Meeting overview', icon: AlignLeft, body: ins.summary ? <p className="whitespace-pre-wrap">{ins.summary}</p> : null },
    { key: 'actions', title: 'Action items', icon: ListChecks, body: arr(ins.action_items).length ? (
      <ul className="space-y-1.5">{arr(ins.action_items).map((a, i) => { const tx = typeof a === 'string' ? a : a?.task; return tx ? <li key={i} className="flex gap-2"><span className="text-[#117dff]">·</span><span>{tx}{a?.owner ? <span className="text-[#a3a3a3]"> — {a.owner}</span> : null}{a?.due ? <span className="text-[#a3a3a3]"> ({a.due})</span> : null}</span></li> : null; })}</ul>
    ) : null },
    { key: 'keypoints', title: 'Key points', icon: Lightbulb, body: arr(ins.key_points).length ? (
      <ul className="space-y-1.5">{arr(ins.key_points).map((k, i) => <li key={i} className="flex gap-2"><span className="text-[#117dff]">·</span>{String(k)}</li>)}</ul>
    ) : null },
    { key: 'decisions', title: 'Decisions', icon: CheckCircle2, body: arr(ins.decisions).length ? (
      <ul className="space-y-1.5">{arr(ins.decisions).map((d, i) => <li key={i} className="flex gap-2"><span className="text-[#f59e0b]">·</span>{typeof d === 'string' ? d : d?.text}</li>)}</ul>
    ) : null },
    { key: 'questions', title: 'Open questions', icon: HelpCircle, body: arr(ins.questions).length ? (
      <ul className="space-y-1.5">{arr(ins.questions).map((q, i) => <li key={i} className="flex gap-2"><span className="text-[#a3a3a3]">?</span>{typeof q === 'string' ? q : q?.text || q?.question}</li>)}</ul>
    ) : null },
    { key: 'risks', title: 'Risks', icon: AlertTriangle, body: arr(ins.risks).length ? (
      <ul className="space-y-1.5">{arr(ins.risks).map((risk, i) => <li key={i} className="flex gap-2"><span className="text-amber-600">!</span>{String(risk)}</li>)}</ul>
    ) : null },
    { key: 'next', title: 'Recommended next steps', icon: ArrowUpRight, body: arr(ins.next_steps).length ? (
      <ul className="space-y-1.5">{arr(ins.next_steps).map((next, i) => <li key={i} className="flex gap-2"><span className="text-emerald-600">·</span>{String(next)}</li>)}</ul>
    ) : null },
    { key: 'participants', title: 'Participants', icon: Users, body: cfgRef.current.participants.length ? (
      <div className="flex flex-wrap gap-1.5">{cfgRef.current.participants.map((name) => <span key={name} className="rounded-full border border-[#e3e0db] bg-[#faf9f4] px-2.5 py-1 text-[11px]">{name}</span>)}</div>
    ) : null },
    { key: 'quotes', title: 'Notable quotes', icon: Quote, body: arr(ins.quotes).length ? (
      <ul className="space-y-2">{arr(ins.quotes).map((q, i) => { const tx = typeof q === 'string' ? q : q?.quote; return tx ? <li key={i} className="border-l-2 border-[#117dff]/40 pl-3 italic text-[#525252]">"{tx}"{q?.speaker ? <span className="not-italic text-[#a3a3a3]"> — {q.speaker}</span> : null}</li> : null; })}</ul>
    ) : null },
    { key: 'transcript', title: 'Raw transcript', icon: AlignLeft, body: transcript ? <p className="whitespace-pre-wrap text-[12.5px] text-[#525252] max-h-[300px] overflow-y-auto">{transcript}</p> : null },
  ].filter((s) => s.body);

  const results = (
    <motion.div key="qr-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-[#0a0a0a]/30 backdrop-blur-[4px] p-3 md:p-8 flex items-center justify-center pointer-events-auto">
      <motion.div initial={{ opacity: 0, scale: 0.98, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[980px] max-h-[92vh] overflow-hidden bg-[#fbfaf7] border border-[#d8d5cf] rounded-[12px] shadow-[0_28px_90px_rgba(10,10,10,0.2)]">
      <div className="h-12 px-4 flex items-center justify-between border-b border-[#e3e0db] bg-white/80">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="w-3 h-3 rounded-full bg-[#ef6258]" />
          <span className="w-3 h-3 rounded-full bg-[#f4bd4f]" />
          <span className="w-3 h-3 rounded-full bg-[#58c653]" />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#a3a3a3]">meeting · operating report</span>
        <span className="text-[10px] font-mono text-emerald-700">READY</span>
      </div>
      {/* sticky header: title + actions */}
      <div className="bg-[#fbfaf7]/95 backdrop-blur border-b border-[#e3e0db] px-4 md:px-7 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-['Space_Grotesk'] leading-none">
            <span className="text-[20px] font-semibold text-[#525252]">{startedAtLabel.split(' ')[0] || '@Today'}</span>
            <span className="text-[20px] font-semibold text-[#b9b5ae] ml-2 tabular-nums">{startedAtLabel.split(' ').slice(1).join(' ')}</span>
          </div>
          <p className="text-[12px] text-[#a3a3a3] truncate mt-1">{ins.title || 'Meeting'} — also in desktop → Past meetings</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={saveToHivemind} disabled={ingesting || ingested || !meetingId}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[12px] font-semibold transition-colors ${ingested ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#117dff] text-white hover:bg-[#0066e0] disabled:opacity-50'}`}>
            {ingested ? <><CheckCircle2 size={13} /> Saved to memory</> : ingesting ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : <><Save size={13} /> Save to HIVEMIND memory</>}
          </button>
          <button onClick={() => setCollapsed(true)} title="Collapse"
            className="w-9 h-9 grid place-items-center rounded-lg text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4]"><Minimize2 size={16} /></button>
          <button onClick={dismiss} title="Close" aria-label="Close"
            className="w-9 h-9 grid place-items-center rounded-lg text-[#525252] hover:text-[#0a0a0a] hover:bg-[#faf9f4]"><X size={18} /></button>
        </div>
      </div>
      {/* sections — revealed one by one */}
      <div className="overflow-y-auto max-h-[calc(92vh-126px)] px-4 md:px-7 py-5 space-y-3">
        {sections.map((s, i) => (
          <motion.section key={s.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12, duration: 0.3 }}
            className="bg-white border border-[#e3e0db] rounded-[8px] p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2.5">
              <s.icon size={14} className="text-[#117dff]" />
              <h3 className="text-[13px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">{s.title}</h3>
            </div>
            <div className="text-[13.5px] text-[#0a0a0a] leading-relaxed">{s.body}</div>
          </motion.section>
        ))}
        {!sections.length && <p className="text-center text-[#a3a3a3] py-16">No insights extracted — the raw transcript is saved in desktop → Past meetings.</p>}
        {error && <p className="text-[12.5px] text-[#dc2626]">{error}</p>}
      </div>
      </motion.div>
    </motion.div>
  );

  const overlay = active ? createPortal(
    <AnimatePresence mode="wait">
      {collapsed ? chip : status === 'done' ? results : (
        <div className={`fixed inset-0 z-[70] flex p-4 pointer-events-none ${mob ? 'items-start justify-center pt-[76px]' : 'items-center justify-center'} ${status === 'config' ? 'bg-[#0a0a0a]/25 backdrop-blur-[2px] pointer-events-auto' : ''}`}>
          {card}
        </div>
      )}
    </AnimatePresence>,
    document.body,
  ) : null;

  return (
    <Ctx.Provider value={{ status, elapsed, error, supported: SUPPORTED, start, stop, dismiss, openConfig, recording, active }}>
      {children}
      {overlay}
    </Ctx.Provider>
  );
}

/**
 * MeetingNotesPromo — highlighted "New feature — AI Meeting Notes" entry pill.
 * Fixed top-right just below the navbar. Opens the quick-recorder wizard.
 * Hides while a recording/processing session is active (the chip lives there).
 */
const _MEET_PROMO_SEEN = 'hm_m_meetpromo_dismissed';

export function MeetingNotesPromo({ mobile = false, inline = false }) {
  const qrec = useQuickRecorder();
  // Mobile: a ONE-TIME banner that slides in from the LEFT on first chat open,
  // with an explicit X (rightmost) — it never floats over other controls again,
  // and no blue glow. Dismissal persists per device.
  const [dismissed, setDismissed] = React.useState(() => {
    try { return window.localStorage.getItem(_MEET_PROMO_SEEN) === '1'; } catch { return false; }
  });
  if (!qrec.supported || qrec.active) return null;
  if (mobile) {
    if (dismissed) return null;
    const dismiss = () => {
      setDismissed(true);
      try { window.localStorage.setItem(_MEET_PROMO_SEEN, '1'); } catch { /* private mode */ }
    };
    return (
      <motion.div
        initial={{ x: '-105%', opacity: 0.6 }} animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.35 }}
        className="mx-3 mt-1 mb-1 flex items-center gap-2 pl-2.5 pr-1.5 py-2 rounded-xl bg-white border border-[#e8e5de] shadow-[0_1px_6px_rgba(0,0,0,0.05)]"
      >
        <span className="px-1.5 py-0.5 rounded-[4px] bg-[#117dff] text-white text-[9px] font-bold font-['Space_Grotesk'] tracking-wide uppercase flex-shrink-0">New</span>
        <button onClick={() => { qrec.openConfig(); dismiss(); }}
          className="flex-1 min-w-0 inline-flex items-center gap-1.5 text-[12.5px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a] text-left">
          <Mic size={13} className="text-[#117dff] flex-shrink-0" />
          <span className="truncate">AI Meeting Notes — record, transcribe, recall</span>
        </button>
        <button onClick={dismiss} aria-label="Dismiss"
          className="w-8 h-8 rounded-full grid place-items-center text-[#6b6b66] active:bg-[#f1eee7] flex-shrink-0">
          <X size={15} />
        </button>
      </motion.div>
    );
  }
  // inline → a normal flex item INSIDE the navbar (can never overlap its
  // dropdowns). Desktop floating variant unchanged.
  const pos = inline ? '' : 'fixed z-10 top-[64px] right-6';
  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      onClick={() => qrec.openConfig()}
      className={`${pos} flex items-center gap-2 pl-2 pr-3 ${inline ? 'h-8' : 'py-1.5'} rounded-[6px] bg-white border border-[#117dff]/35 shadow-[0_2px_12px_rgba(17,125,255,0.18)] hover:shadow-[0_2px_16px_rgba(17,125,255,0.3)] hover:border-[#117dff] transition-all`}
      title="Record a meeting — transcript + insights, saved to Past meetings">
      <span className="px-1.5 py-0.5 rounded-[4px] bg-[#117dff] text-white text-[9px] font-bold font-['Space_Grotesk'] tracking-wide uppercase">New</span>
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">
        <Mic size={13} className="text-[#117dff]" /> AI Meeting Notes
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#117dff] animate-pulse" />
    </motion.button>
  );
}

export default QuickRecorderProvider;
