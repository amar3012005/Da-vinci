import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Latest updates — Mistral "Latest updates." carousel, matched exactly:
 * dark-navy section, light heading, a drag-pill (left) + two square arrow
 * buttons (right), and overflowing cards with small radius, thin borders,
 * amber/gray category badges, and a 2-cell bordered footer (date | source ›).
 * SINGULANCE content; Mistral chrome/colors/edges.
 */

const NAVY = '#0a0d1a';
const CARD = '#13151f';
const BORDER = 'rgba(255,255,255,0.08)';

const CARDS = [
  { cat: 'RESEARCH', img: '/thesis-greekgod.webp', title: 'ICARUS — a memory filesystem', desc: 'The .amr byte layout fuses vector, entity, bi-temporal and graph into one mmap. Equal recall to a live vector DB, 7.5× smaller, zero servers.', date: 'Jun 24, 2026', source: 'SINGULANCE Labs', href: '/research/icarus' },
  { cat: 'PRODUCT', img: '/sp-hivemind.webp', title: 'HIVEMIND', desc: 'Sovereign memory engine — sub-50ms recall across everything your organization knows.', date: 'Jun 22, 2026', source: 'SINGULANCE', href: '/products/hivemind' },
  { cat: 'PRODUCT', img: '/sp-tara.webp', title: 'TARA gets to work.', desc: 'The enterprise voice agent that reasons in real time — calls, qualification, scheduling, support.', date: 'Jun 22, 2026', source: 'SINGULANCE', href: '/products/tara' },
  { cat: 'PRODUCT', img: '/sp-hyperagents.webp', title: 'HYPERAGENTS', desc: 'A swarm of digital employees that watch, decide, and act as one — grounded in memory.', date: 'Jun 22, 2026', source: 'SINGULANCE', href: '/products/hyperagents' },
  { cat: 'COMPANY', img: '/thesis-greekgod.webp', title: 'Cognitive Swarm Intelligence', desc: 'The system remembers. The agents act. The architecture behind HIVEMIND, published.', date: 'Jun 20, 2026', source: 'SINGULANCE Labs', href: '/research' },
  { cat: 'COMPANY', img: '/singulance-cover.webp', title: 'Beyond the horizon of intelligence', desc: 'The AI operating layer for regulated Europe. Run your institution as an AI company.', date: 'Jun 24, 2026', source: 'SINGULANCE', href: '/about' },
];

const LatestUpdates = () => {
  const track = useRef(null);
  const [progress, setProgress] = useState(0);

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
    const step = card ? card.offsetWidth + 16 : 420;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden py-16 md:py-20" style={{ background: NAVY }}>
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">
        {/* heading */}
        <h2 className="font-['Space_Grotesk'] text-4xl font-medium tracking-tight text-white md:text-6xl">
          Latest updates.
        </h2>

        {/* controls: drag-pill (left) + square arrows (right) */}
        <div className="mt-12 flex items-center justify-between">
          {/* drag pill */}
          <div
            className="flex h-9 w-32 items-center gap-2 rounded-full px-3"
            style={{ background: '#1a1d2b' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
            <div className="relative h-1.5 flex-1 rounded-full bg-white/10">
              <div
                className="absolute top-0 h-full w-1/2 rounded-full bg-white/70"
                style={{ left: `${progress * 50}%` }}
              />
            </div>
          </div>
          {/* arrows */}
          <div className="flex gap-2">
            <button onClick={() => scrollBy(-1)} aria-label="Previous"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white/55 transition-colors hover:text-white"
              style={{ background: '#1a1d2b' }}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => scrollBy(1)} aria-label="Next"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:text-white"
              style={{ background: '#23263a' }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* cards track — overflows both edges */}
      <div
        ref={track}
        className="mt-7 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingLeft: 'max(1.5rem,calc((100vw - 1280px)/2 + 2.5rem))', paddingRight: '1.5rem' }}
      >
        {CARDS.map((card) => (
          <a
            key={card.title}
            data-card
            href={card.href}
            className="group block w-[300px] shrink-0 snap-start overflow-hidden rounded-lg no-underline sm:w-[400px]"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            {/* image */}
            <div className="relative aspect-[16/9] overflow-hidden" style={{ background: '#05070f' }}>
              <img src={card.img} alt="" loading="lazy" decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
            </div>
            {/* body */}
            <div className="px-6 pb-7 pt-5">
              <span
                className="inline-block rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={card.cat === 'COMPANY'
                  ? { background: '#f5c24b', color: '#0a0d1a' }
                  : card.cat === 'RESEARCH'
                  ? { background: '#ff5229', color: '#0a0d1a' }
                  : { background: '#23262f', color: '#aeb2bd' }}
              >
                {card.cat}
              </span>
              <h3 className="font-['Space_Grotesk'] mt-5 text-2xl font-medium leading-snug tracking-tight text-white">
                {card.title}
              </h3>
              <p className="mt-3 text-[15px] font-light leading-relaxed text-white/55">{card.desc}</p>
            </div>
            {/* footer — 2 bordered cells: date | source › */}
            <div className="grid grid-cols-2" style={{ borderTop: `1px solid ${BORDER}` }}>
              <div className="px-6 py-4 text-[13px] text-white/40" style={{ borderRight: `1px solid ${BORDER}` }}>
                {card.date}
              </div>
              <div className="flex items-center justify-between px-6 py-4 text-[13px] text-white/40">
                <span>{card.source}</span>
                <ChevronRight size={16} className="text-white/35 transition-transform group-hover:translate-x-0.5" />
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
