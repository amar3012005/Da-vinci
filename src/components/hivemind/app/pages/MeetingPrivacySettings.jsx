import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../shared/api-client';

const defaults = {
  status: 'draft', controller_name: '', privacy_contact: '', country_code: 'DE', recording_jurisdiction: 'Germany',
  national_recording_rule: '', dpia_status: 'required', dpia_reference: '', notice_title: 'Meeting recording and AI processing notice', notice_body: '',
  lawful_basis: { record_audio: 'controller_selected', transcribe_and_summarize: 'controller_selected' },
  purposes: ['record_audio', 'transcribe_and_summarize'], processors: [], retention: { audio_failure_days: 7 },
};

export default function MeetingPrivacySettings() {
  const [form, setForm] = useState(defaults); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { apiClient.core.get('/api/meeting-policies/current').then(({ data }) => {
    const p = data?.policy; if (p) setForm((current) => ({ ...current, ...p, notice_title: p.notice_title || current.notice_title, notice_body: p.notice_body || '' }));
  }).catch(() => {}); }, []);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (activate = false) => {
    setSaving(true); setMessage('');
    try { await apiClient.core.put('/api/meeting-policies/current', { ...form, status: activate ? 'active' : 'draft' }); setMessage(activate ? 'Policy approved and activated.' : 'Draft saved.'); }
    catch (e) { const missing = e?.response?.data?.missing; setMessage(missing?.length ? `Complete: ${missing.join(', ')}` : (e?.response?.data?.error || 'Policy could not be saved.')); }
    finally { setSaving(false); }
  };
  return <main className="mx-auto max-w-4xl space-y-5 pb-12">
    <div><Link to="/hivemind/app/meeting-notes" className="text-xs text-[#117dff]">← Meeting notes</Link><h1 className="mt-2 text-2xl font-semibold">Meeting privacy administration</h1><p className="mt-1 text-sm text-[#737373]">The controller must approve the lawful basis, recording rule, notice, retention, processors and DPIA before v2 recording can begin.</p></div>
    <section className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2">
      {[['controller_name','Controller identity'],['privacy_contact','DPO / privacy contact'],['country_code','Country code'],['recording_jurisdiction','Recording jurisdiction'],['national_recording_rule','National recording-law attestation'],['dpia_reference','DPIA document reference']].map(([key,label]) => <label key={key} className="text-xs font-semibold text-[#525252]">{label}<input value={form[key] || ''} onChange={(e) => set(key,e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" /></label>)}
      <label className="text-xs font-semibold text-[#525252]">DPIA status<select value={form.dpia_status} onChange={(e) => set('dpia_status',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal"><option value="required">Required</option><option value="approved">Approved</option><option value="not_required">Not required (document rationale)</option></select></label>
      <label className="text-xs font-semibold text-[#525252]">Failed-audio retention (maximum 7 days)<input type="number" min="0" max="7" value={form.retention?.audio_failure_days ?? 7} onChange={(e) => set('retention',{ ...form.retention, audio_failure_days: Math.min(7,Math.max(0,Number(e.target.value))) })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" /></label>
      <label className="sm:col-span-2 text-xs font-semibold text-[#525252]">Notice title<input value={form.notice_title || ''} onChange={(e) => set('notice_title',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" /></label>
      <label className="sm:col-span-2 text-xs font-semibold text-[#525252]">Participant notice<textarea rows="8" value={form.notice_body || ''} onChange={(e) => set('notice_body',e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" /></label>
      <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.purposes.includes('promote_to_hivemind_memory')} onChange={(e) => setForm((current) => ({ ...current, purposes: e.target.checked ? [...new Set([...current.purposes,'promote_to_hivemind_memory'])] : current.purposes.filter((p) => p !== 'promote_to_hivemind_memory'), lawful_basis: e.target.checked ? { ...current.lawful_basis, promote_to_hivemind_memory: 'controller_selected' } : Object.fromEntries(Object.entries(current.lawful_basis).filter(([key]) => key !== 'promote_to_hivemind_memory')) }))} />Allow optional canonical memory promotion as a separate purpose</label>
    </section>
    {message && <p className="rounded-lg bg-[#faf9f4] p-3 text-sm">{message}</p>}
    <div className="flex gap-2"><button disabled={saving} onClick={() => save(false)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Save draft</button><button disabled={saving} onClick={() => save(true)} className="rounded-lg bg-[#117dff] px-4 py-2 text-sm font-semibold text-white">Approve and activate</button></div>
  </main>;
}
