import React from 'react';

export default function ActivityRow({ label, status, children }) {
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className={`mt-1.5 inline-block w-2 h-2 rounded-full ${status === 'streaming' || status === 'running' ? 'bg-[#117dff] animate-pulse' : 'bg-[#10b981]'}`} />
      <div className="min-w-0">
        <div className="text-[13px] text-[#171717]">{label}</div>
        {children}
      </div>
    </div>
  );
}
