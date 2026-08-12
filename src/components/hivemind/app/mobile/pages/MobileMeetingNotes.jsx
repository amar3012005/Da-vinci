// Mobile AI Meeting Notes — same structure as desktop MeetingNotes.jsx
// (stat row, Record/Past meetings/Obligations tabs, record panel) instead
// of the old editorial-hero layout, minus desktop's outer BRAIN/OS/VOICE
// app nav (MobileShell's own hamburger replaces it) and minus the
// "Meeting flow" 4-step explainer panel. Stat cards are shrunk to fit a
// single row of 5 instead of desktop's 2-per-row-on-mobile grid.
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  HelpCircle,
  History,
  Lightbulb,
  ListChecks,
  Mic,
  NotebookPen,
  Quote,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../../shared/api-client';
import { useQuickRecorder } from '../../shared/QuickRecorderProvider';
import MobileShell from '../MobileShell';
import MeetingIntelligencePanel from '../../components/MeetingIntelligencePanel';
import MeetingNotesIcon from '../../shared/MeetingNotesIcon';

function when(iso) {
  if (!iso) return 'Recent';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function compactSummary(meeting) {
  return meeting.summary || meeting.notes || meeting.transcript?.slice?.(0, 120) || 'Transcript, decisions, and action items are saved here.';
}

// Same StatCard as desktop, shrunk so all five fit one row on a phone
// screen instead of desktop's grid-cols-2-on-mobile.
function StatCard({ icon: Icon, value, label, color = '#0a0a0a' }) {
  return (
    <div className="bg-white border border-[#e3e0db] rounded-[9px] px-1.5 py-2 flex flex-col items-center text-center min-w-0">
      <Icon size={12} style={{ color }} />
      <div className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] tabular-nums leading-none mt-1">{value}</div>
      <div className="text-[6.5px] leading-tight text-[#a3a3a3] uppercase tracking-tight mt-1 line-clamp-2">{label}</div>
    </div>
  );
}

