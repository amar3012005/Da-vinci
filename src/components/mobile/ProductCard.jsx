import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

/**
 * SINGULANCE product card — a tall poster silhouette with real 3D mouse-tilt
 * (perspective rotateX/Y driven by pointer), a glow that tracks the cursor, and
 * a copy/CTA layer that lifts on hover. One card per sub-product.
 */
const ProductCard = ({ img, eyebrow, name, desc, href, delay = 0, objectPosition = 'center' }) => {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotX = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 150, damping: 18 });
  const rotY = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 150, damping: 18 });
  const glowX = useTransform(mx, [0, 1], ['0%', '100%']);
  const glowY = useTransform(my, [0, 1], ['0%', '100%']);

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
    setHover(false);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 1000 }}
      className="group relative block aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d16] no-underline shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]"
    >
      {/* silhouette */}
      <img
        src={img}
        alt={name}
        loading="lazy"
        decoding="async"
        style={{ objectPosition }}
        className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-[1.05]"
      />

      {/* cursor-tracking glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [glowX, glowY],
            ([x, y]) => `radial-gradient(220px circle at ${x} ${y}, rgba(120,200,255,0.18), transparent 70%)`
          ),
        }}
      />

      {/* legibility gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05070f] via-[#05070f]/20 to-transparent" />

      {/* copy */}
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/55">{eyebrow}</p>
        <p
          className="mt-2 max-w-[24ch] text-sm font-light leading-relaxed text-white/0 transition-all duration-500 group-hover:text-white/80"
          style={{ transform: hover ? 'translateY(0)' : 'translateY(8px)' }}
        >
          {desc}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
          Explore
          <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>

      {/* hover ring */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 transition group-hover:ring-white/25" />
    </motion.a>
  );
};

export default ProductCard;
