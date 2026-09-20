import React from 'react';
import { FileText, Globe } from 'lucide-react';

export default function SourcesPanel({ sources, onOpen }) {
  const list = Array.isArray(sources) ? sources : [];
  return (
    <div className="space-y-1">
      {list.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onOpen && onOpen(s)}
          className="w-full flex items-center gap-2 px-1 py-1.5 text-left text-[12px] text-[#525252]"
        >
          {s.kind === 'web' ? <Globe size={13} /> : <FileText size={13} />}
          <span className="truncate">{s.title}</span>
        </button>
      ))}
    </div>
  );
}
