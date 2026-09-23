import React from 'react';

export default function RunSummary({ goal, status, working, elapsedLabel }) {
  return (
    <div className="text-[12px] text-[#737373] truncate min-w-0">
      <span className="text-[#0a0a0a] font-medium">{goal || 'Work'}</span>
      {elapsedLabel ? <span className="ml-2">{elapsedLabel}</span> : null}
      <span className="ml-2">{working ? 'working' : (status || 'idle')}</span>
    </div>
  );
}
