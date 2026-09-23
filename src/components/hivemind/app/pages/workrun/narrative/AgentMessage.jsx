import React, { useMemo, useState } from 'react';
import { Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import { renderMarkdownLite } from '../../../hyperagents/rooms/shared';
import StreamingText from './StreamingText';
import ReasoningRow from './ReasoningRow';
import ActivityGroup from '../activity/ActivityGroup';
import ApprovalCard from '../approval/ApprovalCard';
import ExternalActionCard from '../approval/ExternalActionCard';
import TurnUsage from './TurnUsage';
import css from '../dsh.module.css';

export default function AgentMessage({
  thinking,
  text,
  streaming,
  tools,
  timeline,
  activity,
  approvals,
  onPreview,
  elapsedLabel,
  statusText,
  usage,
}) {
  const [feedback, setFeedback] = useState(null);
  const ordered = useMemo(() => {
    if (Array.isArray(timeline) && timeline.length) return timeline;
    if (Array.isArray(tools) && tools.length) {
      return [
        ...(thinking ? [{ id: 'thinking:legacy', kind: 'thinking', text: thinking }] : []),
        ...tools.map((tool, index) => ({ ...tool, id: tool.id || `tool-${index}`, kind: 'tool' })),
      ];
    }
    return Array.isArray(activity) ? activity : (thinking ? [{ id: 'thinking:legacy', kind: 'thinking', text: thinking }] : []);
  }, [activity, thinking, timeline, tools]);

  const copyAnswer = () => {
    if (text && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <article className="mx-auto w-full max-w-[840px] space-y-5 text-[#0a0a0a]">
      {elapsedLabel ? <div className="text-[12px] text-[#a3a3a3]">{elapsedLabel}</div> : null}
      {streaming && statusText ? <ReasoningRow text={statusText} title="Status" running /> : null}
      {ordered.length ? <ActivityGroup items={ordered} onOpen={onPreview} streaming={streaming} /> : null}
      {(approvals || []).map((approval) => (
        <ApprovalCard key={approval.block_id} prompt={approval.payload?.prompt} tool={approval.payload?.tool} />
      ))}
      {text ? (
        <div className={`${css.prose} text-[15px] leading-7 text-[#171717]`}>
          {renderMarkdownLite(text)}
          {streaming ? <StreamingText text="" streaming /> : null}
        </div>
      ) : null}
      {text && !streaming ? (
        <>
          <div className={css.actions} aria-label="Response actions">
            <button type="button" onClick={copyAnswer} aria-label="Copy answer" className={css.action}><Copy size={15} /></button>
            <button type="button" onClick={() => setFeedback('up')} aria-label="Helpful" className={css.action} style={feedback === 'up' ? { color: '#117dff' } : undefined}><ThumbsUp size={15} /></button>
            <button type="button" onClick={() => setFeedback('down')} aria-label="Not helpful" className={css.action} style={feedback === 'down' ? { color: '#117dff' } : undefined}><ThumbsDown size={15} /></button>
          </div>
          <TurnUsage usage={usage} />
        </>
      ) : null}
      {(approvals || []).some((approval) => approval.payload?.external) ? <ExternalActionCard title="External action" /> : null}
    </article>
  );
}
