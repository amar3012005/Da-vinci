import React, { useState } from 'react';
import { AudioLines, Bell, BrainCircuit, Orbit, UserPlus } from 'lucide-react';
import WorkRunHeader from './WorkRunHeader';
import WorkRunStream from './WorkRunStream';
import WorkRunComposer from './WorkRunComposer';
import Inspector from './inspector/Inspector';
import PlanDrawer from './plan/PlanDrawer';
import TeamDrawer from './team/TeamDrawer';

export default function WorkRunShell({
  goal,
  status,
  working,
  msgs,
  activity,
  tasks,
  artifacts,
  sources,
  team,
  files,
  computer,
  preview,
  draft,
  error,
  navOpen,
  onNavOpen,
  onPreview,
  onDraft,
  onSend,
  onStop,
  legacySidebar,
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  return (
    <div className="hmDshHost h-screen overflow-hidden flex flex-col bg-[#f7f6f3]">
      <header className="h-14 shrink-0 flex items-center justify-between border-y border-[#e3e0db] bg-[#faf9f4] px-5">
        <div className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Hyper Agents</div>
        <div className="flex items-center rounded-[9px] border border-[#e3e0db] bg-white p-0.5 shadow-sm">
          <span className="flex items-center gap-1.5 rounded-[6px] px-4 py-2 text-[10px] font-semibold text-[#737373]"><BrainCircuit size={13} />BRAIN</span>
          <span className="flex items-center gap-1.5 rounded-[6px] bg-[#0a0a0a] px-4 py-2 text-[10px] font-semibold text-white"><Orbit size={13} />OS</span>
          <span className="flex items-center gap-1.5 rounded-[6px] px-4 py-2 text-[10px] font-semibold text-[#a3a3a3]"><AudioLines size={13} />VOICE</span>
        </div>
        <div className="flex items-center gap-2"><Bell size={15} className="text-[#737373]" /><button type="button" className="flex items-center gap-1.5 rounded-[6px] bg-[#117dff] px-3 py-2 text-[11px] font-semibold text-white"><UserPlus size={13} />Invite your team</button></div>
      </header>
      <div className="flex flex-1 min-h-0">
      {navOpen ? legacySidebar : null}
      <div className="flex-1 min-w-0 flex flex-col bg-[#fbfaf7]">
        <WorkRunHeader
          goal={goal}
          status={status}
          working={working}
          team={team}
          onToggleNav={() => onNavOpen((v) => !v)}
          onToggleRail={() => setPlanOpen(true)}
          onOpenTeam={() => setTeamOpen(true)}
        />
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 flex flex-col">
            <WorkRunStream
              msgs={msgs}
              onPreview={onPreview}
              error={error}
            />
            <div className="shrink-0 border-t border-transparent bg-[#fbfaf7] px-4 pb-3 pt-1">
              <div className="max-w-[940px] mx-auto px-8">
                <WorkRunComposer value={draft} onChange={onDraft} onSubmit={onSend} onStop={onStop} busy={working} />
              </div>
            </div>
          </div>
          <Inspector
            goal={goal}
            status={status}
            working={working}
            artifacts={artifacts}
            sources={sources}
            team={team}
            files={files}
            computer={computer}
            preview={preview}
            onPreview={onPreview}
          />
        </div>
      </div>
      <PlanDrawer open={planOpen} tasks={tasks || activity} onClose={() => setPlanOpen(false)} />
      <TeamDrawer open={teamOpen} team={team} onClose={() => setTeamOpen(false)} />
      </div>
    </div>
  );
}
