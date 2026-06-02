/**
 * AI Meeting Notes — "Control Deck" redesign.
 *
 * Dark, premium studio: animated recording waveform, a glossy radial dial of
 * past meetings (hover → expands a labeled segment + summary, click → details),
 * a live clock hub, a 7-day strip, and Metric.IQ-style insight cards.
 *
 * Pipeline (unchanged): record → Groq Whisper → optional pyannote multi-speaker
 * → gpt-oss insights → Save to HIVEMIND. Past meetings load from memories
 * tagged `ai-meeting-notes`.
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, Loader2, FileText, ListChecks, Lightbulb, CheckCircle2,
  HelpCircle, Save, AlertTriangle, Sparkles, Users, Plus, AlignLeft,
  ScrollText, ArrowUpRight,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useTranslation } from 'react-i18next';

/* ── theme tokens ── */
const C = {
  bg: '#0a0c11', panel: 'rgba(255,255,255,0.035)', panelSolid: '#12151d',
  border: 'rgba(255,255,255,0.09)', text: '#e8eaf0', muted: '#8a90a2',
  faint: '#5b6172', blue: '#3b9dff', blueDeep: '#117dff', rec: '#ff5a63',
};
const SPEAKER_COLORS = { SPEAKER_00: '#3b9dff', SPEAKER_01: '#34d399', SPEAKER_02: '#fbbf24', SPEAKER_03: '#a78bfa', SPEAKER_04: '#22d3ee', SPEAKER_05: '#fb7185' };
const speakerLabel = (s) => { const m = /SPEAKER_(\d+)/.exec(s || ''); return m ? `Speaker ${Number(m[1]) + 1}` : (s || 'Speaker'); };
const fmtTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function extractSummary(c = '') { const m = /##\s*Summary\s*\n([\s\S]*?)(\n##\s|$)/i.exec(c); return (m ? m[1] : c).replace(/[#*`>]/g, '').trim().slice(0, 240); }
function extractSection(c = '', n) { const m = new RegExp(`##\\s*${n}\\s*\\n([\\s\\S]*?)(\\n##\\s|$)`, 'i').exec(c); return m ? m[1].trim() : ''; }
function fmtMeetingDate(iso) { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
@keyframes mn-pulse { 0%{transform:scale(1);opacity:.55} 70%{transform:scale(2.4);opacity:0} 100%{opacity:0} }
@keyframes mn-eq { 0%,100%{transform:scaleY(.28)} 50%{transform:scaleY(1)} }
@keyframes mn-spin { to { transform: rotate(360deg) } }
@keyframes mn-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
.mn-grain:before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.04;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
.mn-font{font-family:'Sora',ui-sans-serif,system-ui,sans-serif}
.mn-scroll::-webkit-scrollbar{width:6px}.mn-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:3px}
`;

/* ── live clock for the dial hub ── */
function HubClock({ recording }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const day = now.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
  const date = now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return (
    <div className="flex flex-col items-center justify-center text-center select-none">
      <span className="text-[9px] tracking-[0.35em] font-semibold" style={{ color: recording ? C.rec : C.blue }}>{day}</span>
      <div className="flex items-baseline mt-1.5" style={{ color: C.text }}>
        <span className="text-[40px] font-bold tabular-nums leading-none" style={{ fontFamily: 'ui-monospace,SFMono-Regular,monospace', letterSpacing: '-0.02em' }}>{hh}:{mm}</span>
        <span className="text-base tabular-nums ml-1" style={{ color: C.faint, fontFamily: 'ui-monospace,monospace' }}>{ss}</span>
      </div>
      <span className="text-[11px] mt-1.5" style={{ color: C.muted }}>{date}</span>
    </div>
  );
}

/* ── animated recording waveform (equalizer bars + pulse) ── */
function Waveform({ active }) {
  const bars = 28;
  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className="w-[3px] rounded-full" style={{
          height: '100%', background: `linear-gradient(${C.blue},${C.blueDeep})`,
          transformOrigin: 'center',
          animation: active ? `mn-eq ${0.7 + (i % 5) * 0.12}s ease-in-out ${i * 0.04}s infinite` : 'none',
          transform: active ? undefined : 'scaleY(0.12)', opacity: active ? 1 : 0.25,
        }} />
      ))}
    </div>
  );
}

function Card({ children, className = '', glow }) {
  return (
    <div className={`relative rounded-2xl border ${className}`} style={{
      background: C.panel, borderColor: C.border, backdropFilter: 'blur(10px)',
      boxShadow: glow ? `0 0 0 1px ${C.blueDeep}22, 0 12px 40px rgba(0,0,0,.4)` : '0 8px 30px rgba(0,0,0,.28)',
    }}>{children}</div>
  );
}

export default function MeetingNotes() {
  const { t } = useTranslation('dashboard');
  const [status, setStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [multiSpeaker, setMultiSpeaker] = useState(false);
  const [speakerSegments, setSpeakerSegments] = useState(null);

  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [tab, setTab] = useState('summary');
  const [rotation, setRotation] = useState(0);
  const pausedRef = useRef(false);
  const rafRef = useRef(null);

  const recRef = useRef(null); const chunksRef = useRef([]); const streamRef = useRef(null); const timerRef = useRef(null);

  const loadMeetings = useCallback(async () => {
    try {
      const data = await apiClient.listMemories({ limit: 40, tags: 'ai-meeting-notes' });
      const list = Array.isArray(data) ? data : (data?.memories || data?.data || []);
      setMeetings(list.filter(Boolean));
    } catch { /* non-fatal */ }
  }, []);
  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  useEffect(() => {
    let last = performance.now();
    const tick = (n) => { const dt = n - last; last = n; if (!pausedRef.current) setRotation((r) => (r + dt * 0.01) % 360); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((tr) => tr.stop()); streamRef.current = null; }
  }, []);
  useEffect(() => cleanup, [cleanup]);

  const process = useCallback(async (blob) => {
    setError(null);
    try {
      setStatus('transcribing');
      const tr = await apiClient.core.post(`/api/meetings/transcribe?diarize=${multiSpeaker}`, blob, { headers: { 'Content-Type': blob.type || 'audio/webm' }, timeout: 300000 });
      const text = tr.data?.transcript || ''; const segs = tr.data?.speakerSegments || null;
      setTranscript(text); setSpeakerSegments(segs);
      if (!text.trim()) { setStatus('error'); setError('No speech detected.'); return; }
      setStatus('analyzing');
      const input = segs && segs.length ? segs.map((s) => `${speakerLabel(s.speaker)}: ${s.text}`).join('\n') : text;
      const ins = await apiClient.core.post('/api/meetings/insights', { transcript: input, notes }, { timeout: 120000 });
      setInsights(ins.data?.insights || null); setStatus('done');
    } catch (e) { setStatus('error'); setError(e.response?.data?.error || e.message || 'Processing failed.'); }
  }, [notes, multiSpeaker]);

  const start = useCallback(async () => {
    setSelected(null); setError(null); setTranscript(''); setInsights(null); setSaved(false); setElapsed(0); setSpeakerSegments(null);
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
      const content = `# ${title}\n\n## Summary\n${summary}\n\n## Action Items\n${(insights?.action_items || []).map((a) => `- ${a.task}${a.owner ? ` (@${a.owner})` : ''}`).join('\n')}\n\n## Decisions\n${(insights?.decisions || []).map((d) => `- ${d}`).join('\n')}\n\n## Transcript\n${tMd}`;
      await apiClient.core.post('/api/memories', { title, content, tags: ['meeting', 'ai-meeting-notes', ...(speakerSegments?.length ? ['multi-speaker'] : []), ...(insights?.topics || []).slice(0, 5)], memory_type: 'event' });
      setSaved(true); loadMeetings();
    } catch (e) { setError('Save failed: ' + (e.response?.data?.error || e.message)); }
  }, [transcript, insights, speakerSegments, loadMeetings]);

  const busy = status === 'transcribing' || status === 'analyzing';
  const recording = status === 'recording';
  const liveView = !selected;

  /* 7-day strip with meeting counts */
  const dayStrip = useMemo(() => {
    const days = []; const today = new Date();
    for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); days.push(d); }
    const counts = {};
    meetings.forEach((m) => { const d = new Date(m.created_at || m.createdAt); if (!Number.isNaN(d.getTime())) { const k = d.toDateString(); counts[k] = (counts[k] || 0) + 1; } });
    return days.map((d) => ({ d, n: counts[d.toDateString()] || 0, today: d.toDateString() === today.toDateString() }));
  }, [meetings]);

  /* dial geometry — centered, NOT clipped */
  const CX = 240, CY = 240, R = 188, HUB = 96;
  const nodes = useMemo(() => {
    const n = Math.max(meetings.length, 1);
    return meetings.map((m, i) => {
      const ang = (270 + (i / n) * 360 + rotation) % 360; // 270 = top start
      const rad = (ang * Math.PI) / 180;
      const x = CX + R * Math.cos(rad), y = CY + R * Math.sin(rad);
      return { m, x, y, ang, z: 100 + i };
    });
  }, [meetings, rotation]);

  return (
    <div className="mn-font mn-grain relative -m-6 p-6 min-h-[calc(100vh-64px)] overflow-hidden" style={{ background: C.bg, color: C.text }}>
      <style>{STYLE}</style>
      {/* ambient glows */}
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(900px 500px at 78% 8%, ${recording ? 'rgba(255,90,99,.10)' : 'rgba(17,125,255,.12)'}, transparent 60%), radial-gradient(700px 500px at 10% 90%, rgba(59,157,255,.07), transparent 60%)` }} />

      <div className="relative max-w-[1180px] mx-auto">
        {/* ── header + day strip ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${C.blue},${C.blueDeep})`, boxShadow: `0 8px 24px rgba(17,125,255,.4)` }}>
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('meetingnotes.title', 'AI Meeting Notes')}</h1>
              <p className="text-xs" style={{ color: C.muted }}>{t('meetingnotes.subtitle', 'Record · transcribe · extract insights')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {dayStrip.map(({ d, n, today }, i) => (
              <div key={i} className="flex flex-col items-center justify-center w-11 h-14 rounded-xl border"
                style={{ background: today ? `linear-gradient(${C.blueDeep},${C.blue})` : C.panel, borderColor: today ? 'transparent' : C.border }}>
                <span className="text-[9px] uppercase tracking-wide" style={{ color: today ? 'rgba(255,255,255,.8)' : C.faint }}>{d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}</span>
                <span className="text-base font-bold tabular-nums" style={{ color: today ? '#fff' : C.text }}>{d.getDate()}</span>
                <span className="flex gap-0.5 mt-0.5 h-1">{Array.from({ length: Math.min(n, 3) }).map((_, k) => (<span key={k} className="w-1 h-1 rounded-full" style={{ background: today ? '#fff' : C.blue }} />))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] gap-6 items-start">
          {/* ════════ LEFT: studio / detail ════════ */}
          <div className="min-w-0 space-y-4">
            {liveView ? (
              <>
                {/* recorder studio */}
                <Card glow={recording} className="p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} style={{ color: C.blue }} />
                      <span className="font-semibold truncate">{insights?.title || t('meetingnotes.newMeeting', 'New meeting')}</span>
                    </div>
                    <button onClick={() => setMultiSpeaker((v) => !v)} disabled={recording || busy}
                      className="flex items-center gap-2 text-[12px] disabled:opacity-40" style={{ color: C.muted }}
                      title={t('meetingnotes.multiSpeakerHint', 'Label who said what (runs speaker diarization)')}>
                      <Users size={14} style={{ color: multiSpeaker ? C.blue : C.faint }} />
                      <span className="hidden sm:inline">{t('meetingnotes.multiSpeaker', 'Multi-speaker')}</span>
                      <span className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" style={{ background: multiSpeaker ? C.blueDeep : 'rgba(255,255,255,.12)' }}>
                        <span className="inline-block h-4 w-4 rounded-full bg-white transition-transform" style={{ transform: multiSpeaker ? 'translateX(18px)' : 'translateX(2px)' }} />
                      </span>
                    </button>
                  </div>

                  {/* record control + waveform */}
                  <div className="flex flex-col items-center py-3">
                    <div className="relative mb-4">
                      {recording && (<>
                        <span className="absolute inset-0 rounded-full" style={{ background: C.rec, animation: 'mn-pulse 2s ease-out infinite' }} />
                        <span className="absolute inset-0 rounded-full" style={{ background: C.rec, animation: 'mn-pulse 2s ease-out .8s infinite' }} />
                      </>)}
                      <button onClick={recording ? stop : start} disabled={busy}
                        className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
                        style={{ background: recording ? `linear-gradient(${C.rec},#e1444d)` : `linear-gradient(135deg,${C.blue},${C.blueDeep})`, boxShadow: `0 10px 30px ${recording ? 'rgba(255,90,99,.5)' : 'rgba(17,125,255,.5)'}` }}>
                        {busy ? <Loader2 size={26} className="text-white animate-spin" /> : recording ? <Square size={24} className="text-white" /> : <Mic size={26} className="text-white" />}
                      </button>
                    </div>
                    <Waveform active={recording} />
                    <div className="mt-3 text-center">
                      {recording ? (
                        <p className="text-sm font-semibold tabular-nums" style={{ color: C.rec, fontFamily: 'ui-monospace,monospace' }}>● REC {fmtTimer(elapsed)}</p>
                      ) : busy ? (
                        <p className="text-sm" style={{ color: C.blue }}>{status === 'transcribing' ? t('meetingnotes.transcribing', 'Transcribing…') : t('meetingnotes.analyzing', 'Analyzing…')}</p>
                      ) : (
                        <p className="text-sm font-semibold">{t('meetingnotes.start', 'Start transcribing')}</p>
                      )}
                      {!recording && !busy && !insights && <p className="text-[11px] mt-1" style={{ color: C.faint }}>{t('meetingnotes.consent', 'By recording, you confirm everyone present has given consent.')}</p>}
                    </div>
                  </div>

                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('meetingnotes.notesPlaceholder', 'Add notes here anytime…')}
                    className="mt-3 w-full min-h-[64px] p-3 text-[13px] rounded-xl resize-y outline-none mn-scroll"
                    style={{ background: 'rgba(0,0,0,.25)', border: `1px solid ${C.border}`, color: C.text }} />
                </Card>

                {error && (<div className="text-[12px] rounded-xl px-3 py-2" style={{ color: '#ffb4b8', background: 'rgba(255,90,99,.1)', border: '1px solid rgba(255,90,99,.25)' }}><AlertTriangle size={12} className="inline mr-1" /> {error}</div>)}

                {insights && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {insights.summary && (
                      <Card className="p-4 sm:col-span-2">
                        <div className="flex items-center gap-2 mb-2"><FileText size={14} style={{ color: C.blue }} /><span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>{t('meetingnotes.summary', 'Summary')}</span></div>
                        <p className="text-[13px] leading-relaxed" style={{ color: '#cfd3de' }}>{insights.summary}</p>
                      </Card>
                    )}
                    {insights.action_items?.length > 0 && (
                      <Card className="p-4 sm:col-span-2">
                        <div className="flex items-center gap-2 mb-3"><ListChecks size={14} style={{ color: '#34d399' }} /><span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>{t('meetingnotes.actionItems', 'Action Items')}</span></div>
                        <ul className="space-y-2">{insights.action_items.map((a, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-[13px]"><span className="mt-0.5 w-4 h-4 rounded-[5px] border flex-shrink-0" style={{ borderColor: '#34d39966' }} /><span>{a.task}{a.owner && <span style={{ color: C.faint }}> · @{a.owner}</span>}{a.due && <span style={{ color: C.faint }}> · {a.due}</span>}</span></li>
                        ))}</ul>
                      </Card>
                    )}
                    {insights.decisions?.length > 0 && (
                      <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Lightbulb size={14} style={{ color: '#fbbf24' }} /><span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>{t('meetingnotes.decisions', 'Decisions')}</span></div><ul className="space-y-1.5 text-[12px]" style={{ color: '#cfd3de' }}>{insights.decisions.map((d, i) => <li key={i} className="flex gap-2"><span style={{ color: '#fbbf24' }}>·</span>{d}</li>)}</ul></Card>
                    )}
                    {insights.key_points?.length > 0 && (
                      <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Sparkles size={14} style={{ color: '#a78bfa' }} /><span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>{t('meetingnotes.keyPoints', 'Key Points')}</span></div><ul className="space-y-1.5 text-[12px]" style={{ color: '#cfd3de' }}>{insights.key_points.map((k, i) => <li key={i} className="flex gap-2"><span style={{ color: '#a78bfa' }}>·</span>{k}</li>)}</ul></Card>
                    )}
                    {insights.questions?.length > 0 && (
                      <Card className="p-4 sm:col-span-2"><div className="flex items-center gap-2 mb-2"><HelpCircle size={14} style={{ color: '#22d3ee' }} /><span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>{t('meetingnotes.openQuestions', 'Open Questions')}</span></div><ul className="space-y-1.5 text-[12px]" style={{ color: '#cfd3de' }}>{insights.questions.map((q, i) => <li key={i} className="flex gap-2"><span style={{ color: '#22d3ee' }}>?</span>{q}</li>)}</ul></Card>
                    )}
                    {insights.topics?.length > 0 && (
                      <div className="sm:col-span-2 flex flex-wrap gap-1.5">{insights.topics.map((tp, i) => (<span key={i} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(59,157,255,.12)', color: C.blue, border: '1px solid rgba(59,157,255,.2)' }}>#{tp}</span>))}</div>
                    )}
                    <button onClick={save} disabled={saved}
                      className="sm:col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-60"
                      style={{ background: saved ? 'rgba(52,211,153,.15)' : '#fff', color: saved ? '#34d399' : '#0a0c11' }}>
                      {saved ? <CheckCircle2 size={15} /> : <Save size={15} />} {saved ? t('meetingnotes.saved', 'Saved to HIVEMIND') : t('meetingnotes.save', 'Save to HIVEMIND')}
                    </button>
                  </div>
                )}

                {transcript && (
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3"><ScrollText size={14} style={{ color: C.faint }} /><span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>{t('meetingnotes.transcript', 'Transcript')}</span></div>
                    {speakerSegments?.length ? (
                      <div className="space-y-2 max-h-[280px] overflow-y-auto mn-scroll">{speakerSegments.map((s, i) => (<div key={i} className="text-[12px] leading-relaxed"><span className="font-semibold" style={{ color: SPEAKER_COLORS[s.speaker] || C.blue }}>{speakerLabel(s.speaker)}:</span> <span style={{ color: '#b9bdc9' }}>{s.text}</span></div>))}</div>
                    ) : (<p className="text-[12px] leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto mn-scroll" style={{ color: '#b9bdc9' }}>{transcript}</p>)}
                  </Card>
                )}
              </>
            ) : (
              /* ════════ history detail (Notion-style) ════════ */
              <Card className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-2xl font-bold leading-tight">{selected.title || 'Meeting'}<span className="text-base font-medium ml-2" style={{ color: C.faint }}>@ {fmtMeetingDate(selected.created_at || selected.createdAt)}</span></h2>
                  <button onClick={() => setSelected(null)} className="text-[12px] flex-shrink-0" style={{ color: C.muted }}>{t('meetingnotes.close', 'Close')}</button>
                </div>
                <div className="flex items-center gap-1 mt-4 mb-5 border-b" style={{ borderColor: C.border }}>
                  {[['summary', 'Summary', ListChecks], ['notes', 'Notes', AlignLeft], ['transcript', 'Transcript', ScrollText]].map(([key, label, Icon]) => (
                    <button key={key} onClick={() => setTab(key)} className="flex items-center gap-1.5 px-3 py-2 text-[13px] -mb-px border-b-2 transition-colors"
                      style={{ borderColor: tab === key ? C.blue : 'transparent', color: tab === key ? C.text : C.faint, fontWeight: tab === key ? 600 : 400 }}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
                {tab === 'summary' && (
                  <div className="space-y-5 text-[14px] leading-relaxed" style={{ color: '#cfd3de' }}>
                    {(() => { const items = extractSection(selected.content, 'Action Items').split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean); return items.length ? (<div><h3 className="font-bold mb-2" style={{ color: C.text }}>Action Items</h3><ul className="space-y-2">{items.map((it, i) => (<li key={i} className="flex items-start gap-2.5"><span className="mt-0.5 w-4 h-4 rounded-[5px] border flex-shrink-0" style={{ borderColor: C.border }} /><span>{it}</span></li>))}</ul></div>) : null; })()}
                    <div><h3 className="font-bold mb-2" style={{ color: C.text }}>Meeting Overview</h3><p className="whitespace-pre-wrap">{extractSection(selected.content, 'Summary') || extractSummary(selected.content)}</p></div>
                    {extractSection(selected.content, 'Decisions') && (<div><h3 className="font-bold mb-2" style={{ color: C.text }}>Decisions</h3><p className="whitespace-pre-wrap">{extractSection(selected.content, 'Decisions')}</p></div>)}
                  </div>
                )}
                {tab === 'notes' && (<p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: '#cfd3de' }}>{extractSection(selected.content, 'Summary') || extractSummary(selected.content)}</p>)}
                {tab === 'transcript' && (<p className="text-[13px] leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto mn-scroll" style={{ color: '#b9bdc9' }}>{extractSection(selected.content, 'Transcript') || 'No transcript saved.'}</p>)}
              </Card>
            )}
          </div>

          {/* ════════ RIGHT: radial dial ════════ */}
          <div className="relative hidden lg:flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-[0.3em] mb-3 self-start" style={{ color: C.faint }}>{t('meetingnotes.pastMeetings', 'Past meetings')}</div>
            <div className="relative" style={{ width: CX * 2, height: CY * 2 }}
              onMouseEnter={() => { pausedRef.current = true; }} onMouseLeave={() => { pausedRef.current = false; setHoverId(null); }}>
              {/* guide rings */}
              <div className="absolute rounded-full" style={{ left: CX - R - 22, top: CY - R - 22, width: (R + 22) * 2, height: (R + 22) * 2, border: `1px dashed ${C.border}` }} />
              <div className="absolute rounded-full" style={{ left: CX - R, top: CY - R, width: R * 2, height: R * 2, border: `1px solid rgba(59,157,255,.14)`, background: `radial-gradient(circle at 50% 38%, rgba(59,157,255,.05), transparent 60%)` }} />
              {/* hub */}
              <div className="absolute rounded-full flex items-center justify-center" style={{ left: CX - HUB, top: CY - HUB, width: HUB * 2, height: HUB * 2, background: 'radial-gradient(circle at 40% 30%, #232a36, #0c0e15 72%)', border: '1px solid rgba(255,255,255,.08)', boxShadow: `0 22px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)` }}>
                <div className="absolute rounded-full" style={{ inset: 9, border: `1px solid ${recording ? 'rgba(255,90,99,.4)' : 'rgba(59,157,255,.3)'}` }} />
                {recording && <span className="absolute rounded-full" style={{ inset: 9, border: '1px solid rgba(255,90,99,.6)', animation: 'mn-pulse 2s ease-out infinite' }} />}
                <HubClock recording={recording} />
              </div>

              {/* meeting nodes */}
              {nodes.map(({ m, x, y, z }) => {
                const active = selected?.id === m.id; const hov = hoverId === m.id;
                return (
                  <div key={m.id} className="absolute" style={{ left: x, top: y, transform: 'translate(-50%,-50%)', zIndex: hov ? 5000 : z }}>
                    <button onMouseEnter={() => setHoverId(m.id)} onClick={() => { setSelected(m); setTab('summary'); }}
                      className="relative flex items-center justify-center rounded-full transition-all"
                      style={{ width: hov ? 44 : 36, height: hov ? 44 : 36, background: active ? `linear-gradient(${C.blue},${C.blueDeep})` : hov ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)', border: `1px solid ${active ? 'transparent' : C.border}`, boxShadow: active || hov ? `0 6px 20px rgba(17,125,255,.4)` : 'none', animation: hov ? 'none' : 'mn-float 5s ease-in-out infinite' }}>
                      <FileText size={hov ? 16 : 14} style={{ color: active ? '#fff' : C.blue }} />
                    </button>
                    {/* expanded label + summary (Huly style) */}
                    <AnimatePresence>
                      {hov && (
                        <motion.div initial={{ opacity: 0, x: -8, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -8 }}
                          className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 w-60 p-3 rounded-2xl"
                          style={{ background: 'rgba(18,21,29,.96)', border: `1px solid ${C.border}`, backdropFilter: 'blur(8px)', boxShadow: '0 16px 50px rgba(0,0,0,.5)', pointerEvents: 'none' }}>
                          <p className="text-[12px] font-semibold truncate">{m.title || 'Meeting'}</p>
                          <p className="text-[10px] mb-1.5" style={{ color: C.blue }}>{fmtMeetingDate(m.created_at || m.createdAt)}</p>
                          <p className="text-[11px] leading-snug line-clamp-3" style={{ color: C.muted }}>{extractSummary(m.content)}</p>
                          <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: C.faint }}>Open details <ArrowUpRight size={11} /></p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* New meeting — pinned at top of dial */}
              <button onClick={() => { setSelected(null); setInsights(null); setTranscript(''); setStatus('idle'); }}
                className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{ left: CX, top: CY - R - 4, transform: 'translate(-50%,-50%)', background: '#fff', color: '#0a0c11', boxShadow: '0 8px 20px rgba(0,0,0,.4)' }}>
                <Plus size={13} /> {t('meetingnotes.new', 'New')}
              </button>
            </div>
            <p className="text-[11px] mt-4 text-center" style={{ color: C.faint }}>
              {meetings.length ? t('meetingnotes.dialHint', 'Hover a node for the summary · click to open') : t('meetingnotes.noMeetings', 'Saved meetings appear here on the dial.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
