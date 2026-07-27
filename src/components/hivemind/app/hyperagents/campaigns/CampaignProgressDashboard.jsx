import React from 'react';
import { ArrowLeft, Check, CheckCircle2, Circle, Clock3, ExternalLink, Loader2, Rocket, X } from 'lucide-react';
import { CHANNEL_NAMES } from './channel-catalog';
import { campaignProgress } from './CampaignDetail';

const STATUS_LABEL = {
  GENERATING: 'Campaign Intelligence is working',
  PREPARING_ASSETS: 'Creating campaign visuals',
  READY_FOR_APPROVAL: 'Plan ready for review',
  RUNNING: 'Campaign is running',
  SCHEDULED: 'Campaign is scheduled',
  PAUSED: 'Campaign is paused',
  COMPLETED: 'Campaign completed',
  NEEDS_INPUT: 'Campaign needs your input',
  FAILED: 'Campaign needs attention',
};

function Progress({ status }) {
  return <ol className="grid grid-cols-3" aria-label="Campaign progress">
    {campaignProgress(status).map((step, index) => <li key={step.id} className="relative min-w-0">
      {index ? <span className={`absolute right-1/2 top-[15px] h-px w-full ${step.state === 'upcoming' ? 'bg-[#d8d3cc]' : 'bg-[#256d5b]'}`} /> : null}
      <div className="relative flex flex-col items-center text-center">
        <span className={`grid h-8 w-8 place-items-center rounded-full border ${step.state === 'complete' ? 'border-[#256d5b] bg-[#256d5b] text-white' : step.state === 'current' ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#cfc9c1] bg-[#fffefa] text-[#aaa49c]'}`}>
          {step.state === 'complete' ? <Check size={14} /> : <Circle size={8} className={step.state === 'current' ? 'fill-current' : ''} />}
        </span>
        <span className="mt-2 text-[10.5px] font-semibold">{step.label}</span>
        <span className="mt-0.5 text-[9px] text-[#817b74]">{step.detail}</span>
      </div>
    </li>)}
  </ol>;
}

export default function CampaignProgressDashboard({ campaign, loading, onClose, onOpenRoom, onLaunch, busy, executionEnabled }) {
  if (loading && !campaign) return <div className="grid min-h-[420px] place-items-center"><Loader2 className="animate-spin text-[#77716a]" size={22} /></div>;
  const readiness = campaign.readiness;
  const events = (campaign.events || []).slice(0, 6);
  const canLaunch = campaign.status === 'READY_FOR_APPROVAL' && executionEnabled && readiness?.decision === 'ready';

  return <div className="min-h-full bg-[#fbfaf6]">
    <header className="border-b border-[#dfdbd4] bg-[#fffefa] px-4 py-4 sm:px-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-[#6f6962]"><ArrowLeft size={12} />All campaigns</button>
          <h1 className="mt-2 truncate text-[18px] font-semibold text-[#171717]">{campaign.name}</h1>
          <p className="mt-1 max-w-3xl text-[11px] text-[#746e67]">{campaign.goal}</p>
        </div>
        <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-[#f0ede7]" title="Close campaign progress"><X size={15} /></button>
      </div>
    </header>

    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-7">
      <section aria-label="Campaign status">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="text-[9px] font-mono uppercase text-[#817b74]">Current status</div><h2 className="mt-1 text-[17px] font-semibold">{STATUS_LABEL[campaign.status] || campaign.status}</h2><div className="mt-2 flex flex-wrap gap-1.5">{campaign.requestedChannels.map((id) => <span key={id} className="rounded border border-[#d8d3cc] bg-white px-2 py-1 text-[9.5px] font-semibold">{CHANNEL_NAMES[id] || id}</span>)}</div></div>
          <button onClick={() => onOpenRoom(campaign.roomId, campaign.id)} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white"><ExternalLink size={13} />Open Campaign Intelligence</button>
        </div>
        <div className="mx-auto mt-8 max-w-xl"><Progress status={campaign.status} /></div>
      </section>

      <section className="mt-8 border-y border-[#d8d3cc] py-5" aria-label="Launch readiness">
        <div className="flex items-center justify-between gap-3"><div><h3 className="text-[12px] font-semibold">Launch readiness</h3><p className="mt-0.5 text-[10px] text-[#817b74]">Only the decisions still needed from you appear here.</p></div><span className={`rounded px-2 py-1 text-[8.5px] font-mono uppercase ${readiness?.decision === 'ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{readiness?.decision || 'checking'}</span></div>
        <div className="mt-4 space-y-3">{(readiness?.checks || []).map((item) => <div key={item.id} className="flex items-start gap-2.5">{item.status === 'passed' ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-700" /> : <Circle size={14} className="mt-0.5 shrink-0 fill-amber-500 text-amber-500" />}<div><div className="text-[10.5px] font-semibold">{item.label}</div>{item.status !== 'passed' ? <><div className="mt-0.5 text-[9.5px] leading-4 text-[#817b74]">{item.detail}</div>{item.recovery ? <div className="mt-1 text-[9.5px] leading-4 text-[#615c56]">Next: {item.recovery}</div> : null}</> : null}</div></div>)}</div>
        {campaign.status === 'READY_FOR_APPROVAL' ? <div className="mt-5 flex justify-end"><button onClick={() => onLaunch('launch')} disabled={!canLaunch || busy} title={canLaunch ? 'Launch campaign' : readiness?.summary?.next_action || 'Complete launch requirements'} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white disabled:bg-[#aaa49c]"><Rocket size={13} />Launch campaign</button></div> : null}
      </section>

      <section className="mt-6" aria-label="Recent campaign activity"><h3 className="text-[12px] font-semibold">Recent progress</h3><div className="mt-2">{events.map((event) => <div key={event.id} className="flex gap-2.5 border-b border-[#e6e2dc] py-3"><Clock3 size={12} className="mt-0.5 shrink-0 text-[#817b74]" /><div><div className="text-[10.5px] font-semibold">{String(event.eventType || '').replaceAll('_', ' ')}</div><div className="mt-0.5 text-[9px] text-[#817b74]">{new Date(event.createdAt).toLocaleString()}</div></div></div>)}</div></section>
    </main>
  </div>;
}
