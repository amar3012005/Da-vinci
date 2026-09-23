import React, { useState } from 'react';
import { Code2, Globe, X } from 'lucide-react';
import { motion } from 'framer-motion';
import InspectorTabs from './InspectorTabs';
import ArtifactPreview from './ArtifactPreview';
import SourcesPanel from './SourcesPanel';
import FilesPanel from './FilesPanel';
import ComputerPanel from './ComputerPanel';
import TeamPanel from './TeamPanel';
import ArtifactGrid from '../artifacts/ArtifactGrid';

export default function Inspector({
  artifacts, sources, team, files, computer, preview, onPreview, railMode, onOpen, onClose, width = 390, onResize,
}) {
  const [tab, setTab] = useState('preview');
  const counts = {
    team: team?.length || 0,
    files: (files?.length || artifacts?.length) || 0,
    artifacts: artifacts?.length || 0,
    sources: sources?.length || 0,
  };

  if (railMode !== 'open') {
    return null;
  }

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative shrink-0 h-full flex flex-col bg-white border-l border-[#e3e0db] overflow-hidden"
      style={{ width, maxWidth: '50vw' }}
    >
      <div className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-[#117dff]/30" onPointerMove={onResize} role="separator" aria-label="Resize preview panel" />
      <div className="h-full min-w-0 flex flex-col">
        <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[#eceae6] text-[#a3a3a3]">
          <Globe size={14} />
          <div className="flex items-center gap-2"><Code2 size={14} /><button type="button" aria-label="Close preview panel" onClick={onClose}><X size={15} /></button></div>
        </div>
        <InspectorTabs tab={tab} onChange={setTab} counts={counts} />
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {tab === 'preview' ? (
            preview || artifacts?.length ? (
              <ArtifactPreview artifact={preview || artifacts[0]} />
            ) : (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center px-6">
                <div className="text-[15px] font-medium text-[#0a0a0a]">Preview</div>
                <p className="mt-2 text-[13px] text-[#737373] leading-5">Live pages, artifacts, and computer sessions appear here.</p>
              </div>
            )
          ) : null}
          {tab === 'browser' ? (
            preview ? <ArtifactPreview artifact={preview} /> : (
              <p className="text-[13px] text-[#737373] text-center mt-16">No browser session yet.</p>
            )
          ) : null}
          {tab === 'computer' ? <ComputerPanel computer={computer} /> : null}
          {tab === 'sources' ? <SourcesPanel sources={sources} onOpen={(s) => onPreview(s)} /> : null}
          {tab === 'files' ? <FilesPanel files={files} artifacts={artifacts} /> : null}
          {tab === 'team' ? (
            <>
              <TeamPanel team={team} />
              <div className="mt-4"><ComputerPanel computer={computer} /></div>
              <div className="mt-4"><FilesPanel files={files} artifacts={artifacts} /></div>
            </>
          ) : null}
          {tab === 'artifacts' ? <ArtifactGrid artifacts={artifacts} onOpen={onPreview} /> : null}
        </div>
      </div>
    </motion.aside>
  );
}
