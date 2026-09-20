import React, { useEffect, useRef } from 'react';
import UserMessage from './narrative/UserMessage';
import AgentMessage from './narrative/AgentMessage';

export default function WorkRunStream({ msgs, activity, tasks, approvals, onPreview, error }) {
  const scroller = useRef(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs]);
  return (
    <div ref={scroller} className="flex-1 overflow-y-auto px-10 py-8 space-y-6">
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
            />
          )
      ))}
      {error ? <p className="text-[12px] text-[#b45309]">{error}</p> : null}
    </div>
  );
}
