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
      <div className="px-3 py-4 pb-6">
        <section className="relative overflow-hidden rounded-[28px] border border-[#e3e0db] bg-white shadow-[0_18px_50px_rgba(26,24,20,0.06)]">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(17,125,255,0.16),_transparent_58%),radial-gradient(circle_at_top_right,_rgba(17,125,255,0.08),_transparent_48%)] pointer-events-none" />
          <div className="relative p-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e6ff] bg-[#f4f8ff] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-[#117dff]">
              <Sparkles size={11} /> meeting engine
            </div>
            <h1 className="mt-4 text-[28px] leading-[0.98] font-bold tracking-tight font-['Space_Grotesk']">
              Open one clean
              <br />
              meeting config.
            </h1>
            <p className="mt-3 max-w-[28rem] text-[13px] leading-relaxed text-[#666159]">
              The same recorder pipeline from the top-right toggle lives here too: participants, save scope, context, record, transcript, insights.
            </p>

            <div className="mt-5 grid gap-2">
              {[
                { title: 'Participants', copy: 'Optional names for clearer labels and speaker context.', Icon: Users },
                { title: 'Save target', copy: 'Personal, project, team, or org, using the same recorder flow.', Icon: FolderKanban },
                { title: 'Meeting context', copy: 'Topics, companies, and key terms to sharpen insights.', Icon: NotebookPen },
              ].map(({ title, copy, Icon }) => (
                <div key={title} className="flex items-start gap-3 rounded-[18px] border border-[#ece9e2] bg-[#fcfbf8] px-3 py-3">
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[14px] bg-white border border-[#e3e0db] text-[#117dff]">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold leading-tight">{title}</span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-[#8b857d]">{copy}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => qrec.openConfig()}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] bg-[#117dff] px-4 text-[13px] font-bold text-white shadow-[0_14px_30px_rgba(17,125,255,0.24)]"
              >
                <Mic size={15} /> {primaryLabel}
              </button>
              <button
                onClick={() => navigate('/hivemind/app/meeting-notes')}
                className="inline-flex h-11 items-center justify-center rounded-[16px] border border-[#e3e0db] bg-white px-4 text-[12px] font-semibold text-[#525252]"
              >
                Desktop
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[24px] border border-[#e3e0db] bg-white p-4 shadow-[0_12px_34px_rgba(26,24,20,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-mono uppercase tracking-[0.16em] text-[#117dff]">Past meetings</div>
              <p className="mt-1 text-[12px] leading-snug text-[#7b766e]">Collapsed by default. Open the stack only when you need it.</p>
            </div>
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e3e0db] bg-[#faf9f4] px-3 text-[11px] font-semibold text-[#525252]"
            >
              <History size={13} /> Open stack
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {historyPreview.length === 0 && !loading && !error && (
              <div className="rounded-[18px] border border-dashed border-[#ddd7cc] bg-[#fcfbf8] px-4 py-5 text-center text-[12px] text-[#8b857d]">
                No meetings yet. Start one from the shared recorder config.
              </div>
            )}
            {historyPreview.map((meeting, index) => (
              <button
                key={meeting.id || index}
                onClick={() => openMeeting(meeting)}
                className="w-full rounded-[18px] border border-[#ece9e2] bg-[#fcfbf8] px-3 py-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold leading-snug line-clamp-1">{meeting.title || meeting.name || 'Untitled meeting'}</div>
                    <div className="mt-1 text-[11px] leading-snug text-[#8b857d] line-clamp-2">{compactSummary(meeting)}</div>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-[13px] border border-[#e3e0db] bg-white text-[#117dff]">
                    <Monitor size={14} />
                  </div>
                </div>
              </button>
            ))}
          </div>
          {loading && <div className="pt-3 text-[12px] text-[#8b857d]">Loading meetings...</div>}
          {error && <div className="mt-3 rounded-[16px] border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>}
        </section>
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
              <div className="mt-4 space-y-2.5">
                {meetings.map((meeting, index) => (
                  <button
                    key={meeting.id || index}
                    onClick={() => {
                      setHistoryOpen(false);
                      openMeeting(meeting);
                    }}
                    className="w-full rounded-[20px] border border-[#e3e0db] bg-[#fcfbf8] px-3 py-3 text-left shadow-[0_8px_22px_rgba(26,24,20,0.035)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-[#e3e0db] bg-white text-[#117dff]">
                            <NotebookPen size={13} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-bold leading-snug line-clamp-1">{meeting.title || meeting.name || 'Untitled meeting'}</span>
                            <span className="mt-0.5 block text-[10px] font-mono uppercase tracking-[0.12em] text-[#a3a3a3]">{when(meeting.created_at || meeting.started_at)}</span>
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] leading-snug text-[#8b857d] line-clamp-2">{compactSummary(meeting)}</div>
                      </div>
                      <div className="mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-full border border-[#e6e1d8] bg-white px-2 py-1 text-[9px] font-mono uppercase text-[#8b857d]">
                        <Clock3 size={10} /> open
                      </div>
                    </div>
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
