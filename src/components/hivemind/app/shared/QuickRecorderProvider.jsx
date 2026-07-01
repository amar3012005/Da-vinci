import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Sparkles, CheckCircle2, X, Users, FolderOpen, NotebookPen, ChevronRight, ChevronLeft, Minimize2 } from 'lucide-react';
import apiClient from './api-client';

/**
 * QuickRecorderProvider — app-wide "record a meeting from anywhere" engine.
 * Mounted ABOVE the router so recording + the floating chip SURVIVE navigation.
 *
 * Flow: mic click → step-by-step config wizard (Participants → Save memories to
 * → Meeting context) → Start → live card (@Today heading, timer, Stop) which
 * collapses to a compact `| @Today 11:18 PM |` chip — bottom-center on desktop,
 * TOP-RIGHT on mobile. On stop: transcribe → insights → save meeting →
 * hard-facts ingest → "see desktop → Past meetings".
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
const isMobile = () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false);

/* "@Today 11:18 PM" label for NOW */
function atNow() {
  const d = new Date();
  return `@Today ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

const SCOPES = [
  { id: 'personal', label: 'Personal', icon: Users },
  { id: 'project', label: 'Project', icon: FolderOpen },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'organization', label: 'Org', icon: Users },
];

export function QuickRecorderProvider({ children }) {
  const [status, setStatus] = useState('idle'); // idle | config | recording | transcribing | analyzing | done | error
  const [step, setStep] = useState(0);          // wizard step 0..2
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
  const cfgRef = useRef({ participants: [], scope: 'personal', projectId: null, notes: '' });

  const cleanup = useCallback(() => {
    if (segTimerRef.current) { clearInterval(segTimerRef.current); segTimerRef.current = null; }
    if (clockRef.current) { clearInterval(clockRef.current); clockRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((tr) => tr.stop()); streamRef.current = null; }
  }, []);

  const transcribeSegment = useCallback((idx, blob) => {
    const names = cfgRef.current.participants.join(', ');
    const hint = [cfgRef.current.notes, names ? `Participants: ${names}` : ''].filter(Boolean).join(' — ').slice(0, 800);
    const p = apiClient.core.post(`/api/meetings/transcribe?diarize=false&prompt=${encodeURIComponent(hint)}`, blob, {
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

  const finalize = useCallback(async () => {
    setError(null); setStatus('transcribing'); setCollapsed(false);
    const cfg = cfgRef.current;
    try {
      await Promise.allSettled(segPromisesRef.current);
      const idxs = Object.keys(segTextsRef.current).map(Number).sort((a, b) => a - b);
      const text = idxs.map((i) => segTextsRef.current[i]).filter(Boolean).join('\n').trim();
      if (!text) { setStatus('error'); setError('No speech detected.'); return; }
      setStatus('analyzing');
      let insights = null;
      try {
        const ins = await apiClient.core.post('/api/meetings/insights', {
          transcript: text, notes: cfg.notes || undefined, participants: cfg.participants,
        }, { timeout: 240000 });
        insights = ins.data?.insights || null;
      } catch { /* insights optional */ }
      const row = await apiClient.core.post('/api/meetings', {
        title: insights?.title || `Meeting ${new Date().toLocaleString()}`,
        transcript: text, insights: insights || {}, language: langRef.current,
        notes: cfg.notes || null,
        participants: cfg.participants.map((n) => ({ type: 'external', name: n })),
        scope: cfg.scope, project_id: cfg.scope === 'project' ? cfg.projectId : null,
        session_id: sessionIdRef.current || undefined,
      }, { timeout: 60000 });
      const mid = row.data?.id || null;
      if (mid) apiClient.core.post(`/api/meetings/${mid}/ingest`, {}, { timeout: 180000 }).catch(() => {});
      setStatus('done');
    } catch (e) {
      setStatus('error'); setError(e?.response?.data?.error || e?.message || 'Processing failed.');
    }
  }, []);

  // Open the pre-start config wizard (the mic-button entry point).
  const openConfig = useCallback(() => {
    if (!SUPPORTED) { setError('Recording not supported on this device.'); setStatus('error'); return; }
    if (status === 'recording') { setCollapsed(false); return; }
    setStep(0); setError(null); setStatus('config');
    apiClient.core.get('/api/team/projects').then(({ data }) => setProjects(data?.projects || [])).catch(() => {});
  }, [status]);

  const start = useCallback(async () => {
    cfgRef.current = { participants: participants.slice(0, 12), scope, projectId, notes };
    setError(null); setElapsed(0); setCollapsed(false);
    segIdxRef.current = 0; segChunksRef.current = []; segPromisesRef.current = [];
    segTextsRef.current = {}; langRef.current = null; finalizingRef.current = false;
    sessionIdRef.current = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : null;
    let mic;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch { setError('Microphone permission denied.'); setStatus('error'); return; }
    streamRef.current = mic;
    setStartedAtLabel(atNow());
    rollSegment(); setStatus('recording');
    segTimerRef.current = setInterval(() => {
      if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
    }, SEGMENT_MS);
    clockRef.current = setInterval(() => setElapsed((x) => x + 1), 1000);
  }, [participants, scope, projectId, notes, rollSegment]);

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

  const dismiss = useCallback(() => {
    setStatus('idle'); setError(null); setCollapsed(false);
    setParticipants([]); setPName(''); setScope('personal'); setProjectId(null); setNotes('');
  }, []);

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

  /* ── Collapsed chip: | @Today 11:18 PM | — top-right (mobile) / bottom-center (desktop) */
  const chip = (
    <motion.button key="qr-chip" initial={{ opacity: 0, y: mob ? -16 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: mob ? -16 : 16 }}
      onClick={() => setCollapsed(false)}
      className={`fixed z-[70] flex items-stretch bg-white border border-[#e3e0db] rounded-[10px] shadow-lg overflow-hidden ${mob ? 'top-3 right-3' : 'bottom-4 left-1/2 -translate-x-1/2'}`}
      title="Expand recorder">
      <span className={`w-[3px] ${recording ? 'bg-red-500' : busy ? 'bg-[#117dff]' : 'bg-emerald-500'}`} />
      <span className="flex items-center gap-2 px-3 py-1.5 font-['Space_Grotesk']">
        {recording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
        <span className="text-[13px] font-semibold text-[#525252]">{startedAtLabel.split(' ')[0] || '@Today'}</span>
        <span className="text-[13px] font-semibold text-[#b9b5ae] tabular-nums">{startedAtLabel.split(' ').slice(1).join(' ')}</span>
        {recording && <span className="text-[12px] text-[#0a0a0a] font-semibold tabular-nums ml-0.5">{mm}:{ss}</span>}
        {busy && <span className="w-3 h-3 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />}
        {status === 'done' && <CheckCircle2 size={13} className="text-emerald-600" />}
      </span>
      <span className={`w-[3px] ${recording ? 'bg-red-500' : busy ? 'bg-[#117dff]' : 'bg-emerald-500'}`} />
    </motion.button>
  );

  /* ── Wizard steps ── */
  const stepDefs = [
    { key: 'participants', label: 'Participants', icon: Users },
    { key: 'saveto', label: 'Save memories to', icon: FolderOpen },
    { key: 'context', label: 'Meeting context', icon: NotebookPen },
  ];
  const StepIcon = stepDefs[step]?.icon || Users;

  const card = (
    <motion.div key="qr-card" initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 10 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      className="bg-white border border-[#e3e0db] rounded-[18px] shadow-xl w-full max-w-[420px] p-5 pointer-events-auto">
      {/* header */}
      <div className="flex items-center justify-between">
        {recording ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-semibold text-red-600 font-['Space_Grotesk'] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
          </span>
        ) : busy ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700 font-['Space_Grotesk']">
            <Sparkles size={11} /> {status === 'transcribing' ? 'Transcribing…' : 'Analyzing…'}
          </span>
        ) : status === 'done' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700 font-['Space_Grotesk']">
            <CheckCircle2 size={11} /> Saved
          </span>
        ) : status === 'error' ? (
          <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-semibold text-red-600 font-['Space_Grotesk']">Error</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-[#117dff] font-['Space_Grotesk']">
            <Mic size={11} /> New meeting
          </span>
        )}
        <div className="flex items-center gap-1">
          {(recording || busy || status === 'done') && (
            <button onClick={() => setCollapsed(true)} title="Collapse"
              className="w-7 h-7 grid place-items-center rounded-lg text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4]"><Minimize2 size={14} /></button>
          )}
          {(status === 'config' || status === 'done' || status === 'error') && (
            <button onClick={dismiss} title="Close"
              className="w-7 h-7 grid place-items-center rounded-lg text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4]"><X size={14} /></button>
          )}
        </div>
      </div>

      {/* @Today heading */}
      <div className="mt-2.5 font-['Space_Grotesk'] leading-none">
        <span className="text-[26px] font-semibold text-[#525252]">{(recording || busy || status === 'done' ? startedAtLabel : atNow()).split(' ')[0]}</span>
        <span className="text-[26px] font-semibold text-[#b9b5ae] ml-2 tabular-nums">{(recording || busy || status === 'done' ? startedAtLabel : atNow()).split(' ').slice(1).join(' ')}</span>
      </div>

      {/* CONFIG WIZARD — one step at a time */}
      {status === 'config' && (
        <>
          {/* step rail */}
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
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                  placeholder="Topic, who is speaking (names), companies, key terms…"
                  className="w-full px-3 py-2 rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] text-[13px] outline-none focus:border-[#117dff] resize-none" />
                <p className="text-[11px] text-[#a3a3a3] mt-1.5">Crucial — used to spell names right + sharpen insights.</p>
              </div>
            )}
          </div>

          {/* wizard nav */}
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

      {/* LIVE / BUSY / DONE */}
      {recording && (
        <div className="mt-3">
          <div className="text-[40px] font-['Space_Grotesk'] leading-none">
            <span className="font-semibold text-[#d4d0ca]">{mm}:</span><span className="font-semibold text-[#0a0a0a] tabular-nums">{ss}</span>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#a3a3a3]">Meeting notes</span>
            <button onClick={stop} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600">
              <Square size={11} fill="currentColor" /> Stop
            </button>
          </div>
        </div>
      )}
      {busy && (
        <p className="mt-3 text-[12.5px] text-[#525252]">Processing your meeting — you can collapse this and keep working.</p>
      )}
      {status === 'done' && (
        <p className="mt-3 text-[12.5px] text-[#525252]">Saved to HIVEMIND. <b>Open desktop → Meeting notes → Past meetings</b> to see the transcript + insights.</p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-[12.5px] text-[#dc2626]">{error}</p>
      )}
    </motion.div>
  );

  const overlay = active ? createPortal(
    <AnimatePresence mode="wait">
      {collapsed ? chip : (
        <div className={`fixed inset-0 z-[70] flex p-4 pointer-events-none ${mob ? 'items-start justify-center pt-10' : 'items-center justify-center'} ${status === 'config' ? 'bg-[#0a0a0a]/25 backdrop-blur-[2px] pointer-events-auto' : ''}`}>
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

export default QuickRecorderProvider;
