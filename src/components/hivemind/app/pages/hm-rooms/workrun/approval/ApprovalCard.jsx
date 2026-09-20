import React, { useState } from 'react';

export default function ApprovalCard({ prompt, tool, onApprove, onDeny }) {
  const [busy, setBusy] = useState(false);
  const decide = async (handler) => {
    if (!handler || busy) return;
    setBusy(true);
    try {
      await handler();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border border-[#e3e0db] bg-white rounded-[10px] p-3 space-y-2">
      <div className="text-[13px] text-[#0a0a0a]">{prompt || 'Needs confirmation'}</div>
      {tool ? <div className="text-[11px] text-[#737373]">{tool}</div> : null}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => decide(onApprove)} className="px-3 py-1.5 rounded-[6px] bg-[#117dff] text-white text-[12px] disabled:opacity-50">{busy ? 'Continuing…' : 'Allow'}</button>
        <button type="button" disabled={busy} onClick={() => decide(onDeny)} className="px-3 py-1.5 rounded-[6px] border border-[#e3e0db] text-[12px] disabled:opacity-50">Deny</button>
      </div>
    </div>
  );
}
