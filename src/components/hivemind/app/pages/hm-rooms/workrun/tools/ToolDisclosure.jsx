import React, { useEffect, useState } from 'react';
import BashTool from './BashTool';
import ReadTool from './ReadTool';
import WriteTool from './WriteTool';
import EditTool from './EditTool';
import SearchTool from './SearchTool';
import ComposioTool from './ComposioTool';
import GenericTool from './GenericTool';

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
      {tool?.result ? (
        <button type="button" className="ml-4 text-[11px] text-[#737373]" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide details' : 'View details'}
        </button>
      ) : null}
      {open && tool?.result ? (
        <pre className="mt-1 ml-4 text-[11px] text-[#525252] bg-[#f7f7f5] p-2 rounded-lg whitespace-pre-wrap line-clamp-8">{tool.result}</pre>
      ) : null}
    </div>
  );
}
