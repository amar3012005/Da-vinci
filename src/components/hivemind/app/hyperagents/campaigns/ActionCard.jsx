import React, { useState } from 'react';
import { Check, CheckCircle2, Clock3, Mail, MessageCircle, Pencil, Phone, RefreshCw, SearchCheck, ShieldAlert, Trash2, X } from 'lucide-react';

const ICONS = { x_organic: MessageCircle, gmail: Mail, tara: Phone };

export default function ActionCard({ action, onApprove, onRetry, onReconcile, onEdit, onRemove, busy }) {
  const Icon = ICONS[action.channel] || MessageCircle;
  const payload = action.payload || {};
  const problem = ['FAILED', 'BLOCKED', 'NEEDS_RECONCILIATION'].includes(action.status);
  const [editing, setEditing] = useState(false); const [editBusy, setEditBusy] = useState(false); const [editError, setEditError] = useState('');
  const [draft, setDraft] = useState(() => ({
    final_copy: payload.final_copy || payload.text || payload.body || '', to: payload.to || '', subject: payload.subject || '',
    opening: payload.opening || '', scheduled_offset_minutes: Number(payload.scheduled_offset_minutes ?? Math.max(0, Math.round((new Date(action.scheduledAt).getTime() - new Date(action.createdAt).getTime()) / 60000))) || 0,
  }));
  const save = async () => {
    setEditBusy(true); setEditError('');
    try {
      const payloadEdit = {};
      if (draft.to) payloadEdit.to = draft.to;
      if (action.channel === 'gmail') payloadEdit.subject = draft.subject;
      if (action.channel === 'tara') payloadEdit.opening = draft.opening;
      await onEdit(action.id, { final_copy: draft.final_copy, scheduled_offset_minutes: Number(draft.scheduled_offset_minutes), payload: payloadEdit });
      setEditing(false);
    } catch (error) { setEditError(error?.response?.data?.message || error.message || 'Could not edit action'); }
    finally { setEditBusy(false); }
  };
  return (
    <article className="border-b border-[#e6e2dc] py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 border border-[#d8d3cc] rounded-md grid place-items-center shrink-0 bg-white"><Icon size={15} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[13px] font-semibold text-[#171717]">{payload.title || action.actionType}</h4>
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${problem ? 'bg-red-50 text-red-700' : action.status === 'SUCCEEDED' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f0eee9] text-[#68635c]'}`}>{action.status}</span>
            {action.status === 'READY' && (onEdit || onRemove) ? <div className="ml-auto flex gap-1">{onEdit ? <button onClick={() => setEditing((value) => !value)} disabled={busy} className="w-7 h-7 border border-[#d2ccc4] rounded-md grid place-items-center" title="Edit action"><Pencil size={12} /></button> : null}{onRemove ? <button onClick={() => onRemove(action.id)} disabled={busy} className="w-7 h-7 border border-[#d2ccc4] rounded-md grid place-items-center text-red-700" title="Remove action"><Trash2 size={12} /></button> : null}</div> : null}
          </div>
          {editing ? <div className="mt-3 border-y border-[#ddd8d0] py-3 space-y-2">
            {payload.to !== undefined ? <input value={draft.to} onChange={(event) => setDraft((value) => ({ ...value, to: event.target.value }))} placeholder={action.channel === 'gmail' ? 'Recipient email' : 'Recipient phone'} className="w-full h-9 border border-[#cfc9c1] rounded-md px-3 text-[11.5px]" /> : null}
            {action.channel === 'gmail' ? <input value={draft.subject} onChange={(event) => setDraft((value) => ({ ...value, subject: event.target.value }))} placeholder="Subject" className="w-full h-9 border border-[#cfc9c1] rounded-md px-3 text-[11.5px]" /> : null}
            {action.channel === 'tara' ? <textarea rows={2} value={draft.opening} onChange={(event) => setDraft((value) => ({ ...value, opening: event.target.value }))} placeholder="Speak-first opening" className="w-full border border-[#cfc9c1] rounded-md p-3 text-[11.5px] resize-none" /> : null}
            <textarea rows={5} value={draft.final_copy} onChange={(event) => setDraft((value) => ({ ...value, final_copy: event.target.value }))} className="w-full border border-[#cfc9c1] rounded-md p-3 text-[11.5px] resize-y" />
            <label className="flex items-center gap-2 text-[10px] text-[#6f6962]">Send after <input type="number" min="0" max="525600" value={draft.scheduled_offset_minutes} onChange={(event) => setDraft((value) => ({ ...value, scheduled_offset_minutes: event.target.value }))} className="w-24 h-8 border border-[#cfc9c1] rounded-md px-2 text-[11px]" /> minutes</label>
            {editError ? <div className="text-[10.5px] text-red-700">{editError}</div> : null}
            <div className="flex gap-2"><button onClick={save} disabled={editBusy || !draft.final_copy.trim()} className="h-8 px-3 bg-[#171717] text-white rounded-md text-[10.5px] font-semibold inline-flex items-center gap-1.5"><Check size={12} />Save new version</button><button onClick={() => setEditing(false)} disabled={editBusy} className="w-8 h-8 border border-[#cfc9c1] rounded-md grid place-items-center" title="Cancel editing"><X size={12} /></button></div>
          </div> : null}
          {!editing && payload.to ? <div className="text-[10.5px] text-[#77716a] mt-1">To {payload.to}</div> : null}
          {payload.subject ? <div className="text-[11.5px] font-semibold mt-2">{payload.subject}</div> : null}
          {!editing ? <div className="mt-2 text-[12px] leading-5 text-[#383532] whitespace-pre-wrap">{payload.final_copy || payload.text || payload.body || payload.opening}</div> : null}
          {action.rationale ? <div className="mt-2 text-[10.5px] text-[#77716a]">Why this action: {action.rationale}</div> : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#8b857e]">
            <span className="inline-flex items-center gap-1"><Clock3 size={11} />{action.scheduledAt ? new Date(action.scheduledAt).toLocaleString() : 'After approval'}</span>
            {action.externalId ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} />Provider ID {action.externalId}</span> : null}
            {problem && action.lastError ? <span className="inline-flex items-center gap-1 text-red-700"><ShieldAlert size={11} />{action.lastError}</span> : null}
          </div>
          {action.status === 'AWAITING_APPROVAL' && onApprove ? <button onClick={() => onApprove(action.id)} disabled={busy} className="mt-3 h-8 px-3 bg-[#171717] text-white rounded-md text-[10.5px] font-semibold">Approve this action</button> : null}
          {['FAILED', 'BLOCKED'].includes(action.status) && onRetry ? <button onClick={() => onRetry(action.id)} disabled={busy} className="mt-3 h-8 px-3 border border-[#bdb7af] rounded-md text-[10.5px] font-semibold inline-flex items-center gap-1.5"><RefreshCw size={12} />Retry action</button> : null}
          {action.status === 'NEEDS_RECONCILIATION' && onReconcile ? <button onClick={() => onReconcile(action.id)} disabled={busy} className="mt-3 h-8 px-3 border border-[#bdb7af] rounded-md text-[10.5px] font-semibold inline-flex items-center gap-1.5"><SearchCheck size={12} />Reconcile provider state</button> : null}
        </div>
      </div>
    </article>
  );
}
