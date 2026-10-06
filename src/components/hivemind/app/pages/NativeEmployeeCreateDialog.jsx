import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../shared/api-client';

/** Native employee creation keeps credentials and external authority unchanged. */
export default function NativeEmployeeCreateDialog({ open, onClose, onCreated }) {
  const key = useRef('');
  const savedInput = useRef(null);
  const [form, setForm] = useState({ name: '', persona: '', lifecycle: 'durable', deadline: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { key.current = crypto.randomUUID(); savedInput.current = null; setForm({ name: '', persona: '', lifecycle: 'durable', deadline: '' }); setError(''); } }, [open]);
  if (!open) return null;
  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const input = { operation: 'create', creation_key: key.current, name: form.name.trim(), persona: form.persona.trim(), lifecycle: form.lifecycle };
      if (form.lifecycle === 'temporary' && !savedInput.current) {
        const deadline = new Date(form.deadline);
        if (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= Date.now()) throw new Error('Choose a future deadline.');
        input.expires_at = deadline.toISOString();
      }
      const result = await apiClient.nativeEmployeeLifecycle(savedInput.current || input);
      savedInput.current = savedInput.current || input;
      await onCreated(result.employee);
      if ((savedInput.current || input).lifecycle === 'temporary' && result.native_activation?.status !== 'ready') {
        setError('Your employee is created, but deadline setup is still pending. Open Runtime, then retry setup.');
        return;
      }
      onClose();
    } catch (failure) { setError(failure.response?.data?.error || failure.message); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"><form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="native-employee-title" className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
    <h2 id="native-employee-title" className="text-xl font-semibold">Create an employee</h2>
    <p className="text-sm text-gray-500">Add a company teammate. Connected apps and publishing permissions stay unchanged.</p>
    <label className="block">Name<input name="name" disabled={Boolean(savedInput.current)} required maxLength={100} value={form.name} onChange={update} className="block border rounded p-2 w-full" /></label>
    <label className="block">Responsibilities<textarea name="persona" disabled={Boolean(savedInput.current)} required maxLength={12000} value={form.persona} onChange={update} className="block border rounded p-2 w-full" /></label>
    <label className="block">Employment<select disabled={Boolean(savedInput.current)} name="lifecycle" value={form.lifecycle} onChange={update} className="block border rounded p-2 w-full"><option value="durable">Ongoing</option><option value="temporary">Temporary</option></select></label>
    {form.lifecycle === 'temporary' && <label className="block">Work ends<input disabled={Boolean(savedInput.current)} type="datetime-local" name="deadline" required value={form.deadline} onChange={update} className="block border rounded p-2 w-full" /></label>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button disabled={busy} className="bg-blue-600 text-white rounded px-4 py-2">{busy ? 'Saving…' : savedInput.current ? 'Retry setup' : 'Create employee'}</button></div>
  </form></div>;
}
