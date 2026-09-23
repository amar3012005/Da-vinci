import React from 'react';

const TABS = ['preview', 'artifacts', 'sources', 'computer', 'files', 'team'];

export default function InspectorTabs({ tab, onChange, counts }) {
  return (
    <div className="flex items-center gap-1 px-2 py-2 flex-wrap border-b border-[#eceae6]">
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
  );
}
