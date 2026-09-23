import React, { useEffect, useRef, useState } from 'react';
import UserMessage from './narrative/UserMessage';
import AgentMessage from './narrative/AgentMessage';

export default function WorkRunStream({ msgs, activity, tasks, approvals, onPreview, error, elapsedLabel, phase, topPadding = 32 }) {
  const scroller = useRef(null);
  const followTail = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  useEffect(() => {
    if (scroller.current && followTail.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs]);
  return (
    <div ref={scroller} onScroll={(event) => {
      const el = event.currentTarget;
      followTail.current = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
      setShowLatest(!followTail.current);
    }} className="relative flex-1 overflow-y-auto px-8 py-8 space-y-6" style={{ containerType: 'inline-size', paddingTop: topPadding }}>
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
              activity={i === (msgs.length - 1) ? activity : []}
              tasks={i === (msgs.length - 1) ? tasks : []}
              approvals={i === (msgs.length - 1) ? approvals : []}
              onPreview={onPreview}
              elapsedLabel={i === (msgs.length - 1) ? elapsedLabel : ''}
              statusText={i === (msgs.length - 1) && phase === 'acknowledging' ? 'Acknowledging your request…' : ''}
            />
          )
      ))}
      {error ? <p className="text-[12px] text-[#b45309]">{error}</p> : null}
      {showLatest ? <button type="button" onClick={() => { followTail.current = true; setShowLatest(false); if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }} className="sticky bottom-2 left-1/2 z-10 mx-auto block rounded-full border border-[#e3e0db] bg-white px-3 py-1.5 text-[11px] text-[#525252] shadow-sm">↓ Latest</button> : null}
    </div>
  );
}
