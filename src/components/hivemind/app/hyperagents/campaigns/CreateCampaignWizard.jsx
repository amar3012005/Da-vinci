import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';

const OBJECTIVES = [
  ['AWARENESS', 'Awareness'], ['PRODUCT_LAUNCH', 'Product launch'], ['LEAD_GENERATION', 'Lead generation'],
  ['WEBSITE_TRAFFIC', 'Website traffic'], ['THOUGHT_LEADERSHIP', 'Thought leadership'],
  ['EVENT_PROMOTION', 'Event promotion'], ['RE_ENGAGEMENT', 'Re-engagement'], ['CUSTOM', 'Custom'],
];
const CHANNEL_NAMES = { x_organic: 'X Organic', gmail: 'Gmail', tara: 'TARA', x_ads: 'X Ads', linkedin: 'LinkedIn', meta: 'Meta' };

export default function CreateCampaignWizard({ capabilities, onClose, onCreate, onConnect }) {
  const [step, setStep] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const idempotencyKey = useRef(window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const [form, setForm] = useState({
    name: '', objective: 'AWARENESS', goal: '', channels: [], audience_mode: 'existing_first', discover_if_insufficient: true,
    offer: '', cta: '', destination_url: '', geography: '', languages: 'English', duration_days: 14,
    brand_constraints: '', prohibited_claims: '', success_metrics: 'Reach, engagement, qualified replies', autonomy_mode: 'APPROVE_PLAN_ONCE',
  });
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selected = useMemo(() => new Set(form.channels), [form.channels]);
  const canContinue = step === 0 ? form.goal.trim().length >= 12 : step === 1 ? form.channels.length > 0 : true;
  const submit = async () => {
    setBusy(true); setError('');
    try {
      await onCreate({
        ...form, idempotency_key: idempotencyKey.current,
        geography: form.geography.split(',').map((x) => x.trim()).filter(Boolean),
        languages: form.languages.split(',').map((x) => x.trim()).filter(Boolean),
        success_metrics: form.success_metrics.split(',').map((x) => x.trim()).filter(Boolean),
        audience: { mode: form.audience_mode, discover_if_insufficient: form.discover_if_insufficient },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });
    } catch (err) { setError(err?.response?.data?.message || err.message || 'Could not create campaign'); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="bg-[#fffefa] border border-[#d8d3cc] rounded-lg w-full max-w-2xl max-h-[94vh] overflow-hidden flex flex-col shadow-xl">
        <header className="h-14 px-5 border-b border-[#e6e2dc] flex items-center justify-between shrink-0">
          <div><div className="text-[13px] font-semibold">Create campaign</div><div className="text-[10px] text-[#817b74] mt-0.5">Step {step + 1} of 5</div></div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md hover:bg-[#f2efe9]" title="Close"><X size={15} /></button>
        </header>
        <div className="h-1 bg-[#ece8e1]"><div className="h-full bg-[#171717] transition-all" style={{ width: `${(step + 1) * 20}%` }} /></div>
        <div className="p-5 sm:p-6 overflow-y-auto min-h-[430px]">
          {step === 0 ? <section><h2 className="text-[18px] font-semibold">What should this campaign achieve?</h2><p className="text-[11.5px] text-[#77716a] mt-1">The agents preserve this goal and must prove every part is covered.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">{OBJECTIVES.map(([id, label]) => <button key={id} onClick={() => patch('objective', id)} className={`min-h-12 px-3 border rounded-md text-[11.5px] text-left ${form.objective === id ? 'border-[#171717] bg-white font-semibold' : 'border-[#d8d3cc] bg-[#faf8f3]'}`}>{label}</button>)}</div>
            <textarea autoFocus rows={6} maxLength={8000} value={form.goal} onChange={(e) => patch('goal', e.target.value)} placeholder="Example: Launch our new product to European solo founders, build trust, and generate 20 qualified conversations in 30 days." className="mt-4 w-full border border-[#cfc9c1] rounded-md p-3 text-[13px] leading-5 resize-none outline-none focus:border-[#171717]" />
            <input value={form.name} onChange={(e) => patch('name', e.target.value)} placeholder="Campaign name (optional)" className="mt-3 w-full h-10 border border-[#cfc9c1] rounded-md px-3 text-[12px] outline-none focus:border-[#171717]" />
          </section> : null}
          {step === 1 ? <section><h2 className="text-[18px] font-semibold">Choose execution channels</h2><p className="text-[11.5px] text-[#77716a] mt-1">Only connected, official integrations can execute.</p>
            <div className="mt-5 divide-y divide-[#e6e2dc] border-y border-[#e6e2dc]">{(capabilities?.channels || []).map((channel) => {
              const active = selected.has(channel.id); return <div key={channel.id} className="min-h-16 flex items-center gap-3 py-3">
                <button disabled={!channel.executable} onClick={() => patch('channels', active ? form.channels.filter((x) => x !== channel.id) : [...form.channels, channel.id])} className={`w-5 h-5 border rounded grid place-items-center shrink-0 ${active ? 'bg-[#171717] border-[#171717] text-white' : 'border-[#aaa39a]'} disabled:opacity-30`} aria-label={`Select ${CHANNEL_NAMES[channel.id]}`}>{active ? <Check size={12} /> : null}</button>
                <div className="flex-1"><div className="text-[12.5px] font-semibold">{CHANNEL_NAMES[channel.id] || channel.id}</div><div className="text-[10.5px] text-[#817b74]">{channel.executable ? 'Ready to execute' : channel.reason?.replaceAll('_', ' ')}</div></div>
                {!channel.connected && ['x_organic', 'gmail', 'tara'].includes(channel.id) ? <button onClick={() => onConnect(channel.id)} className="h-8 px-3 border border-[#bdb7af] rounded-md text-[10.5px] font-semibold">Connect</button> : null}
              </div>})}</div>
          </section> : null}
          {step === 2 ? <section><h2 className="text-[18px] font-semibold">Select the audience policy</h2><p className="text-[11.5px] text-[#77716a] mt-1">Existing organization leads and prospects are searched first.</p>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">{[['existing_first', 'Existing audience first', 'Use current leads, prospects, and saved contacts before discovery.'], ['manual', 'Manual recipients only', 'Agents may only use recipients explicitly present in your company data.']].map(([id, title, desc]) => <button key={id} onClick={() => patch('audience_mode', id)} className={`p-4 border rounded-md text-left ${form.audience_mode === id ? 'border-[#171717] bg-white' : 'border-[#d8d3cc]'}`}><div className="text-[12.5px] font-semibold">{title}</div><div className="text-[10.5px] text-[#77716a] mt-1 leading-4">{desc}</div></button>)}</div>
            <label className="mt-5 flex items-start gap-3 text-[11.5px]"><input type="checkbox" checked={form.discover_if_insufficient} onChange={(e) => patch('discover_if_insufficient', e.target.checked)} className="mt-0.5" /><span><strong>Discover when insufficient</strong><span className="block text-[#77716a] mt-0.5">New people remain provenance-backed prospects and are not contactable until this plan is approved.</span></span></label>
          </section> : null}
          {step === 3 ? <section><h2 className="text-[18px] font-semibold">Give the room its operating brief</h2><div className="grid sm:grid-cols-2 gap-3 mt-5">
            {[['offer', 'Offer'], ['cta', 'Primary CTA'], ['destination_url', 'Destination URL'], ['geography', 'Geography, comma separated'], ['languages', 'Languages, comma separated'], ['success_metrics', 'Success metrics, comma separated']].map(([key, label]) => <label key={key} className="text-[10px] font-mono uppercase text-[#77716a]">{label}<input type={key === 'destination_url' ? 'url' : 'text'} value={form[key]} onChange={(e) => patch(key, e.target.value)} className="mt-1.5 w-full h-10 border border-[#cfc9c1] rounded-md px-3 text-[12px] normal-case font-sans" /></label>)}
            <label className="text-[10px] font-mono uppercase text-[#77716a]">Duration days<input type="number" min="1" max="365" value={form.duration_days} onChange={(e) => patch('duration_days', Number(e.target.value))} className="mt-1.5 w-full h-10 border border-[#cfc9c1] rounded-md px-3 text-[12px] normal-case font-sans" /></label>
          </div><div className="grid sm:grid-cols-2 gap-3 mt-3"><textarea rows={4} value={form.brand_constraints} onChange={(e) => patch('brand_constraints', e.target.value)} placeholder="Brand constraints" className="border border-[#cfc9c1] rounded-md p-3 text-[12px] resize-none" /><textarea rows={4} value={form.prohibited_claims} onChange={(e) => patch('prohibited_claims', e.target.value)} placeholder="Claims or topics to avoid" className="border border-[#cfc9c1] rounded-md p-3 text-[12px] resize-none" /></div>
          </section> : null}
          {step === 4 ? <section><h2 className="text-[18px] font-semibold">Choose approval control</h2><p className="text-[11.5px] text-[#77716a] mt-1">The room generates only. Nothing is sent until you approve.</p>
            <div className="mt-5 space-y-3">{[['APPROVE_PLAN_ONCE', 'Approve this plan once', 'Approve one immutable plan. Scheduled actions then run within its exact content, audience, timing, and limits.'], ['REVIEW_EVERY_ACTION', 'Review every action', 'Keep every generated action waiting for individual review.']].map(([id, title, desc]) => <button key={id} onClick={() => patch('autonomy_mode', id)} className={`w-full p-4 border rounded-md text-left ${form.autonomy_mode === id ? 'border-[#171717] bg-white' : 'border-[#d8d3cc]'}`}><div className="text-[12.5px] font-semibold">{title}</div><div className="text-[10.5px] text-[#77716a] mt-1">{desc}</div></button>)}</div>
            <div className="mt-5 border-l-2 border-[#171717] pl-3 text-[11px] leading-5 text-[#55504a]">Agents will gather company and audience evidence, debate the strategy, and submit final channel actions. Missing recipients, missing call openings, or uncovered requirements block approval.</div>
          </section> : null}
          {error ? <div className="mt-4 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div> : null}
        </div>
        <footer className="h-16 px-5 border-t border-[#e6e2dc] flex items-center justify-between shrink-0">
          <button onClick={() => step ? setStep(step - 1) : onClose()} disabled={busy} className="h-9 px-3 flex items-center gap-1.5 text-[11.5px] font-semibold"><ArrowLeft size={13} />{step ? 'Back' : 'Cancel'}</button>
          {step < 4 ? <button onClick={() => setStep(step + 1)} disabled={!canContinue} className="h-9 px-4 bg-[#171717] text-white rounded-md flex items-center gap-1.5 text-[11.5px] font-semibold disabled:bg-[#bbb5ad]">Continue <ArrowRight size={13} /></button> : <button onClick={submit} disabled={busy} className="h-9 px-4 bg-[#171717] text-white rounded-md flex items-center gap-1.5 text-[11.5px] font-semibold disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : null}Create campaign</button>}
        </footer>
      </div>
    </div>
  );
}
