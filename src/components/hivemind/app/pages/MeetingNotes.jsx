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
  CalendarDays, History, AlignLeft, ScrollText, ArrowLeft, Quote, MoreHorizontal,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import MeetingNotesIcon from '../shared/MeetingNotesIcon';
import { useTranslation } from 'react-i18next';

const SPEAKER_COLORS = { SPEAKER_00: '#117dff', SPEAKER_01: '#10b981', SPEAKER_02: '#f59e0b', SPEAKER_03: '#8b5cf6', SPEAKER_04: '#0891b2', SPEAKER_05: '#ef4444' };
const speakerLabel = (s) => { const m = /SPEAKER_(\d+)/.exec(s || ''); return m ? `Speaker ${Number(m[1]) + 1}` : (s || 'Speaker'); };
const fmtTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

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

/* radio-tuner tick ring — rotates slowly while recording (SVG, no glow) */
function TickRing({ active, size = 520 }) {
  const ticks = useMemo(() => {
    const out = [];
    const r = size / 2;
    for (let i = 0; i < 96; i++) {
      const major = i % 8 === 0;
      const a = (i / 96) * Math.PI * 2;
      const r1 = r - (major ? 30 : 20);
      out.push(<line key={i}
        x1={r + r1 * Math.cos(a)} y1={r + r1 * Math.sin(a)}
        x2={r + (r - 8) * Math.cos(a)} y2={r + (r - 8) * Math.sin(a)}
        stroke={major ? '#73737a' : '#46464c'} strokeWidth={major ? 2.5 : 1.5} strokeLinecap="round" />);
    }
    return out;
  }, [size]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true"
      style={{ animation: active ? 'mn-dial 90s linear infinite' : 'none' }}>
      {ticks}
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 56} fill="none" stroke="#222226" strokeWidth="1" />
    </svg>
  );
}

/* minute-scale arc on the modal's left edge — progress follows elapsed time.
   Sweep is ±55° (always a minor arc → large-arc flag stays 0). */
