import React, { useState } from 'react';
import InspectorTabs from './InspectorTabs';
import ArtifactPreview from './ArtifactPreview';
import SourcesPanel from './SourcesPanel';
import FilesPanel from './FilesPanel';
import ComputerPanel from './ComputerPanel';
import TeamPanel from './TeamPanel';
import ArtifactGrid from '../artifacts/ArtifactGrid';

export default function Inspector({ artifacts, sources, team, files, computer, preview, onPreview, onClose, width = 360 }) {
  const [tab, setTab] = useState('preview');
  const counts = {
    artifacts: artifacts?.length || 0,
    sources: sources?.length || 0,
    team: team?.length || 0,
    files: files?.length || 0,
  };
  return (
    <aside aria-label="WorkRun preview" style={{ width }} className="min-w-[320px] shrink-0 h-full flex flex-col overflow-hidden bg-[#fafafa] border-l border-[#e3e0db]">
      <InspectorTabs tab={tab} onChange={setTab} counts={counts} onClose={onClose} />
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
