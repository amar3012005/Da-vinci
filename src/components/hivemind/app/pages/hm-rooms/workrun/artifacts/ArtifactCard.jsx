import React from 'react';
import { FileText, Image, Table2 } from 'lucide-react';

export default function ArtifactCard({ title, kind, onOpen }) {
  const Icon = /image/i.test(kind || '') ? Image : /table|csv|sheet/i.test(kind || '') ? Table2 : FileText;
  return (
    <button type="button" onClick={onOpen} className="mb-2 flex w-full items-center gap-2 rounded-[8px] border border-[#e3e0db] bg-white p-3 text-left transition-colors hover:border-[#d4d0ca] hover:bg-[#faf9f4]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-blue-50 text-[#117dff]"><Icon size={15} /></span>
      <span className="min-w-0"><span className="block truncate text-[12px] font-medium text-[#0a0a0a]">{title || kind || 'Artifact'}</span><span className="mt-0.5 block text-[10px] text-[#737373]">Registered artifact</span></span>
    </button>
  );
}
