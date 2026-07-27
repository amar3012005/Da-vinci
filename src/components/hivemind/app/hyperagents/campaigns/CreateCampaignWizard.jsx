import React, { useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, Gauge, Link2, Loader2, Sparkles, X } from 'lucide-react';
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
const CONNECTABLE_CHANNELS = new Set(['x_organic', 'gmail', 'tara']);
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
  return {
    name: '',
    objective: form.objective,
    goal: form.goal.trim(),
    channels,
    audience: { mode: 'existing_first', discover_if_insufficient: true },
    offer: '',
    cta: '',
    destination_url: '',
    geography: [],
    languages: ['English'],
    duration_days: durationDays,
    intensity,
    cadence: { preset: intensity },
    brand_constraints: '',
    prohibited_claims: '',
    success_metrics: SUCCESS_METRICS[form.objective] || SUCCESS_METRICS.CUSTOM,
    autonomy_mode: 'APPROVE_PLAN_ONCE',
    idempotency_key: idempotencyKey,
    timezone,
  };
}

export default function CreateCampaignWizard({ capabilities, onClose, onCreate, onConnect }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showMoreChannels, setShowMoreChannels] = useState(false);
  const idempotencyKey = useRef(window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const [form, setForm] = useState({ objective: 'AWARENESS', goal: '', channels: [], durationDays: 14, intensity: 'focused' });
  const readyChannels = useMemo(() => (capabilities?.channels || []).filter((channel) => CAMPAIGN_CHANNELS.has(channel.id) && channel.executable), [capabilities]);
  const visibleChannels = useMemo(() => (capabilities?.channels || []).filter((channel) => CAMPAIGN_CHANNELS.has(channel.id) && channel.planning_ready), [capabilities]);
  const primaryChannels = useMemo(() => visibleChannels.filter((channel) => PRIMARY_CHANNELS.has(channel.id)), [visibleChannels]);
  const moreChannels = useMemo(() => visibleChannels.filter((channel) => !PRIMARY_CHANNELS.has(channel.id)), [visibleChannels]);
  const selected = useMemo(() => new Set(form.channels), [form.channels]);
  const selectedConnections = useMemo(() => visibleChannels.filter((channel) => selected.has(channel.id) && CONNECTABLE_CHANNELS.has(channel.id) && !channel.connected), [selected, visibleChannels]);
  const selectedForSummary = form.channels.length ? form.channels : readyChannels.filter((channel) => channel.execution_ready).map((channel) => channel.id);
  const pace = campaignPaceSummary({ durationDays: form.durationDays, intensity: form.intensity, channels: selectedForSummary });
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));

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

      <div className="overflow-y-auto p-5 sm:p-6">
        <section>
          <h3 className="text-[11px] font-semibold text-[#34312e]">What kind of campaign is this?</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{CAMPAIGN_TYPES.map(([id, label]) => <button key={id} type="button" onClick={() => patch('objective', id)} className={`min-h-12 rounded-md border px-3 text-left text-[11px] ${form.objective === id ? 'border-[#171717] bg-white font-semibold' : 'border-[#d8d3cc] bg-[#faf8f3] text-[#615c56]'}`}>{label}</button>)}</div>
        </section>

        <section className="mt-6">
          <label htmlFor="campaign-goal" className="text-[11px] font-semibold text-[#34312e]">What should your AI team accomplish?</label>
          <textarea id="campaign-goal" autoFocus rows={4} maxLength={8000} value={form.goal} onChange={(event) => patch('goal', event.target.value)} placeholder="Example: Introduce our new product to European founders, build trust, and start qualified conversations." className="mt-2 w-full resize-none rounded-md border border-[#cfc9c1] p-3 text-[13px] leading-5 outline-none focus:border-[#171717]" />
        </section>

        <section className="mt-6">
          <div className="flex items-baseline justify-between gap-3"><h3 className="text-[11px] font-semibold text-[#34312e]">Channels <span className="font-normal text-[#817b74]">(optional)</span></h3><span className="text-[9.5px] text-[#817b74]">Leave blank to use channels ready to launch</span></div>
          {visibleChannels.length ? <><div className="mt-3 flex flex-wrap gap-2">{primaryChannels.map((channel) => {
            const active = selected.has(channel.id);
            return <button key={channel.id} type="button" title={CHANNEL_DESCRIPTIONS[channel.id]} onClick={() => patch('channels', active ? form.channels.filter((id) => id !== channel.id) : [...form.channels, channel.id])} className={`flex min-h-12 items-center gap-2 rounded-md border px-3 text-left text-[11px] font-semibold ${active ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#c9c3bb] bg-white text-[#45413d]'}`} aria-pressed={active}>{active ? <Check size={12} /> : null}<span><span className="block">{CHANNEL_NAMES[channel.id]}</span>{CHANNEL_DESCRIPTIONS[channel.id] ? <span className={`mt-0.5 block text-[8.5px] font-normal ${active ? 'text-white/70' : 'text-[#817b74]'}`}>{CHANNEL_DESCRIPTIONS[channel.id]}</span> : null}</span><span className={`ml-auto text-[9px] font-normal ${active ? 'text-white/70' : 'text-[#817b74]'}`}>{channel.execution_ready ? 'Ready' : 'Plan only'}</span></button>;
          })}</div>{moreChannels.length ? <div className="mt-2"><button type="button" onClick={() => setShowMoreChannels((value) => !value)} className="inline-flex h-8 items-center gap-1.5 text-[10px] font-semibold text-[#615c56]">More channels <ChevronDown size={12} className={showMoreChannels ? 'rotate-180' : ''} /></button>{showMoreChannels ? <div className="mt-1 flex flex-wrap gap-2">{moreChannels.map((channel) => { const active = selected.has(channel.id); return <button key={channel.id} type="button" onClick={() => patch('channels', active ? form.channels.filter((id) => id !== channel.id) : [...form.channels, channel.id])} className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[11px] font-semibold ${active ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#c9c3bb] bg-white text-[#45413d]'}`} aria-pressed={active}>{active ? <Check size={12} /> : null}{CHANNEL_NAMES[channel.id]}<span className={`text-[9px] font-normal ${active ? 'text-white/70' : 'text-[#817b74]'}`}>Plan only</span></button>; })}</div> : null}</div> : null}</> : <div className="mt-3 rounded-md border border-[#ded9d2] bg-[#faf8f3] px-3 py-3 text-[10.5px] text-[#615c56]">Campaign planning is unavailable for this organization.</div>}
          {form.channels.some((id) => !visibleChannels.find((channel) => channel.id === id)?.execution_ready) ? <p className="mt-2 text-[9.5px] leading-4 text-[#817b74]">Plan-only channels receive complete creative, media, budget, and measurement plans. Publishing stays blocked until the required account and adapter are connected.</p> : null}
          {selectedConnections.length ? <div className="mt-2 flex flex-wrap items-center gap-2">{selectedConnections.map((channel) => <button key={channel.id} type="button" onClick={() => onConnect(channel.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#bdb7af] bg-white px-3 text-[10px] font-semibold text-[#45413d]"><Link2 size={11} />Connect {CHANNEL_NAMES[channel.id]}</button>)}</div> : null}
        </section>

        <section className="mt-6 border-t border-[#e6e2dc] pt-5">
          <div className="flex items-center gap-2"><CalendarDays size={13} /><h3 className="text-[11px] font-semibold text-[#34312e]">How much campaign should your AI team prepare?</h3></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">{CAMPAIGN_HORIZONS.map((option) => <button key={option.days} type="button" onClick={() => patch('durationDays', option.days)} className={`min-h-14 rounded-md border px-3 text-left ${form.durationDays === option.days ? 'border-[#171717] bg-white' : 'border-[#d8d3cc] bg-[#faf8f3]'}`}><span className="block text-[11px] font-semibold">{option.label}</span><span className="mt-0.5 block text-[9.5px] text-[#817b74]">{option.note}</span></button>)}</div>
          <div className="mt-4 flex items-center gap-2"><Gauge size={13} /><h3 className="text-[11px] font-semibold text-[#34312e]">Campaign pace</h3></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">{CAMPAIGN_INTENSITIES.map((option) => <button key={option.id} type="button" onClick={() => patch('intensity', option.id)} className={`min-h-14 rounded-md border px-3 text-left ${form.intensity === option.id ? 'border-[#171717] bg-white' : 'border-[#d8d3cc] bg-[#faf8f3]'}`}><span className="block text-[11px] font-semibold">{option.label}</span><span className="mt-0.5 block text-[9.5px] text-[#817b74]">{option.note}</span></button>)}</div>
          <div className="mt-3 border-l-2 border-[#256d5b] bg-[#f2f7f4] px-3 py-2.5 text-[10.5px] leading-5 text-[#31554b]">
            Your agents will design a {form.durationDays}-day {form.intensity} campaign for {pace.channelLabel}, producing {pace.actionSummary} and a complete approval-ready schedule.
          </div>
        </section>

        {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</div> : null}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e6e2dc] px-5 py-4">
        <p className="max-w-md text-[9.5px] leading-4 text-[#817b74]">Your AI team decides the strategy, audience, formats, and exact cadence. Nothing is published until you review the finished campaign.</p>
        <button onClick={submit} disabled={busy || form.goal.trim().length < 12 || (!form.channels.length && !readyChannels.length)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[#171717] px-4 text-[11.5px] font-semibold text-white disabled:bg-[#bbb5ad]">{busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}Create campaign</button>
      </footer>
    </div>
  </div>;
}
