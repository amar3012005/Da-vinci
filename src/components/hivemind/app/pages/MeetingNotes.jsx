/**
 * AI Meeting Notes — matches the HIVEMIND light "operator console" theme
 * (Workspace Admin / MCP / Overview). Built per the hivemind-frontend skill.
 *
 * Pipeline: record → Groq Whisper → optional pyannote multi-speaker → gpt-oss
 * insights → Save to HIVEMIND. Past meetings load from memories tagged
 * `ai-meeting-notes`.
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, Loader2, FileText, ListChecks, Lightbulb, CheckCircle2,
  HelpCircle, Save, AlertTriangle, Sparkles, Users, Clock, ArrowUpRight,
  CalendarDays, History, AlignLeft, ScrollText, ArrowLeft, Quote, NotebookPen, Building2, User,
  Volume2, MonitorSpeaker, FolderOpen, UserPlus, X, Trash2,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import MeetingNotesIcon from '../shared/MeetingNotesIcon';
import MeetingIntelligencePanel from '../components/MeetingIntelligencePanel';
import { useTranslation } from 'react-i18next';

// Pick a MediaRecorder MIME the browser actually supports. Chrome/Firefox do
// webm/opus; Safari + iOS do NOT support webm and only offer mp4 — hardcoding
// 'audio/webm' made `new MediaRecorder` throw there, killing recording on those
// browsers. Falls through to '' (UA default) as a last resort.
const RECORDER_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mp4;codecs=mp4a.40.2'];
function pickRecorderMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  for (const m of RECORDER_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return ''; // let the browser choose its own default
}

const SPEAKER_COLORS = { SPEAKER_00: '#117dff', SPEAKER_01: '#10b981', SPEAKER_02: '#f59e0b', SPEAKER_03: '#8b5cf6', SPEAKER_04: '#0891b2', SPEAKER_05: '#ef4444' };
const speakerLabel = (s) => { const m = /SPEAKER_(\d+)/.exec(s || ''); return m ? `Speaker ${Number(m[1]) + 1}` : (s || 'Speaker'); };
const fmtTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
/* real participant name when insights mapped one (from the pre-meeting context) */
const nameFor = (speaker, map) => (map && map[speaker]) || speakerLabel(speaker);

/* Notion-style "@Today 11:01 PM" — relative day + time */
function fmtAt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay(d, now)) return `@Today ${time}`;
  if (sameDay(d, yest)) return `@Yesterday ${time}`;
  return `@${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).replace(/ /g, ' ')} ${time}`;
}

/* "@Today 11:01 PM" chip — Notion-grey; dark variant for device surfaces */
function AtChip({ iso, dark = false, className = '' }) {
  const label = fmtAt(iso);
  if (!label) return null;
  const [at, ...rest] = label.split(' ');
  return (
    <span className={`inline-flex items-baseline gap-1 font-['Space_Grotesk'] ${className}`}>
      <span className={`text-[12px] font-semibold ${dark ? 'text-[#8e8e93]' : 'text-[#737373]'}`}>{at}</span>
      <span className={`text-[12px] tabular-nums ${dark ? 'text-[#6e6e73]' : 'text-[#a3a3a3]'}`}>{rest.join(' ')}</span>
    </span>
  );
}

/* live clock chip — Space Grotesk numerals, ivory pill */
function ClockChip() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#faf9f4] border border-[#e3e0db]">
      <CalendarDays size={13} className="text-[#a3a3a3]" />
      <span className="text-[11px] text-[#737373]">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
      <span className="text-[12px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] tabular-nums">{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
    </div>
  );
}

/* Live wave — canvas bars. While recording: audio-reactive (Web Audio analyser
   on the live mic stream). While analyzing: a calm synthetic sine wave keeps
   moving. Light theme, app-blue bars, no glow. */
function LiveWave({ stream, mode }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const W = (canvas.width = Math.max(300, canvas.offsetWidth) * 2);
    const H = (canvas.height = 88 * 2);
    const N = 64; const bw = W / N;
    let raf; let audio = null; let analyser = null; let data = null;
    const t0 = performance.now();
    if (stream && mode === 'record') {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        audio = new AC();
        const src = audio.createMediaStreamSource(stream);
        analyser = audio.createAnalyser();
        analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.78;
        src.connect(analyser);
        data = new Uint8Array(analyser.frequencyBinCount);
      } catch { analyser = null; }
    }
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        let v;
        if (analyser) {
          analyser.getByteFrequencyData(data);
          v = (data[Math.floor((i * data.length) / N / 1.7)] || 0) / 255;
          v = 0.06 + v * 0.94;
        } else {
          v = 0.3 + 0.22 * Math.sin(t * 2.6 + i * 0.42) + 0.14 * Math.sin(t * 5.3 + i * 0.9);
        }
        const h = Math.max(6, v * H * 0.86);
        const x = i * bw + bw * 0.28; const w = bw * 0.44;
        const y = (H - h) / 2;
        ctx.fillStyle = mode === 'record' ? 'rgba(17,125,255,0.92)' : 'rgba(17,125,255,0.45)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, w / 2);
        ctx.fill();
      }
    };
    draw();
    return () => { cancelAnimationFrame(raf); if (audio) audio.close().catch(() => {}); };
  }, [stream, mode]);
  return <canvas ref={canvasRef} className="w-full h-[88px] block" aria-hidden="true" />;
}

/* Recording popup — LIGHT panel matching the operator-console theme.
   Big Notion-style "@Today 11:01 PM" heading, audio-reactive wave while
   recording, calm waving shimmer while transcribing/analyzing. */
