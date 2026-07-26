import React from 'react';
import { CheckCircle2, Clock3, Mail, MessageCircle, Phone, RefreshCw, SearchCheck, ShieldAlert } from 'lucide-react';

const ICONS = { x_organic: MessageCircle, gmail: Mail, tara: Phone };

export default function ActionCard({ action, onApprove, onRetry, onReconcile, busy }) {
  const Icon = ICONS[action.channel] || MessageCircle;
  const payload = action.payload || {};
  const problem = ['FAILED', 'BLOCKED', 'NEEDS_RECONCILIATION'].includes(action.status);
  return (
    <article className="border-b border-[#e6e2dc] py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 border border-[#d8d3cc] rounded-md grid place-items-center shrink-0 bg-white"><Icon size={15} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[13px] font-semibold text-[#171717]">{payload.title || action.actionType}</h4>
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${problem ? 'bg-red-50 text-red-700' : action.status === 'SUCCEEDED' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f0eee9] text-[#68635c]'}`}>{action.status}</span>
          </div>
          {payload.to ? <div className="text-[10.5px] text-[#77716a] mt-1">To {payload.to}</div> : null}
          {payload.subject ? <div className="text-[11.5px] font-semibold mt-2">{payload.subject}</div> : null}
          <div className="mt-2 text-[12px] leading-5 text-[#383532] whitespace-pre-wrap">{payload.final_copy || payload.text || payload.body || payload.opening}</div>
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
