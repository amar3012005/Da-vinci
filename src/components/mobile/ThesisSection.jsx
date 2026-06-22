import React from 'react';
import { motion } from 'framer-motion';

/**
 * SINGULANCE thesis.
 * Desktop: editorial split — statement left, plate fills the right half.
 * Mobile: the full plate fit to the screen width (no zoom, no crop) with the
 * statement overlaid on top of it.
 */
const ease = [0.16, 1, 0.3, 1];
const THESIS_PLATE = '/thesis-greekgod.webp';

const Heading = ({ className }) => (
  <motion.h2
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 1, ease }}
    className={className}
  >
    Beyond the horizon of intelligence
  </motion.h2>
);

const ThesisSection = () => {
  return (
    <section className="relative overflow-hidden" style={{ background: '#05070f' }}>
      {/* ---------- MOBILE: full-width image (no zoom) + overlaid text ---------- */}
      <div className="relative md:hidden">
        <img
          src={THESIS_PLATE}
          alt="SINGULANCE — beyond the horizon of intelligence"
          loading="lazy"
          decoding="async"
          className="block h-auto w-full select-none"
          draggable={false}
        />
        {/* scrim for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05070f]/85 via-transparent to-[#05070f]/85" />
        <Heading className="font-['Space_Grotesk'] absolute left-5 top-6 max-w-[80%] text-3xl font-semibold leading-[1.05] tracking-tight text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.7)]" />
      </div>

      {/* ---------- DESKTOP: split, plate fills right half ---------- */}
      <div className="relative hidden min-h-[100svh] md:block">
        <div className="absolute inset-0 left-1/2">
          <img
            src={THESIS_PLATE}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#05070f] via-transparent to-transparent" />
        </div>
        <div className="relative z-10 flex min-h-[100svh] w-1/2 items-center px-16">
          <Heading className="font-['Space_Grotesk'] max-w-xl text-6xl font-semibold leading-[1.02] tracking-tight text-white lg:text-8xl" />
        </div>
      </div>
    </section>
  );
};

export default ThesisSection;
