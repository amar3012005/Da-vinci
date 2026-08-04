import React, { Suspense, lazy, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { COVER_LQIP } from './three/coverLqip';
import HeroCtas from './HeroCtas';
import { HIVEMIND_URL } from './hivemindLinks';

const HeroScene = lazy(() => import('./three/HeroScene'));
const CinematicPlate = lazy(() => import('./three/CinematicPlate'));

/**
 * SINGULANCE cinematic hero.
 * Desktop: full-bleed R3F cover (HeroScene) with overlays.
 * Mobile: the full poster fit to the screen width as a band (no crop — the baked
 * wordmark and corner labels stay intact), with the same water-warp shader, and
 * the eyebrow / copy / CTA stacked above and below it.
 * Reduced-motion: static cover, no canvas.
 */
const ease = [0.16, 1, 0.3, 1];
const COVER = '/singulance-cover.webp';

const useHeroMode = () => {
  const [mode, setMode] = useState('static-desktop');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wide = window.matchMedia('(min-width: 768px)').matches;
    setMode(wide ? (reduced ? 'static-desktop' : 'immersive') : reduced ? 'static-mobile' : 'water-mobile');
  }, []);
  return mode;
};

/* viewfinder corner brackets — IMAX/camera-frame feel */
const Viewfinder = () => (
  <div className="pointer-events-none absolute inset-6 z-10 lg:inset-8">
    <span className="absolute left-0 top-0 h-6 w-6 border-l border-t border-white/25" />
    <span className="absolute right-0 top-0 h-6 w-6 border-r border-t border-white/25" />
    <span className="absolute bottom-0 left-0 h-6 w-6 border-b border-l border-white/25" />
    <span className="absolute bottom-0 right-0 h-6 w-6 border-b border-r border-white/25" />
  </div>
);

const scrollNext = () => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });

const BannerLockup = () => (
  <div className="mx-auto w-full max-w-6xl px-5 text-center sm:px-8">
    <div className="relative mx-auto flex h-14 items-center justify-center border border-white/60 bg-black/20 px-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-[2px] transition-[transform,border-color,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-black/35 hover:shadow-[0_16px_46px_rgba(0,0,0,0.34)] sm:h-16">
      <span className="absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-white" />
      <span className="absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-white" />
      <span className="absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-white" />
      <span className="absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-white" />
      <a
        href={HIVEMIND_URL}
        aria-label="Run your AI company. Enter Hivemind."
        className="flex h-full w-full cursor-pointer items-center justify-center font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-white no-underline transition-[letter-spacing,opacity] duration-300 hover:opacity-80 sm:text-xs sm:tracking-[0.34em] sm:hover:tracking-[0.38em]"
      >
        [ Run your AI company ]
      </a>
    </div>
  </div>
);

const HeroActionRail = ({ delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay, ease }}
    className="w-full max-w-6xl px-5 sm:px-8"
  >
    <div className="flex flex-col items-center gap-3 border-y border-white/20 py-4 lg:grid lg:grid-cols-[minmax(180px,1fr)_minmax(440px,2.1fr)_minmax(180px,1fr)] lg:gap-6">
      <HeroCtas delay={0} banner />
      <p className="order-first whitespace-nowrap text-center text-[clamp(0.58rem,1.05vw,1rem)] font-light leading-relaxed text-white/75 lg:order-2 lg:px-2">
        The AI workforce that runs inside your organization&apos;s&nbsp;memory.
      </p>
    </div>
  </motion.div>
);

