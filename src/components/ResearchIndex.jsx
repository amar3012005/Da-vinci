import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import Seo from './Seo';

/**
 * ResearchIndex — the single SINGULANCE Research page, in the Mistral /models
 * style: a carousel of big research cards (text panel + art panel, tags, title,
 * desc, Learn more) that open the individual articles, then an "All research"
 * list. Warm-paper canvas, black ink, ember accent.
 */
const PAPER = '#FBFBF8';
const INK = '#0a0a0a';
const BORDER = '#E4E3DE';

const ITEMS = [
  {
    tags: ['BENCHMARK', 'LONGMEMEVAL', 'EVALUATION'],
    title: '87.2% on LongMemEval',
    desc: 'Published, reproducible recall benchmark against the industry-standard long-context memory eval — sub-50ms retrieval, live regression gates, methodology public.',
    href: '/benchmark',
    art: 'linear-gradient(135deg, #4a9fff 0%, #117dff 50%, #0a2a5e 100%)',
  },
  {
    tags: ['MEMORY', '.AMR', 'INFRASTRUCTURE'],
    title: 'ICARUS',
    desc: 'A memory filesystem for AI agents — where the byte layout, not the query engine, is the innovation. Equal recall to a live vector DB, 7.5× smaller, zero servers.',
    href: '/research/icarus',
    art: 'linear-gradient(135deg, #ff7a2f 0%, #ff5229 45%, #7a1f0a 100%)',
    img: '/thesis-greekgod.webp',
  },
  {
    tags: ['ARCHITECTURE', 'SWARM', 'MEMORY'],
    title: 'Cognitive Swarm Intelligence',
    desc: 'Environment-centric intelligence — memory, behavior, and policy externalized into a shared cognitive substrate so many agents act as one. The system remembers; the agents act.',
    href: '/research/cognitive-swarm-intelligence',
    art: 'linear-gradient(135deg, #2a6f7a 0%, #16335e 55%, #0a0d18 100%)',
    img: '/sp-hyperagents.webp',
  },
  {
    tags: ['SECURITY', 'POST-QUANTUM', 'FIPS 203/204/205'],
    title: 'Post-Quantum Cryptography',
    desc: 'Three quantum-resistant layers — hybrid PQC TLS on the edge, ML-DSA-65 signatures on every memory write, and an SLH-DSA tamper-evident audit chain. Harvest-now-decrypt-later, closed.',
    href: '/research/post-quantum-cryptography',
    art: 'linear-gradient(135deg, #117dff 0%, #0a2a5e 55%, #05070f 100%)',
  },
];

const Card = ({ item, onOpen }) => (
  <article
    data-card
    className="flex w-[88vw] shrink-0 snap-start flex-col overflow-hidden rounded-xl border md:w-[900px] md:flex-row"
    style={{ borderColor: BORDER, background: '#fff' }}
  >
    {/* text panel */}
    <div className="flex w-full flex-col p-6 md:w-1/2 md:p-10">
      <div className="flex flex-wrap gap-2">
        {item.tags.map((t) => (
          <span key={t} className="rounded bg-[#f3f2ec] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#737367]">{t}</span>
        ))}
      </div>
      <h3 className="font-['Space_Grotesk'] mt-5 text-2xl font-semibold tracking-tight md:mt-6 md:text-3xl" style={{ color: INK }}>{item.title}</h3>
      <p className="mt-4 text-[14px] leading-relaxed text-[#525252] md:mt-5 md:text-[15px]">{item.desc}</p>
      <div className="mt-6 md:mt-auto md:pt-8">
        <button onClick={() => onOpen(item.href)} className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-[13px] font-semibold text-white transition-transform hover:scale-[1.02]">
          Learn more <ChevronRight size={15} />
        </button>
      </div>
    </div>
    {/* art panel — fixed height when stacked (mobile), fills the row half on desktop */}
    <button onClick={() => onOpen(item.href)} className="relative h-40 w-full overflow-hidden md:h-auto md:w-1/2" style={{ background: item.art }} aria-label={item.title}>
      {item.img && <img src={item.img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-luminosity" />}
      <span className="absolute bottom-5 left-5 font-['Space_Grotesk'] text-2xl font-bold text-white/90">{item.title.split(' ')[0]}</span>
    </button>
  </article>
);

const ResearchIndex = () => {
  const navigate = useNavigate();

  return (
    <div style={{ background: PAPER, color: INK }} className="min-h-screen font-['Inter']">
      <Seo
        title="Research — SINGULANCE Labs"
        description="SINGULANCE research: ICARUS (the .amr memory filesystem) and Cognitive Swarm Intelligence (environment-centric agent architecture). Sovereign memory, recall, and coordination for regulated Europe."
        canonical="https://singulancelabs.com/research"
      />

      {/* nav */}
      <nav className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: BORDER, background: 'rgba(251,251,248,0.85)' }}>
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 md:px-10">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-transparent text-[14px] font-medium text-[#525252] hover:text-black">
            <ArrowLeft size={15} /> SINGULANCE
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8a8a82]">Research</span>
        </div>
      </nav>

      {/* hero heading */}
      <header className="mx-auto max-w-[1280px] px-6 pb-10 pt-16 md:px-10 md:pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#8a8a82]">SINGULANCE Labs</p>
        <h1 className="font-['Space_Grotesk'] mt-4 text-5xl font-semibold tracking-tight md:text-7xl" style={{ color: INK }}>Research.</h1>
        <p className="mt-5 max-w-2xl text-lg font-light leading-relaxed text-[#525252]">
          The work behind the sovereign workforce — memory you can prove, and a swarm that acts as one.
        </p>
      </header>

      {/* conveyor belt — cards drift right→left, continuous loop, pause on hover */}
      <style>{`
        @keyframes research-belt { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
        .research-belt { animation: research-belt 60s linear infinite; will-change: transform; }
        .research-belt:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .research-belt { animation: none; } }
      `}</style>
      <div className="mt-7 overflow-hidden">
        <div className="research-belt flex w-max gap-5 pb-3">
          {/* two copies → seamless wrap at -50% */}
          {[...ITEMS, ...ITEMS].map((it, i) => <Card key={`${it.title}-${i}`} item={it} onOpen={navigate} />)}
        </div>
      </div>

      {/* All research list */}
      <section className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-28">
        <h2 className="font-['Space_Grotesk'] text-4xl font-semibold tracking-tight md:text-5xl">All research.</h2>
        <div className="mt-10 divide-y rounded-xl border" style={{ borderColor: BORDER, background: '#fff' }}>
          {ITEMS.map((it) => (
            <button key={it.title} onClick={() => navigate(it.href)} className="flex w-full items-center justify-between gap-6 px-6 py-6 text-left transition-colors hover:bg-[#f6f5ef]">
              <div>
                <div className="flex flex-wrap gap-2">{it.tags.map((t) => <span key={t} className="font-mono text-[10px] uppercase tracking-wider text-[#a3a3a3]">{t}</span>)}</div>
                <h3 className="font-['Space_Grotesk'] mt-2 text-xl font-semibold" style={{ color: INK }}>{it.title}</h3>
              </div>
              <ArrowRight size={18} className="shrink-0 text-[#8a8a82]" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ResearchIndex;
