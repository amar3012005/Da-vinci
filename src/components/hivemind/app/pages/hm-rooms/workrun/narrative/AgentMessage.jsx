import React from 'react';
import { renderMarkdownLite } from '../../../../hyperagents/rooms/shared';
import StreamingText from './StreamingText';
import ToolDisclosure from '../tools/ToolDisclosure';
import ActivityGroup from '../activity/ActivityGroup';
import PlanInline from '../plan/PlanInline';
import ApprovalCard from '../approval/ApprovalCard';
import ExternalActionCard from '../approval/ExternalActionCard';

export default function AgentMessage({
  thinking,
  text,
  streaming,
  tools,
  activity,
  tasks,
  approvals,
  onPreview,
}) {
  return (
    <div className="max-w-[720px] mx-auto w-full space-y-4">
      {streaming && !thinking && !text && !(tools || []).length ? (
        <p className="text-[14px] text-[#8b877f]">Thinking…</p>
      ) : null}
      {thinking ? (
        <div className="text-[15px] leading-7 text-[#525252]">
          <StreamingText text={thinking} streaming={streaming && !text} />
        </div>
      ) : null}
      {(tools || []).length ? (
        <div className="space-y-2">
          {tools.map((t) => (
            <ToolDisclosure key={t.id || t.name} tool={t} onOpen={onPreview} />
          ))}
        </div>
      ) : null}
      <ActivityGroup items={activity} onOpen={onPreview} />
      <PlanInline tasks={tasks} />
      {(approvals || []).map((a) => (
        <ApprovalCard key={a.block_id} prompt={a.payload?.prompt} tool={a.payload?.tool} />
      ))}
      {text ? (
        <div className="text-[16px] leading-[1.7] text-[#171717] [&_h1]:text-[22px] [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:mb-2 [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:mt-5 [&_pre]:bg-[#f7f7f5] [&_pre]:p-3 [&_pre]:rounded-xl">
          {renderMarkdownLite(text)}
          {streaming ? <StreamingText text="" streaming /> : null}
        </div>
      ) : null}
      {(approvals || []).some((a) => a.payload?.external) ? <ExternalActionCard title="External action" /> : null}
    </div>
  );
}
