import React, { Suspense, lazy, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { COVER_LQIP } from './three/coverLqip';

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

/* ---------- desktop full-bleed ---------- */
const DesktopHero = ({ immersive }) => (
  <section
    id="hero"
    className="relative hidden h-[100svh] w-full overflow-hidden md:block"
    style={{ background: '#05070f', backgroundImage: `url(${COVER_LQIP})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
  >
    {immersive ? (
      <Suspense fallback={<img src={COVER} alt="" className="absolute inset-0 h-full w-full object-cover" />}>
        <HeroScene />
      </Suspense>
    ) : (
      <img src={COVER} alt="SINGULANCE" className="absolute inset-0 h-full w-full object-cover" decoding="async" />
    )}

    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05070f]/55 via-transparent to-[#05070f]/80" />

    <motion.p
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease }}
      className="pointer-events-none absolute inset-x-0 top-24 z-10 px-6 text-center text-xs font-medium uppercase tracking-[0.32em] text-white/75"
    >
      The AI Operating Layer for Regulated Europe
    </motion.p>

    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-6 px-6 pb-[8vh] text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.55, ease }} className="pointer-events-none max-w-2xl">
        <p className="text-2xl font-semibold tracking-tight text-white">Run your institution as an AI company</p>
        <p className="mt-2 text-base font-light leading-relaxed text-white/70">The AI workforce that runs inside your organization&apos;s memory.</p>
      </motion.div>
      <motion.a href="/hivemind" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.75, ease }}
        className="group inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-white no-underline backdrop-blur-md transition-colors hover:bg-white/20">
        Enter SINGULANCE <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </motion.a>
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

    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.45, ease }} className="px-5 text-center">
      <p className="text-xl font-semibold tracking-tight text-white">Run your institution as an AI company</p>
      <p className="mt-2 text-sm font-light leading-relaxed text-white/65">The AI workforce that runs inside your organization&apos;s memory.</p>
    </motion.div>

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
