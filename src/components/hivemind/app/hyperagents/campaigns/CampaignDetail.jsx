import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarDays, Check, CheckCircle2, Circle, Loader2, Pause, Play,
  RefreshCw, RotateCcw, Rocket, UsersRound, X,
} from 'lucide-react';
import ChannelTab from './ChannelTab';
import { CampaignReport } from '../rooms/reports';

const LABEL = { x_organic: 'X', gmail: 'Email', tara: 'TARA' };
const EVENT_LABEL = {
  campaign_created: 'Campaign Room created',
  campaign_generation_started: 'Agents started working',
  campaign_plan_ready: 'Campaign plan completed',
  campaign_ready: 'Campaign ready for approval',
  campaign_needs_input: 'Plan needs more input',
  campaign_generation_needs_input: 'Campaign Room needs more input',
  campaign_generation_failed: 'Campaign Room generation failed',
  campaign_approved: 'Campaign launched and scheduled',
  campaign_action_approved: 'Campaign action approved',
  campaign_action_succeeded: 'Campaign action completed',
  campaign_action_failed: 'Campaign action needs attention',
  campaign_action_retry_requested: 'Action retry approved by user',
  campaign_action_reconciled: 'Provider action reconciled',
  campaign_action_reconciliation_pending: 'Provider inspection still required',
  campaign_action_edited: 'Action edited',
  campaign_action_removed: 'Action removed',
  campaign_regeneration_started: 'Campaign regeneration started',
  campaign_metrics_synced: 'Performance synchronized',
  campaign_paused: 'Campaign paused',
  campaign_resumed: 'Campaign resumed',
  campaign_completed: 'Campaign completed',
};

const READY = new Set(['READY_FOR_APPROVAL', 'RUNNING', 'SCHEDULED', 'PAUSED', 'COMPLETED']);
const LIVE = new Set(['RUNNING', 'SCHEDULED', 'PAUSED', 'COMPLETED']);

export function campaignProgress(status) {
  return [
    { id: 'room', label: 'Campaign Room', detail: 'Research and debate', state: status === 'GENERATING' ? 'current' : 'complete' },
    { id: 'plan', label: 'Plan ready', detail: 'Review and approve', state: LIVE.has(status) ? 'complete' : READY.has(status) ? 'current' : 'upcoming' },
    { id: 'live', label: 'Campaign live', detail: 'Publish and measure', state: LIVE.has(status) ? 'current' : 'upcoming' },
  ];
}

function Progress({ status }) {
  return <ol className="grid grid-cols-3" aria-label="Campaign progress">
    {campaignProgress(status).map((step, index) => <li key={step.id} className="relative min-w-0">
      {index ? <span className={`absolute right-1/2 top-[13px] h-px w-full ${step.state === 'upcoming' ? 'bg-[#d8d3cc]' : 'bg-[#256d5b]'}`} aria-hidden="true" /> : null}
      <div className="relative flex flex-col items-center text-center">
        <span className={`grid h-7 w-7 place-items-center rounded-full border ${step.state === 'complete' ? 'border-[#256d5b] bg-[#256d5b] text-white' : step.state === 'current' ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#cfc9c1] bg-[#fffefa] text-[#aaa49c]'}`}>
          {step.state === 'complete' ? <Check size={13} /> : <Circle size={8} className={step.state === 'current' ? 'fill-current' : ''} />}
        </span>
        <span className={`mt-1.5 text-[10px] font-semibold ${step.state === 'upcoming' ? 'text-[#8a847d]' : 'text-[#292624]'}`}>{step.label}</span>
        <span className="hidden text-[9px] text-[#8a847d] sm:block">{step.detail}</span>
      </div>
    </li>)}
  </ol>;
}

