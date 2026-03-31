import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTheme, t } from './ThemeContext';

const ease = [0.16, 1, 0.3, 1];
const fade = (delay) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease },
});

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
              DV — Series
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>
              /2026
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
                DV-S001 <span className="ml-8">52.3759° N, 9.7320° E</span>
              </motion.p>

              {/* Main headline */}
              <motion.h1
                className={`text-5xl md:text-6xl lg:text-[5.5rem] font-bold tracking-tight leading-[0.95] ${c.text} font-['Space_Grotesk']`}
                {...fade(0.15)}
              >
                AI-POWERED
                <br />
                ENTERPRISE
                <br />
                <span className={isDark ? 'text-white' : 'text-[#0a0a0a]'}>AUTOMATION</span>
              </motion.h1>

              {/* Arrow CTA — pill shape like reference */}
              <motion.div className="flex items-center gap-6 mt-10" {...fade(0.25)}>
                <a
                  href="/hivemind"
                  className={`flex items-center gap-3 ${c.accentBg} ${c.accentText} font-semibold rounded-full ${c.accentHover} uppercase tracking-[0.1em] pl-7 pr-5 py-3.5 text-xs transition-colors no-underline`}
                >
                  HIVEMIND
                  <ArrowRight size={14} />
                </a>
                <a
                  href="https://enterprise.davinciai.eu"
                  className={`${c.text} font-medium text-sm transition-colors no-underline border-b ${c.border} pb-0.5 ${isDark ? 'hover:text-white/60' : 'hover:text-[#525252]'}`}
                >
                  Enterprise
                </a>
              </motion.div>

              {/* Bottom tagline */}
              <motion.p
                className={`text-sm ${c.textSecondary} mt-10 max-w-md leading-relaxed`}
                {...fade(0.3)}
              >
                Not what looks cool — <span className={`${c.text} font-medium`}>what actually lasts.</span>
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
                    Hannover, Germany
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
              Made by Da'Vinci Solutions
            </span>
            <span className={`text-[10px] font-mono ${c.textMuted}`}>
              Save for this later
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MobileHero;
