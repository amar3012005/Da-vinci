import React, { useState } from 'react';
import WorkRunHeader from './WorkRunHeader';
import WorkRunStream from './WorkRunStream';
import WorkRunComposer from './WorkRunComposer';
import Inspector from './inspector/Inspector';
import PlanDrawer from './plan/PlanDrawer';
import PlanInline from './plan/PlanInline';
import TeamDrawer from './team/TeamDrawer';

function formatElapsed(ms) {
  if (!ms || ms < 0) return '';
  const s = Math.round(ms / 1000);
  if (s < 60) return `Worked for ${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `Worked for ${m}m ${r}s`;
}

export default function WorkRunShell({
  landing,
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
  startedAt,
  onStop,
  phase,
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [railMode, setRailMode] = useState('closed');
  const [railWidth, setRailWidth] = useState(390);
  const elapsedLabel = working && startedAt ? formatElapsed(Date.now() - new Date(startedAt).getTime()) : '';
  const stats = working ? `${(msgs || []).filter((m) => m.role === 'user').length} turns · ${((activity || []).length)} steps` : '';
  const resizeRail = (event) => {
    if (event.buttons !== 1) return;
    setRailWidth(Math.min(Math.floor(window.innerWidth * 0.5), Math.max(320, window.innerWidth - event.clientX)));
  };

  return (
    <div className="hmDshHost h-full flex bg-white relative font-['Space_Grotesk'] text-[#0a0a0a]">
      <div className="flex-1 min-w-0 flex flex-col relative">
        {!landing ? (
          <WorkRunHeader
            goal={goal}
            status={status}
            working={working}
            team={team}
            elapsedLabel={elapsedLabel}
            railOpen={railMode === 'open'}
            onToggleNav={() => window.dispatchEvent(new Event('hivemind:toggle-company-sidebar'))}
            onToggleRail={() => setRailMode((m) => (m === 'open' ? 'closed' : 'open'))}
            onOpenTeam={() => setTeamOpen(true)}
          />
        ) : null}
        <div className="flex-1 min-h-0 flex relative">
          <div className="flex-1 min-w-0 flex flex-col">
            {landing ? (
              <div className="flex-1 flex items-center justify-center px-6">
                <div className="w-full max-w-[760px]">
                  <WorkRunComposer landing value={draft} onChange={onDraft} onSubmit={onSend} busy={false} />
                  {error ? <p className="text-[12px] text-[#b45309] text-center mt-3">{error}</p> : null}
                </div>
              </div>
            ) : (
              <>
                <WorkRunStream
                  msgs={msgs}
                  activity={activity}
                  tasks={tasks}
                  approvals={approvals}
                  onPreview={(item) => { onPreview(item); setRailMode('open'); }}
                  error={error}
                  elapsedLabel={elapsedLabel}
                  phase={phase}
                />
                <div className="shrink-0 bg-transparent px-4 pb-3 pt-1">
                  <div className="max-w-[760px] mx-auto">
                    <PlanInline tasks={tasks} onOpen={() => setPlanOpen(true)} />
                    <WorkRunComposer value={draft} onChange={onDraft} onSubmit={onSend} busy={false} working={working} onStop={onStop} stats={stats} />
                  </div>
                </div>
              </>
            )}
          </div>
          {!landing ? (
            <Inspector
              artifacts={artifacts}
              sources={sources}
              team={team}
              files={files}
              computer={computer}
              preview={preview}
              onPreview={onPreview}
              railMode={railMode}
              width={railWidth}
              onResize={resizeRail}
              onClose={() => setRailMode('closed')}
              onOpen={() => setRailMode('open')}
            />
          ) : null}
        </div>
      </div>
      <PlanDrawer open={planOpen} tasks={tasks || activity} onClose={() => setPlanOpen(false)} />
      <TeamDrawer open={teamOpen} team={team} onClose={() => setTeamOpen(false)} />
    </div>
  );
}
