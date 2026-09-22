import React from 'react';
import TaskRow from './TaskRow';

export default function PlanInline({ tasks, onOpen }) {
  const list = Array.isArray(tasks) ? tasks : [];
  if (!list.length) return null;
  const done = list.filter((t) => t.status === 'complete' || t.done).length;
  return (
    <button type="button" onClick={onOpen} className="mb-2 w-full rounded-[10px] border border-[#e3e0db] bg-white px-3 py-2 text-left transition-colors hover:border-[#d4d0ca] hover:bg-[#faf9f4]" aria-label="Open task plan">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#737373]">Tasks · {done} / {list.length} complete</div>
      <div className="space-y-1">
      {list.slice(0, 6).map((t) => (
        <TaskRow key={t.id || t.block_id || t.label} title={t.label || t.title} done={t.status === 'complete' || t.done} active={t.status === 'streaming'} />
      ))}
      {list.length > 6 ? <div className="pl-5 text-[11px] text-[#737373]">+{list.length - 6} more tasks</div> : null}
      </div>
    </button>
  );
}
