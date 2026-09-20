import React, { useLayoutEffect, useRef } from 'react';
import UserMessage from './narrative/UserMessage';
import AgentMessage from './narrative/AgentMessage';

export default function WorkRunStream({ msgs, onPreview, error }) {
  const scroller = useRef(null);
  const followLive = useRef(true);
  useLayoutEffect(() => {
    const node = scroller.current;
    if (node && followLive.current) node.scrollTop = node.scrollHeight;
  }, [msgs]);
  return (
    <div
      ref={scroller}
      onScroll={(event) => {
        const node = event.currentTarget;
        followLive.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
      }}
      className="flex-1 min-h-0 overflow-y-auto overscroll-auto bg-[#fbfaf7]"
    >
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
