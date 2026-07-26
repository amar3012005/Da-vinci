import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Pause, Play, ShieldCheck } from 'lucide-react';
import ActionCard from './ActionCard';
import ChannelTab from './ChannelTab';

const LABEL = { x_organic: 'X', gmail: 'Email', tara: 'TARA' };
const EVENT_LABEL = {
  campaign_created: 'Campaign and dedicated Room created',
  campaign_generation_started: 'Agents started gathering and debating',
  campaign_plan_ready: 'Campaign plan contract accepted',
  campaign_needs_input: 'Plan contract needs more input',
  campaign_generation_needs_input: 'Campaign Room needs more input',
  campaign_generation_failed: 'Campaign Room generation failed',
  campaign_approved: 'Immutable campaign plan approved',
  campaign_action_approved: 'Campaign action approved',
  campaign_action_succeeded: 'Campaign action completed',
  campaign_action_failed: 'Campaign action needs attention',
  campaign_paused: 'Campaign paused',
  campaign_resumed: 'Campaign resumed',
  campaign_completed: 'Campaign completed',
};

export default function CampaignDetail({ campaign, loading, onBack, onControl, onApproveAction, busy, executionEnabled = false }) {
  const [tab, setTab] = useState('overview');
  const actions = campaign?.actions || []; const plan = campaign?.planVersions?.[0];
  const events = campaign?.events || [];
  const tabs = useMemo(() => ['overview', 'strategy', 'audience', ...campaign.requestedChannels, 'schedule', 'performance', 'room', 'audit'], [campaign.requestedChannels]);
  if (loading && !campaign) return <div className="h-full grid place-items-center"><Loader2 className="animate-spin text-[#77716a]" size={22} /></div>;
  return <div className="h-full overflow-y-auto bg-[#fbfaf6]">
    <div className="sticky top-0 z-10 bg-[#fbfaf6]/95 backdrop-blur border-b border-[#dfdbd4]">
      <div className="px-4 sm:px-7 pt-4"><button onClick={onBack} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6f6962]"><ArrowLeft size={13} />All campaigns</button>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-end gap-3 justify-between"><div><div className="flex items-center gap-2"><h1 className="text-[20px] font-semibold text-[#171717]">{campaign.name}</h1><span className="text-[9px] font-mono uppercase bg-[#efede8] rounded px-1.5 py-0.5">{campaign.status}</span></div><p className="text-[11.5px] text-[#746e67] mt-1 max-w-3xl">{campaign.goal}</p></div>
          <div className="flex gap-2">{campaign.status === 'READY_FOR_APPROVAL' ? <button onClick={() => onControl('approve')} disabled={busy || !executionEnabled} title={executionEnabled ? 'Approve this immutable plan' : 'Execution is disabled during the generate-only pilot'} className="h-9 px-4 bg-[#171717] text-white rounded-md text-[11.5px] font-semibold inline-flex items-center gap-1.5 disabled:bg-[#aaa49c]"><ShieldCheck size={13} />Approve plan</button> : null}{['RUNNING', 'SCHEDULED'].includes(campaign.status) ? <button onClick={() => onControl('pause')} disabled={busy} className="h-9 px-3 border border-[#bdb7af] rounded-md text-[11.5px] font-semibold inline-flex items-center gap-1.5"><Pause size={13} />Pause</button> : null}{campaign.status === 'PAUSED' ? <button onClick={() => onControl('resume')} disabled={busy || !executionEnabled} className="h-9 px-3 border border-[#bdb7af] rounded-md text-[11.5px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"><Play size={13} />Resume</button> : null}</div>
        </div>
      </div>
      <div className="mt-4 px-4 sm:px-7 flex gap-5 overflow-x-auto">{tabs.map((id) => <button key={id} onClick={() => setTab(id)} className={`h-9 shrink-0 text-[10.5px] font-semibold capitalize border-b-2 ${tab === id ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#817b74]'}`}>{LABEL[id] || (id === 'room' ? 'Campaign Room' : id)}</button>)}</div>
    </div>
    <main className="px-4 sm:px-7 py-6 max-w-6xl">
      {!executionEnabled ? <div className="mb-4 border border-[#d8d3cc] bg-white rounded-md px-4 py-3 text-[11px] text-[#615c56]"><strong>Generate-only pilot:</strong> plans and ready actions are available, while external publishing is intentionally disabled.</div> : null}
      {campaign.status === 'GENERATING' ? <div className="border border-[#d8d3cc] rounded-md p-5 bg-white flex gap-3"><Loader2 size={16} className="animate-spin mt-0.5 shrink-0" /><div><div className="text-[12.5px] font-semibold">Campaign Room is working</div><div className="text-[11px] text-[#77716a] mt-1">Agents are gathering evidence, debating the strategy, and compiling ready actions. This continues if you leave the page.</div>{events[0] ? <div className="text-[9.5px] font-mono uppercase text-[#817b74] mt-2">{EVENT_LABEL[events[0].eventType] || events[0].eventType.replaceAll('_', ' ')}</div> : null}</div></div> : null}
      {campaign.status === 'NEEDS_INPUT' ? <div className="border border-amber-300 bg-amber-50 rounded-md p-4 text-[11.5px] text-amber-900"><strong>Plan needs input.</strong> {campaign.lastError}</div> : null}
      {tab === 'overview' ? <div><div className="grid sm:grid-cols-4 border-y border-[#dfdbd4] divide-y sm:divide-y-0 sm:divide-x divide-[#dfdbd4]">{[['Actions', actions.length], ['Ready or queued', actions.filter((x) => ['READY', 'QUEUED', 'AWAITING_APPROVAL'].includes(x.status)).length], ['Completed', actions.filter((x) => x.status === 'SUCCEEDED').length], ['Channels', campaign.requestedChannels.length]].map(([label, value]) => <div key={label} className="py-4 sm:px-4 first:pl-0"><div className="text-[20px] font-semibold">{value}</div><div className="text-[9.5px] font-mono uppercase text-[#817b74] mt-1">{label}</div></div>)}</div><div className="mt-6"><h3 className="text-[12px] font-semibold">Ready actions</h3>{actions.length ? actions.slice(0, 5).map((action) => <ActionCard key={action.id} action={action} onApprove={onApproveAction} busy={busy} />) : <div className="py-10 text-[11.5px] text-[#817b74]">Actions appear after the Campaign Room submits a valid plan.</div>}</div></div> : null}
      {tab === 'strategy' ? <div className="max-w-3xl whitespace-pre-wrap text-[12.5px] leading-6 text-[#34312e]">{plan?.reportMarkdown || 'Strategy is still being generated.'}</div> : null}
      {tab === 'audience' ? <div className="text-[12px] text-[#615c56]">{plan?.bundle?.audience?.rationale || 'Audience selection is still being generated.'}</div> : null}
      {campaign.requestedChannels.includes(tab) ? <ChannelTab channel={tab} actions={actions} onApprove={onApproveAction} busy={busy} /> : null}
      {tab === 'schedule' ? <div>{[...actions].sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0)).map((action) => <ActionCard key={action.id} action={action} />)}</div> : null}
      {tab === 'performance' ? <div className="py-12 text-center text-[12px] text-[#817b74]">Performance baselines appear after the first action executes. Growth is compared with the preceding period and is not presented as causal attribution.</div> : null}
      {tab === 'room' ? <div><div className="border-l-2 border-[#171717] pl-4"><div className="text-[12.5px] font-semibold">Dedicated Campaign Room</div><div className="text-[11px] text-[#77716a] mt-1">The room researches and generates; only the approved scheduler can execute.</div></div><div className="mt-5 space-y-3">{(campaign.roomTranscript || []).flatMap((turn) => (turn.lines || []).filter((line) => ['line', 'campaign_bundle_invalid', 'campaign_tool'].includes(line?.t)).map((line, index) => <div key={`${turn.id}-${index}`} className="border-b border-[#e1ddd6] pb-3"><div className="text-[9px] font-mono uppercase text-[#8a847d]">{line.agent || (line.t === 'campaign_bundle_invalid' ? 'Plan validator' : line.t === 'campaign_tool' ? 'Campaign pipeline' : 'Agent')}</div><div className="text-[11.5px] leading-5 text-[#45413d] mt-1 whitespace-pre-wrap">{line.content || (line.t === 'campaign_tool' ? `${line.tool} ${line.status}` : (line.errors || []).join('\n'))}</div></div>))}</div></div> : null}
      {tab === 'audit' ? <div className="space-y-0">{events.length ? events.map((event) => <div key={event.id} className="grid grid-cols-[18px_1fr] gap-2 py-3 border-b border-[#e1ddd6]"><CheckCircle2 size={12} className="text-[#6f6962] mt-0.5" /><div><div className="text-[11px] font-semibold">{EVENT_LABEL[event.eventType] || event.eventType.replaceAll('_', ' ')}</div><div className="text-[9.5px] text-[#817b74] mt-0.5">{new Date(event.createdAt).toLocaleString()}</div></div></div>) : <div className="text-[11px] text-[#817b74]">Pipeline events appear here as the campaign progresses.</div>}</div> : null}
    </main>
  </div>;
}
