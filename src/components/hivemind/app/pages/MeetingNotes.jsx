/**
 * AI Meeting Notes — matches the HIVEMIND light "operator console" theme
 * (Workspace Admin / MCP / Overview). Built per the hivemind-frontend skill.
 *
 * Pipeline: record → Groq Whisper → optional pyannote multi-speaker → gpt-oss
 * insights → Save to HIVEMIND. Past meetings load from memories tagged
 * `ai-meeting-notes`.
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Mic, Square, Loader2, FileText, ListChecks, Lightbulb, CheckCircle2,
  HelpCircle, Save, AlertTriangle, Sparkles, Users, Clock, ArrowUpRight,
  CalendarDays, History, AudioLines, AlignLeft, ScrollText, ArrowLeft,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useTranslation } from 'react-i18next';

const SPEAKER_COLORS = { SPEAKER_00: '#117dff', SPEAKER_01: '#10b981', SPEAKER_02: '#f59e0b', SPEAKER_03: '#8b5cf6', SPEAKER_04: '#0891b2', SPEAKER_05: '#ef4444' };
const speakerLabel = (s) => { const m = /SPEAKER_(\d+)/.exec(s || ''); return m ? `Speaker ${Number(m[1]) + 1}` : (s || 'Speaker'); };
const fmtTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function fmtDate(iso) { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }

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

/* subtle equalizer — light, blue */
function Waveform({ active }) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-8">
      {Array.from({ length: 32 }).map((_, i) => (
        <span key={i} className="w-[3px] rounded-full bg-[#117dff]" style={{
          height: '100%', transformOrigin: 'bottom',
          animation: active ? `mn-eq ${0.6 + (i % 6) * 0.1}s ease-in-out ${i * 0.03}s infinite` : 'none',
          transform: active ? undefined : 'scaleY(0.1)', opacity: active ? 0.85 : 0.18,
        }} />
      ))}
    </div>
  );
}

/* Record dial — hover-reactive radial control; concentric pulse rings when live.
   Pure presentation: delegates to the same start/stop handlers (no logic change). */