function MinuteArc({ elapsed }) {
  const frac = Math.min(1, (elapsed % 3600) / 3600);
  const R = 250; const CX = -130; const CY = 200; // circle centre off-canvas left
  const A = (Math.PI * 55) / 180; // half-sweep
  const ang = (f) => -A + f * 2 * A;
  const arc = (from, to, color, w) => {
    const a0 = ang(from); const a1 = ang(to);
    const p0 = [CX + R * Math.cos(a0), CY + R * Math.sin(a0)];
    const p1 = [CX + R * Math.cos(a1), CY + R * Math.sin(a1)];
    return <path d={`M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A ${R} ${R} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="butt" />;
  };
  return (
    <svg viewBox="0 0 180 400" className="h-full w-auto" preserveAspectRatio="xMinYMid meet" aria-hidden="true">
      {arc(0, 1, '#cfe3ff', 44)}
      {frac > 0.002 && arc(0, frac, '#117dff', 44)}
      {[15, 30, 45].map((m) => {
        const a = ang(m / 60);
        return <text key={m} x={CX + (R + 42) * Math.cos(a)} y={CY + (R + 42) * Math.sin(a)} fill="#6e6e73" fontSize="13" fontFamily="Space Grotesk" textAnchor="middle" dominantBaseline="middle">{m}</text>;
      })}
    </svg>
  );
}

/* Recording popup — dark "tuner device" panel; opens on Start transcribing.
   Stays up through transcribe/analyze, closes itself on done/error. */
function RecordingModal({ status, elapsed, notes, setNotes, multiSpeaker, setMultiSpeaker, onStop, title, t }) {
  const recording = status === 'recording';
  const busy = status === 'transcribing' || status === 'analyzing';
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="bg-[#faf9f4] border border-[#e3e0db] rounded-[26px] p-1.5 shadow-xl w-full max-w-[660px]">
        <div className="relative bg-[#0a0a0a] rounded-[22px] overflow-hidden" style={{ minHeight: 380 }}>
          {/* dial face — rotates while recording */}
          <div className="absolute -left-24 top-1/2 -translate-y-1/2 opacity-90 pointer-events-none">
            <TickRing active={recording} />
          </div>
          {/* minute arc on the left edge */}
          <div className="absolute left-0 top-0 bottom-0 pointer-events-none"><MinuteArc elapsed={elapsed} /></div>

          {/* top bar */}
          <div className="relative flex items-center justify-between px-5 pt-4">
            <AtChip iso={now.toISOString()} dark />
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#1c1c1e] text-white text-[11px] font-semibold font-['Space_Grotesk'] tracking-wide">
                REC <span className={`w-2 h-2 rounded-full bg-[#ef4444] ${recording ? 'animate-pulse' : ''}`} />
              </span>
              <span className="inline-flex items-center gap-1.5 text-white text-[14px] font-semibold font-['Space_Grotesk'] tabular-nums">
                <Clock size={13} className="text-[#8e8e93]" />
                {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </div>
          </div>

          {/* main display */}
          <div className="relative pl-[180px] pr-6 pt-6 pb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-[18px] text-[#8e8e93] font-['Space_Grotesk'] font-medium truncate max-w-[260px]">{title || t('meetingnotes.newMeeting', 'New meeting')}</span>
              <span className="text-[9px] text-[#5a5a5e] uppercase tracking-[0.18em] font-['Space_Grotesk']">{t('meetingnotes.live', 'Live')}</span>
            </div>
            <div className="mt-3 inline-flex items-center bg-[#1c1c1e] rounded-[18px] px-7 py-2.5">
              <span className="font-['Space_Grotesk'] font-semibold tabular-nums leading-none text-[64px]">
                <span className={mm === '00' ? 'text-[#48484c]' : 'text-white'}>{mm}</span>
                <span className="text-[#48484c]">:</span>
                <span className="text-white">{ss}</span>
              </span>
            </div>
            {/* MIC / MULTI — FM/AM-style selector */}
            <div className="mt-3 flex items-center gap-4 font-['Space_Grotesk'] select-none">
              <span className="text-[20px] font-semibold text-[#117dff]">{t('meetingnotes.mic', 'MIC')}</span>
              <button onClick={() => setMultiSpeaker((v) => !v)} disabled={busy}
                title={t('meetingnotes.multiSpeakerHint', 'Label who said what (runs speaker diarization)')}
                className={`text-[20px] font-semibold transition-colors ${multiSpeaker ? 'text-[#117dff]' : 'text-[#48484c] hover:text-[#8e8e93]'}`}>
                {t('meetingnotes.multi', 'MULTI')}
              </button>
              {busy && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[#8e8e93] ml-2">
                  <Loader2 size={13} className="animate-spin text-[#117dff]" />
                  {status === 'transcribing' ? t('meetingnotes.transcribing', 'Transcribing…') : t('meetingnotes.analyzing', 'Analyzing…')}
                </span>
              )}
            </div>
            {/* notes — functional, same state as the page */}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={t('meetingnotes.notesPlaceholder', 'Add notes here anytime…')}
              className="mt-4 w-full h-[64px] resize-none p-3 text-[12px] rounded-[12px] bg-[#141416] border border-[#232326] text-[#d4d4d8] placeholder-[#5a5a5e] focus:outline-none focus:border-[#117dff]/50" />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-[#5a5a5e] uppercase tracking-wider font-['Space_Grotesk']">{t('meetingnotes.channel', 'Meeting Notes')}</span>
              <button onClick={onStop} disabled={!recording}
                className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#ef4444] text-white text-[13px] font-semibold hover:bg-[#dc2626] disabled:opacity-40 transition-colors">
                <Square size={13} fill="currentColor" /> {t('meetingnotes.stop', 'Stop')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Past-meeting card — dark "bento widget": header, @time, accent ruler strip,
   big stat, footer micro-stats. Theme-matched (app blue, Space Grotesk, no glow). */
function MeetingCard({ m, onOpen }) {
  const actions = Array.isArray(m.action_items) ? m.action_items.length : 0;
  const keyPts = Array.isArray(m.key_points) ? m.key_points.length : 0;
  const quests = Array.isArray(m.questions) ? m.questions.length : 0;
  const time = new Date(m.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <motion.button whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} onClick={() => onOpen(m)}
      className="relative text-left bg-[#101012] border border-[#222226] rounded-[18px] p-4 hover:border-[#117dff]/60 transition-colors group overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#1c1c1e] flex items-center justify-center flex-shrink-0"><MeetingNotesIcon size={13} className="text-[#117dff]" /></div>
          <span className="text-[13px] font-semibold text-white font-['Space_Grotesk'] truncate">{m.title || 'Meeting'}</span>
        </div>
        <MoreHorizontal size={14} className="text-[#48484c] flex-shrink-0" />
      </div>
      <div className="mt-1.5"><AtChip iso={m.created_at} dark /></div>
      {/* accent ruler strip — start time · ticks · language */}
      <div className="mt-3 rounded-[10px] bg-[#117dff] px-3 py-2 flex items-center font-['Space_Grotesk']">
        <span className="text-[12px] font-semibold text-white tabular-nums">{time}</span>
        <span className="flex-1 mx-3 h-[10px] opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,.9) 0 1.5px, transparent 1.5px 7px)' }} />
        <span className="text-[11px] font-semibold text-white uppercase">{m.language || '—'}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex-shrink-0">
          <div className="text-[34px] leading-none font-semibold text-white font-['Space_Grotesk'] tabular-nums">{actions}</div>
          <div className="text-[10px] text-[#6e6e73] uppercase tracking-wider mt-1">Action items</div>
        </div>
        <p className="text-[11px] text-[#8e8e93] leading-snug line-clamp-2 text-right">{m.summary || '—'}</p>
      </div>
      <div className="mt-3 pt-2.5 border-t border-[#1d1d20] flex items-center gap-4 text-[10px] text-[#8e8e93] font-['Space_Grotesk']">
        <span className="inline-flex items-center gap-1"><Sparkles size={10} className="text-[#117dff]" /> {keyPts} key</span>
        <span className="inline-flex items-center gap-1"><HelpCircle size={10} className="text-[#0891b2]" /> {quests} open</span>
        {m.multi_speaker ? <span className="inline-flex items-center gap-1"><Users size={10} className="text-[#10b981]" /> {m.speaker_count || 'multi'}</span> : null}
        <ArrowUpRight size={12} className="ml-auto text-[#48484c] group-hover:text-white transition-colors" />
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
  const [meetingId, setMeetingId] = useState(null); // Past-meetings row id (persisted on finish, before any HIVEMIND save)
  const [multiSpeaker, setMultiSpeaker] = useState(false);
  const [speakerSegments, setSpeakerSegments] = useState(null);
  const [language, setLanguage] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('summary');
  const [detailErr, setDetailErr] = useState(false);

  const recRef = useRef(null); const chunksRef = useRef([]); const streamRef = useRef(null); const timerRef = useRef(null);

  const loadMeetings = useCallback(async () => {
    try {
      // Persistent org-level meetings table (structured rows).
      const { data } = await apiClient.core.get('/api/meetings?limit=40');
      setMeetings((data?.meetings || []).filter(Boolean));
    } catch { /* non-fatal */ }
  }, []);
  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  // The list endpoint is light (no transcript/notes/insights) — fetch the full
  // row when a past meeting is opened so every section + transcript renders.
  const openMeeting = useCallback(async (m) => {
    setSelected(m); setDetailTab('summary'); setDetailErr(false);
    try {
      const { data } = await apiClient.core.get(`/api/meetings/${m.id}`);
      if (data?.meeting) setSelected((cur) => (cur && cur.id === m.id ? { ...m, ...data.meeting } : cur));
    } catch { setDetailErr(true); /* keep the list row — partial beats broken */ }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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
    });
    return data;
  }, [notes]);

  const process = useCallback(async (blob) => {
    setError(null);
    try {
      setStatus('transcribing');
      const tr = await apiClient.core.post(`/api/meetings/transcribe?diarize=${multiSpeaker}`, blob, { headers: { 'Content-Type': blob.type || 'audio/webm' }, timeout: 300000 });
      const text = tr.data?.transcript || ''; const segs = tr.data?.speakerSegments || null;
      const lang = tr.data?.language || null;
      setTranscript(text); setSpeakerSegments(segs); setLanguage(lang);
      if (!text.trim()) { setStatus('error'); setError('No speech detected.'); return; }
      setStatus('analyzing');
      const input = segs && segs.length ? segs.map((s) => `${speakerLabel(s.speaker)}: ${s.text}`).join('\n') : text;
      const ins = await apiClient.core.post('/api/meetings/insights', { transcript: input, notes }, { timeout: 120000 });
      const insights = ins.data?.insights || null;
      setInsights(insights); setStatus('done');
      // Auto-save to Past meetings the moment the meeting finishes — regardless
      // of whether the user later saves it to HIVEMIND. "Save to HIVEMIND" is a
      // separate step that additionally ingests it as memories (and links here).
      try {
        const row = await persistRow({ insights: insights || {}, transcript: text, segments: segs, language: lang });
        if (row?.id) setMeetingId(row.id);
        loadMeetings();
      } catch { /* non-fatal — recording is still usable / re-savable */ }
    } catch (e) { setStatus('error'); setError(e.response?.data?.error || e.message || 'Processing failed.'); }
  }, [notes, multiSpeaker, persistRow, loadMeetings]);

  const start = useCallback(async () => {
    setError(null); setTranscript(''); setInsights(null); setSaved(false); setElapsed(0); setSpeakerSegments(null); setMeetingId(null);
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch { setError('Microphone permission denied.'); return; }
    streamRef.current = stream; chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime }); recRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => { cleanup(); process(new Blob(chunksRef.current, { type: 'audio/webm' })); };
    rec.start(1000); setStatus('recording');
    timerRef.current = setInterval(() => setElapsed((x) => x + 1), 1000);
  }, [cleanup, process]);

  const stop = useCallback(() => { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); }, []);

  const save = useCallback(async () => {
    if (!transcript) return;
    try {
      const title = insights?.title || `Meeting ${new Date().toLocaleString()}`;
      const summary = insights?.summary || transcript.slice(0, 500);
      const tMd = speakerSegments?.length ? speakerSegments.map((s) => `**${speakerLabel(s.speaker)}:** ${s.text}`).join('\n\n') : transcript;
      const sect = (heading, items, fmt = (x) => `- ${x}`) => (items?.length ? `\n\n## ${heading}\n${items.map(fmt).join('\n')}` : '');
      const content = `# ${title}\n\n## Summary\n${summary}`
        + sect('Action Items', insights?.action_items, (a) => `- ${a.task}${a.owner ? ` (@${a.owner})` : ''}`)
        + sect('Key Points', insights?.key_points)
        + sect('Decisions', insights?.decisions)
        + sect('Open Questions', insights?.questions)
        + sect('Risks', insights?.risks)
        + sect('Next Steps', insights?.next_steps)
        + (notes?.trim() ? `\n\n## My Notes\n${notes.trim()}` : '')
        + `\n\n## Transcript\n${tMd}`;
      const mem = await apiClient.core.post('/api/memories', { title, content, tags: ['meeting', 'ai-meeting-notes', ...(speakerSegments?.length ? ['multi-speaker'] : []), ...(insights?.topics || []).slice(0, 5)], memory_type: 'event' });
      const memId = mem?.data?.id || mem?.data?.memory_id || null;
      // The meeting is already in Past meetings (auto-saved on finish). Just link
      // the new HIVEMIND memory to that row — no duplicate. Only POST a fresh row
      // if the auto-save earlier failed (no meetingId yet).
      if (meetingId) {
        await apiClient.core.patch(`/api/meetings/${meetingId}`, { source_memory_id: memId }).catch(() => { /* link best-effort */ });
      } else {
        const row = await persistRow({ insights, transcript, segments: speakerSegments, language, sourceMemoryId: memId, title }).catch(() => null);
        if (row?.id) setMeetingId(row.id);
      }
      setSaved(true); loadMeetings();
    } catch (e) { setError('Save failed: ' + (e.response?.data?.error || e.message)); }
  }, [transcript, insights, speakerSegments, language, loadMeetings, persistRow, meetingId, notes]);

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
      <style>{`@keyframes mn-dial{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

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
            title={insights?.title} t={t} />
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
                  {busy ? (status === 'transcribing' ? t('meetingnotes.transcribing', 'Transcribing…') : t('meetingnotes.analyzing', 'Analyzing…')) : t('meetingnotes.start', 'Start transcribing')}
                </button>
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

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('meetingnotes.notesPlaceholder', 'Add notes here anytime…')}
              className="w-full min-h-[72px] p-3 text-[13px] bg-[#faf9f4] border border-[#e3e0db] rounded-[8px] focus:outline-none focus:border-[#117dff]/40 resize-y" />
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
                  {speakerSegments?.length ? (<div className="space-y-2 max-h-[280px] overflow-y-auto">{speakerSegments.map((s, i) => (<div key={i} className="text-[12px] leading-relaxed"><span className="font-semibold font-['Space_Grotesk']" style={{ color: SPEAKER_COLORS[s.speaker] || '#117dff' }}>{speakerLabel(s.speaker)}:</span> <span className="text-[#525252]">{s.text}</span></div>))}</div>)
                    : (<p className="text-[12px] text-[#525252] leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto">{transcript}</p>)}
                </Panel>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={save} disabled={saved} className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#0a0a0a] text-white text-[12px] font-medium hover:bg-[#262626] disabled:opacity-50">
                  {saved ? <CheckCircle2 size={14} /> : <Save size={14} />} {saved ? t('meetingnotes.saved', 'Saved to HIVEMIND') : t('meetingnotes.save', 'Save to HIVEMIND')}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {meetings.map((m) => <MeetingCard key={m.id} m={m} onOpen={openMeeting} />)}
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
            const entChips = [...(ents.people || []).map((e) => ['👤', e]), ...(ents.organizations || []).map((e) => ['🏢', e]), ...(ents.dates || []).map((e) => ['📅', e])];
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
                {entChips.length > 0 && (<div><H>Mentioned</H><div className="flex flex-wrap gap-1.5">{entChips.map(([ic, e], i) => <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#faf9f4] border border-[#e3e0db] text-[10px] text-[#525252]">{ic} {e}</span>)}</div></div>)}
                {(selected.sentiment || (Array.isArray(selected.topics) && selected.topics.length > 0)) && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {selected.sentiment && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-700"><Sparkles size={9} /> {selected.sentiment}</span>}
                    {(selected.topics || []).map((tp, i) => <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] text-blue-700">#{tp}</span>)}
                  </div>
                )}
              </div>
            );
          })()}
          {detailTab === 'notes' && (
            <p className="text-[13px] text-[#525252] leading-relaxed whitespace-pre-wrap">
              {selected.notes || t('meetingnotes.noNotes', 'No notes were added during this meeting.')}
            </p>
          )}
          {detailTab === 'transcript' && (
            Array.isArray(selected.segments) && selected.segments.length ? (
              <div className="space-y-2 max-h-[460px] overflow-y-auto">{selected.segments.map((s, i) => (<div key={i} className="text-[12px] leading-relaxed"><span className="font-semibold font-['Space_Grotesk']" style={{ color: SPEAKER_COLORS[s.speaker] || '#117dff' }}>{speakerLabel(s.speaker)}:</span> <span className="text-[#525252]">{s.text}</span></div>))}</div>
            ) : (<p className="text-[12px] text-[#525252] leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto">{selected.transcript || 'No transcript saved.'}</p>)
          )}
        </div>
      )}
    </motion.div>
  );
}
