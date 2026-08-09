import React, { useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Circle, Compass, ExternalLink, Loader2, Pause, Play, Rocket, Send, Settings2, X } from 'lucide-react';
import { CHANNEL_NAMES } from './channel-catalog';
import { CampaignAssetImage } from './CampaignCreative';

const STATUS_LABEL = { GENERATING: 'Campaign Intelligence is working', PREPARING_ASSETS: 'Creating campaign visuals', READY_FOR_APPROVAL: 'Ready for review', RUNNING: 'Running', SCHEDULED: 'Scheduled', PAUSED: 'Paused', COMPLETED: 'Completed', NEEDS_INPUT: 'Needs input', NEEDS_REPAIR: 'Repairing affected actions', FAILED: 'Needs attention' };
const TABS = [['posts', 'Posts', Send], ['schedule', 'Schedule', CalendarDays], ['strategy', 'Strategy', Compass], ['reactions', 'Reactions', Activity], ['controls', 'Controls', Settings2]];

export function launchProgress(campaign) {
  const status = campaign?.status;
  const accepted = ['PREPARING_ASSETS', 'READY_FOR_APPROVAL', 'RUNNING', 'SCHEDULED', 'PAUSED', 'COMPLETED'].includes(status);
  const launched = ['RUNNING', 'SCHEDULED', 'PAUSED', 'COMPLETED'].includes(status);
  const firstPublished = (campaign?.actions || []).some((action) => action.status === 'SUCCEEDED');
  return [
    ['Plan accepted', accepted ? 'complete' : 'current'],
    [status === 'PREPARING_ASSETS' ? 'Preparing visuals' : 'Launch checks', launched ? 'complete' : accepted ? 'current' : 'upcoming'],
    ['First action', firstPublished ? 'complete' : launched ? 'current' : 'upcoming'],
    [status === 'COMPLETED' ? 'Completed' : 'Schedule active', status === 'COMPLETED' ? 'complete' : firstPublished ? 'current' : 'upcoming'],
  ];
}

function LaunchProgress({ campaign }) {
  const steps = launchProgress(campaign);
  return <ol className="mt-4 grid grid-cols-4" aria-label="Campaign launch progress">{steps.map(([label, state], index) => <li key={label} className="relative min-w-0 text-center">{index ? <span className={`absolute right-1/2 top-2.5 h-px w-full ${state === 'upcoming' ? 'bg-[#d8d3cc]' : 'bg-[#256d5b]'}`} /> : null}<span className={`relative mx-auto grid h-5 w-5 place-items-center rounded-full border ${state === 'complete' ? 'border-[#256d5b] bg-[#256d5b] text-white' : state === 'current' ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#cfc9c1] bg-white text-[#aaa49c]'}`}>{state === 'complete' ? <CheckCircle2 size={11} /> : <Circle size={6} className={state === 'current' ? 'fill-current' : ''} />}</span><span className={`mt-1 block truncate px-1 text-[8.5px] font-semibold ${state === 'upcoming' ? 'text-[#9a948d]' : 'text-[#393532]'}`}>{label}</span></li>)}</ol>;
}

function actionLabel(action) {
  if (action.status === 'SUCCEEDED') return 'Published';
  if (action.status === 'PAUSED') return 'Paused';
  if (['QUEUED', 'EXECUTING'].includes(action.status)) return 'Scheduled';
  if (action.status === 'AWAITING_APPROVAL') return 'Needs approval';
  if (['FAILED', 'BLOCKED', 'NEEDS_RECONCILIATION'].includes(action.status)) return 'Needs attention';
  return 'Ready';
}

function selectedAsset(action) {
  return (action.assets || []).find((asset) => asset.id === action.payload?.asset_id)
    || (action.assets || []).find((asset) => ['READY', 'APPROVED'].includes(asset.status));
}

function visualStatus(action) {
  if (!action.payload?.creative_brief?.required) return null;
  const assets = action.assets || [];
  if (assets.some((asset) => asset.status === 'GENERATING')) return 'Creating visual';
  if (assets.some((asset) => asset.status === 'QUEUED')) return 'Visual queued';
  if (assets.some((asset) => ['READY', 'APPROVED'].includes(asset.status))) return 'Visual ready';
  if (assets.some((asset) => asset.status === 'FAILED')) return 'Visual needs attention';
  return 'Visual pending';
}

