import React from 'react';
import { Check, LoaderCircle, Search } from 'lucide-react';

export default function ActivityRow({ label, status, children }) {
  return (
    <div className="relative flex items-start gap-3 py-2 text-[#737373] before:absolute before:bottom-[-8px] before:left-[8px] before:top-[24px] before:w-px before:bg-[#e3e0db] last:before:hidden">
      {status === 'streaming' || status === 'running'
        ? <LoaderCircle size={17} className="mt-0.5 shrink-0 animate-spin" />
        : <Search size={17} className="mt-0.5 shrink-0" strokeWidth={1.7} />}
      <div className="min-w-0 flex-1">
        <div className="text-[14px]">{label}</div>
        {children}
      </div>
      {status !== 'streaming' && status !== 'running' ? <Check size={14} className="mt-0.5 shrink-0" /> : null}
    </div>
  );
}
