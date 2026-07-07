import React, { useEffect, useRef } from 'react';

/**
 * OnboardingTerminal — Polsia-style live log. Renders the orchestrator's
 * progress lines as a black terminal with "> " prefixes and a blinking
 * cursor. Lines arrive from polling; we only append (server is the source
 * of truth), auto-scrolling to the newest line.
 */
export default function OnboardingTerminal({ lines, done, error }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, done]);

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-y-auto bg-[#0a0a0a] font-mono text-[12.5px] leading-[1.9] px-5 py-4 rounded-xl border border-[#262626]"
    >
      {lines.map((l, i) => (
        <div key={`${l.ts}-${i}`} className="whitespace-pre-wrap break-words">
          <span className="text-[#525252] select-none">&gt; </span>
          <span className={error && i === lines.length - 1 ? 'text-red-400' : 'text-[#d4d0ca]'}>
            {l.text}
          </span>
        </div>
      ))}
      {!done && (
        <div>
          <span className="text-[#525252] select-none">&gt; </span>
          <span className="inline-block w-[8px] h-[15px] bg-[#bdf213] align-middle animate-pulse" />
        </div>
      )}
    </div>
  );
}
