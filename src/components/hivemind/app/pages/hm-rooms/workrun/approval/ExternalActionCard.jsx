import React, { useState } from 'react';

export default function ExternalActionCard({ id, title, detail, status = 'pending', onResolve }) {
  const [busy, setBusy] = useState(null);
  const terminal = ['sent', 'failed', 'cancelled', 'expired'].includes(String(status));
  const resolve = async (action) => {
    if (!id || !onResolve || busy || terminal) return;
    setBusy(action);
    try { await onResolve(id, action); } finally { setBusy(null); }
  };
  const label = status === 'sent' ? 'External action sent'
    : status === 'cancelled' ? 'External action declined'
      : status === 'expired' ? 'External action expired'
        : status === 'failed' ? 'External action failed'
          : title || 'External action ready for review';
  if (!title) return null;
  return (
    <div className="border border-[#e3e0db] rounded-[10px] p-3">
      <div className="text-[13px] font-medium">{label}</div>
      {detail ? <div className="text-[12px] text-[#737373] mt-1">{detail}</div> : null}
      {!terminal && id && onResolve ? (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" disabled={Boolean(busy)} onClick={() => resolve('approve')} className="rounded-[6px] bg-[#117dff] px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-60">{busy === 'approve' ? 'Approving…' : 'Approve action'}</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => resolve('cancel')} className="rounded-[6px] border border-[#e3e0db] px-2.5 py-1.5 text-[11px] font-medium text-[#525252] hover:bg-[#f7f6f3] disabled:opacity-60">{busy === 'cancel' ? 'Declining…' : 'Decline'}</button>
        </div>
      ) : null}
    </div>
  );
}
