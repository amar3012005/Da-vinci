import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, ListChecks, Mic, NotebookPen, Sparkles, Users, X } from 'lucide-react';
import apiClient from '../shared/api-client';

function when(iso) {
  if (!iso) return 'Recent';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MobileMeetingNotes() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState(null);
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

  const open = async (meeting) => {
    setSelected(meeting);
    try {
      const { data } = await apiClient.core.get(`/api/meetings/${meeting.id}`);
      if (data?.meeting) setSelected({ ...meeting, ...data.meeting });
    } catch {}
  };

  return (
    <div className="fixed inset-0 bg-[#faf9f4] text-[#0a0a0a] overflow-hidden flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <header className="h-14 px-3 bg-white/90 backdrop-blur-xl border-b border-[#ece9e2] flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/hivemind/m/chat')} className="w-10 h-10 rounded-full grid place-items-center active:bg-[#ece9e2]" aria-label="Back to chat">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight">AI Meeting Notes</div>
          <div className="text-[10.5px] text-[#737373]">{meetings.length} saved sessions</div>
        </div>
        <button onClick={() => navigate('/hivemind/app/meeting-notes')} className="h-9 px-3 rounded-full bg-[#117dff] text-white text-[12px] font-semibold flex items-center gap-1.5">
          <Mic size={14} /> Record
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-3 pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        <section className="mb-3 rounded-[22px] bg-[#0a0a0a] text-white p-4 overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#117dff]/30 blur-xl" />
          <div className="relative flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/60"><Sparkles size={13} /> meeting intelligence</div>
          <div className="relative mt-2 text-[20px] font-bold leading-tight">Capture, summarize, and save decisions into memory.</div>
        </section>
        {loading && <div className="py-12 text-center text-[13px] text-[#737373]">Loading meetings...</div>}
        {error && <div className="p-3 rounded-[16px] bg-red-50 border border-red-100 text-[13px] text-red-700">{error}</div>}
        {!loading && !error && meetings.length === 0 && <div className="py-12 text-center text-[13px] text-[#737373]">No meeting notes yet. Tap Record to create one.</div>}
        <div className="space-y-2">
          {meetings.map((meeting, index) => (
            <motion.button
              key={meeting.id || index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.018, 0.2) }}
              onClick={() => open(meeting)}
              className="w-full text-left bg-white border border-[#ece9e2] rounded-[18px] px-3 py-3 active:scale-[0.99]"
            >
              <div className="flex gap-3">
                <span className="w-10 h-10 rounded-[14px] bg-amber-500/10 text-amber-600 grid place-items-center flex-shrink-0"><NotebookPen size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-snug truncate">{meeting.title || meeting.name || 'Untitled meeting'}</span>
                  <span className="mt-1 flex items-center gap-3 text-[10.5px] text-[#a3a3a3]">
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {when(meeting.created_at || meeting.started_at)}</span>
                    <span className="inline-flex items-center gap-1"><Users size={11} /> {(meeting.participants || []).length || meeting.participant_count || 1}</span>
                  </span>
                  <span className="block mt-1.5 text-[12px] text-[#737373] line-clamp-2">{meeting.summary || meeting.notes || meeting.transcript?.slice?.(0, 130) || 'Tap to inspect transcript, decisions, and action items.'}</span>
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 bg-[#0a0a0a]/25 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.section initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 34 }} onClick={(e) => e.stopPropagation()} className="w-full max-h-[82vh] overflow-y-auto bg-white rounded-t-[28px] border-t border-[#ece9e2] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[18px] font-bold leading-tight">{selected.title || selected.name || 'Untitled meeting'}</div>
                  <div className="mt-1 text-[11px] text-[#a3a3a3]">{when(selected.created_at || selected.started_at)}</div>
                </div>
                <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-full grid place-items-center bg-[#f3f1ec]"><X size={16} /></button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[16px] bg-[#faf9f4] border border-[#ece9e2] p-3"><div className="text-[10px] text-[#737373]">Action items</div><div className="text-[18px] font-bold">{(selected.action_items || selected.actions || []).length || 0}</div></div>
                <div className="rounded-[16px] bg-[#faf9f4] border border-[#ece9e2] p-3"><div className="text-[10px] text-[#737373]">Decisions</div><div className="text-[18px] font-bold">{(selected.decisions || selected.insights?.decisions || []).length || 0}</div></div>
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#737373] flex items-center gap-1.5"><ListChecks size={13} /> Summary</div>
              <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-wrap">{selected.summary || selected.insights?.summary || selected.notes || 'No generated summary yet.'}</p>
              {selected.transcript && <p className="mt-4 text-[12.5px] leading-relaxed whitespace-pre-wrap text-[#525252]">{selected.transcript}</p>}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
