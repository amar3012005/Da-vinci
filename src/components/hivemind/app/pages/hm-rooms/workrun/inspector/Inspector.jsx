import React, { useState } from 'react';
import { Archive, Code2, Globe, Hash, Users } from 'lucide-react';
import InspectorTabs from './InspectorTabs';
import ArtifactPreview from './ArtifactPreview';
import SourcesPanel from './SourcesPanel';
import FilesPanel from './FilesPanel';
import ComputerPanel from './ComputerPanel';
import TeamPanel from './TeamPanel';
import ArtifactGrid from '../artifacts/ArtifactGrid';

export default function Inspector({ goal, status, working, artifacts, sources, team, files, computer, preview, onPreview }) {
  const [tab, setTab] = useState('preview');
  const counts = {
    artifacts: artifacts?.length || 0,
    sources: sources?.length || 0,
    team: team?.length || 0,
    files: files?.length || 0,
  };
  return (
    <aside className="w-[330px] shrink-0 h-full flex flex-col bg-[#fafafa] border-l border-[#e3e0db]">
      <div className="border-b border-[#e3e0db] px-4 py-3">
        <div className="flex items-start gap-2"><Hash size={13} className="mt-0.5 text-[#737373]" /><div className="min-w-0"><p className="truncate text-[12px] font-semibold text-[#0a0a0a]">{goal || 'WorkRun'}</p><span className="mt-1 inline-flex rounded-full bg-[#117dff]/10 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-[#117dff]">General</span></div></div>
        <div className="mt-3 border-t border-[#eae7e1] pt-3"><p className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">Goal</p><p className="mt-1 text-[11px] leading-5 text-[#525252]">{goal || 'Waiting for the WorkRun objective.'}</p><div className="mt-2 flex items-center justify-between text-[10px] text-[#737373]"><span className="inline-flex items-center gap-1"><Users size={11} />{team?.length || 0} participants</span><span className={working ? 'text-[#117dff]' : 'text-[#737373]'}>{working ? 'working' : (status || 'idle')}</span></div></div>
        <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className="rounded-[6px] border border-[#e3e0db] bg-white px-2 py-1.5 text-[10px] text-[#525252]">Clear all</button><button type="button" className="inline-flex items-center justify-center gap-1 rounded-[6px] border border-[#e3e0db] bg-white px-2 py-1.5 text-[10px] text-[#525252]"><Archive size={11} />Archive</button></div>
      </div>
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[#eceae6] text-[#a3a3a3]"><Globe size={14} /><Code2 size={14} /></div>
      <InspectorTabs tab={tab} onChange={setTab} counts={counts} />
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {tab === 'preview' ? (
          preview || artifacts?.length ? (
            <ArtifactPreview artifact={preview || artifacts[0]} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="text-[15px] font-medium text-[#0a0a0a]">Preview</div>
              <p className="mt-2 text-[13px] text-[#737373] leading-5">Artifacts, pages, and computer sessions from this run appear here.</p>
            </div>
          )
        ) : null}
        {tab === 'artifacts' ? <ArtifactGrid artifacts={artifacts} onOpen={onPreview} /> : null}
        {tab === 'sources' ? <SourcesPanel sources={sources} onOpen={onPreview} /> : null}
        {tab === 'files' ? <FilesPanel files={files} /> : null}
        {tab === 'computer' ? <ComputerPanel computer={computer} /> : null}
        {tab === 'team' ? <TeamPanel team={team} /> : null}
      </div>
    </aside>
  );
}
