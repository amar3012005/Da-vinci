import React, { useEffect, useMemo } from 'react';
import { CheckCircle2, Circle, Clock3, X } from 'lucide-react';

const EVENT_LABELS = {
  campaign_created: 'Campaign and dedicated Room created',
  campaign_generation_started: 'Agents started gathering and debating',
  campaign_regeneration_started: 'Campaign regeneration started',
  campaign_plan_ready: 'Campaign plan contract accepted',
  campaign_ready: 'Campaign is ready for your approval',
  campaign_needs_input: 'Campaign plan needs your input',
  campaign_generation_needs_input: 'Campaign Room needs your input',
  campaign_generation_failed: 'Campaign Room generation needs attention',
  campaign_action_edited: 'Campaign action edited',
  campaign_action_removed: 'Campaign action removed',
  campaign_approved: 'Campaign launched and scheduled',
  campaign_paused: 'Campaign paused',
  campaign_resumed: 'Campaign resumed',
  campaign_completed: 'Campaign completed',
};

export function campaignTimeline(events = []) {
  return [...events]
    .filter((event) => event?.eventType)
    .sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0))
    .map((event) => ({
      ...event,
      label: EVENT_LABELS[event.eventType] || event.eventType.replaceAll('_', ' '),
    }));
}

export default function CampaignDashboardModal({ campaign, loading, onClose, children }) {
  const timeline = useMemo(() => campaignTimeline(campaign?.events), [campaign?.events]);
  const visibleTimeline = timeline;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return <div className="fixed inset-0 z-50 bg-black/45 p-0 sm:p-3 lg:p-5" role="dialog" aria-modal="true" aria-labelledby="campaign-dashboard-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="mx-auto h-full w-full max-w-[1500px] overflow-hidden bg-[#fbfaf6] border border-[#d8d3cc] sm:rounded-lg shadow-2xl flex flex-col">
      <header className="shrink-0 border-b border-[#ded9d2] bg-[#fffefa] px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="campaign-dashboard-title" className="truncate text-[15px] font-semibold text-[#171717]">{campaign?.name || 'Campaign dashboard'}</h2>
              {campaign?.status ? <span className="shrink-0 rounded bg-[#efede8] px-1.5 py-0.5 text-[8.5px] font-mono uppercase text-[#615c56]">{campaign.status}</span> : null}
            </div>
            <p className="mt-0.5 truncate text-[10.5px] text-[#77716a]">Campaign progress and operating plan</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-[#f0ede7]" title="Close campaign dashboard" aria-label="Close campaign dashboard"><X size={15} /></button>
        </div>

        <section className="mt-3" aria-label="Campaign progress">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[9px] font-mono uppercase text-[#77716a]">Campaign progress</h3>
          </div>
          {visibleTimeline.length ? <ol className="flex gap-0 overflow-x-auto pb-1">
            {visibleTimeline.map((event, index) => {
              const complete = index < visibleTimeline.length - 1;
              return <li key={event.id || `${event.eventType}-${event.createdAt}-${index}`} className="relative min-w-[190px] flex-1 pr-3 last:pr-0">
                <div className="absolute left-[15px] right-0 top-[7px] h-px bg-[#d9d4cd]" aria-hidden="true" />
                <div className="relative flex items-start gap-2 bg-[#fffefa] pr-2">
                  {complete ? <CheckCircle2 size={15} className="mt-px shrink-0 text-emerald-700" /> : <Circle size={15} className="mt-px shrink-0 fill-[#171717] text-[#171717]" />}
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold leading-4 text-[#34312e]">{event.label}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-[8.5px] text-[#8a847d]"><Clock3 size={9} />{event.createdAt ? new Date(event.createdAt).toLocaleString() : 'In progress'}</div>
                  </div>
                </div>
              </li>;
            })}
          </ol> : <div className="flex items-center gap-2 text-[10.5px] text-[#77716a]"><Circle size={13} className={loading ? 'animate-pulse fill-[#171717]' : ''} />{loading ? 'Loading campaign progress...' : 'Campaign progress will appear here.'}</div>}
        </section>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  </div>;
}
