import React, { useEffect, useState } from 'react';
import BashTool from './BashTool';
import ReadTool from './ReadTool';
import WriteTool from './WriteTool';
import EditTool from './EditTool';
import SearchTool from './SearchTool';
import ComposioTool from './ComposioTool';
import GenericTool from './GenericTool';

function displayValue(value, fallback) {
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => displayValue(item, '')).join('\n') || fallback;
  if (!value || typeof value !== 'object') return fallback;
  for (const key of ['text', 'delta', 'content', 'output', 'value', 'result']) {
    if (value[key] != null && value[key] !== value) return displayValue(value[key], fallback);
  }
  try { return JSON.stringify(value, null, 2); } catch { return fallback; }
}

export default function ToolDisclosure({ tool, onOpen, hidden = false, collapseDetails = false }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (collapseDetails) setOpen(false);
  }, [collapseDetails]);
  const name = String(tool?.name || '');
  const shared = {
    name,
    label: tool?.label,
    state: tool?.state,
    result: tool?.result,
    onOpen,
    onToggle: () => setOpen((value) => !value),
  };
  let body = <GenericTool {...shared} />;
  if (/bash|shell|exec/i.test(name)) body = <BashTool {...shared} />;
  else if (/write/i.test(name)) body = <WriteTool {...shared} />;
  else if (/edit/i.test(name)) body = <EditTool {...shared} />;
  else if (/read|web_read/i.test(name)) body = <ReadTool {...shared} />;
  else if (/search/i.test(name)) body = <SearchTool {...shared} />;
  else if (/composio|gmail/i.test(name)) body = <ComposioTool {...shared} />;
  return (
    <div className={hidden ? 'hidden' : ''}>
      {body}
      {open ? (
        <div className="ml-4 mt-1 overflow-hidden rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] text-[11px] text-[#525252]">
          <div className="grid grid-cols-[44px_minmax(0,1fr)] border-b border-[#e3e0db]">
            <div className="px-3 py-2 font-mono uppercase tracking-wider text-[#a3a3a3]">IN</div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono leading-5">{displayValue(tool?.input, 'No input captured for this call.')}</pre>
          </div>
          <div className="grid grid-cols-[44px_minmax(0,1fr)]">
            <div className="px-3 py-2 font-mono uppercase tracking-wider text-[#a3a3a3]">OUT</div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono leading-5">{displayValue(tool?.result, tool?.state === 'running' ? 'Waiting for tool result…' : 'No result captured for this call.')}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