function RecordingModal({ status, elapsed, notes, setNotes, multiSpeaker, setMultiSpeaker, onStop, title, stream, t }) {
  const recording = status === 'recording';
  const busy = status === 'transcribing' || status === 'analyzing';
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const atLabel = fmtAt(now.toISOString());
  const [atDay, ...atRest] = atLabel.split(' ');
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/25 backdrop-blur-[3px]">
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="bg-white border border-[#e3e0db] rounded-[18px] shadow-xl w-full max-w-[560px] p-6">
        {/* top row — REC / status pill + live clock */}
        <div className="flex items-center justify-between">
          {recording ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-semibold text-red-600 font-['Space_Grotesk'] tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700 font-['Space_Grotesk']">
              <Sparkles size={11} /> {status === 'transcribing' ? t('meetingnotes.transcribing', 'Transcribing…') : t('meetingnotes.analyzing', 'Analyzing…')}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#737373] font-['Space_Grotesk'] tabular-nums">
            <Clock size={12} className="text-[#a3a3a3]" />
            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        </div>

        {/* BIG Notion-style @Today heading */}
        <div className="mt-3 font-['Space_Grotesk'] leading-none">
          <span className="text-[32px] font-semibold text-[#525252]">{atDay}</span>
          <span className="text-[32px] font-semibold text-[#b9b5ae] ml-2 tabular-nums">{atRest.join(' ')}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-6 h-6 rounded-[7px] bg-blue-50 border border-blue-100 grid place-items-center flex-shrink-0"><Mic size={12} className="text-[#117dff]" /></span>
          <span className="text-[13px] font-medium text-[#737373] truncate">{title || t('meetingnotes.newMeeting', 'New meeting')}</span>
          {recording && <span className="text-[9px] text-[#a3a3a3] uppercase tracking-[0.18em] font-['Space_Grotesk']">{t('meetingnotes.live', 'Live')}</span>}
        </div>

        {/* timer + live wave */}
        <div className="mt-4 flex items-end justify-between gap-4">
          <span className="font-['Space_Grotesk'] font-semibold tabular-nums leading-none text-[54px]">
            <span className={mm === '00' ? 'text-[#d4d0ca]' : 'text-[#0a0a0a]'}>{mm}</span>
            <span className="text-[#d4d0ca]">:</span>
            <span className="text-[#0a0a0a]">{ss}</span>
          </span>
          <button onClick={() => setMultiSpeaker((v) => !v)} disabled={busy}
            className="flex items-center gap-2 mb-1 text-[12px] text-[#525252] disabled:opacity-50"
            title={t('meetingnotes.multiSpeakerHint', 'Label who said what (runs speaker diarization)')}>
            <span className="inline-flex items-center gap-1.5"><Users size={13} className="text-[#f59e0b]" /> {t('meetingnotes.multiShort', 'Multi-speaker')}</span>
            <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${multiSpeaker ? 'bg-[#117dff]' : 'bg-[#e3e0db]'}`}>
              <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform" style={{ transform: multiSpeaker ? 'translateX(18px)' : 'translateX(2px)' }} />
            </span>
          </button>
        </div>
        <div className="relative mt-3 rounded-[12px] bg-[#faf9f4] border border-[#e3e0db] overflow-hidden px-2">
          <LiveWave stream={recording ? stream : null} mode={recording ? 'record' : 'analyze'} />
          {busy && <div className="absolute inset-y-0 w-1/3 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(17,125,255,0.14), transparent)', animation: 'mn-sweep 1.6s ease-in-out infinite' }} />}
        </div>

        {/* notes — functional, same state as the page */}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder={t('meetingnotes.contextPlaceholder2', 'Topic, speaker names, key terms — add anytime…')}
          className="mt-3 w-full h-[64px] resize-none p-3 text-[12px] rounded-[10px] bg-[#faf9f4] border border-[#e3e0db] text-[#0a0a0a] placeholder-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40" />

        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[#a3a3a3] uppercase tracking-wider font-['Space_Grotesk']"><MeetingNotesIcon size={11} /> {t('meetingnotes.channel', 'Meeting Notes')}</span>
          <button onClick={onStop} disabled={!recording}
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#ef4444] text-white text-[13px] font-semibold hover:bg-[#dc2626] disabled:opacity-40 transition-colors">
            <Square size={12} fill="currentColor" /> {t('meetingnotes.stop', 'Stop')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Past-meeting card — small light card matching the operator-console theme.
   Emoji tile, prominent @date·time, soft blue ruler strip, emoji micro-stats. */
function MeetingCard({ m, onOpen, onDelete }) {
  const actions = Array.isArray(m.action_items) ? m.action_items.length : 0;
  const keyPts = Array.isArray(m.key_points) ? m.key_points.length : 0;
  const quests = Array.isArray(m.questions) ? m.questions.length : 0;
  const time = new Date(m.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  const atLabel = fmtAt(m.created_at);
  const [atDay, ...atRest] = atLabel.split(' ');
  return (
    <motion.button whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} onClick={() => onOpen(m)}
      className="text-left bg-white border border-[#e3e0db] rounded-[12px] p-3 hover:border-[#0a0a0a] hover:shadow-sm transition-all group relative">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-[8px] bg-blue-50 border border-blue-100 grid place-items-center flex-shrink-0"><MeetingNotesIcon size={14} className="text-[#117dff]" /></span>
          <span className="text-[12px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] truncate">{m.title || 'Meeting'}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => onDelete(m, e)}
            className="text-[#a3a3a3] hover:text-[#ef4444] transition-colors p-0.5 rounded"
            aria-label="Delete meeting"
          >
            <Trash2 size={13} />
          </button>
          <ArrowUpRight size={12} className="text-[#a3a3a3] group-hover:text-[#0a0a0a] transition-colors" />
        </div>
      </div>
      {/* prominent @date · time */}
      <div className="mt-2 font-['Space_Grotesk'] leading-none">
        <span className="text-[16px] font-semibold text-[#525252]">{atDay}</span>
        <span className="text-[16px] font-semibold text-[#b9b5ae] ml-1.5 tabular-nums">{atRest.join(' ')}</span>
      </div>
      {/* soft ruler strip — start time · ticks · language */}
      <div className="mt-2.5 rounded-[8px] bg-blue-50 border border-blue-100 px-2.5 py-1.5 flex items-center font-['Space_Grotesk']">
        <span className="text-[11px] font-semibold text-blue-700 tabular-nums">{time}</span>
        <span className="flex-1 mx-2.5 h-[8px]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(17,125,255,.35) 0 1.5px, transparent 1.5px 7px)' }} />
        <span className="text-[10px] font-semibold text-blue-700 uppercase">{m.language || '—'}</span>
      </div>
      <p className="text-[11px] text-[#737373] mt-2 leading-snug line-clamp-2">{m.summary || '—'}</p>
      <div className="mt-2.5 pt-2 border-t border-[#eae7e1] flex items-center gap-3 text-[10.5px] text-[#737373]">
        <span className="inline-flex items-center gap-1"><ListChecks size={11} className="text-[#10b981]" /> {actions}</span>
        <span className="inline-flex items-center gap-1"><Sparkles size={11} className="text-[#8b5cf6]" /> {keyPts}</span>
        <span className="inline-flex items-center gap-1"><HelpCircle size={11} className="text-[#0891b2]" /> {quests}</span>
        {m.multi_speaker ? <span className="inline-flex items-center gap-1"><Users size={11} className="text-[#f59e0b]" /> {m.speaker_count || 2}</span> : null}
      </div>
    </motion.button>
  );
}

function StatCard({ icon: Icon, value, label, color = '#0a0a0a' }) {
  return (
    <div className="bg-white border border-[#e3e0db] rounded-[10px] p-3 hover:border-[#d4d0ca] transition-colors">
      <Icon size={16} style={{ color }} />
      <div className="text-[22px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] tabular-nums leading-none mt-2">{value}</div>
      <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function Panel({ icon: Icon, title, accent = '#117dff', children, className = '' }) {
  return (
    <div className={`bg-white border border-[#e3e0db] rounded-[10px] p-4 ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <Icon size={14} style={{ color: accent }} />
          <h3 className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

export default function MeetingNotes() {
  const { t } = useTranslation('dashboard');
  const [tab, setTab] = useState('record'); // record | past
  const [status, setStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false); // ingest in flight — gives the button feedback + blocks double-submit
  const [meetingId, setMeetingId] = useState(null); // Past-meetings row id (persisted on finish, before any HIVEMIND save)
  const [multiSpeaker, setMultiSpeaker] = useState(false);
  // 'mic'  → microphone only (in-person / you on a phone call)
  // 'tab'  → capture the meeting TAB's audio (the other participants) merged
  //          with your mic, via getDisplayMedia. Lets the web app transcribe
  //          BOTH sides of a Google Meet / Zoom-web call without an extension.
  const [captureMode, setCaptureMode] = useState('mic');
  const [speakerSegments, setSpeakerSegments] = useState(null);
  const [language, setLanguage] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('summary');
  const [detailErr, setDetailErr] = useState(false);

  // Delete-meeting modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [deleteScope, setDeleteScope] = useState('both');
  const [deleteHard, setDeleteHard] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState(null);

  // Meeting setup — participants and scope (set before recording starts)
  const [participants, setParticipants] = useState([]); // { type:'member'|'external', id?, name, email?, slackName? }
  const [scope, setScope] = useState('personal'); // 'personal' | 'project' | 'team' | 'organization'
  const [scopeProjectId, setScopeProjectId] = useState(null);
  const [orgMembers, setOrgMembers] = useState([]);
  const [orgProjects, setOrgProjects] = useState([]);
  // External participant add-form state (local to setup card)
  const [extName, setExtName] = useState('');
  const [extEmail, setExtEmail] = useState('');
  const [extSlack, setExtSlack] = useState('');

  const recRef = useRef(null); const chunksRef = useRef([]); const streamRef = useRef(null); const timerRef = useRef(null);
  const audioCtxRef = useRef(null); const teardownRef = useRef([]); // extra streams/ctx to tear down (tab+mic merge)

  // ── Segmented capture for long meetings (>50 min) ───────────────────────────
  // A single recording exceeds Groq Whisper's per-call size cap (~25 MB ≈ <1 hr),
  // which is why long meetings failed. We rotate the MediaRecorder every
  // SEGMENT_MS: each finished 10-min segment is an independently-decodable webm
  // that transcribes IN PARALLEL while the next segment is already recording. At
  // stop we await all segment transcriptions, stitch them in order into one full
  // transcript, then run insights ONCE on the whole meeting.
  const SEGMENT_MS = 10 * 60 * 1000;
  const segTimerRef = useRef(null);    // rotation interval
  const segIdxRef = useRef(0);         // next segment index to assign
  const segChunksRef = useRef([]);     // chunks for the CURRENT segment
  const segPromisesRef = useRef([]);   // in-flight transcription promises
  const segTextsRef = useRef({});      // idx -> transcript text (ordered at stop)
  const segSegsRef = useRef({});       // idx -> speakerSegments
  const languageRef = useRef(null);    // first detected language wins
  const finalizingRef = useRef(false); // true once Stop pressed — stops rotation
  const [segDone, setSegDone] = useState(0);
  const [segTotal, setSegTotal] = useState(0);

  const loadMeetings = useCallback(async () => {
    try {
      // Persistent org-level meetings table (structured rows).
      const { data } = await apiClient.core.get('/api/meetings?limit=40');
      setMeetings((data?.meetings || []).filter(Boolean));
    } catch { /* non-fatal */ }
  }, []);
  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  // Load org members and projects for meeting setup (best-effort, non-fatal)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.core.get('/api/team/members');
        if (!cancelled) setOrgMembers(data?.members || []);
      } catch { /* non-fatal */ }
    })();
    (async () => {
      try {
        const { data } = await apiClient.core.get('/api/team/projects');
        if (!cancelled) setOrgProjects(data?.projects || []);
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // The list endpoint is light (no transcript/notes/insights) — fetch the full
  // row when a past meeting is opened so every section + transcript renders.
  const openMeeting = useCallback(async (m) => {
    setSelected(m); setDetailTab('summary'); setDetailErr(false);
    try {
      const { data } = await apiClient.core.get(`/api/meetings/${m.id}`);
      if (data?.meeting) setSelected((cur) => (cur && cur.id === m.id ? { ...m, ...data.meeting } : cur));
    } catch { setDetailErr(true); /* keep the list row — partial beats broken */ }
  }, []);

  // Poll the open meeting's intelligence until it's ready (async generation).
  useEffect(() => {
    if (!selected?.id) return;
    const st = selected.intelligence_status;
    if (st !== 'pending' && st !== 'none') return;
    let n = 0; let cancelled = false;
    const iv = setInterval(async () => {
      n += 1;
      if (cancelled || n > 6) { clearInterval(iv); return; }
      try {
        const { data } = await apiClient.core.get(`/api/meetings/${selected.id}`);
        const m = data?.meeting;
        if (m && (m.intelligence_status === 'ready' || m.intelligence_status === 'empty' || m.intelligence_status === 'error')) {
          setSelected((cur) => (cur && cur.id === m.id ? { ...cur, ...m } : cur));
          clearInterval(iv);
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [selected?.id, selected?.intelligence_status]);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (segTimerRef.current) { clearInterval(segTimerRef.current); segTimerRef.current = null; }
    // Tear down the raw tab + mic streams and the merge AudioContext first.
    teardownRef.current.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
    teardownRef.current = [];
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { /* ignore */ } audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((tr) => tr.stop()); streamRef.current = null; }
  }, []);
  useEffect(() => cleanup, [cleanup]);

  // Persist a structured meeting row to the Past-meetings table. Independent of
  // HIVEMIND — called automatically the moment a meeting finishes, and again
  // (as a PATCH) when the user later saves it to HIVEMIND. Returns { id }.
  const persistRow = useCallback(async ({ insights, transcript, segments, language, sourceMemoryId = null, title }) => {
    const speakers = segments?.length ? new Set(segments.map((s) => s.speaker)).size : null;
    const { data } = await apiClient.core.post('/api/meetings', {
      title: title || insights?.title || `Meeting ${new Date().toLocaleString()}`,
      transcript, language,
      multi_speaker: !!segments?.length, speaker_count: speakers,
      segments: segments || null,
      source_memory_id: sourceMemoryId,
      insights: insights || {},
      notes: notes || null,
      participants,
      scope,
      project_id: scope === 'project' ? scopeProjectId : null,
    }, { timeout: 60000 }); // override the 15s core default — large transcript+insights payloads
    return data;
  }, [notes, participants, scope, scopeProjectId]);

  // Transcribe ONE segment in the background (fired the instant a segment
  // closes). Failures are swallowed per-segment so one bad 10-min chunk never
  // loses the whole meeting — the rest still stitch.
  const transcribeSegment = useCallback((idx, blob) => {
    setSegTotal((n) => Math.max(n, idx + 1));
    const participantNames = participants.map((p) => p.name).filter(Boolean).join(', ');
    const promptHint = [notes, participantNames ? `Participants: ${participantNames}` : ''].filter(Boolean).join(' — ').slice(0, 800);
    const p = apiClient.core.post(`/api/meetings/transcribe?diarize=${multiSpeaker}&prompt=${encodeURIComponent(promptHint)}`, blob, { headers: { 'Content-Type': blob.type || 'audio/webm' }, timeout: 300000 })
      .then((tr) => {
        segTextsRef.current[idx] = tr.data?.transcript || '';
        if (tr.data?.speakerSegments?.length) segSegsRef.current[idx] = tr.data.speakerSegments;
        if (tr.data?.language && !languageRef.current) languageRef.current = tr.data.language;
      })
      .catch(() => { if (segTextsRef.current[idx] === undefined) segTextsRef.current[idx] = ''; })
      .finally(() => setSegDone((n) => n + 1));
    segPromisesRef.current.push(p);
  }, [multiSpeaker, notes, participants]);

  // Roll one segment recorder on the live stream. On stop it ships the segment
  // for transcription and (unless we're finalizing) immediately starts the next
  // one — so recording never pauses while older segments transcribe in parallel.
  const startSegmentRecorder = useCallback(() => {
    const stream = streamRef.current; if (!stream) return;
    const mime = pickRecorderMime();
    segChunksRef.current = [];
    // Empty mime → omit the option so the UA picks its own supported default.
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); recRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size) segChunksRef.current.push(e.data); };
    rec.onstop = () => {
      const idx = segIdxRef.current++;
      const blob = new Blob(segChunksRef.current, { type: rec.mimeType || mime || 'audio/webm' });
      if (blob.size > 1024) transcribeSegment(idx, blob); else segIdxRef.current--;
      if (!finalizingRef.current) startSegmentRecorder(); // roll the next segment instantly
    };
    rec.start(1000);
  }, [transcribeSegment]);

  // Stitch all segments in order → full transcript → ONE insights pass.
  const finalize = useCallback(async () => {
    setError(null); setStatus('transcribing');
    try {
      await Promise.allSettled(segPromisesRef.current);
      const idxs = Object.keys(segTextsRef.current).map(Number).sort((a, b) => a - b);
      const text = idxs.map((i) => segTextsRef.current[i]).filter(Boolean).join('\n').trim();
      const segs = idxs.flatMap((i) => segSegsRef.current[i] || []); // NOTE: speaker labels are per-segment (not globally reconciled yet)
      const lang = languageRef.current;
      setTranscript(text); setSpeakerSegments(segs.length ? segs : null); setLanguage(lang);
      if (!text) { setStatus('error'); setError('No speech detected.'); return; }
      setStatus('analyzing');
      const input = segs.length ? segs.map((s) => `${s.speaker}: ${s.text}`).join('\n') : text;
      const ins = await apiClient.core.post('/api/meetings/insights', { transcript: input, notes, participants: participants.map((p) => p.name) }, { timeout: 240000 });
      const insights = ins.data?.insights || null;
      setInsights(insights); setStatus('done');
      try {
        const row = await persistRow({ insights: insights || {}, transcript: text, segments: segs.length ? segs : null, language: lang });
        if (row?.id) setMeetingId(row.id);
        loadMeetings();
      } catch { /* non-fatal — recording is still usable / re-savable */ }
    } catch (e) { setStatus('error'); setError(e.response?.data?.error || e.message || 'Processing failed.'); }
  }, [notes, participants, persistRow, loadMeetings]);

  const start = useCallback(async () => {
    setError(null); setTranscript(''); setInsights(null); setSaved(false); setElapsed(0); setSpeakerSegments(null); setMeetingId(null);
    // reset segmented-capture state
    segIdxRef.current = 0; segChunksRef.current = []; segPromisesRef.current = [];
    segTextsRef.current = {}; segSegsRef.current = {}; languageRef.current = null;
    finalizingRef.current = false; setSegDone(0); setSegTotal(0);

    // Best-effort invite for external participants — do not await, never block recording
    const extWithEmail = participants.filter((p) => p.type === 'external' && p.email);
    if (extWithEmail.length) {
      apiClient.core.post('/api/meetings/invite', {
        participants: extWithEmail,
        title: (notes || '').slice(0, 120) || 'Meeting',
      }).catch(() => {});
    }

    // Mic is always part of the recording (your voice). In 'tab' mode we ALSO
    // capture the meeting tab's audio (everyone else) and merge the two.
    let mic;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch { setError('Microphone permission denied.'); return; }
    teardownRef.current.push(() => mic.getTracks().forEach((tr) => tr.stop()));

    let recordStream;
    if (captureMode === 'tab') {
      // getDisplayMedia shows the tab/window picker; the user must pick the
      // meeting TAB and tick "Share tab audio". video:true is required for the
      // picker to even offer audio — we drop the video track immediately.
      let display;
      try {
        display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } catch {
        cleanup(); setError('Tab share was cancelled. Pick the meeting tab and enable "Share tab audio" to capture the other participants.'); return;
      }
      teardownRef.current.push(() => display.getTracks().forEach((tr) => tr.stop()));
      const dispAudio = display.getAudioTracks();
      if (!dispAudio.length) {
        cleanup(); setError('No tab audio captured. When the picker opens, choose a TAB (not a window/screen) and tick "Share tab audio".'); return;
      }
      display.getVideoTracks().forEach((tr) => tr.stop()); // audio-only — free the video capture
      // If the user clicks Chrome\'s "Stop sharing" bar, end the recording.
      dispAudio[0].addEventListener('ended', () => { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); });

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(new MediaStream(dispAudio)).connect(dest); // the other participants
      ctx.createMediaStreamSource(mic).connect(dest);                        // you
      recordStream = dest.stream;
    } else {
      recordStream = mic;
    }

    streamRef.current = recordStream; chunksRef.current = [];
    startSegmentRecorder(); setStatus('recording');
    // Rotate to a fresh segment every SEGMENT_MS — stopping the current recorder
    // fires its onstop (ship for transcription + roll next). Short meetings never
    // hit this and behave as a single segment.
    segTimerRef.current = setInterval(() => {
      if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
    }, SEGMENT_MS);
    timerRef.current = setInterval(() => setElapsed((x) => x + 1), 1000);
  }, [cleanup, startSegmentRecorder, captureMode, SEGMENT_MS, participants, notes]);

  const stop = useCallback(() => {
    finalizingRef.current = true; // halt rotation re-arm
    if (segTimerRef.current) { clearInterval(segTimerRef.current); segTimerRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = () => { // final (possibly partial) segment → ship, tear down, stitch
        const idx = segIdxRef.current++;
        const blob = new Blob(segChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size > 1024) transcribeSegment(idx, blob); else segIdxRef.current--;
        cleanup(); finalize();
      };
      rec.stop();
    } else { cleanup(); finalize(); }
  }, [transcribeSegment, finalize, cleanup]);

  const save = useCallback(async () => {
    if (!transcript || saving || saved) return;
    setSaving(true); setError(null);
    try {
      // Smart tree ingest reads the insights off the Past-meetings row, so make
      // sure the row exists first (it's normally auto-saved on finish).
      let mid = meetingId;
      if (!mid) {
        const row = await persistRow({ insights, transcript, segments: speakerSegments, language, title: insights?.title });
        mid = row?.id || null;
        if (mid) setMeetingId(mid);
      }
      if (!mid) throw new Error('could not persist meeting');
      // Parent `event` memory + first-class typed children (decisions, action
      // items, key points, risks, next steps, transcript) — all through the
      // canonical pipeline so each fact links into the graph + is type-boosted
      // in recall. Idempotent server-side via meetings.source_memory_id.
      // The pipeline is LLM-heavy (parent + ~20 children) and routinely runs
      // 60-90s — MUST override the 15s core default or the browser aborts the
      // request mid-ingest and the meeting never gets marked saved.
      await apiClient.core.post(`/api/meetings/${mid}/ingest`, {}, { timeout: 180000 });
      setSaved(true); loadMeetings();
    } catch (e) { setError('Save failed: ' + (e.response?.data?.error || e.message)); }
    finally { setSaving(false); }
  }, [transcript, saving, saved, insights, speakerSegments, language, loadMeetings, persistRow, meetingId]);

  const openDeleteModal = useCallback(async (m, e) => {
    e.stopPropagation();
    setDeleteTarget(m);
    setDeletePreview(null);
    setDeleteScope('both');
    setDeleteHard(false);
    setDeleteErr(null);
    try {
      const { data } = await apiClient.core.get(`/api/meetings/${m.id}/delete-preview`);
      setDeletePreview(data);
    } catch (err) {
      setDeletePreview({ can_delete: false, ingested: false, memory_count: 0, memories: [], _err: err?.response?.data?.error || err.message });
    }
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteErr(null);
    try {
      await apiClient.core.delete(`/api/meetings/${deleteTarget.id}?scope=${deleteScope}&hard=${deleteHard}`);
      const wasSelected = selected?.id === deleteTarget.id;
      setDeleteTarget(null);
      setDeletePreview(null);
      if (wasSelected) setSelected(null);
      loadMeetings();
    } catch (err) {
      setDeleteErr(err?.response?.data?.error || err.message || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleteScope, deleteHard, selected, loadMeetings]);

  const busy = status === 'transcribing' || status === 'analyzing';
  const recording = status === 'recording';

  /* stats */
  const stats = useMemo(() => {
    const now = new Date(); const weekAgo = new Date(now.getTime() - 7 * 864e5);
    const thisWeek = meetings.filter((m) => new Date(m.created_at) >= weekAgo).length;
    const actions = meetings.reduce((s, m) => s + (Array.isArray(m.action_items) ? m.action_items.length : 0), 0);
    const multi = meetings.filter((m) => m.multi_speaker).length;
    const last = meetings[0] ? new Date(meetings[0].created_at) : null;
    return { total: meetings.length, thisWeek, actions, multi, last: last ? last.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—' };
  }, [meetings]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      <style>{`@keyframes mn-sweep{0%{left:-35%}100%{left:105%}}`}</style>

      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3] font-mono uppercase tracking-wider mb-1"><MeetingNotesIcon size={13} /> HIVEMIND</div>
          <h1 className="text-[24px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('meetingnotes.title', 'AI Meeting Notes')}</h1>
          <p className="text-[12px] text-[#737373] mt-1">{t('meetingnotes.subtitle', 'Record, transcribe and extract insights — saved straight into your memory.')}</p>
        </div>
        <ClockChip />
      </div>

      {/* stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <StatCard icon={MeetingNotesIcon} value={stats.total} label={t('meetingnotes.stat.total', 'Meetings')} color="#117dff" />
        <StatCard icon={CalendarDays} value={stats.thisWeek} label={t('meetingnotes.stat.week', 'This week')} color="#0A66C2" />
        <StatCard icon={ListChecks} value={stats.actions} label={t('meetingnotes.stat.actions', 'Action items')} color="#10b981" />
        <StatCard icon={Users} value={stats.multi} label={t('meetingnotes.stat.multi', 'Multi-speaker')} color="#f59e0b" />
        <StatCard icon={Clock} value={stats.last} label={t('meetingnotes.stat.last', 'Last meeting')} color="#0a0a0a" />
      </div>

      {/* tabs */}
      <nav className="border-b border-[#e3e0db] flex items-center gap-0.5">
        {[['record', t('meetingnotes.tab.record', 'Record'), Mic], ['past', t('meetingnotes.tab.past', 'Past meetings'), History]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => { setTab(key); setSelected(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === key ? 'border-[#0a0a0a] text-[#0a0a0a]' : 'border-transparent text-[#737373] hover:text-[#0a0a0a] hover:bg-[#faf9f4]'}`}>
            <Icon size={14} /> {label}{key === 'past' && meetings.length ? <span className="ml-0.5 text-[#a3a3a3]">{meetings.length}</span> : null}
          </button>
        ))}
      </nav>

      {/* recording popup — tuner-device panel (opens on Start transcribing) */}
      <AnimatePresence>
        {(recording || busy) && (
          <RecordingModal key="rec-modal" status={status} elapsed={elapsed} notes={notes} setNotes={setNotes}
            multiSpeaker={multiSpeaker} setMultiSpeaker={setMultiSpeaker} onStop={stop}
            title={insights?.title} stream={streamRef.current} t={t} />
        )}
      </AnimatePresence>

      {/* ───────── DELETE MEETING MODAL ───────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            key="delete-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/25 backdrop-blur-[3px]"
            onClick={() => { if (!deleting) { setDeleteTarget(null); setDeletePreview(null); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="bg-white border border-[#e3e0db] rounded-[18px] shadow-xl w-full max-w-[520px] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-[10px] bg-red-50 border border-red-200 grid place-items-center flex-shrink-0">
                    <Trash2 size={15} className="text-[#ef4444]" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] leading-tight">Delete meeting</h3>
                    <p className="text-[12px] text-[#737373] mt-0.5 leading-tight truncate max-w-[340px]">{deleteTarget.title || 'Meeting'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setDeleteTarget(null); setDeletePreview(null); }}
                  disabled={deleting}
                  className="text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Preview body */}
              <div className="rounded-[10px] bg-[#faf9f4] border border-[#e3e0db] p-4 mb-4 min-h-[80px] flex flex-col justify-center">
                {deletePreview === null ? (
                  <div className="flex items-center gap-2 text-[12px] text-[#737373]">
                    <Loader2 size={14} className="animate-spin text-[#117dff]" />
                    Loading preview…
                  </div>
                ) : deletePreview.can_delete === false ? (
                  <div className="flex items-start gap-2 text-[12px] text-[#ef4444]">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    Only the meeting owner can delete this.
                  </div>
                ) : deletePreview.ingested ? (
                  <div>
                    <p className="text-[12px] text-[#525252] mb-2">
                      This meeting saved <span className="font-semibold text-[#0a0a0a]">{deletePreview.memory_count}</span> {deletePreview.memory_count === 1 ? 'memory' : 'memories'} to HIVEMIND:
                    </p>
                    <ul className="space-y-1">
                      {(deletePreview.memories || []).slice(0, 8).map((mem) => (
                        <li key={mem.id} className="text-[11px] text-[#737373] flex items-start gap-1.5">
                          <span className="text-[#117dff] mt-0.5 flex-shrink-0">·</span>
                          <span className="line-clamp-1">{mem.title}</span>
                        </li>
                      ))}
                      {(deletePreview.memories || []).length > 8 && (
                        <li className="text-[11px] text-[#a3a3a3]">+{deletePreview.memories.length - 8} more</li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#737373]">This meeting was not saved to HIVEMIND.</p>
                )}
              </div>

              {/* Options — only show when preview loaded and can delete */}
              {deletePreview && deletePreview.can_delete !== false && (
                <div className="space-y-3 mb-4">
                  {/* Scope radio group */}
                  <div className="space-y-2">
                    {deletePreview.ingested && (
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="deleteScope"
                          value="memories"
                          checked={deleteScope === 'memories'}
                          onChange={() => setDeleteScope('memories')}
                          className="mt-0.5 accent-[#117dff]"
                        />
                        <span className="text-[12px] text-[#525252] leading-snug">
                          Remove from HIVEMIND memories only <span className="text-[#a3a3a3]">(keep the meeting in Past meetings)</span>
                        </span>
                      </label>
                    )}
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteScope"
                        value="both"
                        checked={deleteScope === 'both'}
                        onChange={() => setDeleteScope('both')}
                        className="mt-0.5 accent-[#117dff]"
                      />
                      <span className="text-[12px] text-[#525252] leading-snug">
                        Delete the meeting <span className="font-medium text-[#0a0a0a]">AND</span> its HIVEMIND memories
                      </span>
                    </label>
                  </div>

                  {/* Hard-delete checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={deleteHard}
                      onChange={(e) => setDeleteHard(e.target.checked)}
                      className="mt-0.5 accent-[#ef4444]"
                    />
                    <span className="text-[12px] text-[#b45309] font-medium leading-snug">
                      Hard delete — permanent, cannot be undone
                    </span>
                  </label>
                  {deleteHard && (
                    <p className="text-[11px] text-[#ef4444] bg-red-50 border border-red-200 rounded-[6px] px-2.5 py-1.5 flex items-start gap-1.5">
                      <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
                      This permanently erases the data; it cannot be recovered.
                    </p>
                  )}
                </div>
              )}

              {/* Error */}
              {deleteErr && (
                <p className="text-[11px] text-[#ef4444] bg-red-50 border border-red-200 rounded-[6px] px-2.5 py-1.5 mb-3 flex items-start gap-1.5">
                  <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
                  {deleteErr}
                </p>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setDeleteTarget(null); setDeletePreview(null); }}
                  disabled={deleting}
                  className="px-3 py-2 rounded-[8px] text-[12px] font-medium text-[#525252] hover:bg-[#faf9f4] border border-[#e3e0db] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting || !deletePreview || deletePreview.can_delete === false}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-[#ef4444] text-white text-[12px] font-semibold hover:bg-[#dc2626] disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  {deleteHard ? 'Permanently delete' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── RECORD TAB ───────── */}
      {tab === 'record' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#e3e0db] rounded-[10px] p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <MeetingNotesIcon size={16} className="text-[#117dff] flex-shrink-0" />
                <span className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] truncate">{insights?.title || t('meetingnotes.newMeeting', 'New meeting')}</span>
              </div>
              {recording ? (
                <button onClick={stop} className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#ef4444] text-white text-[12px] font-medium hover:bg-[#dc2626]"><Square size={13} /> {t('meetingnotes.stop', 'Stop')} · {fmtTimer(elapsed)}</button>
              ) : (
                <button onClick={start} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] font-medium hover:bg-[#0066e0] disabled:opacity-50">
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />}
                  {busy ? (status === 'transcribing' ? `${t('meetingnotes.transcribing', 'Transcribing…')}${segTotal > 1 ? ` ${segDone}/${segTotal}` : ''}` : t('meetingnotes.analyzing', 'Analyzing…')) : t('meetingnotes.start', 'Start transcribing')}
                </button>
              )}
            </div>

            {/* ── Meeting setup — participants + scope (idle only) ─────── */}
            {status === 'idle' && (
              <div className="mb-4 rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] p-4 space-y-4">
                {/* PARTICIPANTS */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={13} className="text-[#117dff]" />
                    <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">Participants</span>
                  </div>
                  {/* Org member chips */}
                  {orgMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {orgMembers.map((m) => {
                        const u = m.user || m;
                        const id = u.id;
                        const name = u.displayName || u.email || id;
                        const isOn = participants.some((p) => p.type === 'member' && p.id === id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setParticipants((prev) =>
                                isOn
                                  ? prev.filter((p) => !(p.type === 'member' && p.id === id))
                                  : [...prev, { type: 'member', id, name, email: u.email }]
                              );
                              // Auto-suggest broader scope: adding a member while
                              // scope is still Personal would keep insights private
                              // to you — bump to Organization so they can recall it.
                              // (Reversible — the user can pick another scope after.)
                              if (!isOn && scope === 'personal') setScope('organization');
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                              isOn
                                ? 'bg-[#117dff] text-white border-[#117dff]'
                                : 'bg-white text-[#525252] border-[#e3e0db] hover:border-[#117dff]/50'
                            }`}
                          >
                            <User size={10} />
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* External participants — added chips */}
                  {participants.filter((p) => p.type === 'external').length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {participants.map((p, globalIdx) => p.type !== 'external' ? null : (
                        <span key={globalIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/30">
                          <UserPlus size={10} />
                          {p.name}
                          <button
                            type="button"
                            onClick={() => setParticipants((prev) => prev.filter((_, j) => j !== globalIdx))}
                            className="ml-0.5 hover:text-[#ef4444] transition-colors"
                            aria-label={`Remove ${p.name}`}
                          >
                            <X size={9} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Add external mini-form */}
                  <details className="group">
                    <summary className="flex items-center gap-1 cursor-pointer text-[11px] text-[#737373] hover:text-[#0a0a0a] list-none select-none">
                      <UserPlus size={12} className="text-[#a3a3a3] group-open:text-[#117dff]" />
                      Add external participant
                    </summary>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      <input
                        type="text"
                        placeholder="Name"
                        value={extName}
                        onChange={(e) => setExtName(e.target.value)}
                        className="px-2.5 py-1.5 text-[12px] rounded-[6px] border border-[#e3e0db] bg-white focus:outline-none focus:border-[#117dff]/40 placeholder-[#a3a3a3]"
                      />
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={extEmail}
                        onChange={(e) => setExtEmail(e.target.value)}
                        className="px-2.5 py-1.5 text-[12px] rounded-[6px] border border-[#e3e0db] bg-white focus:outline-none focus:border-[#117dff]/40 placeholder-[#a3a3a3]"
                      />
                      <input
                        type="text"
                        placeholder="Slack name (optional)"
                        value={extSlack}
                        onChange={(e) => setExtSlack(e.target.value)}
                        className="px-2.5 py-1.5 text-[12px] rounded-[6px] border border-[#e3e0db] bg-white focus:outline-none focus:border-[#117dff]/40 placeholder-[#a3a3a3]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!extName.trim()}
                      onClick={() => {
                        if (!extName.trim()) return;
                        setParticipants((prev) => [...prev, { type: 'external', name: extName.trim(), email: extEmail.trim() || undefined, slackName: extSlack.trim() || undefined }]);
                        setExtName(''); setExtEmail(''); setExtSlack('');
                      }}
                      className="mt-1.5 flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#0a0a0a] text-white text-[11px] font-medium hover:bg-[#262626] disabled:opacity-40 transition-colors"
                    >
                      <UserPlus size={11} /> Add
                    </button>
                  </details>
                </div>

                {/* SCOPE */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen size={13} className="text-[#117dff]" />
                    <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">Save memories to</span>
                  </div>
                  <div className="inline-flex items-center gap-0.5 bg-white border border-[#e3e0db] rounded-[8px] p-0.5 flex-wrap">
                    {[
                      { id: 'personal', label: 'Personal', Icon: User },
                      { id: 'project', label: 'Project', Icon: FolderOpen },
                      { id: 'team', label: 'Team', Icon: Users },
                      { id: 'organization', label: 'Org', Icon: Building2 },
                    ].map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { setScope(id); if (id !== 'project') setScopeProjectId(null); }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${
                          scope === id ? 'bg-[#0a0a0a] text-white' : 'text-[#525252] hover:bg-[#faf9f4]'
                        }`}
                      >
                        <Icon size={11} /> {label}
                      </button>
                    ))}
                  </div>
                  {participants.some((p) => p.type === 'member') && scope === 'personal' && (
                    <p className="mt-1.5 text-[11px] text-[#b45309]">
                      Participants added — on <b>Personal</b> scope only you can recall these insights. Pick Project or Org so they can too.
                    </p>
                  )}
                  {scope === 'project' && orgProjects.length > 0 && (
                    <div className="mt-2">
                      <select
                        value={scopeProjectId || ''}
                        onChange={(e) => setScopeProjectId(e.target.value || null)}
                        className="px-2.5 py-1.5 text-[12px] rounded-[6px] border border-[#e3e0db] bg-white focus:outline-none focus:border-[#117dff]/40 text-[#0a0a0a]"
                      >
                        <option value="">Select project…</option>
                        {orgProjects.map((proj) => (
                          <option key={proj.id} value={proj.id}>{proj.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {scope === 'project' && orgProjects.length === 0 && (
                    <p className="mt-1.5 text-[11px] text-[#a3a3a3]">No projects found.</p>
                  )}
                </div>
              </div>
            )}

            {/* Capture source — mic only vs the whole call (tab audio + mic) */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">{t('meetingnotes.captureSource', 'Audio source')}</span>
              </div>
              <div className="inline-flex items-center gap-0.5 bg-[#faf9f4] border border-[#e3e0db] rounded-[8px] p-0.5">
                {[
                  { id: 'mic', label: t('meetingnotes.srcMic', 'Microphone only'), Icon: Mic },
                  { id: 'tab', label: t('meetingnotes.srcTab', 'This call (tab + mic)'), Icon: MonitorSpeaker },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={recording || busy}
                    onClick={() => setCaptureMode(id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors disabled:opacity-50 ${
                      captureMode === id ? 'bg-[#0a0a0a] text-white' : 'text-[#525252] hover:bg-white'
                    }`}
                  >
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>
              {captureMode === 'tab' && (
                <p className="text-[11px] text-[#737373] mt-1.5 leading-relaxed flex items-start gap-1.5">
                  <Volume2 size={12} className="text-[#117dff] mt-0.5 shrink-0" />
                  {t('meetingnotes.tabHint', 'On Start, pick the Google Meet / Zoom TAB and tick “Share tab audio” — this captures the other participants too, not just you.')}
                </p>
              )}
            </div>

            <button onClick={() => setMultiSpeaker((v) => !v)} disabled={recording || busy}
              className="flex items-center gap-2 mb-4 text-[12px] text-[#525252] disabled:opacity-50" title={t('meetingnotes.multiSpeakerHint', 'Label who said what (runs speaker diarization)')}>
              <Users size={14} style={{ color: multiSpeaker ? '#117dff' : '#a3a3a3' }} />
              <span>{t('meetingnotes.multiSpeaker', 'Multi-speaker recognition')}</span>
              <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${multiSpeaker ? 'bg-[#117dff]' : 'bg-[#e3e0db]'}`}>
                <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform" style={{ transform: multiSpeaker ? 'translateX(18px)' : 'translateX(2px)' }} />
              </span>
            </button>

            {status === 'idle' && !insights && (
              <div className="text-[12px] text-[#737373] leading-relaxed mb-4">
                <p className="font-medium text-[#525252] mb-1">{t('meetingnotes.howItWorks', 'How it works')}</p>
                <p>1. {t('meetingnotes.step1', 'Click “Start transcribing” to record the meeting.')}</p>
                <p>2. {t('meetingnotes.step2', 'Add notes below — the AI uses them to make insights smarter.')}</p>
                <p>3. {t('meetingnotes.step3', 'Click “Stop” → full transcript + insights are generated.')}</p>
                <p className="mt-2 text-[11px] text-[#a3a3a3]">{t('meetingnotes.consent', 'By recording, you confirm everyone present has given consent.')}</p>
              </div>
            )}

            {/* Pre-meeting context — feeds Whisper (correct spelling of names/terms),
                speaker naming and insights. One box, crucial. */}
            <div className={`rounded-[10px] border p-3 transition-colors ${notes.trim() ? 'bg-[#faf9f4] border-[#e3e0db]' : 'bg-blue-50/40 border-[#117dff]/30'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-[7px] bg-blue-50 border border-blue-100 grid place-items-center flex-shrink-0"><NotebookPen size={12} className="text-[#117dff]" /></span>
                <span className="text-[12px] font-semibold text-[#0a0a0a]">{t('meetingnotes.contextTitle', 'Meeting context')}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[9px] font-semibold text-blue-700 uppercase tracking-wide">{t('meetingnotes.contextCrucial', 'Crucial')}</span>
              </div>
              <p className="text-[11px] text-[#737373] mb-2 leading-snug">{t('meetingnotes.contextHint', 'Topic, who is speaking (names), companies, key terms — used to spell names correctly in the transcript, label speakers and sharpen insights.')}</p>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder={t('meetingnotes.contextPlaceholder', 'e.g. Weekly product sync — speakers: Amar, Matthias (investor). Topics: pricing, Hannover event, cap table…')}
                className="w-full min-h-[64px] p-2.5 text-[13px] bg-white border border-[#e3e0db] rounded-[8px] focus:outline-none focus:border-[#117dff]/40 resize-y" />
            </div>
          </div>

          {error && (<div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2"><AlertTriangle size={12} className="inline mr-1" /> {error}</div>)}

          {insights && (
            <div className="space-y-3">
              {insights.summary && (<Panel icon={FileText} title={t('meetingnotes.summary', 'Summary')}><p className="text-[13px] text-[#525252] leading-relaxed">{insights.summary}</p></Panel>)}
              {insights.action_items?.length > 0 && (
                <Panel icon={ListChecks} title={t('meetingnotes.actionItems', 'Action Items')} accent="#10b981">
                  <ul className="space-y-2">{insights.action_items.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#0a0a0a]"><span className="mt-0.5 w-4 h-4 rounded-[5px] border border-[#cbd5e1] flex-shrink-0" /><span>{a.task}{a.owner && <span className="text-[#a3a3a3]"> · @{a.owner}</span>}{a.due && <span className="text-[#a3a3a3]"> · {a.due}</span>}</span></li>
                  ))}</ul>
                </Panel>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.decisions?.length > 0 && (<Panel icon={Lightbulb} title={t('meetingnotes.decisions', 'Decisions')} accent="#f59e0b"><ul className="space-y-1.5 text-[12px] text-[#525252]">{insights.decisions.map((d, i) => <li key={i} className="flex gap-2"><span className="text-[#f59e0b]">·</span>{d}</li>)}</ul></Panel>)}
                {insights.key_points?.length > 0 && (<Panel icon={Sparkles} title={t('meetingnotes.keyPoints', 'Key Points')} accent="#8b5cf6"><ul className="space-y-1.5 text-[12px] text-[#525252]">{insights.key_points.map((k, i) => <li key={i} className="flex gap-2"><span className="text-[#8b5cf6]">·</span>{k}</li>)}</ul></Panel>)}
              </div>
              {insights.questions?.length > 0 && (<Panel icon={HelpCircle} title={t('meetingnotes.openQuestions', 'Open Questions')} accent="#0891b2"><ul className="space-y-1.5 text-[12px] text-[#525252]">{insights.questions.map((q, i) => <li key={i} className="flex gap-2"><span className="text-[#0891b2]">?</span>{q}</li>)}</ul></Panel>)}
              {insights.quotes?.length > 0 && (<Panel icon={Quote} title={t('meetingnotes.quotes', 'Notable Quotes')} accent="#117dff"><ul className="space-y-2 text-[12px] text-[#525252]">{insights.quotes.map((q, i) => (<li key={i} className="border-l-2 border-[#117dff]/40 pl-3 italic">“{q.quote || q}”{q.speaker && <span className="not-italic text-[#a3a3a3]"> — {q.speaker}</span>}</li>))}</ul></Panel>)}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.risks?.length > 0 && (<Panel icon={AlertTriangle} title={t('meetingnotes.risks', 'Risks & Red Flags')} accent="#ef4444"><ul className="space-y-1.5 text-[12px] text-[#525252]">{insights.risks.map((r, i) => <li key={i} className="flex gap-2"><span className="text-[#ef4444]">!</span>{r}</li>)}</ul></Panel>)}
                {insights.next_steps?.length > 0 && (<Panel icon={ArrowUpRight} title={t('meetingnotes.nextSteps', 'Next Steps')} accent="#10b981"><ul className="space-y-1.5 text-[12px] text-[#525252]">{insights.next_steps.map((n, i) => <li key={i} className="flex gap-2"><span className="text-[#10b981]">→</span>{n}</li>)}</ul></Panel>)}
              </div>
              {insights.topics?.length > 0 && (<div className="flex flex-wrap gap-1.5">{insights.topics.map((tp, i) => (<span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] text-blue-700">#{tp}</span>))}</div>)}
              {transcript && (
                <Panel icon={speakerSegments?.length ? Users : ScrollText} title={t('meetingnotes.transcript', 'Transcript')} accent="#a3a3a3">
                  {speakerSegments?.length ? (<div className="space-y-2 max-h-[280px] overflow-y-auto">{speakerSegments.map((s, i) => (<div key={i} className="text-[12px] leading-relaxed"><span className="font-semibold font-['Space_Grotesk']" style={{ color: SPEAKER_COLORS[s.speaker] || '#117dff' }}>{nameFor(s.speaker, insights?.speaker_names)}:</span> <span className="text-[#525252]">{s.text}</span></div>))}</div>)
                    : (<p className="text-[12px] text-[#525252] leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto">{transcript}</p>)}
                </Panel>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={save} disabled={saved || saving} className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#0a0a0a] text-white text-[12px] font-medium hover:bg-[#262626] disabled:opacity-50">
                  {saved ? <CheckCircle2 size={14} /> : saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saved ? t('meetingnotes.saved', 'Saved to HIVEMIND') : saving ? t('meetingnotes.saving', 'Saving to HIVEMIND…') : t('meetingnotes.save', 'Save to HIVEMIND')}
                </button>
                {meetingId && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[#10b981]">
                    <CheckCircle2 size={13} /> {t('meetingnotes.inPast', 'Saved to Past meetings')}
                    {!saved && <span className="text-[#a3a3a3]">· {t('meetingnotes.hivemindOptional', 'Save to HIVEMIND to add it to memories')}</span>}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────── PAST MEETINGS TAB ───────── */}
      {tab === 'past' && !selected && (
        meetings.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {meetings.map((m) => <MeetingCard key={m.id} m={m} onOpen={openMeeting} onDelete={openDeleteModal} />)}
          </div>
        ) : (
          <div className="bg-white border border-[#e3e0db] rounded-[10px] p-10 text-center">
            <History size={22} className="text-[#cbd5e1] mx-auto mb-2" />
            <p className="text-[13px] text-[#737373]">{t('meetingnotes.noMeetings', 'No saved meetings yet.')}</p>
            <button onClick={() => setTab('record')} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]"><Mic size={13} /> {t('meetingnotes.recordFirst', 'Record your first meeting')}</button>
          </div>
        )
      )}

      {/* ───────── MEETING DETAIL ───────── */}
      {tab === 'past' && selected && (
        <div className="bg-white border border-[#e3e0db] rounded-[10px] p-5">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-[11px] text-[#a3a3a3] hover:text-[#0a0a0a] mb-3"><ArrowLeft size={12} /> {t('meetingnotes.back', 'All meetings')}</button>
          {detailErr && (<div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-[6px] px-2.5 py-1.5 mb-3"><AlertTriangle size={11} className="inline mr-1" /> {t('meetingnotes.detailErr', 'Could not load the full record — showing the overview only.')}</div>)}
          <h2 className="text-[20px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] leading-tight flex items-baseline gap-2 flex-wrap">{selected.title || 'Meeting'}
            <AtChip iso={selected.created_at} />
            {selected.language && <span className="text-[12px] font-normal text-[#a3a3a3]">· {selected.language}</span>}</h2>
          <nav className="border-b border-[#e3e0db] flex items-center gap-0.5 mt-4 mb-4">
            {[['summary', 'Summary', ListChecks], ['notes', 'Notes', AlignLeft], ['transcript', 'Transcript', ScrollText]].map(([key, label, Icon]) => (
              <button key={key} onClick={() => setDetailTab(key)} className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${detailTab === key ? 'border-[#0a0a0a] text-[#0a0a0a]' : 'border-transparent text-[#737373] hover:text-[#0a0a0a]'}`}><Icon size={14} /> {label}</button>
            ))}
          </nav>
          {detailTab === 'summary' && (() => {
            // Old columns + the full insights object (new sections live there).
            const insx = (selected.insights && typeof selected.insights === 'object') ? selected.insights : {};
            const keyPoints = Array.isArray(selected.key_points) && selected.key_points.length ? selected.key_points : (insx.key_points || []);
            const questions = Array.isArray(selected.questions) && selected.questions.length ? selected.questions : (insx.questions || []);
            const quotes = Array.isArray(insx.quotes) ? insx.quotes : [];
            const risks = Array.isArray(insx.risks) ? insx.risks : [];
            const nextSteps = Array.isArray(insx.next_steps) ? insx.next_steps : [];
            const ents = (insx.entities && typeof insx.entities === 'object') ? insx.entities : {};
            const entChips = [...(ents.people || []).map((e) => [User, e]), ...(ents.organizations || []).map((e) => [Building2, e]), ...(ents.dates || []).map((e) => [CalendarDays, e])];
            const H = ({ children }) => <h3 className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2">{children}</h3>;
            return (
              <div className="space-y-5 text-[13px] text-[#525252] leading-relaxed">
                <div><H>Meeting Overview</H><p className="whitespace-pre-wrap">{selected.summary || '—'}</p></div>
                {Array.isArray(selected.action_items) && selected.action_items.length > 0 && (<div><H>Action Items</H><ul className="space-y-2">{selected.action_items.map((a, i) => (<li key={i} className="flex items-start gap-2.5 text-[#0a0a0a]"><span className="mt-0.5 w-4 h-4 rounded-[5px] border border-[#cbd5e1] flex-shrink-0" /><span>{a.task || a}{a.owner && <span className="text-[#a3a3a3]"> · @{a.owner}</span>}{a.due && <span className="text-[#a3a3a3]"> · {a.due}</span>}</span></li>))}</ul></div>)}
                {keyPoints.length > 0 && (<div><H>Key Points</H><ul className="space-y-1.5">{keyPoints.map((k, i) => <li key={i} className="flex gap-2"><span className="text-[#8b5cf6]">·</span>{k}</li>)}</ul></div>)}
                {Array.isArray(selected.decisions) && selected.decisions.length > 0 && (<div><H>Decisions</H><ul className="space-y-1.5">{selected.decisions.map((d, i) => <li key={i} className="flex gap-2"><span className="text-[#f59e0b]">·</span>{d}</li>)}</ul></div>)}
                {questions.length > 0 && (<div><H>Open Questions</H><ul className="space-y-1.5">{questions.map((q, i) => <li key={i} className="flex gap-2"><span className="text-[#0891b2]">?</span>{q}</li>)}</ul></div>)}
                {quotes.length > 0 && (<div><H>Notable Quotes</H><ul className="space-y-2">{quotes.map((q, i) => (<li key={i} className="border-l-2 border-[#117dff]/40 pl-3 italic">“{q.quote || q}”{q.speaker && <span className="not-italic text-[#a3a3a3]"> — {q.speaker}</span>}</li>))}</ul></div>)}
                {risks.length > 0 && (<div><H>Risks & Red Flags</H><ul className="space-y-1.5">{risks.map((r, i) => <li key={i} className="flex gap-2"><AlertTriangle size={13} className="text-[#ef4444] mt-0.5 flex-shrink-0" />{r}</li>)}</ul></div>)}
                {nextSteps.length > 0 && (<div><H>Next Steps</H><ul className="space-y-1.5">{nextSteps.map((n, i) => <li key={i} className="flex gap-2"><ArrowUpRight size={13} className="text-[#10b981] mt-0.5 flex-shrink-0" />{n}</li>)}</ul></div>)}
                {entChips.length > 0 && (<div><H>Mentioned</H><div className="flex flex-wrap gap-1.5">{entChips.map(([Ic, e], i) => <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#faf9f4] border border-[#e3e0db] text-[10px] text-[#525252]"><Ic size={10} className="text-[#737373]" /> {e}</span>)}</div></div>)}
                {(selected.sentiment || (Array.isArray(selected.topics) && selected.topics.length > 0)) && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {selected.sentiment && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-700"><Sparkles size={9} /> {selected.sentiment}</span>}
                    {(selected.topics || []).map((tp, i) => <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] text-blue-700">#{tp}</span>)}
                  </div>
                )}
              </div>
            );
          })()}
          {detailTab === 'summary' && (
            <MeetingIntelligencePanel
              intelligence={selected?.intelligence}
              status={selected?.intelligence_status}
              onOpenMemory={(id) => window.open(`/hivemind/app/memories?focus=${id}`, '_self')}
            />
          )}
          {detailTab === 'notes' && (
            <p className="text-[13px] text-[#525252] leading-relaxed whitespace-pre-wrap">
              {selected.notes || t('meetingnotes.noNotes', 'No notes were added during this meeting.')}
            </p>
          )}
          {detailTab === 'transcript' && (
            Array.isArray(selected.segments) && selected.segments.length ? (
              <div className="space-y-2 max-h-[460px] overflow-y-auto">{selected.segments.map((s, i) => (<div key={i} className="text-[12px] leading-relaxed"><span className="font-semibold font-['Space_Grotesk']" style={{ color: SPEAKER_COLORS[s.speaker] || '#117dff' }}>{nameFor(s.speaker, (selected.insights && selected.insights.speaker_names) || null)}:</span> <span className="text-[#525252]">{s.text}</span></div>))}</div>
            ) : (<p className="text-[12px] text-[#525252] leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto">{selected.transcript || 'No transcript saved.'}</p>)
          )}
        </div>
      )}
    </motion.div>
  );
}
