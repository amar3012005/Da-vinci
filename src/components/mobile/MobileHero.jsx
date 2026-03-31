import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTheme, t } from './ThemeContext';

const ease = [0.16, 1, 0.3, 1];
const fade = (delay) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease },
});

const SCRAMBLE_CHARS = '·•:+/×○□01';

const splitText = (text) => Array.from(text);

const ScrambleText = ({
  text,
  as: Component = 'span',
  className = '',
  hoverOnly = false,
  startDelay = 0,
}) => {
  const targetChars = useMemo(() => splitText(text), [text]);
  const [displayText, setDisplayText] = useState(text);
  const frameRef = useRef(null);
  const timeoutRef = useRef(null);

  const buildFrame = useCallback((progress) => {
    const revealIndex = Math.floor(progress * targetChars.length);
    const activeWindow = Math.max(2, Math.ceil((1 - progress) * 7));

    return targetChars
      .map((char, index) => {
        if (char === ' ' || char === '\u00A0') {
          return char;
        }
        if (index < revealIndex || progress >= 1) {
          return char;
        }
        if (index > revealIndex + activeWindow) {
          return char;
        }
        return Math.random() > 0.32
          ? char
          : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      })
      .join('');
  }, [targetChars]);

  const runScramble = useCallback((duration) => {
    const startedAt = performance.now();

    const tick = (timestamp) => {
      const elapsed = timestamp - startedAt;
      const progress = Math.min(1, elapsed / duration);
      setDisplayText(buildFrame(progress));

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        setDisplayText(text);
      }
    };

    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = window.requestAnimationFrame(tick);
  }, [buildFrame, text]);

  useEffect(() => {
    if (!hoverOnly) {
      timeoutRef.current = window.setTimeout(() => runScramble(900), startDelay);
    }

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [hoverOnly, runScramble, startDelay]);

  const handlePointerEnter = () => {
    runScramble(650);
  };

  return (
    <Component
      className={className}
      onMouseEnter={handlePointerEnter}
      onFocus={handlePointerEnter}
      aria-label={text}
      style={{
        position: 'relative',
        display: 'inline-block',
        whiteSpace: 'pre-wrap',
      }}
    >
      <span style={{ visibility: 'hidden' }}>{text}</span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          whiteSpace: 'pre-wrap',
          opacity: 0.96,
          transition: 'opacity 220ms ease',
        }}
      >
        {displayText}
      </span>
    </Component>
  );
};

