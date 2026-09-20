import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Hash, Plus } from 'lucide-react';
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
  runs,
  runId,
  msgs,
  activity,
  tasks,
  approvals,
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
  onNavigate,
  onNewWork,
  onPreview,
  onDraft,
  onSend,
  userLabel,
  onSignOut,
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  return (
    <div className="hmDshHost h-full flex bg-[#f7f6f3]">
      <motion.aside
        initial={false}
        animate={{ width: navOpen ? 240 : 0, opacity: navOpen ? 1 : 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="shrink-0 overflow-hidden border-r border-[#e3e0db] bg-[#faf9f4]"
      >
        <div className="w-[240px] h-full flex flex-col">
          <div className="px-2 pt-2">
            <button type="button" onClick={onNewWork} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold bg-[#0a0a0a] text-white">
              <Plus size={13} /> New work
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto py-1">
            <div className="px-3 pt-3 pb-1 text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3]">Recents</div>
            {(runs || []).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onNavigate(`/hivemind/app/hm-rooms/${r.id}`)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white ${r.id === runId ? 'bg-white' : ''}`}
              >
                <Hash size={12} className="text-[#a3a3a3]" />
                <span className="text-[12px] truncate">{r.goal || r.id.slice(0, 8)}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-[#e3e0db] px-2 py-2 text-[11px] text-[#525252]">
            {userLabel}
            <button type="button" className="block mt-1 hover:text-[#dc2626]" onClick={onSignOut}>Sign Out</button>
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 min-w-0 flex flex-col">
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
              activity={activity}
              tasks={tasks}
              approvals={approvals}
              onPreview={onPreview}
              error={error}
            />
            <div className="shrink-0 bg-transparent px-4 pb-3 pt-1">
              <div className="max-w-[760px] mx-auto">
                <WorkRunComposer value={draft} onChange={onDraft} onSubmit={onSend} busy={false} />
              </div>
            </div>
          </div>
          <Inspector
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
  );
}
