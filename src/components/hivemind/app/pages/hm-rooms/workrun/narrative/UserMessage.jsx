import React from 'react';
import { Copy, Pencil } from 'lucide-react';

export default function UserMessage({ text }) {
  return (
    <div className="flex flex-col items-end gap-2 pb-5">
      <div className="max-w-[72%] rounded-[22px] bg-[#f3f2ef] px-5 py-3 text-[15px] leading-6 text-[#171717]">
        {text}
      </div>
      <div className="flex items-center gap-3 pr-2 text-[#737373]">
        <button type="button" className="transition-colors hover:text-[#0a0a0a]" aria-label="Edit message">
          <Pencil size={15} strokeWidth={1.7} />
        </button>
        <button
          type="button"
          className="transition-colors hover:text-[#0a0a0a]"
          aria-label="Copy message"
          onClick={() => navigator.clipboard?.writeText(String(text || ''))}
        >
          <Copy size={15} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}
