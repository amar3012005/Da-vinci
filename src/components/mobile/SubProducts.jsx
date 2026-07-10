import React, { Suspense, lazy, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { HIVEMIND_URL, hivemindHref } from './hivemindLinks';

const NebulaBackdrop = lazy(() => import('./three/NebulaBackdrop'));

/**
 * SINGULANCE sub-products — the stack.
 * R3F nebula backdrop (depth) behind three tall poster cards: TARA (voice),
 * HIVEMIND (memory), HYPERAGENTS (swarm). Replaces the legacy Solution sections.
 */
const ease = [0.16, 1, 0.3, 1];

const PRODUCTS = [
  {
    img: '/sp-tara.webp',
    eyebrow: 'Voice · Sentinel',
    name: 'TARA',
    desc: 'The voice of your institution — an agent that reasons in real time, not a script that retrieves.',
    href: HIVEMIND_URL,
  },
  {
    img: '/sp-hivemind.webp',
    eyebrow: 'Sovereign Memory',
    name: 'HIVEMIND',
    desc: 'Sub-50ms recall across everything your organization knows. The mind that never forgets.',
    href: HIVEMIND_URL,
  },
  {
    img: '/sp-hyperagents.webp',
    eyebrow: 'Agent Swarm',
    name: 'HYPERAGENTS',
    desc: 'Many minds that act as one — digital employees that watch, decide, and move on your behalf.',
    href: hivemindHref('/app/employees'),
    objectPosition: 'center bottom',
  },
];

const useMotionOk = () => {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOk(
      window.matchMedia('(min-width: 768px)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }, []);
  return ok;
};

const SubProducts = () => {
  const motionOk = useMotionOk();

  return (
    <section id="solutions" className="relative overflow-hidden py-28" style={{ background: '#05070f' }}>
      {/* R3F nebula depth */}
      {motionOk && (
        <Suspense fallback={null}>
          <NebulaBackdrop />
        </Suspense>
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
            Three minds. One sovereign system.
          </h2>
          <p className="mt-4 text-base font-light leading-relaxed text-white/65">
            Voice that reasons. Memory that never forgets. A swarm that acts. Each runs inside your walls —
            sovereign, GDPR-native, built for regulated Europe.
          </p>
        </motion.div>

        {/* cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p, i) => (
            <ProductCard key={p.name} {...p} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubProducts;
