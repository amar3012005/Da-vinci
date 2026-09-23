import React from 'react';
import { ArrowUpRight, FileText } from 'lucide-react';

export default function ArtifactCard({ title, kind, onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="group flex w-full min-w-0 items-center gap-2 rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-left hover:border-[#d4d0ca]">
      <FileText size={15} className="shrink-0 text-[#737373]" />
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#0a0a0a]">{title || kind || 'Artifact'}</span>
      <ArrowUpRight size={13} className="shrink-0 text-[#a3a3a3] group-hover:text-[#0a0a0a]" />
    </button>
  );
}
