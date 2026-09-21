import React, { useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Gauge, Image, Link2, Loader2, Sparkles, X } from 'lucide-react';
import { CAMPAIGN_CHANNEL_IDS, CHANNEL_DESCRIPTIONS, CHANNEL_NAMES } from './channel-catalog';

export const CAMPAIGN_TYPES = [
  ['AWARENESS', 'Build awareness'],
  ['PRODUCT_LAUNCH', 'Launch a product'],
  ['LEAD_GENERATION', 'Generate leads'],
  ['WEBSITE_TRAFFIC', 'Drive website visits'],
  ['THOUGHT_LEADERSHIP', 'Build authority'],
  ['EVENT_PROMOTION', 'Promote an event'],
  ['RE_ENGAGEMENT', 'Re-engage an audience'],
  ['CUSTOM', 'Something else'],
];

const CAMPAIGN_CHANNELS = new Set(CAMPAIGN_CHANNEL_IDS);
const PRIMARY_CHANNELS = new Set(['x_organic', 'gmail', 'tara', 'x_ads', 'google_ads', 'meta', 'linkedin']);
const CONNECTABLE_CHANNELS = new Set([
  'x_organic', 'linkedin', 'instagram', 'facebook', 'tiktok', 'youtube', 'pinterest', 'reddit', 'threads', 'bluesky', 'google_business',
  'x_ads', 'google_ads', 'meta', 'linkedin_ads', 'tiktok_ads', 'pinterest_ads', 'gmail', 'tara',
]);
const VISUAL_CHANNELS = new Set(['x_organic', 'linkedin', 'instagram', 'facebook', 'tiktok', 'youtube', 'pinterest', 'reddit', 'threads', 'bluesky', 'google_business', 'x_ads', 'google_ads', 'meta', 'linkedin_ads', 'youtube_ads', 'tiktok_ads', 'microsoft_ads', 'apple_ads', 'amazon_ads', 'reddit_ads', 'pinterest_ads', 'snapchat_ads']);
export const CAMPAIGN_WIZARD_STEPS = ['Outcome', 'Brief', 'Channels', 'Production', 'Review'];
export const CAMPAIGN_HORIZONS = [
  { days: 7, label: 'Quick test', note: '7 days' },
  { days: 14, label: 'Focused campaign', note: '2 weeks' },
  { days: 30, label: 'Sustained campaign', note: '30 days' },
];
export const CAMPAIGN_INTENSITIES = [
  { id: 'light', label: 'Light', note: 'A few strong actions' },
  { id: 'focused', label: 'Focused', note: 'Consistent presence' },
  { id: 'high', label: 'High visibility', note: 'Frequent coordinated actions' },
];
const ACTION_RANGES = {
  light: [[3, 4], [4, 6], [8, 12]],
  focused: [[4, 6], [6, 8], [12, 16]],
  high: [[6, 8], [9, 12], [18, 24]],
};
const DIRECT_ACTION_RANGES = {
  light: [[1, 2], [2, 3], [3, 5]],
  focused: [[2, 3], [3, 5], [5, 8]],
  high: [[3, 5], [5, 8], [8, 12]],
};

export function campaignPaceSummary({ durationDays = 14, intensity = 'focused', channels = [] }) {
  const horizon = durationDays <= 7 ? 0 : durationDays <= 14 ? 1 : 2;
  const [minimum, maximum] = (ACTION_RANGES[intensity] || ACTION_RANGES.focused)[horizon];
  const names = channels.map((channel) => CHANNEL_NAMES[channel] || channel);
  const selected = channels.length ? channels : ['x_organic'];
  const actionSummary = selected.map((channel) => {
    const ranges = channel === 'x_organic' ? ACTION_RANGES : DIRECT_ACTION_RANGES;
    const [low, high] = (ranges[intensity] || ranges.focused)[horizon];
    return `${low}-${high} ${CHANNEL_NAMES[channel] || channel} action${high === 1 ? '' : 's'}`;
  }).join(', ');
  return { minimum, maximum, channelLabel: names.length ? names.join(' + ') : 'your ready channels', actionSummary };
}
const SUCCESS_METRICS = {
  AWARENESS: ['Reach', 'Impressions', 'Engagements'],
  PRODUCT_LAUNCH: ['Reach', 'Link clicks', 'Qualified replies'],
  LEAD_GENERATION: ['Qualified replies', 'Meetings booked', 'Conversion rate'],
  WEBSITE_TRAFFIC: ['Link clicks', 'Click-through rate', 'Website visits'],
  THOUGHT_LEADERSHIP: ['Impressions', 'Engagements', 'Qualified replies'],
  EVENT_PROMOTION: ['Registrations', 'Link clicks', 'Qualified replies'],
  RE_ENGAGEMENT: ['Replies', 'Reactivated leads', 'Meetings booked'],
  CUSTOM: ['Reach', 'Engagements', 'Qualified replies'],
};

