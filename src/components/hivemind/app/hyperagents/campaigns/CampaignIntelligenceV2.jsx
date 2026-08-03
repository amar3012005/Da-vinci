import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight, Bot, Check, CircleDot, Link2, Megaphone, Radio,
  Send, Sparkles, Target, Unplug, UserCheck,
} from 'lucide-react';
import { CHANNEL_NAMES, PAID_CHANNEL_IDS } from './channel-catalog';

export const CAMPAIGN_INTELLIGENCE_V2 = process.env.REACT_APP_CAMPAIGN_INTELLIGENCE_V2 !== 'false';

const QUICK_RUNS = [
  {
    icon: Radio,
    title: 'Launch an awareness sequence',
    detail: 'Plan, create, schedule, and measure a focused 7-day organic campaign.',
    prompt: 'Create and operate a focused 7-day awareness campaign. Choose the strongest connected organic channels, produce the full scheduled sequence, and define what the team should measure. Do not publish until the campaign contract is ready.',
  },
  {
    icon: Link2,
    title: 'Turn a page into a campaign',
    detail: 'Research a product or landing page and build the campaign around it.',
    prompt: 'Research the product or landing page I provide, identify its strongest campaign angle, and turn it into a complete multichannel campaign with final copy, visuals, timing, and measurement.',
  },
  {
    icon: Megaphone,
    title: 'Prepare organic and paid launch',
    detail: 'Build coordinated organic posts and ad-ready creative without launching yet.',
    prompt: 'Prepare a coordinated organic and paid launch campaign. Use only channels that fit the objective, produce final organic actions and ad-ready creative, and keep every external action in draft until launch approval.',
  },
  {
    icon: Target,
    title: 'Improve a running campaign',
    detail: 'Read current results and recommend the next actions based on evidence.',
    prompt: 'Review the performance of our active campaigns, identify what is working and what is underperforming, then propose the next campaign actions. Make evidence and assumptions explicit.',
  },
];

export function CampaignIntelligenceQuickRuns({ busy, onRun, onStartCampaign }) {
  return <section className="border-b border-[#d6e1f7] bg-[#f7f9fd] px-4 py-3 md:px-6" aria-label="Ready campaign runs">
    <div className="mx-auto grid max-w-[1180px] gap-2 md:grid-cols-3">
      {QUICK_RUNS.slice(0, 3).map(({ icon: Icon, title, detail, prompt }) => (
        <button
          key={title}
          type="button"
          disabled={busy}
          onClick={() => onStartCampaign ? onStartCampaign({ title, prompt }) : onRun(prompt)}
          className="group flex min-h-[72px] items-center gap-3 rounded-md border border-[#c8d8f4] bg-white px-3.5 py-3 text-left shadow-[0_12px_30px_-24px_rgba(20,57,126,0.65)] transition hover:-translate-y-0.5 hover:border-[#3775df] hover:bg-[#f5f8ff] disabled:opacity-50"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e0ebff] text-[#1e54b4]"><Icon size={14} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#102965]">{title}</span><span className="mt-0.5 block text-[9.5px] leading-4 text-[#58719e]">{detail}</span></span>
          <ArrowUpRight size={13} className="shrink-0 text-[#8da8d8] transition group-hover:text-[#1e54b4]" />
        </button>
      ))}
    </div>
  </section>;
}

function channelState(channel) {
  if (channel?.execution_ready) return { label: 'Ready', tone: 'text-emerald-700 bg-emerald-50', ready: true };
  if (channel?.connected) return { label: 'Connected', tone: 'text-blue-700 bg-blue-50', ready: false };
  return { label: 'Connect', tone: 'text-[#766f67] bg-[#efede8]', ready: false };
}

export function CampaignIntelligenceLaunchpad({ busy, onRun, autonomyMode = 'MANUAL_REVIEW' }) {
  const [request, setRequest] = useState('');
  const submit = () => {
    const prompt = request.trim();
    if (!prompt || busy) return;
    onRun(prompt);
    setRequest('');
  };

  return <section className="border-b border-[#e3e0db] bg-[#fbfcfa] px-6 py-7 md:px-10 md:py-8">
    <div className="max-w-[1080px]">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#256d5b]"><Sparkles size={11} />Campaign command</div>
          <h2 className="mt-1 text-[20px] font-semibold text-[#171717]">Tell your campaign team what outcome you want</h2>
          <p className="mt-1 max-w-[720px] text-[11.5px] leading-5 text-[#6f6962]">The Director chooses the useful depth: a direct answer, a content task, a full campaign, execution, or performance review.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 self-start rounded-md border border-[#d8d3cc] bg-white px-2.5 py-1.5 text-[9.5px] font-semibold text-[#514c47]">
          {autonomyMode === 'AUTO' ? <Bot size={11} /> : <UserCheck size={11} />}
          {autonomyMode === 'AUTO' ? 'Auto operation' : 'Manual review'}
        </div>
      </div>

      <div className="mt-5 flex items-end gap-2 rounded-md border border-[#cfc9c1] bg-white p-2 shadow-[0_12px_34px_-28px_rgba(0,0,0,0.45)]">
        <textarea
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }}
          rows={2}
          placeholder="Example: Launch HIVEMIND to European law firms across X and LinkedIn for the next 14 days."
          className="min-h-[58px] flex-1 resize-none bg-transparent px-2 py-1 text-[12.5px] leading-5 text-[#171717] outline-none placeholder:text-[#aaa49c]"
        />
        <button type="button" onClick={submit} disabled={busy || !request.trim()} title="Send to the campaign team" className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#171717] text-white disabled:bg-[#aaa49c]">
          <Send size={14} />
        </button>
      </div>

      <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-[#ddd8d1] bg-[#ddd8d1] sm:grid-cols-2">
        {QUICK_RUNS.map(({ icon: Icon, title, detail, prompt }) => <button key={title} type="button" disabled={busy} onClick={() => onRun(prompt)} className="group flex min-h-[92px] items-start gap-3 bg-white px-4 py-4 text-left hover:bg-[#f4f8f5] disabled:opacity-50">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#eaf4ef] text-[#256d5b]"><Icon size={15} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[11.5px] font-semibold text-[#24211f]">{title}</span><span className="mt-1 block text-[10px] leading-4 text-[#817b74]">{detail}</span></span>
          <ArrowUpRight size={13} className="mt-1 shrink-0 text-[#aaa49c] group-hover:text-[#256d5b]" />
        </button>)}
      </div>
    </div>
  </section>;
}

