import React from 'react';

export default function TaskRow({ title, done, active }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-[#171717]">
      <span>{done ? '✓' : active ? '●' : '○'}</span>
      <span className={done ? 'text-[#737373]' : ''}>{title}</span>
    </div>
  );
}
