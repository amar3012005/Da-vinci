import React from 'react';

export default function ExternalActionCard({ title, detail }) {
  if (!title) return null;
  return (
    <div className="border border-[#e3e0db] rounded-[10px] p-3">
      <div className="text-[13px]">{title || 'External action'}</div>
      {detail ? <div className="text-[12px] text-[#737373] mt-1">{detail}</div> : null}
    </div>
  );
}