export function deriveCampaignPayload(form, capabilities, idempotencyKey, timezone = 'UTC') {
  const availableChannels = (capabilities?.channels || [])
    .filter((channel) => CAMPAIGN_CHANNELS.has(channel.id) && channel.executable)
    .map((channel) => channel.id);
  const launchReadyChannels = (capabilities?.channels || [])
    .filter((channel) => CAMPAIGN_CHANNELS.has(channel.id) && channel.execution_ready)
    .map((channel) => channel.id);
  const channels = form.channels.length ? form.channels : (launchReadyChannels.length ? launchReadyChannels : availableChannels);
  const durationDays = Number(form.durationDays || 14);
  const intensity = form.intensity || 'focused';
  const actionCount = form.actionCount === 'auto' || form.actionCount == null ? null : Number(form.actionCount);
  const visualsRequired = Boolean(form.visualsRequired && channels.some((channel) => VISUAL_CHANNELS.has(channel)));
  return {
    name: '',
    objective: form.objective,
    goal: form.goal.trim(),
    channels,
    audience: { mode: 'existing_first', discover_if_insufficient: true, description: form.audience?.trim() || '' },
    offer: form.offer?.trim() || '',
    cta: form.cta?.trim() || '',
    destination_url: '',
    geography: [],
    languages: ['English'],
    duration_days: durationDays,
    intensity,
    cadence: { preset: intensity },
    action_count: actionCount,
    visuals_required: visualsRequired,
    visual_delivery: { required: visualsRequired, count: visualsRequired ? actionCount : null, coherence: 'shared_campaign_system' },
    brand_constraints: '',
    prohibited_claims: '',
    success_metrics: SUCCESS_METRICS[form.objective] || SUCCESS_METRICS.CUSTOM,
    autonomy_mode: 'APPROVE_PLAN_ONCE',
    idempotency_key: idempotencyKey,
    timezone,
  };
}

