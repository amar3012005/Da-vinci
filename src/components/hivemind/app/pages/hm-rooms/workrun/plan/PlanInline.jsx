import React from 'react';
import TaskRow from './TaskRow';

export default function PlanInline({ tasks, onOpen }) {
  const list = Array.isArray(tasks) ? tasks : [];
  if (!list.length) return null;
  const done = list.filter((t) => t.status === 'complete' || t.done).length;
  return (
    <button type="button" onClick={onOpen} className="text-left w-full space-y-1">
      <div className="text-[12px] text-[#737373]">Plan · {done} / {list.length}</div>
      {list.slice(0, 8).map((t) => (
        <TaskRow key={t.id || t.block_id || t.label} title={t.label || t.title} done={t.status === 'complete' || t.done} active={t.status === 'streaming'} />
      ))}
    </button>
  );
}
