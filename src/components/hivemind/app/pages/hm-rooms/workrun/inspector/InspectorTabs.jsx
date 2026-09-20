import React from 'react';
import { PanelRightClose } from 'lucide-react';

const TABS = ['preview', 'artifacts', 'sources', 'computer', 'files', 'team'];

export default function InspectorTabs({ tab, onChange, counts, onClose }) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-[#eceae6] px-2 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {TABS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`text-[11px] px-2 py-1 rounded-[6px] capitalize ${tab === id ? 'bg-[#0a0a0a] text-white' : 'text-[#737373]'}`}
        >
          {id}{counts?.[id] ? ` · ${counts[id]}` : ''}
        </button>
        ))}
      </div>
      <button type="button" onClick={onClose} aria-label="Close preview" className="shrink-0 rounded-[6px] p-1.5 text-[#737373] hover:bg-[#f3f1ec] hover:text-[#0a0a0a]"><PanelRightClose size={15} /></button>
    </div>
  );
}