function PostsView({ actions }) {
  const [index, setIndex] = useState(0);
  const action = actions[Math.min(index, Math.max(actions.length - 1, 0))];
  if (!action) return <div className="py-16 text-center text-[11px] text-[#817b74]">Final posts will appear when the Campaign Contract is accepted.</div>;
  const asset = selectedAsset(action);
  const visual = visualStatus(action);
  const copy = action.payload?.text || action.payload?.final_copy || action.payload?.body || action.payload?.opening || '';
  return <div>
    <div className="flex items-end justify-between gap-4"><div><h2 className="text-[15px] font-semibold">Final campaign posts</h2><p className="mt-1 text-[10px] text-[#817b74]">Exact creative and live execution state from the accepted contract.</p></div><span className="font-mono text-[9px] uppercase text-[#817b74]">{index + 1} of {actions.length}</span></div>
    <div className="mt-4 grid overflow-hidden rounded-md border border-[#d8d3cc] bg-white lg:grid-cols-[1fr_270px]">
      <article className="min-w-0 p-5 lg:border-r lg:border-[#e3dfd8]">
        <div className="flex items-center justify-between text-[9px] font-mono uppercase text-[#817b74]"><span>{CHANNEL_NAMES[action.channel] || action.channel}</span><span>{Array.from(copy).length}{action.channel === 'x_organic' ? '/280' : ''}</span></div>
        {asset ? <CampaignAssetImage asset={asset} alt={asset.metadata?.alt_text || action.payload?.asset_alt_text || ''} className="mt-4 aspect-[16/7] w-full rounded-md border border-[#e3dfd8] object-cover" /> : null}
        {visual && !asset ? <div className="mt-4 grid aspect-[16/7] place-items-center rounded-md border border-dashed border-[#bfcde7] bg-[#f6f9ff] text-center"><div><Loader2 size={16} className="mx-auto animate-spin text-[#285fc0]" /><div className="mt-2 text-[9px] font-mono uppercase text-[#285fc0]">{visual}</div></div></div> : null}
        <h3 className="mt-5 text-[13px] font-semibold">{action.payload?.title || `Campaign action ${index + 1}`}</h3>
        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-[#26221f]">{copy}</p>
      </article>
      <aside className="bg-[#faf9f6] p-4"><div className="text-[8.5px] font-mono uppercase text-[#817b74]">Publishing status</div><div className="mt-2 inline-flex rounded bg-[#e7f2ed] px-2 py-1 text-[8.5px] font-mono uppercase text-[#256d5b]">{actionLabel(action)}</div>{visual ? <div className="mt-3"><div className="text-[8.5px] font-mono uppercase text-[#817b74]">Visual</div><div className={`mt-1 inline-flex rounded px-2 py-1 text-[8.5px] font-mono uppercase ${visual === 'Visual ready' ? 'bg-emerald-50 text-emerald-700' : visual === 'Visual needs attention' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-[#285fc0]'}`}>{visual}</div></div> : null}<div className="mt-4 text-[10.5px] font-semibold">{action.scheduledAt ? new Date(action.scheduledAt).toLocaleString() : 'Timing set by approved schedule'}</div><div className="mt-5 border-y border-[#e3dfd8] py-3"><div className="text-[8.5px] font-mono uppercase text-[#817b74]">Why this action</div><p className="mt-2 text-[10px] leading-5 text-[#615c56]">{action.rationale || 'The Campaign Intelligence team selected this action as part of the approved sequence.'}</p></div><div className="mt-4 text-[8.5px] font-mono uppercase text-[#817b74]">Success measure</div><p className="mt-1 text-[10px] text-[#615c56]">{action.successMetric || 'Defined in campaign measurement plan'}</p></aside>
    </div>
    <div className="mt-3 flex items-center justify-between"><div className="flex gap-1">{actions.map((item, itemIndex) => <button key={item.id} onClick={() => setIndex(itemIndex)} title={`Open action ${itemIndex + 1}`} className={`h-1 w-6 rounded ${itemIndex === index ? 'bg-[#256d5b]' : 'bg-[#d8d3cc]'}`} />)}</div><div className="flex gap-1"><button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="grid h-8 w-8 place-items-center rounded-md border border-[#d8d3cc] disabled:opacity-30" title="Previous post"><ArrowLeft size={13} /></button><button onClick={() => setIndex(Math.min(actions.length - 1, index + 1))} disabled={index === actions.length - 1} className="grid h-8 w-8 place-items-center rounded-md border border-[#d8d3cc] disabled:opacity-30" title="Next post"><ArrowRight size={13} /></button></div></div>
  </div>;
}

function ScheduleView({ actions, timezone }) {
  const groups = actions.reduce((result, action) => { const key = action.scheduledAt ? new Date(action.scheduledAt).toLocaleDateString() : 'Awaiting launch'; (result[key] ||= []).push(action); return result; }, {});
  return <div><div className="flex items-end justify-between"><div><h2 className="text-[15px] font-semibold">Campaign schedule</h2><p className="mt-1 text-[10px] text-[#817b74]">Every final action in the campaign timezone.</p></div><span className="rounded-md border border-[#d8d3cc] bg-white px-2 py-1.5 text-[9px] font-semibold">{timezone || 'UTC'}</span></div><div className="mt-4 border-t border-[#d8d3cc]">{Object.entries(groups).map(([date, rows]) => <section key={date} className="grid gap-3 border-b border-[#e3dfd8] py-4 sm:grid-cols-[110px_1fr]"><div><div className="text-[10.5px] font-semibold">{date}</div><div className="mt-1 text-[8.5px] font-mono uppercase text-[#817b74]">{rows.length} action{rows.length === 1 ? '' : 's'}</div></div><div className="space-y-2">{rows.map((action) => <div key={action.id} className="grid grid-cols-[26px_1fr_auto] items-center gap-3 rounded-md border border-[#d8d3cc] bg-white px-3 py-2.5"><span className="grid h-6 w-6 place-items-center rounded bg-[#171717] text-[8px] font-semibold text-white">{action.channel === 'x_organic' ? 'X' : action.channel.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><div className="truncate text-[10.5px] font-semibold">{action.payload?.title || action.actionType}</div><div className="mt-0.5 text-[9px] text-[#817b74]">{action.scheduledAt ? new Date(action.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Starts after approval'}</div></div><span className="rounded bg-[#edf3f0] px-2 py-1 text-[8px] font-mono uppercase text-[#256d5b]">{actionLabel(action)}</span></div>)}</div></section>)}</div></div>;
}

function StrategyView({ bundle }) {
  const audience = bundle?.audience || {};
  return <div><h2 className="text-[15px] font-semibold">Strategy at a glance</h2><p className="mt-1 text-[10px] text-[#817b74]">The operational decisions; detailed reasoning remains in Campaign Intelligence.</p><div className="mt-5 border-l-2 border-[#256d5b] bg-[#f1f6f3] px-4 py-3 text-[12px] font-semibold leading-5">{bundle?.positioning?.statement || bundle?.strategy || 'The accepted strategy will appear here.'}</div><div className="mt-5 grid gap-5 sm:grid-cols-2"><section><h3 className="text-[10.5px] font-semibold">Audience</h3><p className="mt-2 text-[10.5px] leading-5 text-[#615c56]">{audience.rationale || 'Audience is being finalized.'}</p></section><section><h3 className="text-[10.5px] font-semibold">Content system</h3><div className="mt-2 divide-y divide-[#e3dfd8] border-y border-[#e3dfd8]">{(bundle?.content_pillars || []).map((pillar) => <div key={pillar} className="py-2 text-[10.5px]">{pillar}</div>)}</div></section></div></div>;
}

function ReactionsView({ metrics, events }) {
  const latest = metrics?.[0]?.metrics || {};
  const comments = (events || []).filter((event) => event.eventType === 'campaign_provider_comment_received' && event.data?.comment);
  const values = [['Impressions', latest.impressions], ['Engagements', latest.engagements], ['Link clicks', latest.clicks ?? latest.url_clicks ?? latest.link_clicks], ['Replies', latest.comments ?? latest.replies ?? comments.length], ['Follows', latest.follows]];
  return <div><h2 className="text-[15px] font-semibold">Audience reactions</h2><p className="mt-1 text-[10px] text-[#817b74]">Verified provider results only. Missing metrics remain unavailable, never estimated.</p><div className="mt-5 grid grid-cols-2 border-y border-[#d8d3cc] sm:grid-cols-5">{values.map(([label, value], index) => <div key={label} className={`px-3 py-4 ${index ? 'border-l border-[#e3dfd8]' : ''}`}><div className="text-[18px] font-semibold">{value ?? '—'}</div><div className="mt-1 text-[8px] font-mono uppercase text-[#817b74]">{label}</div></div>)}</div><div className="mt-6 border-y border-[#e3dfd8] py-4"><h3 className="text-[10.5px] font-semibold">Recent replies</h3>{comments.length ? <div className="mt-3 divide-y divide-[#e3dfd8]">{comments.slice(0, 8).map((event) => <article key={event.id} className="py-3"><div className="flex items-center justify-between gap-3"><span className="truncate text-[10px] font-semibold">{event.data.comment.author || 'Audience member'}</span><time className="shrink-0 text-[8px] font-mono text-[#817b74]">{new Date(event.data.comment.received_at || event.createdAt).toLocaleString()}</time></div><p className="mt-1.5 whitespace-pre-wrap text-[10.5px] leading-5 text-[#514c47]">{event.data.comment.text}</p></article>)}</div> : <p className="mt-2 text-[10.5px] text-[#817b74]">Replies and comments will appear here as connected channels report them.</p>}</div></div>;
}

function ControlsView({ campaign, readiness, canLaunch, onLaunch, busy, onOpenRoom }) {
  const postLaunch = ['RUNNING', 'SCHEDULED', 'PAUSED', 'COMPLETED', 'FAILED'].includes(campaign.status);
  return <div><div className="flex items-start justify-between gap-4"><div><h2 className="text-[15px] font-semibold">Campaign controls</h2><p className="mt-1 text-[10px] text-[#817b74]">Health, connections, approval policy, recovery, and audit.</p></div><button onClick={() => onOpenRoom(campaign.roomId, campaign.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#cfc9c1] bg-white px-3 text-[10px] font-semibold"><ExternalLink size={12} />Campaign Intelligence</button></div><div className="mt-5 flex items-center justify-between border-y border-[#d8d3cc] py-3"><div><div className="text-[10.5px] font-semibold">{postLaunch ? 'Campaign health' : 'Launch readiness'}</div><div className="mt-1 text-[9.5px] text-[#817b74]">{campaign.autonomyMode === 'FULL_AUTO' ? 'Auto operation' : 'Manual Review'} · {STATUS_LABEL[campaign.status] || campaign.status}</div></div><span className={`rounded px-2 py-1 text-[8px] font-mono uppercase ${readiness?.decision === 'ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{readiness?.decision === 'ready' && postLaunch ? 'healthy' : readiness?.decision || 'checking'}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{(readiness?.checks || []).map((item) => <div key={item.id} className="flex items-start gap-2.5 bg-[#f7f8f5] px-3 py-2.5">{item.status === 'passed' ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-700" /> : <Circle size={13} className="mt-0.5 shrink-0 fill-amber-500 text-amber-500" />}<div><div className="text-[10px] font-semibold">{item.label}</div>{item.status !== 'passed' ? <div className="mt-1 text-[9px] leading-4 text-[#817b74]">{item.detail}</div> : null}</div></div>)}</div><div className="mt-5 flex justify-end gap-2">{campaign.status === 'READY_FOR_APPROVAL' ? <button onClick={() => onLaunch('launch')} disabled={!canLaunch || busy} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#171717] px-4 text-[10.5px] font-semibold text-white disabled:bg-[#aaa49c]"><Rocket size={13} />Launch campaign</button> : null}{['RUNNING', 'SCHEDULED'].includes(campaign.status) ? <button onClick={() => onLaunch('pause')} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#cfc9c1] px-4 text-[10.5px] font-semibold"><Pause size={13} />Pause</button> : null}{campaign.status === 'PAUSED' ? <button onClick={() => onLaunch('resume')} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#171717] px-4 text-[10.5px] font-semibold text-white"><Play size={13} />Resume</button> : null}</div></div>;
}

export default function CampaignProgressDashboard({ campaign, loading, onClose, onOpenRoom, onLaunch, busy, executionEnabled }) {
  const [tab, setTab] = useState('posts');
  if (loading && !campaign) return <div className="grid min-h-[420px] place-items-center"><Loader2 className="animate-spin text-[#77716a]" size={22} /></div>;
  const actions = campaign.actions || []; const readiness = campaign.readiness;
  const plan = campaign.planVersions?.find((item) => item.id === campaign.currentPlanVersionId) || campaign.planVersions?.[0];
  const counts = actions.reduce((result, action) => { const key = actionLabel(action); result[key] = (result[key] || 0) + 1; return result; }, {});
  const canLaunch = campaign.status === 'READY_FOR_APPROVAL' && executionEnabled && readiness?.decision === 'ready';
  return <div className="grid h-full grid-rows-[auto_1fr] bg-[#fbfaf6]">
    <header className="border-b border-[#dfdbd4] bg-white px-5 py-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><button onClick={onClose} className="inline-flex items-center gap-1.5 text-[9.5px] font-semibold text-[#6f6962]"><ArrowLeft size={11} />All campaigns</button><h1 className="mt-2 truncate text-[17px] font-semibold">{campaign.name}</h1><div className="mt-1 flex flex-wrap items-center gap-2 text-[9.5px] text-[#817b74]"><span>{campaign.brief?.duration_days || 14}-day campaign</span><span>·</span><span>{campaign.requestedChannels.map((id) => CHANNEL_NAMES[id] || id).join(', ')}</span><span className="rounded bg-[#e7f2ed] px-1.5 py-0.5 font-mono uppercase text-[#256d5b]">{STATUS_LABEL[campaign.status] || campaign.status}</span></div></div><div className="flex items-center gap-4"><div className="hidden gap-4 sm:flex">{[['Published', counts.Published || 0], ['Scheduled', counts.Scheduled || 0], ['Attention', counts['Needs attention'] || 0]].map(([label, value]) => <div key={label} className="text-right"><div className="text-[14px] font-semibold">{value}</div><div className="text-[7.5px] font-mono uppercase text-[#817b74]">{label}</div></div>)}</div><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md border border-[#e3dfd8]" title="Close campaign"><X size={14} /></button></div></div><div className="mx-auto max-w-xl"><LaunchProgress campaign={campaign} /></div></header>
    <div className="grid min-h-0 md:grid-cols-[155px_1fr]"><nav className="flex overflow-x-auto border-b border-[#dfdbd4] bg-[#f3f5f2] p-2 md:block md:border-b-0 md:border-r">{TABS.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-[10.5px] font-semibold md:w-full ${tab === id ? 'bg-white text-[#171717] shadow-sm' : 'text-[#6f746f]'}`}><Icon size={13} />{label}{id === 'posts' || id === 'schedule' ? <span className="ml-auto rounded border border-[#d8d3cc] px-1.5 py-0.5 text-[8px] font-mono">{actions.length}</span> : null}</button>)}</nav><main className="min-w-0 overflow-y-auto p-4 sm:p-6">{tab === 'posts' ? <PostsView actions={actions} /> : tab === 'schedule' ? <ScheduleView actions={actions} timezone={campaign.schedulePolicy?.timezone} /> : tab === 'strategy' ? <StrategyView bundle={plan?.bundle} /> : tab === 'reactions' ? <ReactionsView metrics={campaign.metricSnapshots} events={campaign.events} /> : <ControlsView campaign={campaign} readiness={readiness} canLaunch={canLaunch} onLaunch={onLaunch} busy={busy} onOpenRoom={onOpenRoom} />}</main></div>
  </div>;
}
