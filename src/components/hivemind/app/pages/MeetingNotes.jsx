/**
 * AI Meeting Notes — record a meeting, transcribe via Groq Whisper, extract insights.
 *
 * Flow: Start → MediaRecorder captures whole meeting (mic) → Stop → upload blob to
 * core /api/meetings/transcribe (Groq Whisper, full transcript) → /api/meetings/insights
 * (LLM → summary, action items, decisions, topics) → Save to HIVEMIND.
 *
 * Note: v1 captures the microphone. To also capture other participants (remote
 * meeting audio), tab/system audio capture is a follow-up (getDisplayMedia).
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mic, Square, Loader2, FileText, ListChecks, Lightbulb, CheckCircle2,
  HelpCircle, Tag, Save, AlertTriangle, Sparkles, Clock,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useTranslation } from 'react-i18next';

function fmtTime(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
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

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }, []);
  useEffect(() => cleanup, [cleanup]);

  const process = useCallback(async (blob) => {
    setError(null);
    try {
      setStatus('transcribing');
      const tr = await apiClient.core.post('/api/meetings/transcribe', blob, {
        headers: { 'Content-Type': blob.type || 'audio/webm' },
        timeout: 300000,
      });
      const text = tr.data?.transcript || '';
      setTranscript(text);
      if (!text.trim()) { setStatus('error'); setError('No speech detected.'); return; }

      setStatus('analyzing');
      const ins = await apiClient.core.post('/api/meetings/insights', { transcript: text, notes }, { timeout: 120000 });
      setInsights(ins.data?.insights || null);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError(e.response?.data?.error || e.message || 'Processing failed.');
    }
  }, [notes]);

  const start = useCallback(async () => {
    setError(null); setTranscript(''); setInsights(null); setSaved(false); setElapsed(0);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError('Microphone permission denied.'); return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
    recRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      cleanup();
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      process(blob);
    };
    rec.start(1000); // gather in 1s slices
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
      const content = `# ${title}\n\n## Summary\n${summary}\n\n## Action Items\n${(insights?.action_items || []).map((a) => `- ${a.task}${a.owner ? ` (@${a.owner})` : ''}`).join('\n')}\n\n## Decisions\n${(insights?.decisions || []).map((d) => `- ${d}`).join('\n')}\n\n## Transcript\n${transcript}`;
      await apiClient.core.post('/api/memories', {
        title, content,
        tags: ['meeting', 'ai-meeting-notes', ...(insights?.topics || []).slice(0, 5)],
        memory_type: 'event',
      });
      setSaved(true);
    } catch (e) {
      setError('Save failed: ' + (e.response?.data?.error || e.message));
    }
  }, [transcript, insights]);

  const busy = status === 'transcribing' || status === 'analyzing';
  const now = new Date().toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#117dff] to-[#6366f1] flex items-center justify-center shadow-lg">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk']">{t('meetingnotes.title', 'AI Meeting Notes')}</h1>
          <p className="text-[#a3a3a3] text-xs">{t('meetingnotes.subtitle', 'Record · transcribe · extract insights')}</p>
        </div>
      </div>

      {/* Recorder card */}
      <div className="bg-white border border-[#e3e0db] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#117dff]" />
            <span className="font-['Space_Grotesk'] font-semibold text-[#0a0a0a]">{t('meetingnotes.meeting', 'Meeting')} · {now}</span>
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

        {status === 'idle' && (
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

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('meetingnotes.notesPlaceholder', 'Add notes here anytime…')}
          className="mt-4 w-full min-h-[80px] p-3 text-[13px] bg-[#faf9f4] border border-[#e3e0db] rounded-xl focus:outline-none focus:border-[#117dff]/40 resize-y"
        />
      </div>

      {error && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertTriangle size={12} className="inline mr-1" /> {error}
        </div>
      )}

      {/* Insights */}
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
                <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-[#f3f1ec] text-[#525252]">
                  <Tag size={10} /> {tp}
                </span>
              ))}
            </div>
          )}
          <button onClick={save} disabled={saved}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a0a0a] text-white text-[13px] font-semibold hover:bg-[#262626] disabled:opacity-50">
            {saved ? <CheckCircle2 size={14} /> : <Save size={14} />} {saved ? t('meetingnotes.saved', 'Saved to HIVEMIND') : t('meetingnotes.save', 'Save to HIVEMIND')}
          </button>
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <InsightBlock icon={FileText} title={t('meetingnotes.transcript', 'Full Transcript')} accent="#a3a3a3">
          <p className="text-[12px] text-[#525252] leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">{transcript}</p>
        </InsightBlock>
      )}
    </motion.div>
  );
}