const MobileHero = () => {
  const { isDark } = useTheme();
  const c = t(isDark);

  return (
    <section className={`${c.bg} pt-24 pb-0 lg:pt-28 relative overflow-hidden`}>
      <div className={`max-w-[1200px] mx-auto border-x ${c.border} relative`}>

        {/* Subtle grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 left-1/3 w-px h-full ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`} />
          <div className={`absolute top-0 left-2/3 w-px h-full ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`} />
        </div>

        {/* Main layout — editorial overlap */}
        <div className="relative px-6 md:px-10 lg:px-20 pt-8 pb-0">

          {/* Top metadata row */}
          <motion.div
            className="flex items-center justify-between mb-8"
            {...fade(0)}
          >
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>
              <ScrambleText text="DV — Series" startDelay={0} />
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>
              <ScrambleText text="/2026" startDelay={80} />
            </span>
          </motion.div>

          {/* Two-column editorial layout */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-0 items-end relative">

            {/* Left column — Text content */}
            <div className="relative z-10 pb-12 lg:pb-20">
              {/* Solid accent square — design element */}
              <motion.div
                className={`w-8 h-8 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} mb-8`}
                {...fade(0.05)}
              />

              {/* Label */}
              <motion.p
                className={`text-[10px] font-mono uppercase tracking-[0.3em] ${c.textMuted} mb-6`}
                {...fade(0.1)}
              >
                <ScrambleText text="DV-S001" startDelay={120} />
                <span className="ml-8">
                  <ScrambleText text="52.3759° N, 9.7320° E" startDelay={180} />
                </span>
              </motion.p>

              {/* Main headline */}
              <motion.h1
                className={`text-5xl md:text-6xl lg:text-[5.5rem] font-bold tracking-tight leading-[0.95] ${c.text} font-['Space_Grotesk']`}
                {...fade(0.15)}
              >
                <span className="block">
                  <ScrambleText text="AI-POWERED" startDelay={220} />
                </span>
                <span className="block">
                  <ScrambleText text="ENTERPRISE" startDelay={320} />
                </span>
                <span className={`block ${isDark ? 'text-white' : 'text-[#0a0a0a]'}`}>
                  <ScrambleText text="AUTOMATION" startDelay={420} />
                </span>
              </motion.h1>

              {/* Arrow CTA — pill shape like reference */}
              <motion.div className="flex items-center gap-6 mt-10" {...fade(0.25)}>
                <a
                  href="/hivemind"
                  className={`flex items-center gap-3 ${c.accentBg} ${c.accentText} font-semibold rounded-full ${c.accentHover} uppercase tracking-[0.1em] pl-7 pr-5 py-3.5 text-xs transition-colors no-underline`}
                >
                  <ScrambleText text="HIVEMIND" startDelay={520} />
                  <ArrowRight size={14} />
                </a>
                <a
                  href="https://enterprise.davinciai.eu"
                  className={`${c.text} font-medium text-sm transition-colors no-underline border-b ${c.border} pb-0.5 ${isDark ? 'hover:text-white/60' : 'hover:text-[#525252]'}`}
                >
                  <ScrambleText text="Enterprise" startDelay={580} />
                </a>
              </motion.div>

              {/* Bottom tagline */}
              <motion.p
                className={`text-sm ${c.textSecondary} mt-10 max-w-md leading-relaxed`}
                {...fade(0.3)}
              >
                <ScrambleText text="Not what looks cool — " startDelay={640} />
                <span className={`${c.text} font-medium`}>
                  <ScrambleText text="what actually lasts." startDelay={720} />
                </span>
              </motion.p>
            </div>

            {/* Right column — Image as element */}
            <motion.div
              className="relative lg:-mr-20 lg:ml-0"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.2, ease }}
            >
              {/* Image element — NOT background */}
              <div className="relative">
                {/* Small solid accent square — overlapping top-left */}
                <div className={`absolute -top-4 -left-4 w-16 h-16 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} z-20`} />

                {/* The featured image */}
                <div className="relative overflow-hidden rounded-none">
                  <img
                    src="/hivemind_bg.jpeg"
                    alt="Da Vinci AI"
                    className="w-full h-[500px] md:h-[600px] lg:h-[700px] object-cover"
                  />
                  {/* Subtle overlay for text contrast */}
                  <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-t from-[#080808]/60 via-transparent to-transparent' : 'bg-gradient-to-t from-[#faf9f4]/60 via-transparent to-transparent'}`} />
                </div>

                {/* Small solid accent square — bottom-right */}
                <div className={`absolute -bottom-3 -right-3 w-10 h-10 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} z-20`} />

                {/* Metadata overlay on image */}
                <div className={`absolute bottom-6 left-6 z-10`}>
                  <span className="text-white/70 text-[9px] font-mono uppercase tracking-[0.2em]">
                    <ScrambleText text="Hannover, Germany" startDelay={780} />
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom row — footer metadata */}
          <motion.div
            className={`flex items-center justify-between py-6 border-t ${c.border} mt-0`}
            {...fade(0.4)}
          >
            <span className={`text-[10px] font-mono ${c.textMuted}`}>
              <ScrambleText text="Made by Da'Vinci Solutions" startDelay={840} />
            </span>
            <span className={`text-[10px] font-mono ${c.textMuted}`}>
              <ScrambleText text="Save for this later" startDelay={900} />
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MobileHero;