function Section({ icon: Icon, title, accent = '#117dff', children }) {
  return (
    <div className="mt-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#737373] flex items-center gap-1.5">
        <Icon size={13} style={{ color: accent }} /> {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// Same structured breakdown as desktop's Summary sub-tab — action items,
// decisions, key points, questions, quotes, risks, next steps, topics —
// reading the exact fields openMeeting() already fetches from
// /api/meetings/:id. Intelligence panel is the shared component reused as-is.
function MeetingDetailBody({ meeting: m }) {
  const insx = m.insights || {};
  const actionItems = Array.isArray(m.action_items) && m.action_items.length ? m.action_items : (insx.action_items || []);
  const decisions = Array.isArray(m.decisions) && m.decisions.length ? m.decisions : (insx.decisions || []);
  const keyPoints = Array.isArray(m.key_points) && m.key_points.length ? m.key_points : (insx.key_points || []);
  const questions = insx.questions || [];
  const quotes = insx.quotes || [];
  const risks = Array.isArray(insx.risks) ? insx.risks : [];
  const nextSteps = Array.isArray(insx.next_steps) ? insx.next_steps : [];
  const topics = insx.topics || [];
  const summary = m.summary || insx.summary || m.notes;

  return (
    <div className="pb-2">
      {(m.intelligence || m.intelligence_status) && (
        <div className="mt-4">
          <MeetingIntelligencePanel
            intelligence={m.intelligence}
            status={m.intelligence_status}
            onOpenMemory={(id) => id && window.open(`/hivemind/app/memories?focus=${id}`, '_self')}
          />
        </div>
      )}

      <Section icon={NotebookPen} title="Summary">
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{summary || 'No generated summary yet.'}</p>
      </Section>

      {actionItems.length > 0 && (
        <Section icon={Sparkles} title="Action Items">
          <ul className="space-y-2">
            {actionItems.map((a, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#0a0a0a]">
                <span className="mt-0.5 w-4 h-4 rounded-[5px] border border-[#cbd5e1] flex-shrink-0" />
                <span>{a.task || a}{a.owner && <span className="text-[#a3a3a3]"> · @{a.owner}</span>}{a.due && <span className="text-[#a3a3a3]"> · {a.due}</span>}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {decisions.length > 0 && (
        <Section icon={Lightbulb} title="Decisions" accent="#f59e0b">
          <ul className="space-y-1.5 text-[13px] text-[#525252]">
            {decisions.map((d, i) => <li key={i} className="flex gap-2"><span className="text-[#f59e0b]">·</span>{d}</li>)}
          </ul>
        </Section>
      )}

      {keyPoints.length > 0 && (
        <Section icon={Sparkles} title="Key Points">
          <ul className="space-y-1.5 text-[13px] text-[#525252]">
            {keyPoints.map((k, i) => <li key={i} className="flex gap-2"><span className="text-[#117dff]">·</span>{k}</li>)}
          </ul>
        </Section>
      )}

      {questions.length > 0 && (
        <Section icon={HelpCircle} title="Open Questions" accent="#0891b2">
          <ul className="space-y-1.5 text-[13px] text-[#525252]">
            {questions.map((q, i) => <li key={i} className="flex gap-2"><span className="text-[#0891b2]">?</span>{q}</li>)}
          </ul>
        </Section>
      )}

      {quotes.length > 0 && (
        <Section icon={Quote} title="Notable Quotes">
          <ul className="space-y-2 text-[13px] text-[#525252]">
            {quotes.map((q, i) => (
              <li key={i} className="border-l-2 border-[#117dff]/40 pl-3 italic">
                "{q.quote || q}"{q.speaker && <span className="not-italic text-[#a3a3a3]"> — {q.speaker}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {risks.length > 0 && (
        <Section icon={AlertTriangle} title="Risks & Red Flags" accent="#ef4444">
          <ul className="space-y-1.5 text-[13px] text-[#525252]">
            {risks.map((r, i) => <li key={i} className="flex gap-2"><AlertTriangle size={13} className="text-[#ef4444] mt-0.5 flex-shrink-0" />{r}</li>)}
          </ul>
        </Section>
      )}

      {nextSteps.length > 0 && (
        <Section icon={ArrowUpRight} title="Next Steps" accent="#10b981">
          <ul className="space-y-1.5 text-[13px] text-[#525252]">
            {nextSteps.map((n, i) => <li key={i} className="flex gap-2"><span className="text-[#10b981]">→</span>{n}</li>)}
          </ul>
        </Section>
      )}

      {topics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {topics.map((tp, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] text-blue-700">#{tp}</span>
          ))}
        </div>
      )}

      {Array.isArray(m.segments) && m.segments.length > 0 ? (
        <Section icon={Users} title="Transcript">
          <div className="space-y-2 max-h-[380px] overflow-y-auto">
            {m.segments.map((s, i) => (
              <div key={i} className="text-[12.5px] leading-relaxed">
                <span className="font-semibold text-[#117dff]">{s.speaker || 'Speaker'}:</span> <span className="text-[#525252]">{s.text}</span>
              </div>
            ))}
          </div>
        </Section>
      ) : m.transcript ? (
        <Section icon={Users} title="Transcript">
          <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-[#525252]">{m.transcript}</p>
        </Section>
      ) : null}
    </div>
  );
}

export default function MobileMeetingNotes() {
  const qrec = useQuickRecorder();
  const [tab, setTab] = useState('record');
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [obligations, setObligations] = useState({ obligations: [], counts: {} });

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

  useEffect(() => {
    if (tab !== 'obligations') return;
    apiClient.core.get('/api/meetings/obligations')
      .then(({ data }) => setObligations(data || { obligations: [], counts: {} }))
      .catch(() => {});
  }, [tab]);

  const openMeeting = async (meeting) => {
    setSelected(meeting);
    try {
      const { data } = await apiClient.core.get(`/api/meetings/${meeting.id}`);
      if (data?.meeting) setSelected({ ...meeting, ...data.meeting });
    } catch {}
  };

  const stats = useMemo(() => {
    const now = new Date(); const weekAgo = new Date(now.getTime() - 7 * 864e5);
    const thisWeek = meetings.filter((m) => new Date(m.created_at) >= weekAgo).length;
    const actions = meetings.reduce((s, m) => s + (Array.isArray(m.action_items) ? m.action_items.length : 0), 0);
    const multi = meetings.filter((m) => m.multi_speaker).length;
    const last = meetings[0] ? new Date(meetings[0].created_at) : null;
    return { total: meetings.length, thisWeek, actions, multi, last: last ? last.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—' };
  }, [meetings]);

  const primaryLabel = qrec.active ? 'Open current meeting' : 'Start meeting';

  return (
    <MobileShell title="AI Meeting Notes">
      <div className="px-4 pt-2 pb-10">
        <div className="flex items-center gap-1.5 text-[10px] text-[#a3a3a3] font-mono uppercase tracking-wider mb-1">
          <MeetingNotesIcon size={12} /> HIVEMIND
        </div>
        <h1 className="text-[21px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">AI Meeting Notes</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-[#737373]">Record, transcribe and extract insights — saved straight into your memory.</p>

        {/* stat row — all five in one row, shrunk to fit */}
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          <StatCard icon={MeetingNotesIcon} value={stats.total} label="Meetings" color="#117dff" />
          <StatCard icon={CalendarDays} value={stats.thisWeek} label="This week" color="#0A66C2" />
          <StatCard icon={ListChecks} value={stats.actions} label="Action items" color="#10b981" />
          <StatCard icon={Users} value={stats.multi} label="Multi-speaker" color="#f59e0b" />
          <StatCard icon={Clock} value={stats.last} label="Last meeting" color="#0a0a0a" />
        </div>

        {/* tabs */}
        <nav className="mt-4 border-b border-[#e3e0db] flex items-center gap-0.5">
          {[['record', 'Record', Mic], ['past', 'Past meetings', History], ['obligations', 'Obligations', CheckCircle2]].map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => { setTab(key); }}
              className={`flex items-center gap-1.5 px-2.5 py-2 text-[11.5px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === key ? 'border-[#0a0a0a] text-[#0a0a0a]' : 'border-transparent text-[#737373]'
              }`}
            >
              <Icon size={13} /> {label}{key === 'past' && meetings.length ? <span className="ml-0.5 text-[#a3a3a3]">{meetings.length}</span> : null}
            </button>
          ))}
        </nav>

        {tab === 'record' && (
          <section className="mt-4 bg-white border border-[#e3e0db] rounded-[10px] p-4">
            <div className="w-9 h-9 rounded-[8px] bg-blue-50 border border-blue-100 grid place-items-center">
              <Mic size={17} className="text-[#117dff]" />
            </div>
            <h2 className="mt-3 text-[16px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Capture the meeting, keep the decisions</h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#737373]">
              Add the people and context once. The recorder preserves transcript checkpoints, builds the report, and saves searchable meeting memories.
            </p>
            {qrec.status === 'interrupted' && (
              <div className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                An interrupted meeting is ready to resume. Open the recorder to continue or finish it.
              </div>
            )}
            <button
              onClick={() => qrec.openConfig()}
              disabled={!qrec.supported}
              className="mt-4 inline-flex items-center gap-2 h-11 px-4 rounded-full bg-[#117dff] text-white text-[13.5px] font-semibold active:scale-[0.98] disabled:opacity-40"
            >
              <Mic size={15} /> {primaryLabel}
            </button>
          </section>
        )}

        {tab === 'past' && (
          <div className="mt-4">
            {loading && <div className="py-6 text-[12.5px] text-[#8b857d]">Loading meetings…</div>}
            {error && <div className="py-3 text-[12.5px] text-red-700">{error}</div>}
            {!loading && !error && meetings.length === 0 && (
              <div className="bg-white border border-[#e3e0db] rounded-[10px] p-8 text-center">
                <History size={20} className="text-[#cbd5e1] mx-auto mb-2" />
                <p className="text-[12.5px] text-[#737373]">No saved meetings yet.</p>
                <button onClick={() => setTab('record')} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px]"><Mic size={13} /> Record your first meeting</button>
              </div>
            )}
            <div className="space-y-1.5">
              {meetings.map((meeting) => (
                <button
                  key={meeting.id}
                  onClick={() => openMeeting(meeting)}
                  className="w-full rounded-[12px] border border-[#e3e0db] bg-white p-3 text-left active:bg-[#faf9f4]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-[13.5px] font-semibold leading-snug line-clamp-1 flex-1 min-w-0">{meeting.title || meeting.name || 'Untitled meeting'}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wide text-[#a3a3a3] flex-shrink-0">{when(meeting.created_at || meeting.started_at)}</div>
                  </div>
                  <div className="mt-1 text-[11.5px] leading-snug text-[#8b857d] line-clamp-2">{compactSummary(meeting)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'obligations' && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3 text-[12px] font-['Space_Grotesk']">
              <span className="font-semibold text-[#0a0a0a]">Obligation register</span>
              <span className="text-[#dc2626]">{obligations.counts?.overdue || 0} overdue</span>
              <span className="text-[#117dff]">{obligations.counts?.open || 0} open</span>
              <span className="text-[#a3a3a3]">{obligations.counts?.done || 0} done</span>
            </div>
            {(!obligations.obligations || obligations.obligations.length === 0) ? (
              <div className="bg-white border border-[#e3e0db] rounded-[10px] p-8 text-center">
                <CheckCircle2 size={20} className="text-[#cbd5e1] mx-auto mb-2" />
                <p className="text-[12.5px] text-[#737373]">No commitments captured across meetings yet.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {obligations.obligations.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-[10px] border border-[#e3e0db] bg-white">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${o.status === 'overdue' ? 'bg-[#dc2626]' : o.status === 'done' ? 'bg-[#16a34a]' : 'bg-[#117dff]'}`} title={o.status} />
                    <span className="flex-1 text-[12.5px] text-[#0a0a0a] leading-snug min-w-0">{o.task}</span>
                    {o.due && <span className={`text-[10.5px] font-mono shrink-0 ${o.status === 'overdue' ? 'text-[#dc2626]' : 'text-[#a3a3a3]'}`}>{o.due}</span>}
                    <button
                      onClick={() => { const mm = meetings.find((x) => x.id === o.source_meeting_id); setTab('past'); if (mm) openMeeting(mm); }}
                      className="text-[10.5px] text-[#117dff] shrink-0"
                    >
                      source
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 bg-[#0a0a0a]/25 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.section
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[86vh] overflow-y-auto bg-white rounded-t-[28px] border-t border-[#ece9e2] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[18px] font-bold leading-tight">{selected.title || selected.name || 'Untitled meeting'}</div>
                  <div className="mt-1 text-[11px] text-[#a3a3a3]">{when(selected.created_at || selected.started_at)}</div>
                </div>
                <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-full grid place-items-center bg-[#f3f1ec]"><X size={16} /></button>
              </div>

              <MeetingDetailBody meeting={selected} />
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileShell>
  );
}
