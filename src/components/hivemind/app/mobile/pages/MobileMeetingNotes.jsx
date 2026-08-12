// Mobile AI Meeting Notes — same structure as desktop MeetingNotes.jsx
// (stat row, Record/Past meetings/Obligations tabs, MeetingCard grid,
// delete flow, obligation register) instead of the old editorial-hero
// layout, minus desktop's outer BRAIN/OS/VOICE app nav (MobileShell's own
// hamburger replaces it) and minus the "Meeting flow" 4-step explainer
// panel. Stat cards are shrunk to fit a single row of 5. Start-meeting
// requires <QuickRecorderProvider> in the route tree (HiveMindApp.jsx) —
// without it useQuickRecorder() falls back to a no-op stub and the button
// looks frozen.
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
  Loader2,
  Mic,
  NotebookPen,
  Quote,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../../shared/api-client';
import { useQuickRecorder } from '../../shared/QuickRecorderProvider';
import MobileShell from '../MobileShell';
import MeetingIntelligencePanel from '../../components/MeetingIntelligencePanel';
import MeetingNotesIcon from '../../shared/MeetingNotesIcon';
import EntityText from '../../shared/EntityText';

function fmtAt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay(d, now)) return `@Today ${time}`;
  if (sameDay(d, yest)) return `@Yesterday ${time}`;
  return `@${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${time}`;
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

