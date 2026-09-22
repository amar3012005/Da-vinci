import React, { useEffect, useState } from 'react';
import { Copy, Ellipsis, Link, LoaderCircle, RefreshCw, ThumbsDown, ThumbsUp, ChevronDown } from 'lucide-react';
import { renderMarkdownLite } from '../../../../hyperagents/rooms/shared';
import StreamingText from './StreamingText';
import ToolDisclosure from '../tools/ToolDisclosure';
import ExternalActionCard from '../approval/ExternalActionCard';

export default function AgentMessage({
  thinking,
  text,
  streaming,
  stage,
  tools,
  timeline,
  onPreview,
  onResolveExternalAction,
}) {
  const ordered = (timeline || []).length
    ? timeline
    : [
      ...(thinking ? [{ kind: 'thinking', id: 'thinking', text: thinking }] : []),
      ...(tools || []).map((tool, index) => ({ ...tool, kind: 'tool', id: tool.id || `tool-${index}` })),
    ];
  const hasWork = ordered.length > 0;
  // Final text is not the completion signal.  A reply can complete with an
  // empty synthesis after a tool failure/cancellation, and that must still
  // release the UI rather than leaving its working trace permanently open.
  const finished = !streaming && (Boolean(text) || hasWork || stage === 'complete');
  const [toolsOpen, setToolsOpen] = useState(!finished);
  const [feedback, setFeedback] = useState(null);

  // A completed turn keeps its answer prominent. Tool output remains available
  // on demand, but details never stay expanded after final synthesis.
  useEffect(() => {
    if (finished) setToolsOpen(false);
  }, [finished]);
  const liveStatus = stage === 'acknowledging' ? 'Acknowledging your request…'
    : stage === 'reasoning' ? 'Reasoning…'
      : stage === 'working' ? 'Working…'
        : null;
  const copyAnswer = () => {
    if (!text || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <article className="w-full space-y-5 text-[#0a0a0a]">
      {streaming && liveStatus && stage !== 'working' ? (
        <div className="inline-flex items-center gap-2 text-[13px] text-[#737373]">
          <LoaderCircle size={14} className="animate-spin" /> {liveStatus}
        </div>
      ) : null}
      {hasWork ? (
        <button
          type="button"
          onClick={() => setToolsOpen((open) => !open)}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#737373] hover:text-[#171717]"
        >
          {streaming ? <LoaderCircle size={14} className="animate-spin" /> : null}
          <span>{streaming ? 'Working' : 'Worked'} · {ordered.length} action{ordered.length === 1 ? '' : 's'}</span>
          <ChevronDown size={15} className={`transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : null}
      {ordered.map((item, index) => (
        item.kind === 'tool' ? (
          <ToolDisclosure
            key={item.id || `${item.name}-${index}`}
            tool={{ ...item, label: item.label || item.name, state: item.status || item.state }}
            onOpen={onPreview}
            hidden={finished && !toolsOpen}
            collapseDetails={finished}
          />
        ) : item.kind === 'externalAction' ? (
          <div key={item.id || `external-action-${index}`} className={finished && !toolsOpen ? 'hidden' : ''}>
            <ExternalActionCard id={item.id} title={item.title} detail={item.detail} status={item.status} onResolve={onResolveExternalAction} />
          </div>
        ) : (
          <div key={item.id || `thinking-${index}`} className={`text-[14px] leading-6 text-[#737373] ${finished && !toolsOpen ? 'hidden' : ''}`}>
            <StreamingText text={item.text || ''} streaming={streaming && index === ordered.length - 1 && !text} />
          </div>
        )
      ))}
      {text ? (
        <>
          <div className={`${hasWork ? 'border-t border-[#e3e0db] pt-7' : ''} text-[15px] leading-7 text-[#171717] [&_h1]:mb-5 [&_h1]:mt-1 [&_h1]:font-['Space_Grotesk'] [&_h1]:text-[28px] [&_h1]:font-semibold [&_h1]:tracking-[-0.025em] [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-['Space_Grotesk'] [&_h2]:text-[21px] [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-['Space_Grotesk'] [&_h3]:text-[17px] [&_h3]:font-semibold [&_ol]:my-4 [&_ol]:space-y-3 [&_ul]:my-4 [&_ul]:space-y-2 [&_pre]:rounded-[10px] [&_pre]:bg-[#f3f1ec] [&_pre]:p-4 [&_code]:rounded [&_code]:bg-[#f7eee7] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[#a24d1d]`}>
            {renderMarkdownLite(text)}
            {streaming ? <StreamingText text="" streaming /> : null}
          </div>
          {!streaming ? (
            <div className="flex items-center gap-1 pt-1 text-[#737373]" aria-label="Response actions">
              <button type="button" onClick={copyAnswer} aria-label="Copy answer" className="rounded-[6px] p-1.5 hover:bg-[#f3f1ec] hover:text-[#0a0a0a]"><Copy size={16} /></button>
              <button type="button" onClick={() => setFeedback('up')} aria-label="Helpful" className={`rounded-[6px] p-1.5 hover:bg-[#f3f1ec] hover:text-[#0a0a0a] ${feedback === 'up' ? 'text-[#117dff]' : ''}`}><ThumbsUp size={16} /></button>
              <button type="button" onClick={() => setFeedback('down')} aria-label="Not helpful" className={`rounded-[6px] p-1.5 hover:bg-[#f3f1ec] hover:text-[#0a0a0a] ${feedback === 'down' ? 'text-[#117dff]' : ''}`}><ThumbsDown size={16} /></button>
              <button type="button" aria-label="Copy response link" className="rounded-[6px] p-1.5 hover:bg-[#f3f1ec] hover:text-[#0a0a0a]"><Link size={16} /></button>
              <button type="button" aria-label="Retry response" className="rounded-[6px] p-1.5 hover:bg-[#f3f1ec] hover:text-[#0a0a0a]"><RefreshCw size={16} /></button>
              <button type="button" aria-label="More response actions" className="rounded-[6px] p-1.5 hover:bg-[#f3f1ec] hover:text-[#0a0a0a]"><Ellipsis size={16} /></button>
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
