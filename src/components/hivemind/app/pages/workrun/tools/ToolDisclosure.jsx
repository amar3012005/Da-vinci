import React from 'react';
import BashTool from './BashTool';
import ReadTool from './ReadTool';
import WriteTool from './WriteTool';
import EditTool from './EditTool';
import SearchTool from './SearchTool';
import ComposioTool from './ComposioTool';
import GenericTool from './GenericTool';
import { toolLabel } from '../../hm-rooms-dsh/workrun-view';

export default function ToolDisclosure({ tool, onOpen }) {
  const name = String(tool?.name || tool?.tool_name || 'Tool');
  const shared = {
    name,
    label: tool?.label || toolLabel(name),
    state: tool?.state,
    result: tool?.result,
    input: tool?.input,
    onOpen,
  };
  if (/bash|shell|exec/i.test(name)) return <BashTool {...shared} />;
  if (/write/i.test(name)) return <WriteTool {...shared} />;
  if (/edit/i.test(name)) return <EditTool {...shared} />;
  if (/read|web_read/i.test(name)) return <ReadTool {...shared} />;
  if (/search/i.test(name)) return <SearchTool {...shared} />;
  if (/composio|gmail/i.test(name)) return <ComposioTool {...shared} />;
  return <GenericTool {...shared} />;
}
