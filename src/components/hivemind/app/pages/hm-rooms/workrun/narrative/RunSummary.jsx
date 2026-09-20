import React from 'react';

export default function RunSummary({ goal, status, working }) {
  return (
    <div className="text-[12px] text-[#737373]">
      {goal || 'Work'}
      <span className="ml-2">{working ? 'working' : (status || 'idle')}</span>
    </div>
  );
}
