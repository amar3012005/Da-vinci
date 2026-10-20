import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { HeroMotionBoundary } from './MobileHero';
import { PRODUCT_CATALOG } from './productCatalog';

const NebulaBackdrop = lazy(() => import('./three/NebulaBackdrop'));

/**
 * SINGULANCE sub-products — the stack.
 * R3F nebula backdrop behind the same four roles as the main catalog.
 * Voice remains a companion capability rather than a competing product role.
 */
const ease = [0.16, 1, 0.3, 1];

const useMotionOk = (host) => {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 768px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = !('IntersectionObserver' in window);
    const sync = () => setOk(visible && wide.matches && !reduced.matches);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting); sync();
    }) : null;
    if (host.current) observer?.observe(host.current);
    wide.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    sync();
    return () => {
      observer?.disconnect();
      wide.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
    };
  }, [host]);
  return ok;
};

const SubProducts = () => {
  const host = useRef(null);
  const motionOk = useMotionOk(host);

  return (
    <section ref={host} id="solutions" className="relative overflow-hidden py-28" style={{ background: '#05070f' }}>
      {/* R3F nebula depth */}
      {motionOk && (
        <HeroMotionBoundary><Suspense fallback={null}>
          <NebulaBackdrop />
        </Suspense></HeroMotionBoundary>
      )}
      {/* static gradient fallback / overlay tint */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(20,40,60,0.35),transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6">
        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease }}
          className="mb-14 max-w-3xl"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/55">The SINGULANCE Stack</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            One company Brain. A coordinated AI team.
          </h2>
          <p className="mt-4 text-base font-light leading-relaxed text-white/65">
            HIVEMIND connects company knowledge. Runtime is the proactive, always-on AI Chief of Staff that coordinates HyperAgents. ICARUS advances the research behind the system.
          </p>
        </motion.div>

        {/* cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCT_CATALOG.map((p, i) => (
            <ProductCard key={p.name} {...p} img={p.stackImg} avif={p.stackAvif} smallImg={p.stackSmall} smallAvif={p.stackSmallAvif} objectPosition="center top" eyebrow={p.role} desc={p.text} delay={i * 0.1} />
          ))}
        </div>
        <p className="mt-10 max-w-3xl text-sm leading-relaxed text-white/65">Prefer to talk? TARA brings voice conversations into HIVEMIND with the workspace context available to it. <a href="/tara" className="text-white underline underline-offset-4">Explore TARA voice</a>.</p>
      </div>
    </section>
  );
};

export default SubProducts;
