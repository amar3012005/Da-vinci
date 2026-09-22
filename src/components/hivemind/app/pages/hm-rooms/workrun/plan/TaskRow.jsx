import React from 'react';
import { CheckCircle2, Circle, LoaderCircle } from 'lucide-react';

export default function TaskRow({ title, done, active }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-[12px] text-[#171717]">
      {done ? <CheckCircle2 size={14} className="shrink-0 text-[#10b981]" /> : active ? <LoaderCircle size={14} className="shrink-0 animate-spin text-[#117dff]" /> : <Circle size={14} className="shrink-0 text-[#a3a3a3]" />}
      <span className={`truncate ${done ? 'text-[#737373]' : ''}`}>{title}</span>
    </div>
  );
}
