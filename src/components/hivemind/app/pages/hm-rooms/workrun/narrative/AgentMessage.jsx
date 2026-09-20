import React, { useMemo, useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { renderMarkdownLite } from '../../../../hyperagents/rooms/shared';
import StreamingText from './StreamingText';
import ToolDisclosure from '../tools/ToolDisclosure';
import ActivityGroup from '../activity/ActivityGroup';
import ApprovalCard from '../approval/ApprovalCard';
import ExternalActionCard from '../approval/ExternalActionCard';

export default function AgentMessage({
  thinking,
  text,
  streaming,
  tools,
  activity,
  approvals,
  onPreview,
}) {
  const [traceOpen, setTraceOpen] = useState(true);
  const trace = useMemo(() => {
    const seen = new Set();
    return [...(tools || []), ...(activity || [])].filter((item) => {
      const key = item.id || item.block_id || `${item.name || item.label}:${item.state || item.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [tools, activity]);
  const hasWork = Boolean(thinking || trace.length || streaming);

  return (
    <article className="w-full space-y-5 text-[#171717]">
      {hasWork ? (
        <details className="group" open={streaming || traceOpen} onToggle={(event) => setTraceOpen(event.currentTarget.open)}>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] text-[#737373] marker:content-none">
            <span>{streaming ? 'Working' : 'Worked on this run'}</span>
            {trace.length ? <span>· {trace.length} {trace.length === 1 ? 'action' : 'actions'}</span> : null}
            <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-5 space-y-5">
            {thinking ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[14px] text-[#737373]">
                  <Lightbulb size={17} strokeWidth={1.7} />
                  <span>{streaming ? 'Working through the request' : 'Evaluated the request'}</span>
                </div>
                <div className="text-[15px] leading-7 text-[#242424]">
                  <StreamingText text={thinking} streaming={streaming && !text} />
                </div>
              </div>
            ) : null}
            {trace.length ? (
              <div className="space-y-0">
                {trace.map((item, index) => (
                  item.name
                    ? <ToolDisclosure key={item.id || `${item.name}-${index}`} tool={item} onOpen={onPreview} />
                    : <ActivityGroup key={item.id || item.block_id || index} items={[item]} onOpen={onPreview} />
                ))}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
      {(approvals || []).map((a) => (
        <ApprovalCard key={a.block_id} prompt={a.payload?.prompt} tool={a.payload?.tool} />
      ))}
      {text ? (
        <div className={`${hasWork ? 'border-t border-[#e3e0db] pt-8' : ''} text-[16px] leading-[1.75] text-[#171717] [&_h1]:mb-5 [&_h1]:mt-1 [&_h1]:text-[30px] [&_h1]:font-semibold [&_h1]:tracking-[-0.025em] [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-[22px] [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[18px] [&_h3]:font-semibold [&_ol]:my-4 [&_ol]:space-y-3 [&_ul]:my-4 [&_ul]:space-y-2 [&_pre]:rounded-[10px] [&_pre]:bg-[#f3f1ec] [&_pre]:p-4 [&_code]:rounded [&_code]:bg-[#f7eee7] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[#a24d1d]`}>
          {renderMarkdownLite(text)}
          {streaming ? <StreamingText text="" streaming /> : null}
        </div>
      ) : null}
      {(approvals || []).some((a) => a.payload?.external) ? <ExternalActionCard title="External action" /> : null}
    </article>
  );
}
