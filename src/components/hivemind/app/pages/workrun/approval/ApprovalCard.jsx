import React from 'react';

export default function ApprovalCard({ prompt, tool, onApprove, onDeny }) {
  return (
    <div className="border border-[#e3e0db] bg-white rounded-[10px] p-3 space-y-2">
      <div className="text-[13px] text-[#0a0a0a]">{prompt || 'Needs confirmation'}</div>
      {tool ? <div className="text-[11px] text-[#737373]">{tool}</div> : null}
      <div className="flex gap-2">
        <button type="button" onClick={onApprove} className="px-3 py-1.5 rounded-[6px] bg-[#117dff] text-white text-[12px]">Allow</button>
        <button type="button" onClick={onDeny} className="px-3 py-1.5 rounded-[6px] border border-[#e3e0db] text-[12px]">Deny</button>
      </div>
    </div>
  );
}
