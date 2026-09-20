import React, { useEffect, useRef } from 'react';
import UserMessage from './narrative/UserMessage';
import AgentMessage from './narrative/AgentMessage';

export default function WorkRunStream({ msgs, onPreview, error }) {
  const scroller = useRef(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const node = scroller.current;
      if (!node) return;
      if (typeof node.scrollTo === 'function') {
        node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
      } else {
        node.scrollTop = node.scrollHeight;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [msgs]);
  return (
    <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#fbfaf7] scroll-smooth">
      <div className="mx-auto w-full max-w-[940px] space-y-7 px-12 pb-10 pt-8">
        {(msgs || []).map((m, i) => (
          m.role === 'user'
            ? <UserMessage key={i} text={m.text} />
            : (
              <AgentMessage
                key={i}
                thinking={m.thinking}
                text={m.text}
                streaming={m.streaming}
                tools={m.tools}
                timeline={m.timeline}
                onPreview={onPreview}
              />
            )
        ))}
        {error ? <p className="text-[13px] text-[#b45309]">{error}</p> : null}
      </div>
    </div>
  );
}
