import React, { useEffect, useRef } from 'react';

/**
 * OnboardingTerminal — Polsia-style live build log, day-mode.
 * Light themed (warm paper, not black): mono "> step" lines with a soft
 * blinking cursor. Lines arrive from polling; auto-scrolls to the newest.
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
      className="w-full h-full overflow-y-auto bg-[#faf9f4] font-mono text-[12px] leading-[1.85] px-4 py-3 rounded-xl border border-[#e3e0db]"
    >
      {lines.map((l, i) => (
        <div key={`${l.ts}-${i}`} className="whitespace-pre-wrap break-words">
          <span className="text-[#c9c4bc] select-none">&gt; </span>
          <span className={error && i === lines.length - 1 ? 'text-[#dc2626]' : 'text-[#3f3d39]'}>
            {l.text}
          </span>
        </div>
      ))}
      {!done && (
        <div>
          <span className="text-[#c9c4bc] select-none">&gt; </span>
          <span className="inline-block w-[8px] h-[14px] bg-[#117dff] align-middle animate-pulse" />
        </div>
      )}
    </div>
  );
}
