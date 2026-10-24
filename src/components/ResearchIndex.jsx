import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Copy, Github, UserRound } from 'lucide-react';
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
  { tags: ['RUNTIME', 'PROACTIVE INTELLIGENCE', 'PRODUCT DESIGN'], title: 'Intelligence with continuity', desc: 'How company signals become scoped work, reviewed results and useful next steps. The thinking behind Runtime, your AI Chief of Staff.', href: '/research/runtime', art: 'radial-gradient(ellipse at center, #704333, #10111a)', img: '/assets/runtime-computer-c2305f5b.webp' },
  {
    tags: ['MEMORY', '.AMR', 'INFRASTRUCTURE'],
    title: 'ICARUS',
    desc: 'A memory filesystem for AI agents — where the byte layout, not the query engine, is the innovation. Equal recall to a live vector DB, 7.5× smaller, zero servers.',
    href: '/research/icarus',
    art: 'linear-gradient(135deg, #ff7a2f 0%, #ff5229 45%, #7a1f0a 100%)',
    img: '/thesis-greekgod.webp',
  },
  {
    tags: ['BENCHMARK', 'LONGMEMEVAL', 'EVALUATION'],
    title: '87.2% on LongMemEval',
    desc: 'Published, reproducible recall benchmark against the industry-standard long-context memory eval — sub-50ms retrieval, live regression gates, methodology public.',
    href: '/benchmark',
    art: 'linear-gradient(135deg, #4a9fff 0%, #117dff 50%, #0a2a5e 100%)',
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

const EMBER = '#FF5229';
const GITHUB = 'https://github.com/amar3012005';
const ICARUS_INSTALL = 'curl -fsSL https://raw.githubusercontent.com/amar3012005/ICARUS/main/install.sh | bash';
// The Agent Bus source is still private; flip this when the repository is published.
const AGENT_BUS_PUBLIC = false;

/** The open-source ICARUS family, all under one SINGULANCE developer account. */
const PRODUCTS = [
  {
    name: 'Memory',
    status: 'Stable',
    line: 'The .amr memory filesystem for agents. Save and recall locally, with no account, server or API key.',
    command: `${ICARUS_INSTALL}\nicarus save "Release notes live in docs/release.md" --org demo\nicarus recall "release notes" --org demo`,
    docs: '/research/icarus',
    repo: `${GITHUB}/ICARUS`,
  },
  {
    name: 'Harness',
    status: 'Opt-in',
    line: 'The deterministic layer around a coding agent: task contracts, context packs, verification receipts and a seal gate for high-risk work.',
    command: 'icarus harness init --agent claude\nicarus doctor',
    docs: `${GITHUB}/ICARUS/blob/main/docs/HARNESS_QUICKSTART.md`,
    repo: `${GITHUB}/ICARUS/tree/main/crate/icarus-harness`,
  },
  {
    name: 'Agent Bus',
    status: AGENT_BUS_PUBLIC ? 'New' : 'Early access',
    line: 'A durable mailbox between any two coding agents, laptop or cloud. Jobs, progress and receipts arrive by push, and nothing is lost while one sleeps.',
    command: AGENT_BUS_PUBLIC
      ? 'curl -fsSL https://raw.githubusercontent.com/amar3012005/SINGULANCE-agent-bus/main/install.sh | bash\nicarus-bus setup'
      : null,
    docs: AGENT_BUS_PUBLIC ? `${GITHUB}/SINGULANCE-agent-bus#readme` : null,
    repo: AGENT_BUS_PUBLIC ? `${GITHUB}/SINGULANCE-agent-bus` : null,
  },
  {
    name: 'Computer Use',
    status: 'Experimental',
    line: 'Computer control for agents that follows a plan the caller supplies, evaluated separately from the memory core.',
    command: null,
    docs: `${GITHUB}/HIVEMIND-Computer-use#readme`,
    repo: `${GITHUB}/HIVEMIND-Computer-use`,
  },
];

const ACCOUNT_STEPS = [
  { n: '01', title: 'Install ICARUS', body: 'One binary for macOS, Linux and Windows. Local memory works straight away.' },
  { n: '02', title: 'Run icarus connect', body: 'Your browser opens. Create the account or sign in with email or Google.' },
  { n: '03', title: 'Use every tool', body: 'The same developer identity covers Memory, Harness, Agent Bus and Computer Use.' },
];

const CopyBlock = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-[#101522] p-4 pr-12 text-[12px] leading-6 text-[#e3e8f1]"><code>{text}</code></pre>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${copied ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-white/15 bg-white/5 text-white/70 hover:text-white'}`}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <span className="sr-only" aria-live="polite">{copied ? `${label} copied.` : ''}</span>
    </div>
  );
};

