// "Your Leads" — a Notion-style outreach board. One row per prospect the org
// has run outreach on: all firm info + sent state, sent date/time, reply/meeting
// outcome, and a coarse "potential". Read-only view over GET /v1/hyper/leads
// (outreach_targets ⨝ outbound_actions). No re-sends happen here — sending is
// the campaign panel's job, and the backend hard-dedups repeat emails.
import React, { useCallback, useEffect, useState } from 'react';
import {
  Mail, PhoneCall, Reply, CalendarCheck, RefreshCw, Globe, CheckCheck, Clock,
  Building2, ListChecks,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';

const POTENTIAL = {
  high: ['High', 'bg-emerald-100 text-emerald-700'],
  medium: ['Medium', 'bg-amber-100 text-amber-700'],
  low: ['Low', 'bg-blue-100 text-blue-700'],
  none: ['—', 'bg-[#f4f2ec] text-[#a3a3a3]'],
};

function fmt(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return '—'; }
}

export default function LeadsView() {
  const { t } = useTranslation('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setData(await apiClient.getLeads()); }
    catch (e) { setErr(e?.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const leads = data?.leads || [];
  const s = data?.summary || { total: 0, emails_sent: 0, calls: 0, replies: 0, meetings: 0 };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
      <div className="px-6 pt-5 pb-4 border-b border-[#e3e0db] flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold text-[#0a0a0a] font-['Space_Grotesk'] flex items-center gap-2">
            <ListChecks size={20} className="text-[#117dff]" /> {t('leads.title', 'Your Leads')}
          </h1>
          <p className="text-[11.5px] text-[#525252] mt-1">
            {t('leads.subtitle', 'Every prospect your agents reached out to — status, replies and potential.')}
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

      {/* Board */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {err && <div className="text-[12px] text-red-600 mb-3">{err}</div>}
        {!loading && leads.length === 0 && (
          <div className="text-[12.5px] text-[#a3a3a3] py-12 text-center">
            {t('leads.empty', 'No leads yet — run an outreach room, then send emails or calls from a report.')}
          </div>
        )}
        {leads.length > 0 && (
          <div className="border border-[#e3e0db] rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1.6fr_1.4fr_0.8fr_0.8fr_0.9fr_1.1fr] gap-2 px-4 py-2.5 bg-[#faf9f4] border-b border-[#e3e0db] text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">
              <span>{t('leads.company', 'Company')}</span>
              <span>{t('leads.contact', 'Contact')}</span>
              <span>{t('leads.sent', 'Sent')}</span>
              <span>{t('leads.reply', 'Reply')}</span>
              <span>{t('leads.potential', 'Potential')}</span>
              <span>{t('leads.sentAt', 'Sent at')}</span>
            </div>
            {leads.map((l) => {
              const [pLabel, pClass] = POTENTIAL[l.potential] || POTENTIAL.none;
              return (
                <div key={l.id} className="grid grid-cols-[1.6fr_1.4fr_0.8fr_0.8fr_0.9fr_1.1fr] gap-2 px-4 py-3 border-b border-[#eceae4] last:border-0 items-center hover:bg-[#faf9f4]/60">
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-[#0a0a0a] truncate flex items-center gap-1.5">
                      {l.channel === 'call' ? <PhoneCall size={11} className="text-[#a3a3a3] shrink-0" /> : <Mail size={11} className="text-[#a3a3a3] shrink-0" />}
                      {l.company}
                    </div>
                    {l.website && (
                      <a href={l.website} target="_blank" rel="noreferrer"
                        className="text-[10.5px] font-mono text-[#117dff] hover:underline truncate flex items-center gap-1">
                        <Globe size={9} /> {l.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                  <div className="min-w-0 text-[11.5px] text-[#525252] font-mono truncate">
                    {l.email || l.phone || '—'}
                    {l.address && <div className="text-[10px] text-[#a3a3a3] truncate">{l.address}</div>}
                  </div>
                  <div>
                    {l.sent
                      ? <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-700"><CheckCheck size={11} /> {t('leads.yes', 'Sent')}</span>
                      : l.skipped_reason
                        ? <span className="text-[10.5px] font-mono text-[#a3a3a3]" title={l.skipped_reason}>{t('leads.skipped', 'Skipped')}</span>
                        : l.error
                          ? <span className="text-[10.5px] font-mono text-red-500" title={l.error}>{t('leads.failed', 'Failed')}</span>
                          : <span className="text-[10.5px] font-mono text-[#a3a3a3]">{t('leads.queued', 'Queued')}</span>}
                  </div>
                  <div>
                    {l.replied
                      ? <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-700"><Reply size={11} /> {t('leads.replied', 'Replied')}</span>
                      : l.booked
                        ? <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-700"><CalendarCheck size={11} /> {t('leads.booked', 'Booked')}</span>
                        : <span className="text-[10.5px] font-mono text-[#a3a3a3]">—</span>}
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${pClass}`}>{pLabel}</span>
                  </div>
                  <div className="text-[10.5px] font-mono text-[#525252] flex items-center gap-1">
                    <Clock size={10} className="text-[#a3a3a3] shrink-0" /> {fmt(l.sent_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
