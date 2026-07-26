import React, { useMemo, useRef, useState } from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';

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

const CHANNEL_NAMES = { x_organic: 'X', gmail: 'Email', tara: 'TARA' };
const V1_CHANNELS = new Set(Object.keys(CHANNEL_NAMES));
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
  const readyChannels = (capabilities?.channels || [])
    .filter((channel) => V1_CHANNELS.has(channel.id) && channel.executable)
    .map((channel) => channel.id);
  const channels = form.channels.length ? form.channels : readyChannels;
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
    duration_days: 14,
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
  const idempotencyKey = useRef(window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const [form, setForm] = useState({ objective: 'AWARENESS', goal: '', channels: [] });
  const readyChannels = useMemo(() => (capabilities?.channels || []).filter((channel) => V1_CHANNELS.has(channel.id) && channel.executable), [capabilities]);
  const selected = useMemo(() => new Set(form.channels), [form.channels]);
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (form.goal.trim().length < 12) { setError('Describe what you want this campaign to achieve.'); return; }
    const payload = deriveCampaignPayload(form, capabilities, idempotencyKey.current, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    if (!payload.channels.length) { setError('Connect at least one channel before creating a campaign.'); return; }
    setBusy(true); setError('');
    try { await onCreate(payload); }
    catch (err) { setError(err?.response?.data?.message || err.message || 'Could not create campaign'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="create-campaign-title">
    <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[#d8d3cc] bg-[#fffefa] shadow-xl">
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
          <textarea id="campaign-goal" autoFocus rows={6} maxLength={8000} value={form.goal} onChange={(event) => patch('goal', event.target.value)} placeholder="Example: Introduce our new product to European founders, build trust, and start qualified conversations." className="mt-2 w-full resize-none rounded-md border border-[#cfc9c1] p-3 text-[13px] leading-5 outline-none focus:border-[#171717]" />
        </section>

        <section className="mt-6">
          <div className="flex items-baseline justify-between gap-3"><h3 className="text-[11px] font-semibold text-[#34312e]">Channels <span className="font-normal text-[#817b74]">(optional)</span></h3><span className="text-[9.5px] text-[#817b74]">Leave blank to use every ready channel</span></div>
          {readyChannels.length ? <div className="mt-3 flex flex-wrap gap-2">{readyChannels.map((channel) => {
            const active = selected.has(channel.id);
            return <button key={channel.id} type="button" onClick={() => patch('channels', active ? form.channels.filter((id) => id !== channel.id) : [...form.channels, channel.id])} className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[11px] font-semibold ${active ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#c9c3bb] bg-white text-[#45413d]'}`} aria-pressed={active}>{active ? <Check size={12} /> : null}{CHANNEL_NAMES[channel.id]}</button>;
          })}</div> : <div className="mt-3 rounded-md border border-[#ded9d2] bg-[#faf8f3] px-3 py-3 text-[10.5px] text-[#615c56]">
            <div>No execution channel is ready yet.</div>
            <div className="mt-2 flex flex-wrap gap-2">{(capabilities?.channels || []).filter((channel) => V1_CHANNELS.has(channel.id) && !channel.connected).map((channel) => <button key={channel.id} type="button" onClick={() => onConnect(channel.id)} className="h-8 rounded-md border border-[#bdb7af] bg-white px-3 font-semibold">Connect {CHANNEL_NAMES[channel.id]}</button>)}</div>
          </div>}
        </section>

        {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</div> : null}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e6e2dc] px-5 py-4">
        <p className="max-w-md text-[9.5px] leading-4 text-[#817b74]">Nothing is published until the finished campaign plan is reviewed and launched.</p>
        <button onClick={submit} disabled={busy || form.goal.trim().length < 12 || !readyChannels.length} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[#171717] px-4 text-[11.5px] font-semibold text-white disabled:bg-[#bbb5ad]">{busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}Create campaign</button>
      </footer>
    </div>
  </div>;
}
