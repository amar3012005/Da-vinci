import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * SingulanceSplash — the SINGULANCE onboarding animation, ported from the mac
 * Electron splash (electron-app/src/splash.html) to a self-contained React
 * component for the mobile web app. Pure CSS keyframes, no animation library.
 *
 * Sequence: wordmark wiped left→right (clip-path) with an ink pen dot riding
 * the reveal edge → hairline underline → time-based greeting + tagline rise →
 * bottom loading meter → fade out. Auto-finishes ~3.5s; tap/key skips.
 * Honors prefers-reduced-motion (skips straight to onDone).
 *
 * Renders the wordmark as letter-spaced text (crisper than a PNG on retina,
 * no asset to ship). onDone fires exactly once.
 */
export default function SingulanceSplash({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }, []);

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setLeaving(true);
      window.setTimeout(() => onDone && onDone(), 300);
    };

    // Reduced motion: don't animate, hand off immediately.
    const reduce = typeof window !== 'undefined'
      && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { onDone && onDone(); doneRef.current = true; return undefined; }

    const auto = window.setTimeout(finish, 3550);
    const skip = () => { window.clearTimeout(auto); finish(); };
    window.addEventListener('keydown', skip);
    window.addEventListener('touchstart', skip);
    window.addEventListener('click', skip);
    return () => {
      window.clearTimeout(auto);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('touchstart', skip);
      window.removeEventListener('click', skip);
    };
  }, [onDone]);

  return (
    <div
      className={`hm-splash${leaving ? ' hm-splash--leaving' : ''}`}
      role="dialog"
      aria-label="SINGULANCE"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <style>{SPLASH_CSS}</style>
      <div className="hm-splash__stage">
        <div className="hm-splash__mark">
          <span className="hm-splash__word">SINGULANCE</span>
          <span className="hm-splash__pen" />
        </div>
        <div className="hm-splash__rule" />
        <div className="hm-splash__greet">{greeting}</div>
        <div className="hm-splash__tag">The agent that remembers everything</div>
      </div>
      <div className="hm-splash__meter" />
      <div className="hm-splash__skip">tap to enter</div>
    </div>
  );
}

const SPLASH_CSS = `
.hm-splash {
  position: fixed; inset: 0; z-index: 100;
  background: #ffffff; color: #0a0a0a;
  display: flex; align-items: center; justify-content: center;
  user-select: none; -webkit-user-select: none; cursor: default;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Space Grotesk', sans-serif;
}
.hm-splash::after {
  content: ''; position: fixed; inset: 0; pointer-events: none; opacity: .04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.hm-splash::before {
  content: ''; position: fixed; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 70% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.05) 100%);
}
.hm-splash__stage { position: relative; text-align: center; width: 100%; max-width: 640px; padding: 0 32px; }
.hm-splash__mark { position: relative; display: inline-block; }
.hm-splash__word {
  display: block; font-weight: 700; letter-spacing: 0.22em;
  font-size: clamp(26px, 9vw, 46px); line-height: 1; padding-left: 0.22em;
  clip-path: inset(0 100% 0 0);
  animation: hmWipe 1.15s cubic-bezier(0.7, 0, 0.2, 1) 0.35s forwards;
}
.hm-splash__pen {
  position: absolute; top: 50%; left: 0; width: 6px; height: 6px; border-radius: 50%;
  background: #0a0a0a; transform: translate(-50%, -50%) scale(0); opacity: 0;
  animation: hmPen 1.15s cubic-bezier(0.7, 0, 0.2, 1) 0.35s forwards;
}
.hm-splash__rule {
  height: 1.5px; background: #0a0a0a; width: 0; margin: 18px auto 0;
  animation: hmRule 0.7s cubic-bezier(0.22, 1, 0.36, 1) 1.5s forwards;
}
.hm-splash__greet {
  margin-top: 28px; font-size: 15px; font-weight: 500; letter-spacing: 0.02em; color: #0a0a0a;
  opacity: 0; transform: translateY(8px);
  animation: hmRise 0.7s cubic-bezier(0.22,1,0.36,1) 1.9s forwards;
}
.hm-splash__tag {
  margin-top: 8px; font-size: 11.5px; font-weight: 400; letter-spacing: 0.08em;
  text-transform: uppercase; color: #a3a3a3; opacity: 0; transform: translateY(8px);
  animation: hmRise 0.7s cubic-bezier(0.22,1,0.36,1) 2.1s forwards;
}
.hm-splash__meter {
  position: fixed; left: 0; bottom: 0; height: 2px; width: 0; background: #0a0a0a; opacity: .85;
  animation: hmMeter 3.2s cubic-bezier(0.4,0,0.2,1) 0.35s forwards;
}
.hm-splash__skip {
  position: fixed; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); right: 22px;
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #c8c4be;
}
.hm-splash--leaving { animation: hmLeave .45s ease forwards; }
@keyframes hmWipe  { to { clip-path: inset(0 0 0 0); } }
@keyframes hmPen   { 0% { opacity: 0; transform: translate(-50%,-50%) scale(0);} 8% { opacity:1; transform: translate(-50%,-50%) scale(1);} 92% { left: 100%; opacity: 1;} 100% { left: 100%; opacity: 0; transform: translate(-50%,-50%) scale(0);} }
@keyframes hmRule  { to { width: min(440px, 74vw); } }
@keyframes hmRise  { to { opacity: 1; transform: translateY(0); } }
@keyframes hmMeter { to { width: 100%; } }
@keyframes hmLeave { to { opacity: 0; transform: scale(1.015); } }
@media (prefers-reduced-motion: reduce) { .hm-splash { display: none; } }
`;
