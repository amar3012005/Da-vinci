import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTheme, t } from './ThemeContext';
import { getMobileCopy } from './mobileCopy';

const ease = [0.16, 1, 0.3, 1];
const fade = (delay) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease },
});

const ScrambleText = ({
  text,
  as: Component = 'span',
  className = '',
}) => {
  return (
    <Component
      className={className}
      style={{
        display: 'inline-block',
        whiteSpace: 'pre-wrap',
      }}
    >
      {text}
    </Component>
  );
};

const MobileHero = () => {
  const { isDark, locale } = useTheme();
  const c = t(isDark);
  const copy = getMobileCopy(locale).hero;
  const headlineClass = locale === 'de'
    ? 'text-4xl md:text-5xl lg:text-[5rem] font-bold tracking-tight leading-[0.95]'
    : 'text-5xl md:text-6xl lg:text-[5.5rem] font-bold tracking-tight leading-[0.95]';

  return (
    <section className={`${c.bg} pt-28 pb-0 lg:pt-28 relative overflow-hidden`}>
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
              <ScrambleText text={copy.series} startDelay={0} />
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>
              <ScrambleText text={copy.year} startDelay={80} />
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
                <ScrambleText text={copy.metaCode} startDelay={120} />
                <span className="ml-8">
                  <ScrambleText text={copy.coordinates} startDelay={180} />
                </span>
              </motion.p>

              {/* Main headline */}
              <motion.h1
                className={`${headlineClass} ${c.text} font-['Space_Grotesk']`}
                {...fade(0.15)}
              >
                <span className="block">
                  <ScrambleText text={copy.headline[0]} startDelay={220} />
                </span>
                <span className="block">
                  <ScrambleText text={copy.headline[1]} startDelay={320} />
                </span>
                <span className={`block ${isDark ? 'text-white' : 'text-[#0a0a0a]'}`}>
                  <ScrambleText text={copy.headline[2]} startDelay={420} />
                </span>
              </motion.h1>

              {/* Arrow CTA — pill shape like reference */}
              <motion.div className="flex items-center gap-6 mt-10" {...fade(0.25)}>
                <a
                  href="/hivemind"
                  className={`flex items-center gap-3 ${c.accentBg} ${c.accentText} font-semibold rounded-full ${c.accentHover} uppercase tracking-[0.1em] pl-7 pr-5 py-3.5 text-xs transition-colors no-underline`}
                >
                  <ScrambleText text={copy.primaryCta} startDelay={520} />
                  <ArrowRight size={14} />
                </a>
                <a
                  href="https://enterprise.davinciai.eu"
                  className={`${c.text} font-medium text-sm transition-colors no-underline border-b ${c.border} pb-0.5 ${isDark ? 'hover:text-white/60' : 'hover:text-[#525252]'}`}
                >
                  <ScrambleText text={copy.secondaryCta} startDelay={580} />
                </a>
              </motion.div>

              {/* Bottom tagline */}
              <motion.p
                className={`text-sm ${c.textSecondary} mt-10 max-w-md leading-relaxed`}
                {...fade(0.3)}
              >
                <ScrambleText text={copy.taglineLead} startDelay={640} />
                <span className={`${c.text} font-medium`}>
                  <ScrambleText text={copy.taglineStrong} startDelay={720} />
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
                    <ScrambleText text={copy.imageLocation} startDelay={780} />
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
              <ScrambleText text={copy.footerLeft} startDelay={840} />
            </span>
            <span className={`text-[10px] font-mono ${c.textMuted}`}>
              <ScrambleText text={copy.footerRight} startDelay={900} />
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MobileHero;
