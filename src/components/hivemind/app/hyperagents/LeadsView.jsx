// "Your Leads" — shared prospect intelligence plus outreach outcomes. Room
// discoveries appear immediately; campaign/send state enriches the same rows.
// Card grid: each lead is one box, star-rated by funnel importance, click for
// the full outreach dashboard (LeadDetailPanel, inside the reused
// CampaignDashboardModal shell).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Mail, PhoneCall, Reply, CalendarCheck, RefreshCw, Globe, Building2, ListChecks, Star,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import CampaignDashboardModal from './campaigns/CampaignDashboardModal';
import LeadDetailPanel from './LeadDetailPanel';

// No numeric "importance" exists server-side (/v1/hyper/leads only returns a
// 4-bucket `potential`). Derive a 1-5 star score from the same funnel signals
// the backend already computes potential from — booked > replied > sent >
// qualified (has a fit reason) > bare discovery. Never 0 — every row here is a
// real lead, not an empty state.
export function leadScore(l) {
  if (l.booked) return 5;
  if (l.replied) return 4;
  if (l.sent) return 3;
  if (l.fit_reason || l.outreach_angle || l.distinctive_signal) return 2;
  return 1;
}

export function leadStatus(l) {
  if (l.booked) return 'booked';
  if (l.replied) return 'replied';
  if (l.error) return 'failed';
  if (l.skipped_reason) return 'skipped';
  if (l.sent) return 'sent';
  if (l.state === 'discovered') return 'discovered';
  return 'queued';
}

// One solid color per funnel stage — the "multi-color" identity of the board.
// Deliberately keyed by status (not random per-card) so color carries meaning:
// glance at the grid and the palette itself tells you where every lead stands.
export const STATUS_STYLE = {
  booked:     { label: 'Booked',     chip: 'bg-emerald-500 text-white', bar: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700' },
  replied:    { label: 'Replied',    chip: 'bg-blue-500 text-white',    bar: 'bg-blue-500',    soft: 'bg-blue-50 text-blue-700' },
  sent:       { label: 'Sent',       chip: 'bg-amber-500 text-white',   bar: 'bg-amber-500',   soft: 'bg-amber-50 text-amber-700' },
  discovered: { label: 'Discovered', chip: 'bg-violet-500 text-white', bar: 'bg-violet-500',  soft: 'bg-violet-50 text-violet-700' },
  queued:     { label: 'Queued',     chip: 'bg-slate-400 text-white',   bar: 'bg-slate-400',   soft: 'bg-slate-50 text-slate-600' },
  skipped:    { label: 'Skipped',    chip: 'bg-stone-400 text-white',   bar: 'bg-stone-400',   soft: 'bg-stone-50 text-stone-600' },
  failed:     { label: 'Failed',     chip: 'bg-rose-500 text-white',    bar: 'bg-rose-500',    soft: 'bg-rose-50 text-rose-700' },
};

export function fmt(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return '—'; }
}

function Stars({ score }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${score} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={i <= score ? 'fill-amber-400 text-amber-400' : 'text-[#dcd8d0]'} />
      ))}
    </div>
  );
}

