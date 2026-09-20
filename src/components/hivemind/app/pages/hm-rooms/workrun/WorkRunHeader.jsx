import React from 'react';
import { LayoutDashboard, Code2 } from 'lucide-react';
import RunSummary from './narrative/RunSummary';
import TeamInline from './team/TeamInline';

function statusClass(status) {
  if (status === 'completed' || status === 'idle') return 'text-[#10b981] bg-[#10b981]/10';
  if (status === 'failed' || status === 'cancelled') return 'text-[#737373] bg-[#f3f1ec]';
  if (status === 'running' || status === 'streaming' || status === 'working') return 'text-[#117dff] bg-[#117dff]/10';
  return 'text-[#737373] bg-[#f3f1ec]';
}

export default function WorkRunHeader({ goal, status, working, team, onToggleNav, onToggleRail, onOpenTeam }) {
  const label = working ? 'working' : (status || 'idle');
  return (
    <div className="h-11 shrink-0 px-3 flex items-center justify-between border-b border-[#eceae6] bg-white">
      <div className="flex items-center gap-2 min-w-0">
        <button type="button" onClick={onToggleNav} className="p-1.5 rounded-lg hover:bg-[#f3f1ec] text-[#525252]" aria-label="Toggle sidebar">
          <LayoutDashboard size={15} />
        </button>
        <RunSummary goal={goal} status={status} working={working} />
        <TeamInline team={team} onOpen={onOpenTeam} />
        <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] ${statusClass(working ? 'working' : status)}`}>
          {label}
        </span>
      </div>
      <button type="button" onClick={onToggleRail} className="p-1.5 rounded-lg hover:bg-[#f3f1ec] text-[#525252]" aria-label="Toggle preview">
        <Code2 size={15} />
      </button>
    </div>
  );
}
