import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import UserMessage from './narrative/UserMessage';
import AgentMessage from './narrative/AgentMessage';

export default function WorkRunStream({ msgs, onPreview, error }) {
  const scroller = useRef(null);
  const followLive = useRef(true);
  const [showJump, setShowJump] = useState(false);
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node || !followLive.current) return undefined;
    const frame = requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [msgs]);
  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scroller}
        onScroll={(event) => {
          const node = event.currentTarget;
          const atLatest = node.scrollHeight - node.scrollTop - node.clientHeight < 96;
          followLive.current = atLatest;
          setShowJump(!atLatest);
        }}
        className="h-full overflow-y-auto overscroll-contain bg-[#fbfaf7]"
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
                  stage={m.stage}
                  tools={m.tools}
                  timeline={m.timeline}
                  onPreview={onPreview}
                />
              )
          ))}
          {error ? <p className="text-[13px] text-[#b45309]">{error}</p> : null}
        </div>
      </div>
      {showJump ? (
        <button
          type="button"
          onClick={() => {
            const node = scroller.current;
            if (!node) return;
            followLive.current = true;
            node.scrollTop = node.scrollHeight;
            setShowJump(false);
          }}
          className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#e3e0db] bg-white px-3 py-1.5 text-[11px] font-medium text-[#525252] shadow-sm hover:text-[#0a0a0a]"
        >
          <ArrowDown size={13} /> Latest
        </button>
      ) : null}
    </div>
  );
}