export default function CampaignDetail({ campaign, loading, onBack, onOpenRoom, onControl, onApproveAction, onRetryAction, onReconcileAction, onEditAction, onRemoveAction, onRegenerate, busy, executionEnabled = false }) {
  const [tab, setTab] = useState('plan');
  const [launchOpen, setLaunchOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const actions = campaign?.actions || [];
  const plan = campaign?.planVersions?.[0];
  const events = campaign?.events || [];
  const channelMetrics = Object.fromEntries((campaign?.channels || []).map((channel) => [channel.channel, channel.metrics || {}]));
  const tabs = useMemo(() => ['plan', ...campaign.requestedChannels, 'performance', 'activity'], [campaign.requestedChannels]);

  useEffect(() => {
    if (!tabs.includes(tab)) setTab('plan');
  }, [tab, tabs]);

  if (loading && !campaign) return <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-[#77716a]" size={22} /></div>;

  return <div className="h-full overflow-y-auto bg-[#fbfaf6]">
    <header className="sticky top-0 z-10 border-b border-[#dfdbd4] bg-[#fffefa]/95 backdrop-blur">
      <div className="px-4 py-4 sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-[#6f6962]"><ArrowLeft size={12} />All campaigns</button>
            <div className="mt-2 flex items-center gap-2"><h1 className="truncate text-[18px] font-semibold text-[#171717]">{campaign.name}</h1><span className="shrink-0 rounded bg-[#efede8] px-1.5 py-0.5 text-[8.5px] font-mono uppercase">{campaign.status}</span></div>
            <p className="mt-1 max-w-3xl text-[11px] text-[#746e67]">{campaign.goal}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            {campaign.status === 'GENERATING' && campaign.roomId ? <button onClick={() => onOpenRoom(campaign.roomId, campaign.id)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#171717] px-3 text-[11px] font-semibold text-white">Open Room</button> : null}
            {['READY_FOR_APPROVAL', 'NEEDS_INPUT', 'FAILED'].includes(campaign.status) ? <button onClick={() => setRegenerateOpen(true)} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#bdb7af] px-3 text-[11px] font-semibold"><RotateCcw size={13} />Regenerate</button> : null}
            {campaign.status === 'READY_FOR_APPROVAL' ? <button onClick={() => setLaunchOpen(true)} disabled={busy || !executionEnabled} title={executionEnabled ? 'Review the launch schedule' : 'Execution is disabled during the generate-only pilot'} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white disabled:bg-[#aaa49c]"><Rocket size={13} />Launch</button> : null}
            {['RUNNING', 'SCHEDULED'].includes(campaign.status) ? <button onClick={() => onControl('pause')} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#bdb7af] px-3 text-[11px] font-semibold"><Pause size={13} />Pause</button> : null}
            {campaign.status === 'PAUSED' ? <button onClick={() => onControl('resume')} disabled={busy || !executionEnabled} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#bdb7af] px-3 text-[11px] font-semibold disabled:opacity-40"><Play size={13} />Resume</button> : null}
            <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-md hover:bg-[#f0ede7]" title="Close campaign dashboard" aria-label="Close campaign dashboard"><X size={15} /></button>
          </div>
        </div>
        <div className="mx-auto mt-4 max-w-xl"><Progress status={campaign.status} /></div>
      </div>
      <nav className="flex gap-5 overflow-x-auto px-4 sm:px-7" aria-label="Campaign dashboard sections">
        {tabs.map((id) => <button key={id} onClick={() => setTab(id)} className={`h-9 shrink-0 border-b-2 text-[10.5px] font-semibold capitalize ${tab === id ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#817b74]'}`}>{LABEL[id] || id}</button>)}
      </nav>
    </header>

    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-7">
      {regenerateOpen ? <div className="mb-5 border-y border-[#d8d3cc] py-4"><div className="flex items-center justify-between"><div><div className="text-[12px] font-semibold">Regenerate in the same Campaign Room</div><div className="mt-0.5 text-[10.5px] text-[#77716a]">Tell the team what should change; the current plan remains in history.</div></div><button onClick={() => setRegenerateOpen(false)} className="grid h-8 w-8 place-items-center" title="Close"><X size={14} /></button></div><textarea rows={3} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="What should the agents change or improve?" className="mt-3 w-full resize-none rounded-md border border-[#cfc9c1] p-3 text-[11.5px]" /><button onClick={async () => { try { await onRegenerate(feedback); setRegenerateOpen(false); setFeedback(''); if (campaign.roomId) onOpenRoom(campaign.roomId, campaign.id); } catch { /* parent surfaces the API error */ } }} disabled={busy} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md bg-[#171717] px-3 text-[10.5px] font-semibold text-white"><RotateCcw size={12} />Start regeneration</button></div> : null}

      {launchOpen ? <section className="mb-5 rounded-md border border-[#bdb7af] bg-white p-4" aria-label="Launch confirmation"><div className="flex items-start justify-between gap-4"><div><h3 className="text-[13px] font-semibold">Launch this campaign?</h3><p className="mt-1 text-[10.5px] text-[#77716a]">The first action becomes due now. Every remaining action is scheduled from this approval time.</p></div><button onClick={() => setLaunchOpen(false)} className="grid h-8 w-8 place-items-center" title="Close launch confirmation"><X size={14} /></button></div><div className="mt-4 grid gap-px border border-[#dfdbd4] bg-[#dfdbd4] sm:grid-cols-3"><div className="bg-[#fbfaf6] p-3"><div className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-[#817b74]"><Rocket size={11} />Channels</div><div className="mt-1 text-[11px] font-semibold">{campaign.requestedChannels.map((id) => LABEL[id] || id).join(', ')}</div></div><div className="bg-[#fbfaf6] p-3"><div className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-[#817b74]"><UsersRound size={11} />Audience</div><div className="mt-1 text-[11px] font-semibold">{campaign.audience?.length || 0} selected contacts</div></div><div className="bg-[#fbfaf6] p-3"><div className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-[#817b74]"><CalendarDays size={11} />Schedule</div><div className="mt-1 text-[11px] font-semibold">{actions.length} action{actions.length === 1 ? '' : 's'} from launch time</div></div></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setLaunchOpen(false)} className="h-9 rounded-md border border-[#bdb7af] px-3 text-[11px] font-semibold">Keep reviewing</button><button onClick={async () => { if (await onControl('launch')) setLaunchOpen(false); }} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white disabled:bg-[#aaa49c]"><Rocket size={13} />Confirm launch</button></div></section> : null}

      {!executionEnabled ? <div className="mb-4 rounded-md border border-[#d8d3cc] bg-white px-4 py-3 text-[11px] text-[#615c56]"><strong>Generate-only pilot:</strong> plans and ready actions are available, while external publishing is intentionally disabled.</div> : null}
      {campaign.status === 'NEEDS_INPUT' ? <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-[11.5px] text-amber-900"><strong>Plan needs input.</strong> {campaign.lastError}</div> : null}

      {tab === 'plan' ? (plan ? <CampaignReport report={{ bundle: plan.bundle, content: plan.reportMarkdown }} taskTitle={campaign.name} surface="dashboard" /> : <div className="py-14 text-center text-[11.5px] text-[#817b74]">The operating plan appears when the Campaign Room completes.</div>) : null}
      {campaign.requestedChannels.includes(tab) ? <ChannelTab channel={tab} actions={actions} onApprove={onApproveAction} onRetry={onRetryAction} onReconcile={onReconcileAction} onEdit={onEditAction} onRemove={onRemoveAction} busy={busy} /> : null}
      {tab === 'performance' ? <div><div className="flex items-center justify-between border-b border-[#d8d3cc] pb-3"><div><h3 className="text-[12.5px] font-semibold">Measured performance</h3><p className="mt-0.5 text-[10.5px] text-[#817b74]">Provider results appear after actions go live.</p></div><button onClick={() => onControl('sync')} disabled={busy || !actions.some((action) => action.status === 'SUCCEEDED')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#bdb7af] px-3 text-[10.5px] font-semibold disabled:opacity-40"><RefreshCw size={12} />Refresh</button></div>{campaign.requestedChannels.map((channel) => { const metrics = channelMetrics[channel] || {}; const rows = channel === 'x_organic' ? [['Impressions', metrics.impressions], ['Engagements', metrics.engagements], ['Link clicks', metrics.url_clicks], ['Followers', metrics.followers], ['Follower change', metrics.follower_delta], ['Engagement rate', typeof metrics.engagement_rate === 'number' ? `${(metrics.engagement_rate * 100).toFixed(2)}%` : null]] : channel === 'gmail' ? [['Sent', metrics.sent], ['Replies', metrics.replied], ['Booked', metrics.booked], ['Bounced', metrics.bounced]] : [['Calls', metrics.calls], ['Completed', metrics.completed], ['Booked', metrics.booked], ['No answer', metrics.no_answer], ['Blocked', metrics.blocked]]; return <section key={channel} className="border-b border-[#dfdbd4] py-5"><div className="text-[10px] font-mono uppercase text-[#77716a]">{LABEL[channel] || channel}</div><div className="mt-3 grid grid-cols-2 gap-px border border-[#dfdbd4] bg-[#dfdbd4] sm:grid-cols-3">{rows.map(([label, value]) => <div key={label} className="min-h-16 bg-[#fbfaf6] p-3"><div className="text-[18px] font-semibold">{value ?? 0}</div><div className="mt-1 text-[9.5px] text-[#817b74]">{label}</div></div>)}</div>{metrics.synced_at ? <div className="mt-2 text-[9.5px] text-[#8a847d]">Last synchronized {new Date(metrics.synced_at).toLocaleString()}</div> : <div className="mt-2 text-[9.5px] text-[#8a847d]">Metrics appear after the first successful action.</div>}</section>; })}</div> : null}
      {tab === 'activity' ? <div>{events.length ? events.map((event) => <div key={event.id} className="grid grid-cols-[18px_1fr] gap-2 border-b border-[#e1ddd6] py-3"><CheckCircle2 size={12} className="mt-0.5 text-[#6f6962]" /><div><div className="text-[11px] font-semibold">{EVENT_LABEL[event.eventType] || event.eventType.replaceAll('_', ' ')}</div><div className="mt-0.5 text-[9.5px] text-[#817b74]">{new Date(event.createdAt).toLocaleString()}</div></div></div>) : <div className="text-[11px] text-[#817b74]">Campaign activity will appear here.</div>}</div> : null}
    </main>
  </div>;
}