export default function CreateCampaignWizard({ capabilities, autonomyMode = 'MANUAL_REVIEW', onClose, onCreate, onConnect }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showMoreChannels, setShowMoreChannels] = useState(false);
  const idempotencyKey = useRef(window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const [form, setForm] = useState({ objective: 'AWARENESS', goal: '', audience: '', offer: '', cta: '', channels: [], durationDays: 14, intensity: 'focused', actionCount: 'auto', visualsRequired: true });
  const readyChannels = useMemo(() => (capabilities?.channels || []).filter((channel) => CAMPAIGN_CHANNELS.has(channel.id) && channel.executable), [capabilities]);
  const visibleChannels = useMemo(() => (capabilities?.channels || []).filter((channel) => CAMPAIGN_CHANNELS.has(channel.id) && channel.planning_ready), [capabilities]);
  const primaryChannels = useMemo(() => visibleChannels.filter((channel) => PRIMARY_CHANNELS.has(channel.id)), [visibleChannels]);
  const moreChannels = useMemo(() => visibleChannels.filter((channel) => !PRIMARY_CHANNELS.has(channel.id)), [visibleChannels]);
  const selected = useMemo(() => new Set(form.channels), [form.channels]);
  const selectedConnections = useMemo(() => visibleChannels.filter((channel) => selected.has(channel.id) && CONNECTABLE_CHANNELS.has(channel.id) && !channel.connected), [selected, visibleChannels]);
  const selectedForSummary = form.channels.length ? form.channels : readyChannels.filter((channel) => channel.execution_ready).map((channel) => channel.id);
  const pace = campaignPaceSummary({ durationDays: form.durationDays, intensity: form.intensity, channels: selectedForSummary });
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const canContinue = step !== 1 || form.goal.trim().length >= 12;

  const submit = async () => {
    if (form.goal.trim().length < 12) { setError('Describe what you want this campaign to achieve.'); return; }
    const payload = deriveCampaignPayload(form, capabilities, idempotencyKey.current, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    if (!payload.channels.length) { setError('Select at least one channel for the campaign plan.'); return; }
    setBusy(true); setError('');
    try { await onCreate(payload); }
    catch (err) { setError(err?.response?.data?.message || err.message || 'Could not create campaign'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="create-campaign-title">
    <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#d8d3cc] bg-[#fffefa] shadow-xl">
      <header className="flex shrink-0 items-center justify-between border-b border-[#e6e2dc] px-5 py-4">
        <div>
          <div className="flex items-center gap-2"><Sparkles size={14} /><h2 id="create-campaign-title" className="text-[14px] font-semibold">Create a campaign</h2></div>
          <p className="mt-1 text-[10.5px] text-[#817b74]">Tell the Campaign Room the outcome. Your agents handle the strategy, content, audience, and schedule.</p>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-[#f2efe9]" title="Close" aria-label="Close"><X size={15} /></button>
      </header>

      <div className="border-b border-[#eeeae4] px-5 py-3">
        <div className="mx-auto flex max-w-xl items-center justify-center gap-2" aria-label={`Step ${step + 1} of ${CAMPAIGN_WIZARD_STEPS.length}`}>
          {CAMPAIGN_WIZARD_STEPS.map((label, index) => <React.Fragment key={label}><button type="button" onClick={() => index < step && setStep(index)} className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] font-semibold ${index <= step ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#d8d3cc] bg-white text-[#817b74]'}`} aria-label={label}>{index < step ? <Check size={11} /> : index + 1}</button>{index < CAMPAIGN_WIZARD_STEPS.length - 1 ? <span className={`h-px w-8 sm:w-14 ${index < step ? 'bg-[#171717]' : 'bg-[#d8d3cc]'}`} /> : null}</React.Fragment>)}
        </div>
        <div className="mt-2 text-center text-[10px] font-mono uppercase tracking-[0.14em] text-[#817b74]">{CAMPAIGN_WIZARD_STEPS[step]}</div>
      </div>

      <div className="overflow-y-auto p-5 sm:p-7">
        {step === 0 ? <section className="mx-auto max-w-2xl text-center">
          <h3 className="text-[11px] font-semibold text-[#34312e]">What kind of campaign is this?</h3>
          <p className="mt-2 text-[11px] text-[#817b74]">Choose the business outcome. The Campaign Room will challenge the positioning before it produces anything.</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{CAMPAIGN_TYPES.map(([id, label]) => <button key={id} type="button" onClick={() => patch('objective', id)} className={`min-h-16 rounded-md border px-3 text-left text-[11px] transition ${form.objective === id ? 'border-[#171717] bg-white font-semibold shadow-sm' : 'border-[#d8d3cc] bg-[#faf8f3] text-[#615c56] hover:border-[#aaa49c]'}`}>{label}</button>)}</div>
        </section> : null}

        {step === 1 ? <section className="mx-auto max-w-2xl">
          <label htmlFor="campaign-goal" className="text-[11px] font-semibold text-[#34312e]">What should your AI team accomplish?</label>
          <textarea id="campaign-goal" autoFocus rows={4} maxLength={8000} value={form.goal} onChange={(event) => patch('goal', event.target.value)} placeholder="Example: Introduce our new product to European founders, build trust, and start qualified conversations." className="mt-2 w-full resize-none rounded-md border border-[#cfc9c1] p-3 text-[13px] leading-5 outline-none focus:border-[#171717]" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[10.5px] font-semibold">Who should this reach?<input value={form.audience} onChange={(event) => patch('audience', event.target.value)} placeholder="German law firms with 20–200 employees" className="mt-1.5 h-10 w-full rounded-md border border-[#cfc9c1] px-3 text-[11px] font-normal outline-none focus:border-[#171717]" /></label><label className="text-[10.5px] font-semibold">What are you offering?<input value={form.offer} onChange={(event) => patch('offer', event.target.value)} placeholder="A governed company-memory assessment" className="mt-1.5 h-10 w-full rounded-md border border-[#cfc9c1] px-3 text-[11px] font-normal outline-none focus:border-[#171717]" /></label></div>
          <label className="mt-3 block text-[10.5px] font-semibold">Desired next step<input value={form.cta} onChange={(event) => patch('cta', event.target.value)} placeholder="Book a founder-led discovery call" className="mt-1.5 h-10 w-full rounded-md border border-[#cfc9c1] px-3 text-[11px] font-normal outline-none focus:border-[#171717]" /></label>
        </section> : null}

        {step === 2 ? <section className="mx-auto max-w-2xl">
          <div className="flex items-baseline justify-between gap-3"><h3 className="text-[11px] font-semibold text-[#34312e]">Channels <span className="font-normal text-[#817b74]">(optional)</span></h3><span className="text-[9.5px] text-[#817b74]">Leave blank to use channels ready to launch</span></div>
          {visibleChannels.length ? <><div className="mt-3 flex flex-wrap gap-2">{primaryChannels.map((channel) => {
            const active = selected.has(channel.id);
            return <button key={channel.id} type="button" title={CHANNEL_DESCRIPTIONS[channel.id]} onClick={() => patch('channels', active ? form.channels.filter((id) => id !== channel.id) : [...form.channels, channel.id])} className={`flex min-h-12 items-center gap-2 rounded-md border px-3 text-left text-[11px] font-semibold ${active ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#c9c3bb] bg-white text-[#45413d]'}`} aria-pressed={active}>{active ? <Check size={12} /> : null}<span><span className="block">{CHANNEL_NAMES[channel.id]}</span>{CHANNEL_DESCRIPTIONS[channel.id] ? <span className={`mt-0.5 block text-[8.5px] font-normal ${active ? 'text-white/70' : 'text-[#817b74]'}`}>{CHANNEL_DESCRIPTIONS[channel.id]}</span> : null}</span><span className={`ml-auto text-[9px] font-normal ${active ? 'text-white/70' : 'text-[#817b74]'}`}>{channel.execution_ready ? 'Ready' : 'Plan only'}</span></button>;
          })}</div>{moreChannels.length ? <div className="mt-2"><button type="button" onClick={() => setShowMoreChannels((value) => !value)} className="inline-flex h-8 items-center gap-1.5 text-[10px] font-semibold text-[#615c56]">More channels <ChevronDown size={12} className={showMoreChannels ? 'rotate-180' : ''} /></button>{showMoreChannels ? <div className="mt-1 flex flex-wrap gap-2">{moreChannels.map((channel) => { const active = selected.has(channel.id); return <button key={channel.id} type="button" onClick={() => patch('channels', active ? form.channels.filter((id) => id !== channel.id) : [...form.channels, channel.id])} className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[11px] font-semibold ${active ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#c9c3bb] bg-white text-[#45413d]'}`} aria-pressed={active}>{active ? <Check size={12} /> : null}{CHANNEL_NAMES[channel.id]}<span className={`text-[9px] font-normal ${active ? 'text-white/70' : 'text-[#817b74]'}`}>Plan only</span></button>; })}</div> : null}</div> : null}</> : <div className="mt-3 rounded-md border border-[#ded9d2] bg-[#faf8f3] px-3 py-3 text-[10.5px] text-[#615c56]">Campaign planning is unavailable for this organization.</div>}
          {form.channels.some((id) => !visibleChannels.find((channel) => channel.id === id)?.execution_ready) ? <p className="mt-2 text-[9.5px] leading-4 text-[#817b74]">Plan-only channels receive complete creative, media, budget, and measurement plans. Publishing stays blocked until the required account and adapter are connected.</p> : null}
          {selectedConnections.length ? <div className="mt-2 flex flex-wrap items-center gap-2">{selectedConnections.map((channel) => <button key={channel.id} type="button" onClick={() => onConnect(channel.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#bdb7af] bg-white px-3 text-[10px] font-semibold text-[#45413d]"><Link2 size={11} />Connect {CHANNEL_NAMES[channel.id]}</button>)}</div> : null}
        </section> : null}

        {step === 3 ? <section className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2"><CalendarDays size={13} /><h3 className="text-[11px] font-semibold text-[#34312e]">How much campaign should your AI team prepare?</h3></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">{CAMPAIGN_HORIZONS.map((option) => <button key={option.days} type="button" onClick={() => patch('durationDays', option.days)} className={`min-h-14 rounded-md border px-3 text-left ${form.durationDays === option.days ? 'border-[#171717] bg-white' : 'border-[#d8d3cc] bg-[#faf8f3]'}`}><span className="block text-[11px] font-semibold">{option.label}</span><span className="mt-0.5 block text-[9.5px] text-[#817b74]">{option.note}</span></button>)}</div>
          <div className="mt-4 flex items-center gap-2"><Gauge size={13} /><h3 className="text-[11px] font-semibold text-[#34312e]">Campaign pace</h3></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">{CAMPAIGN_INTENSITIES.map((option) => <button key={option.id} type="button" onClick={() => patch('intensity', option.id)} className={`min-h-14 rounded-md border px-3 text-left ${form.intensity === option.id ? 'border-[#171717] bg-white' : 'border-[#d8d3cc] bg-[#faf8f3]'}`}><span className="block text-[11px] font-semibold">{option.label}</span><span className="mt-0.5 block text-[9.5px] text-[#817b74]">{option.note}</span></button>)}</div>
          <div className="mt-3 border-l-2 border-[#256d5b] bg-[#f2f7f4] px-3 py-2.5 text-[10.5px] leading-5 text-[#31554b]">
            Your agents will design a {form.durationDays}-day {form.intensity} campaign for {pace.channelLabel}, producing {pace.actionSummary} and a complete approval-ready schedule.
          </div>
          <div className="mt-5"><h3 className="text-[11px] font-semibold text-[#34312e]">How many campaign actions?</h3><div className="mt-3 grid grid-cols-4 gap-2">{[['auto', 'Recommended'], [3, '3'], [5, '5'], [7, '7']].map(([value, label]) => <button key={value} type="button" onClick={() => patch('actionCount', value)} className={`min-h-12 rounded-md border px-2 text-[10.5px] font-semibold ${form.actionCount === value ? 'border-[#171717] bg-white' : 'border-[#d8d3cc] bg-[#faf8f3] text-[#615c56]'}`}>{label}</button>)}</div></div>
          <button type="button" onClick={() => patch('visualsRequired', !form.visualsRequired)} className={`mt-5 flex w-full items-center gap-3 rounded-md border p-3 text-left ${form.visualsRequired ? 'border-[#171717] bg-white' : 'border-[#d8d3cc] bg-[#faf8f3]'}`} aria-pressed={form.visualsRequired}><span className={`grid h-9 w-9 place-items-center rounded-md ${form.visualsRequired ? 'bg-[#171717] text-white' : 'bg-[#ece9e3] text-[#817b74]'}`}><Image size={15} /></span><span><span className="block text-[11px] font-semibold">Generate a complete visual for every social action</span><span className="mt-0.5 block text-[9.5px] text-[#817b74]">Strategy and copy finish first. Then the image pipeline applies Brand DNA and keeps every shot coherent.</span></span></button>
        </section> : null}

        {step === 4 ? <section className="mx-auto max-w-2xl"><div className="text-center"><Sparkles size={20} className="mx-auto" /><h3 className="mt-3 text-[16px] font-semibold">Ready for the Campaign Room</h3><p className="mx-auto mt-2 max-w-lg text-[11px] leading-5 text-[#817b74]">Your HyperAgents will research the company and audience, debate the strongest position, write the full sequence, generate required visuals, and stop for human approval.</p></div><div className="mt-6 divide-y divide-[#e6e2dc] rounded-md border border-[#d8d3cc] bg-white px-4">{[['Outcome', CAMPAIGN_TYPES.find(([id]) => id === form.objective)?.[1]], ['Goal', form.goal], ['Channels', (selectedForSummary || []).map((id) => CHANNEL_NAMES[id] || id).join(', ') || 'Ready channels'], ['Production', `${form.durationDays} days · ${form.intensity} · ${form.actionCount === 'auto' ? 'recommended volume' : `${form.actionCount} actions`}`], ['Visuals', form.visualsRequired ? 'One coherent visual per social action' : 'Copy and plan only']].map(([label, value]) => <div key={label} className="grid grid-cols-[100px_1fr] gap-3 py-3"><span className="text-[9px] font-mono uppercase text-[#817b74]">{label}</span><span className="text-[11px] leading-4 text-[#34312e]">{value}</span></div>)}</div></section> : null}

        {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</div> : null}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e6e2dc] px-5 py-4">
        <button type="button" onClick={() => step ? setStep(step - 1) : onClose()} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#c9c3bb] bg-white px-3 text-[10.5px] font-semibold"><ChevronLeft size={12} />{step ? 'Back' : 'Cancel'}</button>
        <p className="hidden max-w-sm text-center text-[9.5px] leading-4 text-[#817b74] sm:block">{autonomyMode === 'AUTO' ? 'Auto mode launches only after contract, provider, creative, visual, and safety checks pass.' : 'Manual Review keeps launch blocked until you approve the finished campaign.'}</p>
        {step < CAMPAIGN_WIZARD_STEPS.length - 1 ? <button type="button" onClick={() => canContinue && setStep(step + 1)} disabled={!canContinue} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#171717] px-4 text-[11.5px] font-semibold text-white disabled:bg-[#bbb5ad]">Continue<ChevronRight size={13} /></button> : <button onClick={submit} disabled={busy || form.goal.trim().length < 12 || (!form.channels.length && !readyChannels.length)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[#171717] px-4 text-[11.5px] font-semibold text-white disabled:bg-[#bbb5ad]">{busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}Create Campaign Room</button>}
      </footer>
    </div>
  </div>;
}
