import React from 'react';
import { renderMarkdownLite } from '../../../../hyperagents/rooms/shared';
import StreamingText from './StreamingText';
import ToolDisclosure from '../tools/ToolDisclosure';

export default function AgentMessage({
  thinking,
  text,
  streaming,
  tools,
  timeline,
  onPreview,
}) {
  const ordered = (timeline || []).length
    ? timeline
    : [
      ...(thinking ? [{ kind: 'thinking', id: 'thinking', text: thinking }] : []),
      ...(tools || []).map((tool, index) => ({ ...tool, kind: 'tool', id: tool.id || `tool-${index}` })),
    ];
  const hasWork = ordered.length > 0;

  return (
    <article className="w-full space-y-5 text-[#171717]">
      {ordered.map((item, index) => (
        item.kind === 'tool' ? (
          <ToolDisclosure
            key={item.id || `${item.name}-${index}`}
            tool={{ ...item, label: item.name, state: item.status || item.state }}
            onOpen={onPreview}
          />
        ) : (
          <div key={item.id || `thinking-${index}`} className="text-[16px] leading-[1.75] text-[#404040]">
            <StreamingText text={item.text || ''} streaming={streaming && index === ordered.length - 1 && !text} />
          </div>
        )
      ))}
      {text ? (
        <div className={`${hasWork ? 'border-t border-[#e3e0db] pt-8' : ''} text-[16px] leading-[1.75] text-[#171717] [&_h1]:mb-5 [&_h1]:mt-1 [&_h1]:text-[30px] [&_h1]:font-semibold [&_h1]:tracking-[-0.025em] [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-[22px] [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[18px] [&_h3]:font-semibold [&_ol]:my-4 [&_ol]:space-y-3 [&_ul]:my-4 [&_ul]:space-y-2 [&_pre]:rounded-[10px] [&_pre]:bg-[#f3f1ec] [&_pre]:p-4 [&_code]:rounded [&_code]:bg-[#f7eee7] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[#a24d1d]`}>
          {renderMarkdownLite(text)}
          {streaming ? <StreamingText text="" streaming /> : null}
        </div>
      ) : null}
    </article>
  );
}