/** Reads the existing SINGULANCE session through the shared api client; signed out on any failure. */
const useDeveloperSession = () => {
  const [session, setSession] = useState({ state: 'checking', email: null });
  useEffect(() => {
    let live = true;
    import('./hivemind/app/shared/api-client')
      .then(({ default: apiClient }) => apiClient.bootstrap())
      .then((data) => {
        if (!live) return;
        const signedIn = data && data.authenticated !== false && data.user;
        setSession(signedIn ? { state: 'signed_in', email: data.user.email || null } : { state: 'signed_out', email: null });
      })
      .catch(() => live && setSession({ state: 'signed_out', email: null }));
    return () => { live = false; };
  }, []);
  return session;
};

const AccountCard = ({ session }) => {
  const [showCommand, setShowCommand] = useState(false);
  if (session.state === 'signed_in') {
    return (
      <div className="min-w-0 self-start rounded-xl border bg-white p-6 md:p-8" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3f2ec] text-[#0a0a0a]"><UserRound size={18} /></span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a8a82]">Signed in</p>
            <p className="truncate font-['Space_Grotesk'] text-lg font-semibold">{session.email || 'SINGULANCE account'}</p>
          </div>
        </div>
        <p className="mt-5 text-[14px] leading-relaxed text-[#525252]">Link this account to your terminal once, and every ICARUS tool on that machine uses it.</p>
        <div className="mt-5"><CopyBlock text="icarus connect" label="connect command" /></div>
      </div>
    );
  }
  return (
    <div className="min-w-0 self-start rounded-xl border bg-white p-6 md:p-8" style={{ borderColor: BORDER }}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a8a82]">SINGULANCE developer account</p>
      <p className="mt-3 font-['Space_Grotesk'] text-2xl font-semibold tracking-tight">Free, for every developer.</p>
      <ul className="mt-4 space-y-2 text-[14px] text-[#525252]">
        {['Email or Google', 'No card and no company workspace', 'Local memory never needs it'].map((t) => (
          <li key={t} className="flex items-center gap-2"><Check size={14} style={{ color: EMBER }} /> {t}</li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => setShowCommand(true)}
          aria-expanded={showCommand}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-2.5 text-[13px] font-semibold text-white transition-transform hover:scale-[1.02]"
        >
          Create free account <ChevronRight size={15} />
        </button>
        <button
          type="button"
          onClick={() => setShowCommand(true)}
          aria-expanded={showCommand}
          className="inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-[13px] font-semibold text-[#0a0a0a] hover:bg-[#f6f5ef]"
          style={{ borderColor: BORDER }}
        >
          Sign in
        </button>
      </div>
      {showCommand && (
        <div className="mt-6">
          <p className="mb-3 text-[13px] leading-relaxed text-[#525252]">Run this in your terminal. Your browser opens to create the account or sign in, and the credential is saved only on your machine.</p>
          <CopyBlock text={`${ICARUS_INSTALL}\nicarus connect`} label="account command" />
        </div>
      )}
    </div>
  );
};

const ProductCard = ({ product }) => (
  <article className="flex min-w-0 flex-col rounded-xl border bg-white p-6" style={{ borderColor: BORDER }}>
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-['Space_Grotesk'] text-xl font-semibold tracking-tight"><span className="text-[#8a8a82]">ICARUS</span> {product.name}</h3>
      <span className="shrink-0 rounded bg-[#f3f2ec] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#737367]">{product.status}</span>
    </div>
    <p className="mt-3 text-[14px] leading-relaxed text-[#525252]">{product.line}</p>
    {product.command && <div className="mt-5"><CopyBlock text={product.command} label={`ICARUS ${product.name} commands`} /></div>}
    <div className="mt-auto flex flex-wrap gap-4 pt-5 text-[13px] font-semibold">
      {product.docs && (
        <a href={product.docs} className="inline-flex items-center gap-1 text-[#0a0a0a] hover:underline">Read the docs <ArrowRight size={14} /></a>
      )}
      {product.repo ? (
        <a href={product.repo} className="inline-flex items-center gap-1.5 text-[#525252] hover:text-black"><Github size={14} /> Source</a>
      ) : (
        <span className="text-[#a3a3a3]">Source opens with the public release</span>
      )}
    </div>
  </article>
);

const Card = ({ item, onOpen, standalone = false }) => (
  <article
    data-card
    className={`flex snap-start flex-col overflow-hidden rounded-xl border ${standalone ? 'w-full' : 'w-[88vw] shrink-0 md:w-[900px]'} md:flex-row`}
    style={{ borderColor: BORDER, background: '#fff' }}
  >
    {/* text panel */}
    <div className="flex w-full flex-col p-6 md:w-1/2 md:p-10">
      <div className="flex flex-wrap gap-2">
        {item.tags.map((t) => (
          <span key={t} className="rounded bg-[#f3f2ec] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#737367]">{t}</span>
        ))}
      </div>
      <h2 className="font-['Space_Grotesk'] mt-5 text-2xl font-semibold tracking-tight md:mt-6 md:text-3xl" style={{ color: INK }}>{item.title}</h2>
      <p className="mt-4 text-[14px] leading-relaxed text-[#525252] md:mt-5 md:text-[15px]">{item.desc}</p>
      <div className="mt-6 md:mt-auto md:pt-8">
        <a href={item.href} className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-[13px] font-semibold text-white transition-transform hover:scale-[1.02]">
          Learn more <ChevronRight size={15} />
        </a>
      </div>
    </div>
    {/* art panel — fixed height when stacked (mobile), fills the row half on desktop */}
    <a href={item.href} className="relative h-48 w-full overflow-hidden md:h-auto md:w-1/2" style={{ background: item.art }} aria-label={item.title}>
      {item.img && <img src={item.img} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-luminosity" />}
      <span className="absolute bottom-5 left-5 font-['Space_Grotesk'] text-2xl font-bold text-white/90">{item.title.split(' ')[0]}</span>
    </a>
  </article>
);

const ResearchIndex = () => {
  const navigate = useNavigate();
  const session = useDeveloperSession();

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
          <a href="/" className="flex items-center gap-2 bg-transparent text-[14px] font-medium text-[#525252] hover:text-black">
            <ArrowLeft size={15} /> SINGULANCE
          </a>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.28em] text-[#8a8a82] sm:inline">Research</span>
            <a href="#developers" className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-[12px] font-semibold text-white">
              <UserRound size={13} /> {session.state === 'signed_in' ? 'Developer account' : 'Sign in'}
            </a>
          </div>
        </div>
      </nav>

      {/* hero heading */}
      <header className="mx-auto max-w-[1280px] px-5 pb-8 pt-12 sm:px-6 md:px-10 md:pb-10 md:pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#8a8a82]">SINGULANCE Labs</p>
        <h1 className="font-['Space_Grotesk'] mt-4 text-[44px] font-semibold leading-none tracking-tight sm:text-5xl md:text-7xl" style={{ color: INK }}>Research.</h1>
        <p className="mt-5 max-w-2xl text-[17px] font-light leading-7 text-[#525252] md:text-lg md:leading-relaxed">
          The work behind the sovereign workforce — memory you can prove, and a swarm that acts as one.
        </p>
        <a href="#developers" className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-[#0a0a0a] hover:underline">
          Use the open-source ICARUS tools, free <ArrowRight size={15} />
        </a>
      </header>

      {/* conveyor belt — cards drift right→left, continuous loop, pause on hover */}
      <style>{`
        @keyframes research-belt { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
        .research-belt { animation: research-belt 60s linear infinite; will-change: transform; }
        .research-belt:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .research-belt { animation: none; } }
      `}</style>
      <div className="space-y-8 px-4 pb-4 md:hidden">
        {ITEMS.map((item, index) => (
          <div key={item.title}>
            <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a8a82]">
              <span>{index === 0 ? 'Featured research' : 'Research'}</span>
              <span>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <Card item={item} onOpen={navigate} standalone />
          </div>
        ))}
      </div>
      <div className="mt-7 hidden overflow-hidden md:block">
        <div className="research-belt flex w-max gap-5 pb-3">
          {/* two copies → seamless wrap at -50% */}
          {[...ITEMS, ...ITEMS].map((it, i) => <Card key={`${it.title}-${i}`} item={it} onOpen={navigate} />)}
        </div>
      </div>

      {/* All research list */}
      <section className="mx-auto hidden max-w-[1280px] px-5 py-16 sm:px-6 md:block md:px-10 md:py-28">
        <h2 className="font-['Space_Grotesk'] text-[34px] font-semibold tracking-tight md:text-5xl">All research.</h2>
        <div className="mt-7 divide-y overflow-hidden rounded-xl border md:mt-10" style={{ borderColor: BORDER, background: '#fff' }}>
          {ITEMS.map((it) => (
            <a key={it.title} href={it.href} className="flex w-full items-center justify-between gap-4 px-4 py-5 text-left transition-colors hover:bg-[#f6f5ef] sm:px-6 sm:py-6">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">{it.tags.map((t) => <span key={t} className="font-mono text-[10px] uppercase tracking-wider text-[#a3a3a3]">{t}</span>)}</div>
                <h3 className="font-['Space_Grotesk'] mt-2 text-[18px] font-semibold leading-tight sm:text-xl" style={{ color: INK }}>{it.title}</h3>
              </div>
              <ArrowRight size={18} className="shrink-0 text-[#8a8a82]" />
            </a>
          ))}
        </div>
      </section>

      {/* ICARUS open-source tools under one SINGULANCE developer account */}
      <section id="developers" className="scroll-mt-20 border-t" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-6 md:px-10 md:py-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em]" style={{ color: EMBER }}>Open source · SINGULANCE developer account</p>
          <div className="mt-4 grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-16">
            <div className="min-w-0">
              <h2 className="font-['Space_Grotesk'] text-[34px] font-semibold leading-[1.05] tracking-tight md:text-5xl">One account.<br />Every ICARUS tool.</h2>
              <p className="mt-5 max-w-xl text-[16px] font-light leading-7 text-[#525252]">
                The research above ships as open tools you run yourself. A free SINGULANCE developer account ties them to one identity, so your agents, terminals and machines know who they work for.
              </p>
              <ol className="mt-8 space-y-5">
                {ACCOUNT_STEPS.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="font-mono text-[12px] text-[#a3a3a3]">{s.n}</span>
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-[#525252]">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <AccountCard session={session} />
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 md:mt-20 md:grid-cols-2">
            {PRODUCTS.map((p) => <ProductCard key={p.name} product={p} />)}
          </div>
          <p className="mt-6 text-[13px] text-[#8a8a82]">
            ICARUS is licensed under Apache-2.0. Hosted HIVEMIND capabilities need their own permissions; a developer account never grants them on its own.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ResearchIndex;