function LeadCard({ lead, onOpen }) {
  const { t } = useTranslation('dashboard');
  const score = leadScore(lead);
  const status = leadStatus(lead);
  const style = STATUS_STYLE[status];
  const snippet = lead.fit_reason || lead.distinctive_signal || lead.outreach_angle;

  return (
    <button
      onClick={() => onOpen(lead)}
      className="group text-left rounded-xl border border-[#e3e0db] bg-white overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-[#117dff]/40"
    >
      <div className={`h-1.5 ${style.bar}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] truncate flex items-center gap-1.5">
              {lead.channel === 'call' ? <PhoneCall size={12} className="text-[#a3a3a3] shrink-0" /> : <Mail size={12} className="text-[#a3a3a3] shrink-0" />}
              {lead.company}
            </div>
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                className="text-[10.5px] font-mono text-[#117dff] hover:underline truncate flex items-center gap-1 mt-0.5">
                <Globe size={9} /> {lead.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded text-[9.5px] font-mono uppercase tracking-wider ${style.chip}`}>
            {t(`leads.status.${status}`, style.label)}
          </span>
        </div>

        <div className="mt-2.5"><Stars score={score} /></div>

        <div className="mt-2 text-[11px] text-[#525252] font-mono truncate">
          {lead.email || lead.phone || '—'}
        </div>

        {snippet && (
          <p className="mt-2 text-[11px] leading-relaxed text-[#353535] line-clamp-2">{snippet}</p>
        )}

        <div className="mt-3 flex items-center justify-between text-[9.5px] font-mono text-[#a3a3a3]">
          <span>{fmt(lead.sent_at || lead.discovered_at)}</span>
          {(lead.replied || lead.booked) && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              {lead.booked ? <CalendarCheck size={10} /> : <Reply size={10} />}
              {lead.booked ? t('leads.booked', 'Booked') : t('leads.replied', 'Replied')}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function LeadsView() {
  const { t } = useTranslation('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [openLeadId, setOpenLeadId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setData(await apiClient.getLeads()); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const leads = data?.leads || [];
  const s = data?.summary || { total: 0, emails_sent: 0, calls: 0, replies: 0, meetings: 0 };
  // Most important first: score desc, then most recently touched.
  const sorted = useMemo(() => [...leads].sort((a, b) => {
    const d = leadScore(b) - leadScore(a);
    if (d !== 0) return d;
    return new Date(b.sent_at || b.discovered_at || 0) - new Date(a.sent_at || a.discovered_at || 0);
  }), [leads]);
  const openLead = useMemo(() => leads.find((l) => l.id === openLeadId) || null, [leads, openLeadId]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
      <div className="px-6 pt-5 pb-4 border-b border-[#e3e0db] flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold text-[#0a0a0a] font-['Space_Grotesk'] flex items-center gap-2">
            <ListChecks size={20} className="text-[#117dff]" /> {t('leads.title', 'Your Leads')}
          </h1>
          <p className="text-[11.5px] text-[#525252] mt-1">
            {t('leads.subtitle', 'Every prospect your agents discovered — why they fit, the best angle, and what happened next.')}
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#525252] hover:text-[#0a0a0a] border border-[#e3e0db] rounded-lg px-3 py-1.5 bg-white hover:bg-[#faf9f4] transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('leads.refresh', 'Refresh')}
        </button>
      </div>

      {/* Summary row */}
      <div className="px-6 pt-4 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { icon: Building2, label: t('leads.prospects', 'Prospects'), v: s.total },
            { icon: Mail, label: t('leads.emailsSent', 'Emails sent'), v: s.emails_sent },
            { icon: Reply, label: t('leads.replies', 'Replies'), v: s.replies },
            { icon: CalendarCheck, label: t('leads.meetings', 'Meetings'), v: s.meetings },
            { icon: PhoneCall, label: t('leads.calls', 'Calls'), v: s.calls },
          ].map(({ icon: Icon, label, v }) => (
            <div key={label} className="border border-[#e3e0db] rounded-lg px-3.5 py-2.5 bg-white flex items-center gap-3">
              <Icon size={15} className={v > 0 ? 'text-[#117dff]' : 'text-[#c9c5be]'} />
              <div>
                <div className={`text-[18px] leading-none font-semibold font-['Space_Grotesk'] ${v > 0 ? 'text-[#0a0a0a]' : 'text-[#a3a3a3]'}`}>{v}</div>
                <div className="text-[10.5px] font-mono uppercase text-[#a3a3a3] mt-1">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {err && <div className="text-[12px] text-red-600 mb-3">{err}</div>}
        {!loading && sorted.length === 0 && (
          <div className="text-[12.5px] text-[#a3a3a3] py-12 text-center">
            {t('leads.empty', 'No leads yet — ask a Company Room to discover or qualify prospects.')}
          </div>
        )}
        {sorted.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
            {sorted.map((l) => <LeadCard key={l.id} lead={l} onOpen={(lead) => setOpenLeadId(lead.id)} />)}
          </div>
        )}
      </div>

      {openLead && (
        <CampaignDashboardModal campaign={{ name: openLead.company }} loading={false} onClose={() => setOpenLeadId(null)}>
          <LeadDetailPanel lead={openLead} onClose={() => setOpenLeadId(null)} />
        </CampaignDashboardModal>
      )}
    </div>
  );
}