// Exact port of desktop's MeetingCard — emoji tile, prominent @date·time,
// blue ruler strip, micro-stats, delete button — single column on mobile.
function MeetingCard({ m, onOpen, onDelete }) {
  const actions = Array.isArray(m.action_items) ? m.action_items.length : 0;
  const keyPts = Array.isArray(m.key_points) ? m.key_points.length : 0;
  const quests = Array.isArray(m.questions) ? m.questions.length : 0;
  const time = new Date(m.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  const atLabel = fmtAt(m.created_at);
  const [atDay, ...atRest] = atLabel.split(' ');
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={() => onOpen(m)}
      className="w-full text-left bg-white border border-[#e3e0db] rounded-[12px] p-3 active:border-[#0a0a0a] transition-all relative">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-[8px] bg-blue-50 border border-blue-100 grid place-items-center flex-shrink-0"><MeetingNotesIcon size={14} className="text-[#117dff]" /></span>
          <span className="text-[12px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] truncate">{m.title || 'Meeting'}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button type="button" onClick={(e) => onDelete(m, e)} className="text-[#a3a3a3] p-0.5 rounded" aria-label="Delete meeting">
            <Trash2 size={13} />
          </button>
          <ArrowUpRight size={12} className="text-[#a3a3a3]" />
        </div>
      </div>
      <div className="mt-2 font-['Space_Grotesk'] leading-none">
        <span className="text-[16px] font-semibold text-[#525252]">{atDay}</span>
        <span className="text-[16px] font-semibold text-[#b9b5ae] ml-1.5 tabular-nums">{atRest.join(' ')}</span>
      </div>
      <div className="mt-2.5 rounded-[8px] bg-blue-50 border border-blue-100 px-2.5 py-1.5 flex items-center font-['Space_Grotesk']">
        <span className="text-[11px] font-semibold text-blue-700 tabular-nums">{time}</span>
        <span className="flex-1 mx-2.5 h-[8px]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(17,125,255,.35) 0 1.5px, transparent 1.5px 7px)' }} />
        <span className="text-[10px] font-semibold text-blue-700 uppercase">{m.language || '—'}</span>
      </div>
      <p className="text-[11px] text-[#737373] mt-2 leading-snug line-clamp-2">{m.summary || '—'}</p>
      <div className="mt-2.5 pt-2 border-t border-[#eae7e1] flex items-center gap-3 text-[10.5px] text-[#737373]">
        <span className="inline-flex items-center gap-1"><ListChecks size={11} className="text-[#10b981]" /> {actions}</span>
        <span className="inline-flex items-center gap-1"><Sparkles size={11} className="text-[#117dff]" /> {keyPts}</span>
        <span className="inline-flex items-center gap-1"><HelpCircle size={11} className="text-[#0891b2]" /> {quests}</span>
        {m.multi_speaker ? <span className="inline-flex items-center gap-1"><Users size={11} className="text-[#f59e0b]" /> {m.speaker_count || 2}</span> : null}
      </div>
    </motion.button>
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
  const [orgEntities, setOrgEntities] = useState([]);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.core.get('/api/meetings?limit=50');
      setMeetings((data?.meetings || []).filter(Boolean));
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Could not load meeting notes.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadMeetings(); }, []);

  useEffect(() => {
    apiClient.core.get('/api/meetings/entities').then(({ data }) => setOrgEntities(data?.entities || [])).catch(() => {});
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

  // ── Delete flow — same preview/scope/hard-delete semantics as desktop ──
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [deleteScope, setDeleteScope] = useState('both');
  const [deleteHard, setDeleteHard] = useState(false);
  const [deleteErr, setDeleteErr] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openDeleteModal = async (m, e) => {
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
  };

  const confirmDelete = async () => {
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
            {!qrec.supported && (
              <div className="mt-3 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                Recording isn't supported in this browser/device.
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
            <div className="grid grid-cols-1 gap-2.5">
              {meetings.map((m) => <MeetingCard key={m.id} m={m} onOpen={openMeeting} onDelete={openDeleteModal} />)}
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
                    <span className="flex-1 text-[12.5px] text-[#0a0a0a] leading-snug min-w-0"><EntityText text={o.task} entities={orgEntities} /></span>
                    {o.owner && <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#faf9f4] border border-[#e3e0db] text-[#525252] shrink-0">{o.owner}</span>}
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

      {/* ───────── DELETE MEETING BOTTOM SHEET — same fields/logic as desktop ───────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="fixed inset-0 z-[60] bg-[#0a0a0a]/25 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!deleting) { setDeleteTarget(null); setDeletePreview(null); } }}>
            <motion.section
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[86vh] overflow-y-auto bg-white rounded-t-[28px] border-t border-[#ece9e2] p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-[10px] bg-red-50 border border-red-200 grid place-items-center flex-shrink-0">
                    <Trash2 size={15} className="text-[#ef4444]" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] leading-tight">Delete meeting</h3>
                    <p className="text-[12px] text-[#737373] mt-0.5 leading-tight truncate max-w-[240px]">{deleteTarget.title || 'Meeting'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setDeleteTarget(null); setDeletePreview(null); }} disabled={deleting} className="w-9 h-9 rounded-full grid place-items-center bg-[#f3f1ec] flex-shrink-0 disabled:opacity-50" aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-[10px] bg-[#faf9f4] border border-[#e3e0db] p-4 mb-4 min-h-[80px] flex flex-col justify-center">
                {deletePreview === null ? (
                  <div className="flex items-center gap-2 text-[12px] text-[#737373]">
                    <Loader2 size={14} className="animate-spin text-[#117dff]" /> Loading preview…
                  </div>
                ) : deletePreview.can_delete === false ? (
                  <div className="flex items-start gap-2 text-[12px] text-[#ef4444]">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> Only the meeting owner can delete this.
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

              {deletePreview && deletePreview.can_delete !== false && (
                <div className="space-y-3 mb-4">
                  <div className="space-y-2">
                    {deletePreview.ingested && (
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input type="radio" name="deleteScope" value="memories" checked={deleteScope === 'memories'} onChange={() => setDeleteScope('memories')} className="mt-0.5 accent-[#117dff]" />
                        <span className="text-[12px] text-[#525252] leading-snug">
                          Remove from HIVEMIND memories only <span className="text-[#a3a3a3]">(keep the meeting in Past meetings)</span>
                        </span>
                      </label>
                    )}
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="radio" name="deleteScope" value="both" checked={deleteScope === 'both'} onChange={() => setDeleteScope('both')} className="mt-0.5 accent-[#117dff]" />
                      <span className="text-[12px] text-[#525252] leading-snug">
                        Delete the meeting <span className="font-medium text-[#0a0a0a]">AND</span> its HIVEMIND memories
                      </span>
                    </label>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer mt-1">
                    <input type="checkbox" checked={deleteHard} onChange={(e) => setDeleteHard(e.target.checked)} className="mt-0.5 accent-[#ef4444]" />
                    <span className="text-[12px] text-[#b45309] font-medium leading-snug">Hard delete — permanent, cannot be undone</span>
                  </label>
                  {deleteHard && (
                    <p className="text-[11px] text-[#ef4444] bg-red-50 border border-red-200 rounded-[6px] px-2.5 py-1.5 flex items-start gap-1.5">
                      <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" /> This permanently erases the data; it cannot be recovered.
                    </p>
                  )}
                </div>
              )}

              {deleteErr && (
                <p className="text-[11px] text-[#ef4444] bg-red-50 border border-red-200 rounded-[6px] px-2.5 py-1.5 mb-3 flex items-start gap-1.5">
                  <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" /> {deleteErr}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setDeleteTarget(null); setDeletePreview(null); }} disabled={deleting} className="flex-1 h-11 rounded-full text-[13px] font-medium text-[#525252] border border-[#e3e0db] disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" onClick={confirmDelete} disabled={deleting || !deletePreview || deletePreview.can_delete === false} className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-full bg-[#ef4444] text-white text-[13px] font-semibold disabled:opacity-50">
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {deleteHard ? 'Permanently delete' : 'Delete'}
                </button>
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
              className="w-full max-h-[86vh] overflow-y-auto bg-white rounded-t-[28px] border-t border-[#ece9e2] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[18px] font-bold leading-tight">{selected.title || selected.name || 'Untitled meeting'}</div>
                  <div className="mt-1 text-[11px] text-[#a3a3a3]">{fmtAt(selected.created_at || selected.started_at)}</div>
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
