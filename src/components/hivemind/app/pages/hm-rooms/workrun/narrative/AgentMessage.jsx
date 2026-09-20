import React, { useMemo } from 'react';
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
  onApproval,
}) {
  const trace = useMemo(() => {
    const seen = new Set();
    const candidates = (activity || []).length ? activity : (tools || []);
    return candidates.filter((item) => {
      const label = String(item.label || item.name || item.payload?.name || '').trim();
      if (!label || /^tool$/i.test(label) || label.startsWith('{')) return false;
      const key = label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [tools, activity]);
  const hasWork = Boolean(thinking || trace.length || streaming);

  return (
    <article className="w-full space-y-5 text-[#171717]">
      {hasWork ? (
        <div>
          <div className="flex items-center gap-2 text-[14px] text-[#737373]">
            <span>{streaming ? 'Working' : 'Worked on this run'}</span>
            {trace.length ? <span>· {trace.length} {trace.length === 1 ? 'action' : 'actions'}</span> : null}
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 text-[14px] text-[#737373]">
              <Lightbulb size={17} strokeWidth={1.7} />
              <span>{streaming ? 'Working through the request' : 'Completed the requested work'}</span>
            </div>
            {trace.length ? (
              <div className="space-y-0">
                {trace.map((item, index) => (
                  item.name
                    ? <ToolDisclosure key={item.id || `${item.name}-${index}`} tool={{ ...item, label: item.name, state: item.status || item.state }} onOpen={onPreview} />
                    : <ActivityGroup key={item.id || item.block_id || index} items={[item]} onOpen={onPreview} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {thinking ? (
        <details className="group text-[13px] text-[#737373]">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] text-[#737373] marker:content-none">
            <span>View working notes</span>
            <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 border-l border-[#e3e0db] pl-5 text-[14px] leading-7 text-[#525252]">
            <StreamingText text={thinking} streaming={streaming && !text} />
          </div>
        </details>
      ) : null}
      {(approvals || []).map((a) => (
        <ApprovalCard
          key={a.block_id}
          prompt={a.payload?.prompt}
          tool={a.payload?.tool}
          onApprove={() => onApproval?.(a, true)}
          onDeny={() => onApproval?.(a, false)}
        />
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
