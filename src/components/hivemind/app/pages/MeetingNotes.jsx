/**
 * AI Meeting Notes — control-room redesign.
 *
 * Right: a slowly self-rotating "meeting wheel". Hub = live clock (day / date /
 * time, realtime). Saved meetings ride the left-facing arc as nodes; hover →
 * summary popover, click → full details in the left panel. Rotation pauses on
 * hover so nodes are easy to target.
 *
 * Left: record → Groq Whisper transcribe → (optional pyannote multi-speaker) →
 * gpt-oss insights → Save to HIVEMIND. Selecting a past meeting shows its
 * Summary / Notes / Transcript (Notion-style tabs).
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, Loader2, FileText, ListChecks, Lightbulb, CheckCircle2,
  HelpCircle, Tag, Save, AlertTriangle, Sparkles, Clock, Users, Plus,
  AlignLeft, ScrollText,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useTranslation } from 'react-i18next';

function fmtTime(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

const SPEAKER_COLORS = { SPEAKER_00: '#117dff', SPEAKER_01: '#16a34a', SPEAKER_02: '#f59e0b', SPEAKER_03: '#7c3aed', SPEAKER_04: '#0891b2', SPEAKER_05: '#dc2626' };
function speakerLabel(s) { const m = /SPEAKER_(\d+)/.exec(s || ''); return m ? `Speaker ${Number(m[1]) + 1}` : (s || 'Speaker'); }

// Pull a one-line summary out of a saved meeting's markdown content.
function extractSummary(content = '') {
  const m = /##\s*Summary\s*\n([\s\S]*?)(\n##\s|$)/i.exec(content);
  const s = (m ? m[1] : content).replace(/[#*`>]/g, '').trim();
  return s.slice(0, 220);
}
function extractSection(content = '', name) {
  const re = new RegExp(`##\\s*${name}\\s*\\n([\\s\\S]*?)(\\n##\\s|$)`, 'i');
  const m = re.exec(content);
  return m ? m[1].trim() : '';
}
function fmtMeetingDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Live clock hub ───────────────────────────────────────────────────────
function HubClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  const date = now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  const sec = String(now.getSeconds()).padStart(2, '0');
  return (
    <div className="flex flex-col items-center justify-center text-center select-none">
      <span className="text-[10px] uppercase tracking-[0.25em] text-[#117dff] font-['Space_Grotesk'] font-semibold">{day}</span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-white text-3xl font-bold tabular-nums font-mono leading-none">{time}</span>
        <span className="text-white/40 text-sm font-mono tabular-nums">{sec}</span>
      </div>
      <span className="text-white/55 text-[11px] mt-1 font-['Space_Grotesk']">{date}</span>
    </div>
  );
}

function InsightBlock({ icon: Icon, title, accent, children }) {
  return (
    <div className="bg-white border border-[#e3e0db] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon size={15} style={{ color: accent }} />
        <span className="text-[12px] font-['Space_Grotesk'] font-semibold text-[#0a0a0a] uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function MeetingNotes() {
  const { t } = useTranslation('dashboard');
  const [status, setStatus] = useState('idle'); // idle|recording|transcribing|analyzing|done|error
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [multiSpeaker, setMultiSpeaker] = useState(false);
  const [speakerSegments, setSpeakerSegments] = useState(null);

  // Wheel + history
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState(null); // saved meeting memory (history view) or null (live view)
  const [hoverId, setHoverId] = useState(null);
  const [tab, setTab] = useState('summary'); // summary|notes|transcript
  const [rotation, setRotation] = useState(0);
  const pausedRef = useRef(false);
  const rafRef = useRef(null);

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  // ── Load saved meetings for the wheel ──
  const loadMeetings = useCallback(async () => {
    try {
      const data = await apiClient.listMemories({ limit: 40, tags: 'ai-meeting-notes' });
      const list = Array.isArray(data) ? data : (data?.memories || data?.data || []);
      setMeetings(list.filter(Boolean));
    } catch { /* non-fatal — wheel just shows fewer nodes */ }
  }, []);
  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  // ── Continuous slow rotation (pauses on wheel hover) ──
  useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      const dt = now - last; last = now;
      if (!pausedRef.current) setRotation((r) => (r + dt * 0.012) % 360); // ~30s/turn
      rafRef.current = requestAnimationFrame(tick);
    };
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
      const tr = await apiClient.core.post(`/api/meetings/transcribe?diarize=${multiSpeaker}`, blob, {
        headers: { 'Content-Type': blob.type || 'audio/webm' }, timeout: 300000,
      });
      const text = tr.data?.transcript || '';
      const segs = tr.data?.speakerSegments || null;
      setTranscript(text); setSpeakerSegments(segs);
      if (!text.trim()) { setStatus('error'); setError('No speech detected.'); return; }
      setStatus('analyzing');
      const insightInput = segs && segs.length ? segs.map((s) => `${speakerLabel(s.speaker)}: ${s.text}`).join('\n') : text;
      const ins = await apiClient.core.post('/api/meetings/insights', { transcript: insightInput, notes }, { timeout: 120000 });
      setInsights(ins.data?.insights || null);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError(e.response?.data?.error || e.message || 'Processing failed.');
    }
  }, [notes, multiSpeaker]);

  const start = useCallback(async () => {
    setSelected(null); setError(null); setTranscript(''); setInsights(null); setSaved(false); setElapsed(0); setSpeakerSegments(null);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch { setError('Microphone permission denied.'); return; }
    streamRef.current = stream; chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
    recRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => { cleanup(); process(new Blob(chunksRef.current, { type: 'audio/webm' })); };
    rec.start(1000);
    setStatus('recording');
    timerRef.current = setInterval(() => setElapsed((x) => x + 1), 1000);
  }, [cleanup, process]);

  const stop = useCallback(() => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
  }, []);

  const save = useCallback(async () => {
    if (!transcript) return;
    try {
      const title = insights?.title || `Meeting ${new Date().toLocaleString()}`;
      const summary = insights?.summary || transcript.slice(0, 500);
      const transcriptMd = speakerSegments && speakerSegments.length
        ? speakerSegments.map((s) => `**${speakerLabel(s.speaker)}:** ${s.text}`).join('\n\n')
        : transcript;
      const content = `# ${title}\n\n## Summary\n${summary}\n\n## Action Items\n${(insights?.action_items || []).map((a) => `- ${a.task}${a.owner ? ` (@${a.owner})` : ''}`).join('\n')}\n\n## Decisions\n${(insights?.decisions || []).map((d) => `- ${d}`).join('\n')}\n\n## Transcript\n${transcriptMd}`;
      await apiClient.core.post('/api/memories', {
        title, content,
        tags: ['meeting', 'ai-meeting-notes', ...(speakerSegments?.length ? ['multi-speaker'] : []), ...(insights?.topics || []).slice(0, 5)],
        memory_type: 'event',
      });
      setSaved(true);
      loadMeetings();
    } catch (e) { setError('Save failed: ' + (e.response?.data?.error || e.message)); }
  }, [transcript, insights, speakerSegments, loadMeetings]);

  const busy = status === 'transcribing' || status === 'analyzing';
  const liveView = !selected; // showing the current recording session

  // ── Wheel geometry ──
  const CX = 430, CY = 310, R = 290, HUB = 118;
  const wheelNodes = useMemo(() => {
    const n = Math.max(meetings.length, 1);
    return meetings.map((m, i) => {
      // base angle spread around the full circle; 180° = left-facing (front)
      const base = 180 + (i / n) * 360;
      const ang = (base + rotation) % 360;
      const rad = (ang * Math.PI) / 180;
      const x = CX + R * Math.cos(rad);
      const y = CY + R * Math.sin(rad);
      // visibility/opacity: fade out away from the left front (180°)
      const delta = Math.min(Math.abs(ang - 180), 360 - Math.abs(ang - 180));
      const opacity = delta > 95 ? 0 : Math.max(0.12, 1 - delta / 95);
      const scale = 0.72 + 0.28 * Math.max(0, 1 - delta / 95);
      return { m, x, y, opacity, scale, z: Math.round(1000 - delta), front: delta < 30 };
    });
  }, [meetings, rotation]);

  return (
    <div className="relative min-h-[calc(100vh-120px)] overflow-hidden">
      {/* ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(1200px 600px at 85% 30%, rgba(17,125,255,0.07), transparent 60%)' }} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px] gap-6">
        {/* ───────────── LEFT: detail / recorder ───────────── */}
        <div className="min-w-0 space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#117dff] to-[#6366f1] flex items-center justify-center shadow-lg">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk']">{t('meetingnotes.title', 'AI Meeting Notes')}</h1>
              <p className="text-[#a3a3a3] text-xs">{t('meetingnotes.subtitle', 'Record · transcribe · extract insights')}</p>
            </div>
          </div>

          {liveView ? (
            <>
              {/* Recorder card */}
              <div className="bg-white border border-[#e3e0db] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-[#117dff] flex-shrink-0" />
                    <span className="font-['Space_Grotesk'] font-semibold text-[#0a0a0a] truncate">
                      {insights?.title || t('meetingnotes.newMeeting', 'New meeting')}
                    </span>
                  </div>
                  {status === 'recording' ? (
                    <button onClick={stop} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ef4444] text-white text-[13px] font-semibold hover:bg-[#dc2626]">
                      <Square size={14} /> {t('meetingnotes.stop', 'Stop')} · {fmtTime(elapsed)}
                    </button>
                  ) : (
                    <button onClick={start} disabled={busy}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#117dff] text-white text-[13px] font-semibold hover:bg-[#0066e0] disabled:opacity-50">
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
                      {busy ? (status === 'transcribing' ? t('meetingnotes.transcribing', 'Transcribing…') : t('meetingnotes.analyzing', 'Analyzing…')) : t('meetingnotes.start', 'Start transcribing')}
                    </button>
                  )}
                </div>

                <button type="button" onClick={() => setMultiSpeaker((v) => !v)} disabled={status === 'recording' || busy}
                  className="flex items-center gap-2 mb-3 text-[13px] font-['Space_Grotesk'] text-[#525252] disabled:opacity-50"
                  title={t('meetingnotes.multiSpeakerHint', 'Label who said what (slower — runs speaker diarization)')}>
                  <Users size={15} style={{ color: multiSpeaker ? '#117dff' : '#a3a3a3' }} />
                  <span>{t('meetingnotes.multiSpeaker', 'Multi-speaker recognition')}</span>
                  <span className={`ml-1 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${multiSpeaker ? 'bg-[#117dff]' : 'bg-[#e3e0db]'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${multiSpeaker ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </span>
                </button>

                {status === 'idle' && !insights && (
                  <div className="text-[13px] text-[#737373] leading-relaxed">
                    <p className="font-medium text-[#525252] mb-1">{t('meetingnotes.howItWorks', 'How it works:')}</p>
                    <p>1. {t('meetingnotes.step1', 'Click “Start transcribing” to record the meeting.')}</p>
                    <p>2. {t('meetingnotes.step2', 'Add notes below — the AI uses them to make insights smarter.')}</p>
                    <p>3. {t('meetingnotes.step3', 'Click “Stop” → full transcript + insights are generated.')}</p>
                    <p className="mt-2 text-[11px] text-[#a3a3a3]">{t('meetingnotes.consent', 'By recording, you confirm everyone present has given consent.')}</p>
                  </div>
                )}
                {status === 'recording' && (
                  <div className="flex items-center gap-2 text-[13px] text-[#ef4444]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse" />
                    {t('meetingnotes.recording', 'Recording…')} <Clock size={13} className="ml-1" /> {fmtTime(elapsed)}
                  </div>
                )}
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('meetingnotes.notesPlaceholder', 'Add notes here anytime…')}
                  className="mt-4 w-full min-h-[72px] p-3 text-[13px] bg-[#faf9f4] border border-[#e3e0db] rounded-xl focus:outline-none focus:border-[#117dff]/40 resize-y" />
              </div>

              {error && (
                <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertTriangle size={12} className="inline mr-1" /> {error}
                </div>
              )}

              {insights && (
                <div className="space-y-3">
                  {insights.summary && (
                    <InsightBlock icon={FileText} title={t('meetingnotes.summary', 'Summary')} accent="#117dff">
                      <p className="text-[13px] text-[#525252] leading-relaxed">{insights.summary}</p>
                    </InsightBlock>
                  )}
                  {insights.action_items?.length > 0 && (
                    <InsightBlock icon={ListChecks} title={t('meetingnotes.actionItems', 'Action Items')} accent="#16a34a">
                      <ul className="space-y-1.5">
                        {insights.action_items.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-[#0a0a0a]">
                            <CheckCircle2 size={14} className="text-[#16a34a] mt-0.5 flex-shrink-0" />
                            <span>{a.task}{a.owner && <span className="text-[#a3a3a3]"> · @{a.owner}</span>}{a.due && <span className="text-[#a3a3a3]"> · {a.due}</span>}</span>
                          </li>
                        ))}
                      </ul>
                    </InsightBlock>
                  )}
                  {insights.decisions?.length > 0 && (
                    <InsightBlock icon={Lightbulb} title={t('meetingnotes.decisions', 'Decisions')} accent="#f59e0b">
                      <ul className="list-disc pl-5 space-y-1 text-[13px] text-[#525252]">{insights.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                    </InsightBlock>
                  )}
                  {insights.key_points?.length > 0 && (
                    <InsightBlock icon={Sparkles} title={t('meetingnotes.keyPoints', 'Key Points')} accent="#7c3aed">
                      <ul className="list-disc pl-5 space-y-1 text-[13px] text-[#525252]">{insights.key_points.map((k, i) => <li key={i}>{k}</li>)}</ul>
                    </InsightBlock>
                  )}
                  {insights.questions?.length > 0 && (
                    <InsightBlock icon={HelpCircle} title={t('meetingnotes.openQuestions', 'Open Questions')} accent="#0891b2">
                      <ul className="list-disc pl-5 space-y-1 text-[13px] text-[#525252]">{insights.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                    </InsightBlock>
                  )}
                  {insights.topics?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {insights.topics.map((tp, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-[#f3f1ec] text-[#525252]"><Tag size={10} /> {tp}</span>
                      ))}
                    </div>
                  )}
                  <button onClick={save} disabled={saved}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a0a0a] text-white text-[13px] font-semibold hover:bg-[#262626] disabled:opacity-50">
                    {saved ? <CheckCircle2 size={14} /> : <Save size={14} />} {saved ? t('meetingnotes.saved', 'Saved to HIVEMIND') : t('meetingnotes.save', 'Save to HIVEMIND')}
                  </button>
                </div>
              )}

              {transcript && (
                <InsightBlock icon={speakerSegments?.length ? Users : FileText} title={t('meetingnotes.transcript', 'Full Transcript')} accent="#a3a3a3">
                  {speakerSegments && speakerSegments.length ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {speakerSegments.map((s, i) => (
                        <div key={i} className="text-[12px] leading-relaxed">
                          <span className="font-['Space_Grotesk'] font-semibold" style={{ color: SPEAKER_COLORS[s.speaker] || '#117dff' }}>{speakerLabel(s.speaker)}:</span>{' '}
                          <span className="text-[#525252] whitespace-pre-wrap">{s.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#525252] leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">{transcript}</p>
                  )}
                </InsightBlock>
              )}
            </>
          ) : (
            /* ───────────── HISTORY: selected meeting (Notion-style) ───────────── */
            <div className="bg-white border border-[#e3e0db] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk'] leading-tight">
                  {selected.title || 'Meeting'}
                  <span className="text-[#a3a3a3] font-medium text-base ml-2">@ {fmtMeetingDate(selected.created_at || selected.createdAt)}</span>
                </h2>
                <button onClick={() => { setSelected(null); }} className="text-[12px] text-[#a3a3a3] hover:text-[#117dff] flex-shrink-0">{t('meetingnotes.close', 'Close')}</button>
              </div>

              <div className="flex items-center gap-1 mt-4 mb-5 border-b border-[#eee] -mx-1">
                {[['summary', 'Summary', ListChecks], ['notes', 'Notes', AlignLeft], ['transcript', 'Transcript', ScrollText]].map(([key, label, Icon]) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-['Space_Grotesk'] rounded-t-lg -mb-px border-b-2 transition-colors ${tab === key ? 'border-[#117dff] text-[#0a0a0a] font-semibold' : 'border-transparent text-[#a3a3a3] hover:text-[#525252]'}`}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {tab === 'summary' && (
                <div className="space-y-5 text-[14px] text-[#333] leading-relaxed">
                  {(() => {
                    const ai = extractSection(selected.content, 'Action Items');
                    const items = ai.split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
                    return items.length ? (
                      <div>
                        <h3 className="text-[#0a0a0a] font-bold font-['Space_Grotesk'] mb-2">Action Items</h3>
                        <ul className="space-y-2">{items.map((it, i) => (
                          <li key={i} className="flex items-start gap-2.5"><span className="mt-0.5 w-4 h-4 rounded border border-[#cbd5e1] flex-shrink-0" /><span>{it}</span></li>
                        ))}</ul>
                      </div>
                    ) : null;
                  })()}
                  <div>
                    <h3 className="text-[#0a0a0a] font-bold font-['Space_Grotesk'] mb-2">Meeting Overview</h3>
                    <p className="whitespace-pre-wrap">{extractSection(selected.content, 'Summary') || extractSummary(selected.content)}</p>
                  </div>
                  {extractSection(selected.content, 'Decisions') && (
                    <div>
                      <h3 className="text-[#0a0a0a] font-bold font-['Space_Grotesk'] mb-2">Decisions</h3>
                      <p className="whitespace-pre-wrap">{extractSection(selected.content, 'Decisions')}</p>
                    </div>
                  )}
                </div>
              )}
              {tab === 'notes' && (
                <p className="text-[14px] text-[#333] leading-relaxed whitespace-pre-wrap">{extractSection(selected.content, 'Summary') || extractSummary(selected.content)}</p>
              )}
              {tab === 'transcript' && (
                <p className="text-[13px] text-[#525252] leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto">{extractSection(selected.content, 'Transcript') || 'No transcript saved.'}</p>
              )}
            </div>
          )}
        </div>

        {/* ───────────── RIGHT: rotating meeting wheel ───────────── */}
        <div className="relative hidden lg:block">
          <div
            className="absolute right-[-150px] top-1/2 -translate-y-1/2"
            style={{ width: 600, height: 620 }}
            onMouseEnter={() => { pausedRef.current = true; }}
            onMouseLeave={() => { pausedRef.current = false; setHoverId(null); }}
          >
            {/* rotating guide ring */}
            <div className="absolute rounded-full border border-[#117dff]/15"
              style={{ left: CX - R, top: CY - R, width: R * 2, height: R * 2,
                background: 'radial-gradient(circle at 50% 40%, rgba(17,125,255,0.05), transparent 62%)' }} />
            <div className="absolute rounded-full border border-dashed border-[#cbd5e1]/40"
              style={{ left: CX - R - 14, top: CY - R - 14, width: (R + 14) * 2, height: (R + 14) * 2 }} />

            {/* hub — glossy dark disc with the live clock */}
            <div className="absolute rounded-full flex items-center justify-center shadow-[0_18px_50px_rgba(10,12,20,0.45)]"
              style={{ left: CX - HUB, top: CY - HUB, width: HUB * 2, height: HUB * 2,
                background: 'radial-gradient(circle at 38% 28%, #2b3140, #0c0e15 70%)',
                border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute rounded-full" style={{ inset: 10, border: '1px solid rgba(17,125,255,0.25)' }} />
              <HubClock />
            </div>

            {/* meeting nodes on the arc */}
            {wheelNodes.map(({ m, x, y, opacity, scale, z, front }) => {
              if (opacity <= 0.01) return null;
              const active = selected?.id === m.id;
              return (
                <div key={m.id} className="absolute" style={{ left: x, top: y, transform: `translate(-100%, -50%) scale(${scale})`, opacity, zIndex: z }}>
                  <button
                    onMouseEnter={() => setHoverId(m.id)}
                    onMouseLeave={() => setHoverId((h) => (h === m.id ? null : h))}
                    onClick={() => { setSelected(m); setTab('summary'); }}
                    className={`group flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border whitespace-nowrap transition-shadow ${active ? 'bg-[#117dff] border-[#117dff] text-white shadow-[0_4px_16px_rgba(17,125,255,0.35)]' : 'bg-white border-[#e3e0db] text-[#0a0a0a] hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)]'}`}
                    style={{ fontFamily: 'Space Grotesk' }}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : 'bg-[#117dff]/10'}`}>
                      <FileText size={12} className={active ? 'text-white' : 'text-[#117dff]'} />
                    </span>
                    <span className="text-[11px] leading-tight text-left max-w-[150px] truncate">
                      <span className="block font-semibold truncate">{(m.title || 'Meeting').replace(/^Meeting\s+/, '')}</span>
                      <span className={`block text-[10px] ${active ? 'text-white/70' : 'text-[#a3a3a3]'}`}>{fmtMeetingDate(m.created_at || m.createdAt)}</span>
                    </span>
                  </button>

                  {/* hover summary popover (only for the front-most / hovered node) */}
                  <AnimatePresence>
                    {hoverId === m.id && (
                      <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        className="absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 w-64 p-3 rounded-xl bg-[#0c0e15] text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] z-[2000]"
                        style={{ pointerEvents: 'none' }}>
                        <p className="text-[12px] font-semibold mb-1 font-['Space_Grotesk'] truncate">{m.title || 'Meeting'}</p>
                        <p className="text-[11px] text-white/70 leading-snug line-clamp-4">{extractSummary(m.content)}</p>
                        <p className="text-[10px] text-[#117dff] mt-2">Click to open details →</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {front && null}
                </div>
              );
            })}

            {/* New-meeting node pinned at the front of the wheel */}
            <button
              onClick={() => { setSelected(null); setInsights(null); setTranscript(''); setStatus('idle'); }}
              className="absolute flex items-center gap-2 px-3 py-2 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold shadow-lg hover:bg-[#262626]"
              style={{ left: CX - R - 6, top: CY, transform: 'translate(-100%, -50%)', fontFamily: 'Space Grotesk' }}
            >
              <Plus size={14} /> {t('meetingnotes.new', 'New')}
            </button>

            {meetings.length === 0 && (
              <div className="absolute text-[12px] text-[#a3a3a3] text-center" style={{ left: CX - R, top: CY + R + 6, width: R }}>
                {t('meetingnotes.noMeetings', 'Saved meetings appear here on the wheel.')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
