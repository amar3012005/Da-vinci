import React, { useCallback, useRef, useState } from 'react';
import { AudioLines, Bell, BrainCircuit, Orbit, UserPlus } from 'lucide-react';
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
  onPreview,
  onDraft,
  onSend,
  onStop,
  legacySidebar,
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(360);
  const dragRef = useRef(null);

  const clampPreviewWidth = useCallback((value) => {
    const max = Math.max(320, Math.floor(window.innerWidth * 0.5));
    return Math.min(max, Math.max(320, value));
  }, []);

  const startPreviewResize = useCallback((event) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, startWidth: previewWidth, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [previewWidth]);

  const resizePreview = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPreviewWidth(clampPreviewWidth(drag.startWidth + drag.startX - event.clientX));
  }, [clampPreviewWidth]);

  const finishPreviewResize = useCallback((event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const resizeByKey = useCallback((event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    setPreviewWidth((current) => {
      if (event.key === 'Home') return 320;
      if (event.key === 'End') return clampPreviewWidth(window.innerWidth * 0.5);
      const step = event.shiftKey ? 48 : 16;
      return clampPreviewWidth(current + (event.key === 'ArrowLeft' ? step : -step));
    });
  }, [clampPreviewWidth]);
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
      {legacySidebar}
      <div className="flex-1 min-w-0 flex flex-col bg-[#fbfaf7]">
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 flex flex-col" aria-label="WorkRun output">
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
          <div
            role="separator"
            aria-label="Resize preview pane"
            aria-orientation="vertical"
            aria-valuemin={320}
            aria-valuemax={Math.floor(window.innerWidth * 0.5)}
            aria-valuenow={previewWidth}
            tabIndex={0}
            onPointerDown={startPreviewResize}
            onPointerMove={resizePreview}
            onPointerUp={finishPreviewResize}
            onPointerCancel={finishPreviewResize}
            onKeyDown={resizeByKey}
            className="group relative z-10 -mx-1 flex w-2 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none before:h-full before:w-px before:bg-[#e3e0db] hover:before:w-0.5 hover:before:bg-[#117dff] focus-visible:before:w-0.5 focus-visible:before:bg-[#117dff]"
          >
            <span className="h-10 w-1 rounded-full bg-[#d4d0ca] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
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
            width={previewWidth}
          />
        </div>
      </div>
      <PlanDrawer open={planOpen} tasks={tasks || activity} onClose={() => setPlanOpen(false)} />
      <TeamDrawer open={teamOpen} team={team} onClose={() => setTeamOpen(false)} />
      </div>
    </div>
  );
}
