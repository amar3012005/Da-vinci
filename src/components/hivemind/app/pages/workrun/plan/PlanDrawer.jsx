import React from 'react';
import PlanInline from './PlanInline';

export default function PlanDrawer({ open, tasks, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} role="presentation">
      <div className="absolute right-0 top-0 h-full w-[360px] bg-white border-l border-[#e3e0db] p-4" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="text-[13px] font-medium mb-3">Plan</div>
        <PlanInline tasks={tasks} />
      </div>
    </div>
  );
}
