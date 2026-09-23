import React from 'react';
import { Check, ChevronRight, Circle, LoaderCircle, ListChecks } from 'lucide-react';

export default function PlanInline({ tasks, onOpen }) {
  const list = Array.isArray(tasks) ? tasks : [];
  if (!list.length) return null;
  const done = list.filter((t) => t.status === 'complete' || t.done).length;
  return (
    <section aria-label="Company operating plan" className="mb-2 rounded-[10px] border border-[#e3e0db] bg-white px-3 py-2">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 text-left">
        <ListChecks size={14} className="shrink-0 text-[#737373]" />
        <span className="flex-1 text-[11px] font-medium text-[#525252]">Operating plan · {done} / {list.length}</span>
        <ChevronRight size={13} className="text-[#a3a3a3]" />
      </button>
      <ul className="mt-1 space-y-1">
        {list.slice(0, 5).map((task) => {
          const complete = task.status === 'complete' || task.done;
          const active = task.status === 'streaming';
          return (
            <li key={task.id || task.block_id || task.label} className="flex min-w-0 items-center gap-2 pl-5 text-[11px] leading-4">
              {complete ? <Check size={12} className="shrink-0 text-[#10b981]" /> : active ? <LoaderCircle size={12} className="shrink-0 animate-spin text-[#117dff]" /> : <Circle size={12} className="shrink-0 text-[#a3a3a3]" />}
              <span className={`truncate ${complete ? 'text-[#737373]' : 'text-[#525252]'}`} title={task.label || task.title}>{task.label || task.title}</span>
            </li>
          );
        })}
        {list.length > 5 ? <li className="pl-10 text-[10px] text-[#a3a3a3]">+{list.length - 5} more steps</li> : null}
      </ul>
    </section>
  );
}
