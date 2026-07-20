import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock3,
  FolderKanban,
  History,
  Mic,
  Monitor,
  NotebookPen,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../../shared/api-client';
import { useQuickRecorder } from '../../shared/QuickRecorderProvider';
import MobileShell from '../MobileShell';

function when(iso) {
  if (!iso) return 'Recent';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function compactSummary(meeting) {
  return meeting.summary || meeting.notes || meeting.transcript?.slice?.(0, 120) || 'Transcript, decisions, and action items are saved here.';
}

export default function MobileMeetingNotes() {
  const navigate = useNavigate();
  const qrec = useQuickRecorder();
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.core.get('/api/meetings?limit=50');
        if (!cancelled) setMeetings((data?.meetings || []).filter(Boolean));
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err.message || 'Could not load meeting notes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openMeeting = async (meeting) => {
    setSelected(meeting);
    try {
      const { data } = await apiClient.core.get(`/api/meetings/${meeting.id}`);
      if (data?.meeting) setSelected({ ...meeting, ...data.meeting });
    } catch {}
  };

  const historyPreview = useMemo(() => meetings.slice(0, 3), [meetings]);
  const primaryLabel = qrec.active ? 'Open recorder' : 'Open meeting config';

  const historyAction = (
    <button
      onClick={() => setHistoryOpen(true)}
      className="relative h-10 w-10 rounded-full border border-[#e3e0db] bg-white grid place-items-center text-[#525252]"
      aria-label="Open past meetings"
    >
      <History size={16} />
      {meetings.length > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#117dff] text-white text-[9px] font-bold grid place-items-center">{Math.min(meetings.length, 99)}</span>}
    </button>
  );
  return (
    <MobileShell title="AI Meeting Notes" rightAction={historyAction}>
      <div className="px-5 pt-1 pb-10">
        {/* Editorial head — serif, unboxed (matches Memories) */}
        <h1 className="text-[34px] leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Meeting Notes</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#737373] max-w-[30rem]">
          Record a meeting — participants, save scope and context — and the transcript,
          decisions and action items land in your memory.
        </p>

        {/* Primary actions — one clean row, no hero card */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => qrec.openConfig()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1a1a17] px-5 text-[13.5px] font-semibold text-white active:scale-[0.98]"
          >
            <Mic size={15} /> {primaryLabel}
          </button>
          <button
            onClick={() => navigate('/hivemind/app/meeting-notes')}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#dcd8d0] px-4 text-[12.5px] font-medium text-[#525252]"
          >
            <Monitor size={14} className="mr-1.5" /> Desktop
          </button>
        </div>

        {/* What the recorder captures — plain icon lines, hairline separated */}
        <div className="mt-6">
          {[
            { title: 'Participants', copy: 'Optional names for clearer labels and speaker context.', Icon: Users },
            { title: 'Save target', copy: 'Personal, project, team, or org — same recorder flow.', Icon: FolderKanban },
            { title: 'Meeting context', copy: 'Topics, companies and key terms sharpen the insights.', Icon: NotebookPen },
          ].map(({ title, copy, Icon }, i) => (
            <div key={title} className={`flex items-start gap-3 py-3 ${i ? 'border-t border-[#eceae3]' : ''}`}>
              <Icon size={16} className="mt-0.5 flex-shrink-0 text-[#117dff]" />
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold leading-tight">{title}</div>
                <div className="mt-0.5 text-[12px] leading-snug text-[#8b857d]">{copy}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Past meetings — flowing list, hairline dividers, no boxes */}
        <div className="mt-7 flex items-baseline justify-between">
          <h2 className="text-[20px]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Past meetings</h2>
          {meetings.length > 3 && (
            <button onClick={() => setHistoryOpen(true)} className="text-[12px] font-medium text-[#117dff]">
              All {meetings.length}
            </button>
          )}
        </div>
        <div className="mt-1">
          {loading && <div className="py-6 text-[12.5px] text-[#8b857d]">Loading meetings…</div>}
          {error && <div className="py-3 text-[12.5px] text-red-700">{error}</div>}
          {!loading && !error && historyPreview.length === 0 && (
            <div className="py-8 text-center text-[12.5px] text-[#8b857d]">No meetings yet. Start one above.</div>
          )}
          {historyPreview.map((meeting, index) => (
            <button
              key={meeting.id || index}
              onClick={() => openMeeting(meeting)}
              className={`w-full py-3.5 text-left active:bg-[#f1eee7]/60 ${index ? 'border-t border-[#eceae3]' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-[14px] font-semibold leading-snug line-clamp-1 flex-1 min-w-0">{meeting.title || meeting.name || 'Untitled meeting'}</div>
                <div className="text-[10.5px] font-mono uppercase tracking-wide text-[#a3a3a3] flex-shrink-0">{when(meeting.created_at || meeting.started_at)}</div>
              </div>
              <div className="mt-1 text-[12px] leading-snug text-[#8b857d] line-clamp-2">{compactSummary(meeting)}</div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {historyOpen && (
          <motion.div className="fixed inset-0 z-50 bg-[#0a0a0a]/25 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryOpen(false)}>
            <motion.section
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[78vh] overflow-y-auto bg-white rounded-t-[30px] border-t border-[#ece9e2] p-4 shadow-[0_-24px_80px_rgba(20,18,14,0.16)]"
            >
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#dfdad1]" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[18px] font-bold leading-tight font-['Space_Grotesk']">Past meetings</div>
                  <div className="mt-1 text-[11px] text-[#a3a3a3]">Compact history stack. Open any row for the transcript and summary.</div>
                </div>
                <button onClick={() => setHistoryOpen(false)} className="w-9 h-9 rounded-full grid place-items-center bg-[#f3f1ec]"><X size={16} /></button>
              </div>
              <div className="mt-3">
                {meetings.map((meeting, index) => (
                  <button
                    key={meeting.id || index}
                    onClick={() => {
                      setHistoryOpen(false);
                      openMeeting(meeting);
                    }}
                    className={`w-full py-3 text-left active:bg-[#f1eee7]/60 ${index ? 'border-t border-[#eceae3]' : ''}`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13.5px] font-semibold leading-snug line-clamp-1 flex-1 min-w-0">{meeting.title || meeting.name || 'Untitled meeting'}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wide text-[#a3a3a3] flex-shrink-0">{when(meeting.created_at || meeting.started_at)}</span>
                    </div>
                    <div className="mt-1 text-[11.5px] leading-snug text-[#8b857d] line-clamp-2">{compactSummary(meeting)}</div>
                  </button>
                ))}
                {!loading && !meetings.length && <div className="rounded-[18px] border border-dashed border-[#ddd7cc] bg-[#fcfbf8] px-4 py-5 text-center text-[12px] text-[#8b857d]">No saved meetings yet.</div>}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 bg-[#0a0a0a]/25 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.section
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[82vh] overflow-y-auto bg-white rounded-t-[28px] border-t border-[#ece9e2] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[18px] font-bold leading-tight">{selected.title || selected.name || 'Untitled meeting'}</div>
                  <div className="mt-1 text-[11px] text-[#a3a3a3]">{when(selected.created_at || selected.started_at)}</div>
                </div>
                <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-full grid place-items-center bg-[#f3f1ec]"><X size={16} /></button>
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#737373] flex items-center gap-1.5"><NotebookPen size={13} /> Summary</div>
              <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-wrap">{selected.summary || selected.insights?.summary || selected.notes || 'No generated summary yet.'}</p>
              {selected.transcript && <p className="mt-4 text-[12.5px] leading-relaxed whitespace-pre-wrap text-[#525252]">{selected.transcript}</p>}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileShell>
  );
}
