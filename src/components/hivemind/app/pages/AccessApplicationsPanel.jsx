import React, { useEffect, useState } from 'react';
import { Check, Eye, Loader2, Mail, Trash2, X } from 'lucide-react';
import apiClient from '../shared/api-client';

const inputClass = 'w-full border border-[#d8d6cf] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#117dff]';
const when = (value) => value ? new Date(value).toLocaleString() : 'Not yet';

export default function AccessApplicationsPanel({ onChanged }) {
  const [kind, setKind] = useState('personal');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [configuring, setConfiguring] = useState(null);
  const [config, setConfig] = useState({ company_name: '', workspace_name: '', account_type: 'enterprise_managed', storage_mode: 'hybrid', onboarding_days: 14, invitation_expires_at: '', welcome_message: '', private_notes: '' });

  const load = async () => {
    try {
      const data = await apiClient.listPlatformAccessApplications({ account_type: kind });
      setItems((data.applications || []).filter((item) => item.status !== 'discarded'));
    } catch (err) { setError(err.response?.data?.error || err.message); }
  };
  useEffect(() => { load(); }, [kind]);

  const run = async (item, action, payload = {}) => {
    setBusy(`${item.id}:${action}`); setError('');
    try {
      const result = await apiClient.accessApplicationAction(item.id, action, payload);
      if (action === 'preview') setPreview({ item, ...result });
      await load(); onChanged?.();
      return result;
    } catch (err) { setError(err.response?.data?.error || err.message); return null; }
    finally { setBusy(''); }
  };

  const approve = async (item) => {
    if (item.account_type === 'enterprise') {
      setConfiguring(item);
      setConfig((value) => ({ ...value, company_name: item.company_name || '', workspace_name: item.company_name || '', welcome_message: item.message || '' }));
      return;
    }
    if (await run(item, 'approve')) await run({ ...item, status: 'approved' }, 'preview');
  };

  const approveEnterprise = async (event) => {
    event.preventDefault();
    const item = configuring;
    if (await run(item, 'approve', config)) {
      setConfiguring(null);
      await run({ ...item, status: 'approved' }, 'preview');
    }
  };

  const sendPreview = async () => {
    if (await run(preview.item, 'send')) setPreview(null);
  };

  return <section className="mt-6 border-t border-[#dfddd5] pt-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#117dff]">Homepage access queue</p><h3 className="mt-1 text-lg font-semibold">Review before inviting</h3><p className="mt-1 text-sm text-[#737373]">Approve, configure, inspect the exact email, then send through Cloudflare.</p></div>
      <div className="flex border border-[#d8d6cf] p-1" role="tablist" aria-label="Application type">{[['personal', 'B2C waitlist'], ['enterprise', 'B2B requests']].map(([id, label]) => <button key={id} type="button" onClick={() => setKind(id)} className={`px-3 py-2 text-xs font-semibold ${kind === id ? 'bg-[#0a0a0a] text-white' : 'text-[#525252]'}`}>{label}</button>)}</div>
    </div>
    {error && <p className="mt-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 divide-y divide-[#e5e2dc]">
      {items.map((item) => <article key={item.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{item.name}</strong><span className="border border-[#d8d6cf] px-2 py-0.5 font-mono text-[10px] uppercase">{item.status}</span></div><p className="mt-1 text-sm text-[#525252]">{item.email}{item.company_name ? ` · ${item.company_name}` : ''}</p><p className="mt-1 text-xs text-[#737373]">{item.niche || 'No niche'} · {item.message || 'No additional note'} · applied {when(item.created_at)}</p></div><div className="flex flex-wrap items-center gap-2">{item.status === 'pending' && <button type="button" onClick={() => approve(item)} disabled={!!busy} className="inline-flex items-center gap-1.5 bg-[#117dff] px-3 py-2 text-xs font-semibold text-white"><Check size={14}/>Approve</button>}{['approved', 'invited'].includes(item.status) && <button type="button" onClick={() => run(item, 'preview')} disabled={!!busy} className="inline-flex items-center gap-1.5 border border-[#d8d6cf] px-3 py-2 text-xs font-semibold"><Eye size={14}/>Preview email</button>}{item.status === 'pending' && <button type="button" onClick={() => run(item, 'discard')} disabled={!!busy} className="inline-flex items-center gap-1.5 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"><Trash2 size={14}/>Discard</button>}{busy.startsWith(item.id) && <Loader2 size={16} className="animate-spin text-[#117dff]"/>}</div></article>)}
      {!items.length && <p className="py-8 text-center text-sm text-[#737373]">No {kind === 'personal' ? 'B2C' : 'B2B'} applications yet.</p>}
    </div>

    {configuring && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"><form onSubmit={approveEnterprise} className="max-h-[88vh] w-full max-w-2xl overflow-auto bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#117dff]">B2B approval</p><h3 className="mt-1 text-xl font-semibold">Configure {configuring.company_name || configuring.name}</h3></div><button type="button" onClick={() => setConfiguring(null)} aria-label="Close"><X size={20}/></button></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><input required className={inputClass} placeholder="Company name" value={config.company_name} onChange={(e) => setConfig({ ...config, company_name: e.target.value })}/><input className={inputClass} placeholder="Workspace name" value={config.workspace_name} onChange={(e) => setConfig({ ...config, workspace_name: e.target.value })}/><select className={inputClass} value={config.account_type} onChange={(e) => { const selfHosted = e.target.value === 'enterprise_self_hosted'; setConfig({ ...config, account_type: e.target.value, storage_mode: selfHosted ? 'byod_amr' : 'hybrid' }); }}><option value="enterprise_managed">Managed</option><option value="enterprise_self_hosted">Self-hosted</option></select><select className={inputClass} value={config.storage_mode} onChange={(e) => setConfig({ ...config, storage_mode: e.target.value })}>{config.account_type === 'enterprise_self_hosted' ? <option value="byod_amr">BYOD .amr agent</option> : <><option value="hybrid">Managed hybrid</option><option value="amr_embedded">Embedded .amr</option></>}</select><input className={inputClass} type="number" min="1" max="90" value={config.onboarding_days} onChange={(e) => setConfig({ ...config, onboarding_days: Number(e.target.value) })}/><input className={inputClass} type="datetime-local" value={config.invitation_expires_at} onChange={(e) => setConfig({ ...config, invitation_expires_at: e.target.value })}/><textarea className={`${inputClass} min-h-24 sm:col-span-2`} placeholder="Company-specific welcome message" value={config.welcome_message} onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}/><textarea className={`${inputClass} min-h-20 sm:col-span-2`} placeholder="Private operator notes" value={config.private_notes} onChange={(e) => setConfig({ ...config, private_notes: e.target.value })}/></div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setConfiguring(null)} className="border border-[#d8d6cf] px-4 py-2">Cancel</button><button disabled={!!busy} className="bg-[#117dff] px-4 py-2 font-semibold text-white">Approve and preview</button></div></form></div>}

    {preview && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"><section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden bg-[#0d0d0f] shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-[#303138] p-5 text-white"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#24d2ed]">Rendered invitation</p><h3 className="mt-2 text-lg font-semibold">{preview.subject}</h3><p className="mt-1 text-xs text-[#a9aaae]">From {preview.from} · To {preview.to}</p></div><button type="button" onClick={() => setPreview(null)} aria-label="Close"><X size={20}/></button></header><div className="min-h-0 flex-1 overflow-auto bg-[#f8fafc]"><iframe title="Invitation email preview" sandbox="" srcDoc={preview.html} className="h-[620px] w-full border-0 bg-white"/></div><footer className="flex items-center justify-between gap-3 border-t border-[#303138] p-4"><p className="text-xs text-[#a9aaae]">The live secure link and one-time code are generated only when sent.</p><button type="button" onClick={sendPreview} disabled={!!busy} className="inline-flex items-center gap-2 bg-[#24d2ed] px-4 py-2.5 text-sm font-bold text-[#0a0a0a]">{busy ? <Loader2 size={16} className="animate-spin"/> : <Mail size={16}/>}Send invitation</button></footer></section></div>}
  </section>;
}