function RecordDial({ recording, busy, elapsed, onStart, onStop }) {
  const active = recording;
  return (
    <div className="flex flex-col items-center justify-center py-2 select-none">
      <button
        type="button"
        onClick={active ? onStop : onStart}
        disabled={busy}
        title={active ? 'Stop recording' : 'Start recording'}
        className="relative grid place-items-center disabled:opacity-50 disabled:cursor-not-allowed group"
        style={{ width: 132, height: 132 }}
      >
        {/* pulse rings */}
        {active && [0, 1, 2].map((i) => (
          <span key={i} className="absolute rounded-full border" style={{
            width: 132, height: 132, borderColor: '#ef4444',
            animation: `mn-ring 1.8s cubic-bezier(.2,.6,.3,1) ${i * 0.6}s infinite`,
          }} />
        ))}
        {/* track */}
        <span className="absolute rounded-full" style={{
          width: 116, height: 116,
          background: active ? 'rgba(239,68,68,0.06)' : 'rgba(17,125,255,0.05)',
          border: `1px solid ${active ? 'rgba(239,68,68,0.25)' : '#e3e0db'}`,
          transition: 'all .25s',
        }} />
        {/* inner disc — scales on hover */}
        <span className="absolute grid place-items-center rounded-full transition-transform duration-200 group-hover:scale-105 group-active:scale-95" style={{
          width: 84, height: 84,
          background: active ? '#ef4444' : busy ? '#a3a3a3' : '#117dff',
          boxShadow: active ? '0 6px 22px rgba(239,68,68,.35)' : '0 6px 22px rgba(17,125,255,.28)',
        }}>
          {busy ? <Loader2 size={26} className="text-white animate-spin" />
            : active ? <Square size={24} className="text-white" />
            : <Mic size={28} className="text-white" />}
        </span>
      </button>
      <div className="mt-3 text-center">
        {active
          ? <div className="text-[18px] font-semibold text-[#ef4444] font-['Space_Grotesk'] tabular-nums">{fmtTimer(elapsed)}</div>
          : <div className="text-[13px] font-medium text-[#0a0a0a]">{busy ? 'Working…' : 'Tap to record'}</div>}
        <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wider mt-0.5">{active ? 'Recording — tap to stop' : busy ? 'Transcribing & analyzing' : 'Microphone'}</div>
      </div>
    </div>
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
  const [multiSpeaker, setMultiSpeaker] = useState(false);
  const [speakerSegments, setSpeakerSegments] = useState(null);
  const [language, setLanguage] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('summary');

  const recRef = useRef(null); const chunksRef = useRef([]); const streamRef = useRef(null); const timerRef = useRef(null);

  const loadMeetings = useCallback(async () => {
    try {
      // Persistent org-level meetings table (structured rows).
      const { data } = await apiClient.core.get('/api/meetings?limit=40');
      setMeetings((data?.meetings || []).filter(Boolean));
    } catch { /* non-fatal */ }
  }, []);
  useEffect(() => { loadMeetings(); }, [loadMeetings]);

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
      setTranscript(text); setSpeakerSegments(segs); setLanguage(tr.data?.language || null);
      if (!text.trim()) { setStatus('error'); setError('No speech detected.'); return; }
      setStatus('analyzing');
      const input = segs && segs.length ? segs.map((s) => `${speakerLabel(s.speaker)}: ${s.text}`).join('\n') : text;
      const ins = await apiClient.core.post('/api/meetings/insights', { transcript: input, notes }, { timeout: 120000 });
      setInsights(ins.data?.insights || null); setStatus('done');
    } catch (e) { setStatus('error'); setError(e.response?.data?.error || e.message || 'Processing failed.'); }
  }, [notes, multiSpeaker]);

  const start = useCallback(async () => {
    setError(null); setTranscript(''); setInsights(null); setSaved(false); setElapsed(0); setSpeakerSegments(null);
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
      const mem = await apiClient.core.post('/api/memories', { title, content, tags: ['meeting', 'ai-meeting-notes', ...(speakerSegments?.length ? ['multi-speaker'] : []), ...(insights?.topics || []).slice(0, 5)], memory_type: 'event' });
      // Persist the structured row in the org-level meetings table.
      const speakers = speakerSegments?.length ? new Set(speakerSegments.map((s) => s.speaker)).size : null;
      await apiClient.core.post('/api/meetings', {
        title, transcript, language, multi_speaker: !!speakerSegments?.length, speaker_count: speakers,
        segments: speakerSegments || null, source_memory_id: mem?.data?.id || mem?.data?.memory_id || null,
        insights: insights || {},
      }).catch(() => { /* memory already saved; table mirror best-effort */ });
      setSaved(true); loadMeetings();
    } catch (e) { setError('Save failed: ' + (e.response?.data?.error || e.message)); }
  }, [transcript, insights, speakerSegments, language, loadMeetings]);

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
      <style>{`@keyframes mn-eq{0%,100%{transform:scaleY(.18)}50%{transform:scaleY(1)}}@keyframes mn-ring{0%{transform:scale(.78);opacity:.55}100%{transform:scale(1.12);opacity:0}}`}</style>

      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3] font-mono uppercase tracking-wider mb-1"><Sparkles size={12} /> HIVEMIND</div>
          <h1 className="text-[24px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('meetingnotes.title', 'AI Meeting Notes')}</h1>
          <p className="text-[12px] text-[#737373] mt-1">{t('meetingnotes.subtitle', 'Record, transcribe and extract insights — saved straight into your memory.')}</p>
        </div>
        <ClockChip />
      </div>

      {/* stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <StatCard icon={History} value={stats.total} label={t('meetingnotes.stat.total', 'Meetings')} color="#117dff" />
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

      {/* ───────── RECORD TAB ───────── */}
      {tab === 'record' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#e3e0db] rounded-[10px] p-5">
            <div className="flex items-center gap-2 min-w-0 mb-2">
              <FileText size={16} className="text-[#117dff] flex-shrink-0" />
              <span className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] truncate">{insights?.title || t('meetingnotes.newMeeting', 'New meeting')}</span>
            </div>

            {/* hero record dial (hover-reactive; pulse rings when live) */}
            <RecordDial recording={recording} busy={busy} elapsed={elapsed} onStart={start} onStop={stop} />

            <button onClick={() => setMultiSpeaker((v) => !v)} disabled={recording || busy}
              className="flex items-center gap-2 mb-4 text-[12px] text-[#525252] disabled:opacity-50" title={t('meetingnotes.multiSpeakerHint', 'Label who said what (runs speaker diarization)')}>
              <Users size={14} style={{ color: multiSpeaker ? '#117dff' : '#a3a3a3' }} />
              <span>{t('meetingnotes.multiSpeaker', 'Multi-speaker recognition')}</span>
              <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${multiSpeaker ? 'bg-[#117dff]' : 'bg-[#e3e0db]'}`}>
                <span className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform" style={{ transform: multiSpeaker ? 'translateX(18px)' : 'translateX(2px)' }} />
              </span>
            </button>

            {/* live state row */}
            {(recording || busy) && (
              <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-[6px] bg-[#faf9f4] border border-[#e3e0db]">
                {recording
                  ? <span className="flex items-center gap-1.5 text-[12px] text-[#ef4444] font-medium"><span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" /> REC {fmtTimer(elapsed)}</span>
                  : <span className="flex items-center gap-1.5 text-[12px] text-[#117dff]"><AudioLines size={14} /> {status === 'transcribing' ? t('meetingnotes.transcribing', 'Transcribing…') : t('meetingnotes.analyzing', 'Analyzing…')}</span>}
                <div className="flex-1"><Waveform active={recording} /></div>
              </div>
            )}

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
              {insights.topics?.length > 0 && (<div className="flex flex-wrap gap-1.5">{insights.topics.map((tp, i) => (<span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] text-blue-700">#{tp}</span>))}</div>)}
              {transcript && (
                <Panel icon={speakerSegments?.length ? Users : ScrollText} title={t('meetingnotes.transcript', 'Transcript')} accent="#a3a3a3">
                  {speakerSegments?.length ? (<div className="space-y-2 max-h-[280px] overflow-y-auto">{speakerSegments.map((s, i) => (<div key={i} className="text-[12px] leading-relaxed"><span className="font-semibold font-['Space_Grotesk']" style={{ color: SPEAKER_COLORS[s.speaker] || '#117dff' }}>{speakerLabel(s.speaker)}:</span> <span className="text-[#525252]">{s.text}</span></div>))}</div>)
                    : (<p className="text-[12px] text-[#525252] leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto">{transcript}</p>)}
                </Panel>
              )}
              <button onClick={save} disabled={saved} className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#0a0a0a] text-white text-[12px] font-medium hover:bg-[#262626] disabled:opacity-50">
                {saved ? <CheckCircle2 size={14} /> : <Save size={14} />} {saved ? t('meetingnotes.saved', 'Saved to HIVEMIND') : t('meetingnotes.save', 'Save to HIVEMIND')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ───────── PAST MEETINGS TAB ───────── */}
      {tab === 'past' && !selected && (
        meetings.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {meetings.map((m) => (
              <button key={m.id} onClick={() => { setSelected(m); setDetailTab('summary'); }}
                className="text-left bg-white border border-[#e3e0db] rounded-[10px] p-4 hover:border-[#0a0a0a] hover:shadow-sm transition-all group">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-[8px] bg-[#117dff]/10 flex items-center justify-center"><FileText size={15} className="text-[#117dff]" /></div>
                  <ArrowUpRight size={13} className="text-[#a3a3a3] group-hover:text-[#0a0a0a]" />
                </div>
                <div className="text-[13px] font-semibold text-[#0a0a0a] mt-2.5 line-clamp-1 font-['Space_Grotesk']">{m.title || 'Meeting'}</div>
                <div className="text-[10px] text-[#a3a3a3] font-mono mt-0.5">{fmtDate(m.created_at)}</div>
                <p className="text-[11px] text-[#737373] mt-2 leading-snug line-clamp-2">{m.summary || '—'}</p>
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {Array.isArray(m.action_items) && m.action_items.length > 0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[9px] text-blue-700"><ListChecks size={9} /> {m.action_items.length}</span>}
                  {m.multi_speaker && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] text-emerald-700"><Users size={9} /> {m.speaker_count || 'multi'}</span>}
                </div>
              </button>
            ))}
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
          <h2 className="text-[20px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] leading-tight">{selected.title || 'Meeting'}
            <span className="text-[13px] font-normal text-[#a3a3a3] ml-2">@ {fmtDate(selected.created_at)}{selected.language ? ` · ${selected.language}` : ''}</span></h2>
          <nav className="border-b border-[#e3e0db] flex items-center gap-0.5 mt-4 mb-4">
            {[['summary', 'Summary', ListChecks], ['notes', 'Notes', AlignLeft], ['transcript', 'Transcript', ScrollText]].map(([key, label, Icon]) => (
              <button key={key} onClick={() => setDetailTab(key)} className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${detailTab === key ? 'border-[#0a0a0a] text-[#0a0a0a]' : 'border-transparent text-[#737373] hover:text-[#0a0a0a]'}`}><Icon size={14} /> {label}</button>
            ))}
          </nav>
          {detailTab === 'summary' && (
            <div className="space-y-5 text-[13px] text-[#525252] leading-relaxed">
              {Array.isArray(selected.action_items) && selected.action_items.length > 0 && (<div><h3 className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2">Action Items</h3><ul className="space-y-2">{selected.action_items.map((a, i) => (<li key={i} className="flex items-start gap-2.5 text-[#0a0a0a]"><span className="mt-0.5 w-4 h-4 rounded-[5px] border border-[#cbd5e1] flex-shrink-0" /><span>{a.task || a}{a.owner && <span className="text-[#a3a3a3]"> · @{a.owner}</span>}{a.due && <span className="text-[#a3a3a3]"> · {a.due}</span>}</span></li>))}</ul></div>)}
              <div><h3 className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2">Meeting Overview</h3><p className="whitespace-pre-wrap">{selected.summary || '—'}</p></div>
              {Array.isArray(selected.decisions) && selected.decisions.length > 0 && (<div><h3 className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2">Decisions</h3><ul className="space-y-1.5">{selected.decisions.map((d, i) => <li key={i} className="flex gap-2"><span className="text-[#f59e0b]">·</span>{d}</li>)}</ul></div>)}
              {Array.isArray(selected.topics) && selected.topics.length > 0 && (<div className="flex flex-wrap gap-1.5">{selected.topics.map((tp, i) => <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] text-blue-700">#{tp}</span>)}</div>)}
            </div>
          )}
          {detailTab === 'notes' && (<p className="text-[13px] text-[#525252] leading-relaxed whitespace-pre-wrap">{selected.summary || '—'}</p>)}
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
