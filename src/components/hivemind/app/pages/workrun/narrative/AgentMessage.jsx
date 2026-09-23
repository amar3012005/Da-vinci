import React from 'react';
import { renderMarkdownLite } from '../../../hyperagents/rooms/shared';
import StreamingText from './StreamingText';
import ReasoningRow from './ReasoningRow';
import ToolDisclosure from '../tools/ToolDisclosure';
import ActivityGroup from '../activity/ActivityGroup';
import PlanInline from '../plan/PlanInline';
import ApprovalCard from '../approval/ApprovalCard';
import ExternalActionCard from '../approval/ExternalActionCard';
import css from '../dsh.module.css';

export default function AgentMessage({
  thinking,
  text,
  streaming,
  tools,
  activity,
  tasks,
  approvals,
  onPreview,
  elapsedLabel,
  statusText,
}) {
  const copy = () => {
    if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  };
  return (
    <div className={css.assistant}>
      {elapsedLabel ? <div className="text-[12px] text-[#a3a3a3]">{elapsedLabel} ▾</div> : null}
      {streaming && !thinking && !text && !(tools || []).length ? (
        <ReasoningRow text={statusText || 'Thinking'} title={statusText ? 'Starting' : 'Think'} running />
      ) : null}
      {thinking ? <ReasoningRow text={thinking} running={Boolean(streaming && !text)} /> : null}
      {(tools || []).length ? (
        <div>
          {tools.map((t) => (
            <ToolDisclosure key={t.id || t.name} tool={t} onOpen={onPreview} />
          ))}
        </div>
      ) : (
        <ActivityGroup items={activity} onOpen={onPreview} />
      )}
      <PlanInline tasks={(tasks || []).filter((t) => t.kind === 'plan' || t.title)} />
      {(approvals || []).map((a) => (
        <ApprovalCard key={a.block_id} prompt={a.payload?.prompt} tool={a.payload?.tool} />
      ))}
      {text ? (
        <div className={css.prose}>
          {renderMarkdownLite(text)}
          {streaming ? <StreamingText text="" streaming /> : null}
        </div>
      ) : null}
      {text && !streaming ? (
        <div className={css.actions}>
          <button type="button" className={css.action} onClick={copy}>Copy</button>
        </div>
      ) : null}
      {(approvals || []).some((a) => a.payload?.external) ? <ExternalActionCard title="External action" /> : null}
    </div>
  );
}