/* ---------- desktop full-bleed ---------- */
const DesktopHero = ({ immersive }) => (
  <section
    id="hero"
    className="relative hidden h-[100svh] w-full overflow-hidden md:block"
    style={{ background: '#05070f', backgroundImage: `url(${COVER_LQIP})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
  >
    {/* plate — fill full width, crop top/bottom (wordmark sides never cut) */}
    <div className="absolute inset-0">
      {immersive ? (
        <Suspense fallback={<img src={COVER} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />}>
          <HeroScene />
        </Suspense>
      ) : (
        <img src={COVER} alt="SINGULANCE" className="absolute inset-0 h-full w-full object-cover object-top" decoding="async" />
      )}
    </div>

    {/* grades: depth gradient + vignette + film grain */}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05070f]/50 via-transparent to-[#05070f]/85" />
    <div className="cm-vignette pointer-events-none absolute inset-0" />
    <div className="cm-grain pointer-events-none absolute inset-0 overflow-hidden opacity-[0.05] mix-blend-soft-light" />

    {/* drifting ember spores */}
    <span className="cm-spore" style={{ left: '22%', top: '70%', width: 5, height: 5, animationDelay: '0s' }} />
    <span className="cm-spore" style={{ left: '48%', top: '78%', width: 4, height: 4, animationDelay: '4s' }} />
    <span className="cm-spore" style={{ left: '68%', top: '66%', width: 6, height: 6, animationDelay: '8s' }} />
    <span className="cm-spore" style={{ left: '82%', top: '74%', width: 4, height: 4, animationDelay: '11s' }} />

    <Viewfinder />

    {/* eyebrow — kinetic mono with a drawn line */}
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease }}
      className="pointer-events-none absolute inset-x-0 top-[18%] z-10 flex flex-col items-center gap-3"
    >
      <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, delay: 0.5, ease }} className="h-px w-12 origin-center bg-white/35" />
      <p className="px-6 text-center text-[11px] font-mono uppercase tracking-[0.42em] text-white/70">
        The AI Operating Layer for Regulated Europe
      </p>
    </motion.div>

    {/* Framed operating banner: the clear public entry point. */}
    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-5 pb-[7vh] text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.55, ease }} className="w-full">
        <BannerLockup />
      </motion.div>
      <HeroActionRail delay={0.78} />
      <motion.button
        onClick={scrollNext} aria-label="Scroll down"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.95, ease }}
        className="text-white/45 transition-colors hover:text-white"
      >
        <motion.span animate={{ y: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} className="block">
          <ChevronDown size={20} />
        </motion.span>
      </motion.button>
    </div>
  </section>
);

/* ---------- mobile width-fit band ---------- */
const MobileHeroBand = ({ water }) => (
  <section id="hero-m" className="relative flex min-h-[100svh] flex-col justify-center gap-8 pb-10 pt-24 md:hidden" style={{ background: '#05070f' }}>
    <motion.p
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease }}
      className="px-5 text-center text-[10px] font-medium uppercase tracking-[0.32em] text-white/70"
    >
      The AI Operating Layer for Regulated Europe
    </motion.p>

    {/* full poster fit to screen edges (no side padding, no rounding), water shader */}
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease }}
      className="relative aspect-[1586/992] w-full overflow-hidden bg-[#05070f]"
      style={{ backgroundImage: `url(${COVER_LQIP})`, backgroundSize: 'cover' }}
    >
      {water ? (
        <Suspense fallback={<img src={COVER} alt="SINGULANCE" className="absolute inset-0 h-full w-full object-cover" />}>
          <CinematicPlate src={COVER} zoom={1} warp={1} bloom={0.5} tint={[0.04, 0.015, 0.0]} />
        </Suspense>
      ) : (
        <img src={COVER} alt="SINGULANCE" className="absolute inset-0 h-full w-full object-cover" decoding="async" fetchpriority="high" />
      )}
    </motion.div>

    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.45, ease }} className="w-full">
      <BannerLockup />
    </motion.div>

    <HeroActionRail delay={0.6} />

    {/* scroll-down cue replaces the CTA */}
    <button
      onClick={() => document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      aria-label="Scroll down"
      className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white backdrop-blur-md"
    >
      <motion.span animate={{ y: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
        <ChevronDown size={20} />
      </motion.span>
    </button>
  </section>
);

const MobileHero = () => {
  const mode = useHeroMode();
  return (
    <>
      <DesktopHero immersive={mode === 'immersive'} />
      <MobileHeroBand water={mode === 'water-mobile'} />
    </>
  );
};

export default MobileHero;