export function CampaignConnectionsRail({ capabilities, onConnect, onDisconnect, onSelectAdAccount }) {
  const visible = useMemo(() => {
    const channels = capabilities?.channels || [];
    const preferred = ['x_organic', 'linkedin', 'instagram', 'meta', 'x_ads', 'google_ads'];
    return preferred.map((id) => channels.find((channel) => channel.id === id) || {
      id, connected: false, executable: false, execution_ready: false, planning_ready: true,
    });
  }, [capabilities?.channels]);
  const organicReady = visible.filter((channel) => !PAID_CHANNEL_IDS.has(channel.id) && channel.execution_ready).length;
  const adsReady = visible.filter((channel) => PAID_CHANNEL_IDS.has(channel.id) && channel.execution_ready).length;
  const providerStatus = capabilities?.status || (capabilities?.configured === false ? 'UNAVAILABLE' : null);
  const connectedAccounts = Array.isArray(capabilities?.connected_accounts) ? capabilities.connected_accounts.filter((account) => account.status === 'CONNECTED') : [];

  return <section className="mt-4 border-t border-[#d8d3cc] pt-4" aria-label="Campaign channels">
    <div className="flex items-center justify-between gap-2">
      <div className="text-[9px] font-mono uppercase text-[#256d5b]">Campaign channels</div>
      <span className="text-[8.5px] font-mono text-[#817b74]">{providerStatus === 'DEGRADED' ? 'Sync needed' : `${organicReady + adsReady} ready`}</span>
    </div>
    <div className="mt-3 space-y-1.5">
      {visible.map((channel) => {
        const state = channelState(channel);
        const needsSelection = channel.connected && !state.ready && Array.isArray(channel.ad_accounts) && channel.ad_accounts.length > 0;
        return <React.Fragment key={channel.id}><button type="button" onClick={() => !state.ready && !needsSelection && onConnect?.(channel.id)} disabled={state.ready || needsSelection} className="flex w-full items-center gap-2 rounded-md border border-[#ded9d2] bg-white px-2.5 py-2 text-left disabled:cursor-default">
          {state.ready ? <Check size={11} className="shrink-0 text-emerald-700" /> : <CircleDot size={11} className="shrink-0 text-[#9a948d]" />}
          <span className="min-w-0 flex-1 truncate text-[9.5px] font-semibold text-[#3d3935]">{CHANNEL_NAMES[channel.id] || channel.id}</span>
          <span className={`rounded px-1.5 py-0.5 text-[7.5px] font-mono uppercase ${state.tone}`}>{needsSelection ? 'Select' : state.label}</span>
        </button>{needsSelection ? <div className="ml-5 border-l border-[#d8d3cc] pl-2">{channel.ad_accounts.map((account) => <button key={account.ad_account_ref} type="button" onClick={() => onSelectAdAccount?.(channel.id, account.publisher_account_ref, account.ad_account_ref)} className="flex w-full items-center justify-between gap-2 py-1.5 text-left"><span className="min-w-0 truncate text-[8.5px] font-semibold text-[#514c47]">{account.name}</span><span className="shrink-0 text-[7.5px] font-mono text-[#817b74]">{account.currency || ''}</span></button>)}</div> : null}</React.Fragment>;
      })}
    </div>
    <div className="mt-3 grid grid-cols-3 divide-x divide-[#ded9d2] border-y border-[#ded9d2] py-2 text-center">
      <div><div className="text-[9.5px] font-semibold text-[#2f342f]">{organicReady ? 'Yes' : 'No'}</div><div className="mt-0.5 text-[7.5px] font-mono uppercase text-[#8a847d]">Publish</div></div>
      <div><div className="text-[9.5px] font-semibold text-[#2f342f]">{organicReady ? 'Yes' : 'No'}</div><div className="mt-0.5 text-[7.5px] font-mono uppercase text-[#8a847d]">Schedule</div></div>
      <div><div className="text-[9.5px] font-semibold text-[#2f342f]">{adsReady ? 'Yes' : 'No'}</div><div className="mt-0.5 text-[7.5px] font-mono uppercase text-[#8a847d]">Run ads</div></div>
    </div>
    {connectedAccounts.length ? <div className="mt-3 space-y-1 border-t border-[#ded9d2] pt-3">
      {connectedAccounts.map((account) => <div key={account.account_ref} className="flex min-w-0 items-center gap-2 px-1 py-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
        <span className="min-w-0 flex-1 truncate text-[9px] text-[#514c47]">{account.label || account.username || account.platform}</span>
        <button type="button" onClick={() => onDisconnect?.(account.account_ref)} title={`Disconnect ${account.label || account.platform}`} className="grid h-6 w-6 shrink-0 place-items-center rounded text-[#9a645d] hover:bg-red-50 hover:text-red-700"><Unplug size={10} /></button>
      </div>)}
    </div> : null}
  </section>;
}
