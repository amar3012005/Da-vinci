import React from 'react';
import { FileText, Globe, Link2 } from 'lucide-react';

export default function SourcesPanel({ sources, onOpen, compact }) {
  const list = Array.isArray(sources) ? sources : [];
  const shown = compact ? list.slice(0, 4) : list;
  return (
    <div className="space-y-0.5">
      {shown.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onOpen && onOpen(s)}
          className="w-full flex items-center gap-2 px-1 py-1.5 text-left text-[12px] text-[#525252] hover:bg-[#faf9f4] rounded"
        >
          {s.kind === 'web' ? <Globe size={13} /> : <FileText size={13} />}
          <span className="truncate">{s.title}</span>
        </button>
      ))}
      {compact && list.length > 4 ? (
        <div className="flex items-center gap-2 px-1 py-1.5 text-[12px] text-[#a3a3a3]"><Link2 size={13} /> View all</div>
      ) : null}
    </div>
  );
}
