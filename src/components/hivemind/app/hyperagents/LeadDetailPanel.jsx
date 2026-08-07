// Lead detail dashboard — rendered inside the reused CampaignDashboardModal
// shell. Organizes everything /v1/hyper/leads returns for one lead: contact,
// outreach timeline, why-this-lead, correspondence, call analysis, notes.
import React from 'react';
import {
  X, Mail, PhoneCall, Globe, MapPin, Sparkles, Target, Radar, CalendarCheck,
  Reply, Send, Search, AlertTriangle, SkipForward, StickyNote, Star,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { leadScore, leadStatus, STATUS_STYLE, fmt } from './LeadsView';

// A colored label chip above its value — the block-label motif this whole
// panel is built around (one bold color per section, not per random card).
function Block({ icon: Icon, color, label, children }) {
  if (!children) return null;
  return (
    <div className="min-w-0">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-mono uppercase tracking-wider ${color}`}>
        {Icon && <Icon size={10} />} {label}
      </span>
      <div className="mt-1.5 text-[12px] leading-relaxed text-[#2a2a2a]">{children}</div>
    </div>
  );
}

function TimelineStep({ icon: Icon, label, ts, active, tone }) {
  if (!ts) return null;
  return (
    <div className="flex items-center gap-2">
      <span className={`grid place-items-center h-6 w-6 rounded-full shrink-0 ${active ? tone : 'bg-[#eceae4] text-[#a3a3a3]'}`}>
        <Icon size={11} />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-semibold text-[#0a0a0a]">{label}</div>
        <div className="text-[10px] font-mono text-[#a3a3a3]">{fmt(ts)}</div>
      </div>
    </div>
  );
}

function CallAnalysis({ data }) {
  if (!data) return null;
  if (typeof data === 'string') return <p className="text-[12px] leading-relaxed text-[#2a2a2a]">{data}</p>;
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object');
  if (entries.length === 0) return null;
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-[#e3e0db] px-3 py-2">
          <div className="text-[9px] font-mono uppercase text-[#a3a3a3]">{k.replace(/_/g, ' ')}</div>
          <div className="text-[11.5px] text-[#2a2a2a] mt-0.5">{String(v)}</div>
        </div>
      ))}
    </div>
  );
}

export default function LeadDetailPanel({ lead, onClose }) {
  const { t } = useTranslation('dashboard');
  if (!lead) return null;
  const score = leadScore(lead);
  const status = leadStatus(lead);
  const style = STATUS_STYLE[status];

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-[#dfdbd4] bg-white px-5 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {lead.channel === 'call' ? <PhoneCall size={14} className="text-[#a3a3a3] shrink-0" /> : <Mail size={14} className="text-[#a3a3a3] shrink-0" />}
              <h1 className="truncate text-[18px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{lead.company}</h1>
            </div>
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noreferrer"
                className="text-[10.5px] font-mono text-[#117dff] hover:underline flex items-center gap-1 mt-1">
                <Globe size={9} /> {lead.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono uppercase tracking-wider ${style.chip}`}>
                {t(`leads.status.${status}`, style.label)}
              </span>
              <div className="flex items-center gap-0.5" aria-label={`${score} of 5`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={12} className={i <= score ? 'fill-amber-400 text-amber-400' : 'text-[#dcd8d0]'} />
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md border border-[#e3dfd8] shrink-0" title={t('leads.close', 'Close')}>
            <X size={14} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Contact + channel */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Block icon={Mail} color="bg-blue-50 text-blue-700" label={t('leads.contact', 'Contact')}>
            <div className="font-mono">{lead.email || lead.phone || '—'}</div>
          </Block>
          <Block icon={MapPin} color="bg-violet-50 text-violet-700" label={t('leads.address', 'Address')}>
            {lead.address}
          </Block>
        </div>

        {/* Outreach timeline */}
        {(lead.discovered_at || lead.sent_at || lead.outcome_at) && (
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-mono uppercase tracking-wider bg-slate-50 text-slate-600">
              <Search size={10} /> {t('leads.timeline', 'Outreach timeline')}
            </span>
            <div className="mt-2.5 flex flex-wrap items-center gap-4">
              <TimelineStep icon={Search} label={t('leads.discovered', 'Discovered')} ts={lead.discovered_at} active tone="bg-violet-100 text-violet-700" />
              <TimelineStep icon={Send} label={t('leads.sentAt', 'Sent')} ts={lead.sent_at} active tone="bg-amber-100 text-amber-700" />
              <TimelineStep icon={lead.booked ? CalendarCheck : Reply} label={lead.booked ? t('leads.booked', 'Booked') : t('leads.outcome', 'Outcome')} ts={lead.outcome_at} active tone="bg-emerald-100 text-emerald-700" />
            </div>
          </div>
        )}

        {/* Why this lead / best angle / signal */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Block icon={Target} color="bg-emerald-50 text-emerald-700" label={t('leads.whyThisLead', 'Why this lead')}>
            {lead.fit_reason || lead.distinctive_signal}
          </Block>
          <Block icon={Sparkles} color="bg-amber-50 text-amber-700" label={t('leads.bestAngle', 'Best angle')}>
            {lead.outreach_angle}
          </Block>
        </div>
        <Block icon={Radar} color="bg-cyan-50 text-cyan-700" label={t('leads.signal', 'Distinctive signal')}>
          {lead.fit_reason ? lead.distinctive_signal : null /* avoid repeating when fit_reason already showed it */}
        </Block>

        {/* Correspondence */}
        {lead.correspondence && (
          <Block icon={Reply} color="bg-blue-50 text-blue-700" label={t('leads.correspondence', 'Correspondence')}>
            <div className="rounded-lg border border-[#e3e0db] px-3 py-2 space-y-0.5">
              {lead.correspondence.subject && <div className="font-semibold text-[#0a0a0a]">{lead.correspondence.subject}</div>}
              {lead.correspondence.sender && <div className="text-[11px] text-[#525252]">{lead.correspondence.sender}</div>}
              <div className="text-[10px] font-mono text-[#a3a3a3]">{fmt(lead.correspondence.received_at)}</div>
            </div>
          </Block>
        )}

        {/* Call analysis */}
        {lead.channel === 'call' && lead.call_analysis && (
          <Block icon={PhoneCall} color="bg-indigo-50 text-indigo-700" label={t('leads.callAnalysis', 'Call analysis')}>
            <CallAnalysis data={lead.call_analysis} />
          </Block>
        )}

        {/* Note */}
        <Block icon={StickyNote} color="bg-stone-50 text-stone-600" label={t('leads.note', 'Note')}>
          {lead.note}
        </Block>

        {/* Skipped / error */}
        {lead.skipped_reason && (
          <Block icon={SkipForward} color="bg-stone-50 text-stone-600" label={t('leads.skipped', 'Skipped')}>
            {lead.skipped_reason}
          </Block>
        )}
        {lead.error && (
          <Block icon={AlertTriangle} color="bg-rose-50 text-rose-700" label={t('leads.failed', 'Failed')}>
            {lead.error}
          </Block>
        )}
      </div>
    </div>
  );
}
