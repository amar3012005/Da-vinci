import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';

/**
 * Latest updates — horizontal news carousel (Mistral "Latest updates." pattern,
 * rebuilt pixel-faithful in the SINGULANCE dark skin). Dark navy section, big
 * heading, prev/next square buttons + a scroll-progress pill, and overflowing
 * cards (image / category badge / title / desc / footer row date|source→).
 */

const CARDS = [
  {
    cat: 'PRODUCT',
    img: '/sp-hivemind.webp',
    title: 'HIVEMIND',
    desc: 'Sovereign memory engine — sub-50ms recall across everything your organization knows.',
    date: 'Jun 22, 2026',
    source: 'SINGULANCE',
    href: '/products/hivemind',
  },
  {
    cat: 'PRODUCT',
    img: '/sp-tara.webp',
    title: 'TARA gets to work.',
    desc: 'The enterprise voice agent that reasons in real time — calls, qualification, scheduling, support.',
    date: 'Jun 22, 2026',
    source: 'SINGULANCE',
    href: '/products/tara',
  },
  {
    cat: 'PRODUCT',
    img: '/sp-hyperagents.webp',
    title: 'HYPERAGENTS',
    desc: 'A swarm of digital employees that watch, decide, and act as one — grounded in memory.',
    date: 'Jun 22, 2026',
    source: 'SINGULANCE',
    href: '/products/hyperagents',
  },
  {
    cat: 'RESEARCH',
    img: '/thesis-greekgod.webp',
    title: 'Cognitive Swarm Intelligence',
    desc: 'The system remembers. The agents act. The architecture behind HIVEMIND, published.',
    date: 'Jun 20, 2026',
    source: 'SINGULANCE Labs',
    href: '/research',
  },
  {
    cat: 'COMPANY',
    img: '/singulance-cover.webp',
    title: 'Beyond the horizon of intelligence',
    desc: 'The AI operating layer for regulated Europe. Run your institution as an AI company.',
    date: 'Jun 24, 2026',
    source: 'SINGULANCE',
    href: '/about',
  },
];

const BADGE = {
  COMPANY: 'bg-[#ff7a2f] text-[#05070f]',
  PRODUCT: 'bg-white/10 text-white/70',
  RESEARCH: 'bg-[#1f4f55] text-[#9fe9f0]',
};

const LatestUpdates = () => {
  const track = useRef(null);
  const [progress, setProgress] = useState(0); // 0..1

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const scrollBy = (dir) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const step = card ? card.offsetWidth + 24 : 400;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden py-20 md:py-24" style={{ background: '#0a0d18' }}>
      <div className="mx-auto max-w-[1200px] px-6">
        {/* heading */}
        <h2 className="font-['Space_Grotesk'] text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Latest updates.
        </h2>

        {/* controls row: progress pill (left) + arrows (right) */}
        <div className="mt-10 flex items-center justify-between">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white/60 transition-[width,margin] duration-150"
              style={{ width: '38%', marginLeft: `${progress * 62}%` }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Previous"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Next"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* cards track — overflows right edge like the reference */}
      <div
        ref={track}
        className="mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-pl-6 pb-2 pl-6 pr-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* spacer to align first card with max-w container on wide screens */}
        <div className="hidden shrink-0 lg:block lg:w-[calc((100vw-1200px)/2-24px)]" aria-hidden />
        {CARDS.map((card) => (
          <a
            key={card.title}
            data-card
            href={card.href}
            className="group block w-[300px] shrink-0 snap-start overflow-hidden rounded-xl border border-white/8 bg-[#12151f] no-underline sm:w-[360px]"
          >
            {/* image */}
            <div className="relative aspect-[16/10] overflow-hidden bg-[#05070f]">
              <img
                src={card.img}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            </div>
            {/* body */}
            <div className="p-5">
              <span className={`inline-block rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${BADGE[card.cat]}`}>
                {card.cat}
              </span>
              <h3 className="font-['Space_Grotesk'] mt-4 text-xl font-semibold leading-snug tracking-tight text-white">
                {card.title}
              </h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-white/55">{card.desc}</p>
            </div>
            {/* footer */}
            <div className="grid grid-cols-2 border-t border-white/8 text-[11px] font-mono text-white/45">
              <div className="border-r border-white/8 px-5 py-3">{card.date}</div>
              <div className="flex items-center justify-between px-5 py-3">
                <span>{card.source}</span>
                <ArrowUpRight size={14} className="text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </a>
        ))}
        <div className="shrink-0 pr-6" aria-hidden />
      </div>
    </section>
  );
};

export default LatestUpdates;
