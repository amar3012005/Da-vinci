import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import NewsArticleLayout, { H2, P, Table, FullBleed } from './research/NewsArticleLayout';
import InteractiveByteSlot from './research/InteractiveByteSlot';

const IcarusHeroScene = lazy(() => import('./research/three/IcarusHeroScene'));

const EMBER = '#FF5229';
const BORDER = '#E4E3DE';
const ICARUS_AGENT_SETUP_URL = 'https://icarus.singulancelabs.com/agent-setup/prompt.md';
const ICARUS_AGENT_SETUP_PROMPT = `Fetch and follow the ICARUS coding-agent setup instructions at:

${ICARUS_AGENT_SETUP_URL}

Set up ICARUS for the current repository. Detect the coding agent, install ICARUS only if needed, register its MCP integration, initialize this repository, and verify the result. Do not create a graph, governed task, or upload project data unless the user’s actual task requires it. Use ICARUS primarily for targeted durable memory and recall; use the full harness only for high-risk changes such as production, security, tenant, billing, migration, destructive, or major-refactor work.`;

const CODING_AGENT_LOGOS = [
  { name: 'OpenAI Codex', src: '/agent-setup/icons/openai.svg' },
  { name: 'Claude Code', src: '/agent-setup/icons/anthropic.svg' },
  { name: 'Cursor', src: '/agent-setup/icons/cursor.svg' },
];

const AgentOnboardingPill = () => {
  const [copied, setCopied] = useState(false);
  const copySetupPrompt = async () => {
    try {
      await navigator.clipboard.writeText(ICARUS_AGENT_SETUP_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="mx-auto flex w-full max-w-[460px] justify-center px-1">
      <button
        type="button"
        onClick={copySetupPrompt}
        aria-label="Copy the ICARUS coding-agent onboarding prompt"
        className="group flex w-full items-center justify-between gap-2 rounded-full border border-white/60 bg-white px-3 py-2 text-left shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition-all hover:border-white hover:shadow-md sm:px-4"
      >
        <span className="min-w-0 truncate font-['Space_Grotesk'] text-[13px] font-medium tracking-tight text-[#0a0a0a] sm:text-[15px]">Onboard your coding agent to ICARUS</span>
        <span className="flex shrink-0 items-center gap-1 text-[#0a0a0a] sm:gap-1.5">
          {CODING_AGENT_LOGOS.map((agent) => (
            <img
              key={agent.name}
              src={agent.src}
              alt={`${agent.name} logo`}
              title={agent.name}
              className="h-4 w-4 object-contain sm:h-[18px] sm:w-[18px]"
            />
          ))}
          <span className={`ml-0.5 flex h-6 w-6 items-center justify-center rounded-[5px] border transition-colors sm:ml-1 ${copied ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#e3e0db] bg-[#faf9f4] text-[#525252] group-hover:border-[#0a0a0a] group-hover:text-[#0a0a0a]'}`}>
            {copied ? <Check size={13} strokeWidth={2.2} /> : <Copy size={13} />}
          </span>
        </span>
      </button>
      <span className="sr-only" aria-live="polite">{copied ? 'ICARUS agent setup prompt copied to clipboard.' : ''}</span>
    </div>
  );
};

const useMotionOk = () => {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wide = window.matchMedia?.('(min-width: 768px)');
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setOk(Boolean(wide?.matches && !reducedMotion?.matches));
  }, []);
  return ok;
};

/* ── Version toggle — sticky segmented pill ─────────────────────────────── */
const VersionToggle = ({ version, onChange }) => (
  <div className="sticky top-3 z-30 my-6 flex justify-center">
    <div
      className="relative flex items-center gap-0 rounded-full border bg-white/85 p-1 shadow-sm backdrop-blur-md"
      style={{ borderColor: BORDER }}
      role="tablist"
      aria-label="Paper version"
    >
      {/* sliding highlight */}
      <span
        className="absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-out"
        style={{
          left: version === 'v1' ? 4 : '50%',
          width: 'calc(50% - 4px)',
          background: '#0a0a0a',
        }}
      />
      {[
        { id: 'v1', label: 'v1 — Thesis', sub: 'Jun 24' },
        { id: 'v2', label: 'v2 — Production', sub: 'Jul 3' },
      ].map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={version === t.id}
          onClick={() => onChange(t.id)}
          className="relative z-10 w-[7.5rem] rounded-full px-2 py-2 text-center transition-colors duration-300 sm:w-40 sm:px-4 md:w-48"
        >
          <span className={`font-['Space_Grotesk'] block text-[11px] font-semibold leading-tight sm:text-[13px] ${version === t.id ? 'text-white' : 'text-[#5a5a54]'}`}>{t.label}</span>
          <span className={`block font-mono text-[9px] uppercase tracking-[0.2em] ${version === t.id ? 'text-white/60' : 'text-[#a3a39b]'}`}>{t.sub} 2026</span>
        </button>
      ))}
    </div>
  </div>
);

/* ── PhaseRail — the build, gate by gate (interactive stepper) ──────────── */
const PHASES = [
  { id: 'P0', name: 'Frozen spec', metric: 'RFC before code', detail: 'The .amr format RFC — magic, every field offset, four file formats (.mseg/.mnsw/.mpq/lock), six invariants — written and human-frozen BEFORE any implementation. The layout is the contract.' },
  { id: 'P1', name: 'Proof of physics', metric: '13.3× vs REST', detail: '10k real production memories embedded with bge-m3 (the prod model). Local int8 mmap scan: 0.155 ms p50 vs Qdrant REST 2.057 ms — the network hop, not the algorithm, was the cost. GO decision made on this gate.' },
  { id: 'P2', name: 'Production crate', metric: '35 tests · 89.7% cov', detail: 'Rust .mseg crate: spec-locked byte structs (offset asserts against the RFC), LZ4 text region, growable mmap, append-only CRUD with tombstones, per-tenant shard locks. Gate: fmt + clippy -D warnings + coverage ≥80%.' },
  { id: 'P3', name: 'HNSW + entity bitmap', metric: '1.33 ms @ 1M', detail: 'usearch HNSW overlay with async background indexing — writes never block (p99 54.75 µs under concurrent index rebuild). Entity filter = one bitwise AND. Recall@10: 99.25% vs exact float32 at 1M vectors.' },
  { id: 'P4', name: 'Product Quantization', metric: '32× · 100% overlap', detail: 'M=128/K=256 PQ codebook + ADC distance tables + drift detection (retrain never inline). ADC scan + exact rescore holds 100% recall@10 overlap at 32× vector compression.' },
  { id: 'P5', name: 'Bi-temporal + graph', metric: '1.93 ms @ 1M', detail: 'Time-travel on both axes (created_at / valid_from independently) fused with 2-hop adjacency BFS in one recall — 1.93 ms p50 at 1M. Miri-verified: no undefined behaviour in the format crate.' },
  { id: 'P6', name: 'Node binding + cutover', metric: 'recall parity 1.00', detail: 'napi addon + MnemeVectorStore — a drop-in for the Qdrant client. Eval gate: recall@5 parity 1.00 vs the live stack on real data. Soak testing surfaced and fixed a real concurrent-reserve segfault (RwLock write-guard).' },
];

const PhaseRail = () => {
  const [active, setActive] = useState(6);
  const p = PHASES[active];
  return (
    <div className="my-10">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#8a8a82]">the build — seven gates, each machine-verified</span>
        <span className="font-mono text-[11px] text-[#a3a3a3]">click a gate</span>
      </div>
      <div className="flex w-full overflow-hidden rounded-lg border" style={{ borderColor: BORDER }}>
        {PHASES.map((ph, i) => (
          <button
            key={ph.id}
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            className="group relative flex-1 border-r px-1 py-3 transition-colors last:border-r-0"
            style={{
              borderColor: BORDER,
              background: i === active ? '#0a0a0a' : i < active ? '#f3f2ec' : '#fbfbf8',
            }}
          >
            <span className={`block text-center font-mono text-[10px] font-bold ${i === active ? 'text-white' : 'text-[#7a7a72]'}`}>{ph.id}</span>
            <span className={`mt-0.5 hidden text-center font-mono text-[8.5px] uppercase tracking-wide md:block ${i === active ? 'text-white/60' : 'text-[#b0b0a8]'}`}>{ph.name}</span>
            <span className="absolute inset-x-0 bottom-0 h-[2px] transition-opacity" style={{ background: EMBER, opacity: i === active ? 1 : 0 }} />
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-lg border p-4" style={{ borderColor: BORDER, background: '#fff' }}>
        <div className="flex items-baseline gap-3">
          <span className="font-['Space_Grotesk'] text-[15px] font-semibold text-[#0a0a0a]">{p.id} — {p.name}</span>
          <span className="rounded px-2 py-0.5 font-mono text-[11px] font-semibold" style={{ background: '#FF522915', color: EMBER }}>{p.metric}</span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-[#4a4a44]">{p.detail}</p>
      </div>
    </div>
  );
};

/* ── PqcFlow — every memory write is post-quantum signed (interactive) ──── */
const PQC_STEPS = [
  { id: 'write', label: 'memory write', code: '{ id, user_id, org_id, content }', detail: 'Every memory created through the engine — chat, documents, connectors, meetings — passes through one write path.' },
  { id: 'canon', label: 'canonicalize', code: 'canonical(payload) → stable bytes', detail: 'Keys sorted, deterministic JSON — so the exact signed bytes are reproducible at verify time, years later, by anyone.' },
  { id: 'sign', label: 'ML-DSA-65 sign', code: 'FIPS 204 · lattice · sub-ms', detail: 'Signed with ML-DSA-65 — a NIST-standard post-quantum signature. Secret key lives ONLY in server env, never in the database: an attacker with full DB access cannot forge a valid signature.' },
  { id: 'store', label: 'signature stored', code: 'memory_signatures (side-table)', detail: 'Signature + payload hash stored beside the memory. 30,000+ live signatures on managed hosting today. Tampering with content breaks the signature — detectably.' },
  { id: 'verify', label: 'anyone verifies', code: 'GET /api/security/verify-memory', detail: 'Public keys are exposed. Any auditor recomputes the canonical payload and verifies against the ML-DSA public key — no trust in SINGULANCE required.' },
];

const PqcFlow = () => {
  const [active, setActive] = useState(2);
  const s = PQC_STEPS[active];
  return (
    <div className="my-10">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#8a8a82]">the signing path — on by default</span>
        <span className="font-mono text-[11px] text-[#a3a3a3]">step through</span>
      </div>
      <div className="flex w-full flex-col gap-1 md:flex-row md:items-stretch md:gap-0">
        {PQC_STEPS.map((st, i) => (
          <React.Fragment key={st.id}>
            <button
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className="flex-1 rounded-lg border px-3 py-3 text-left transition-all"
              style={{
                borderColor: i === active ? EMBER : BORDER,
                background: i === active ? '#0a0a0a' : '#fbfbf8',
                boxShadow: i === active ? `0 0 0 1px ${EMBER}` : 'none',
              }}
            >
              <span className={`block font-mono text-[9px] uppercase tracking-[0.18em] ${i === active ? 'text-white/50' : 'text-[#a3a39b]'}`}>step {i + 1}</span>
              <span className={`font-['Space_Grotesk'] mt-0.5 block text-[13px] font-semibold leading-tight ${i === active ? 'text-white' : 'text-[#3a3a34]'}`}>{st.label}</span>
              <span className={`mt-1 block font-mono text-[10px] ${i === active ? 'text-[#FF8266]' : 'text-[#8a8a82]'}`}>{st.code}</span>
            </button>
            {i < PQC_STEPS.length - 1 && (
              <span className="hidden items-center px-1 font-mono text-[#c9c9c1] md:flex">→</span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3 rounded-lg border p-4" style={{ borderColor: BORDER, background: '#fff' }}>
        <p className="text-[14px] leading-relaxed text-[#4a4a44]">{s.detail}</p>
      </div>
    </div>
  );
};

/* ── v1 body — the original thesis paper, kept verbatim ─────────────────── */
const V1Body = ({ motionOk }) => (
  <>
    <P>General-purpose vector databases are built for document retrieval. AI-agent <em>memory</em> has a different access pattern: a single recall must fuse semantic similarity, entity filter, bi-temporal range, and graph traversal — per tenant, in milliseconds. ICARUS collapses all four indexes into one byte layout, the <code className="rounded bg-[#efeee8] px-1.5 py-0.5 font-mono text-[13px]">.amr</code> format, served from one memory-mapped file. It is to a vector database what <strong>SQLite is to Postgres</strong>: embedded, single-file, in-process.</P>

    <H2>Agent memory is not document search</H2>
    <P>A document store answers “find the most similar chunk among millions.” An agent-memory store must answer “what did this user say about authentication three weeks ago, across 47 conversations, that’s still valid — and what entities does it connect to?” That single question touches four indexes at once:</P>
    <Table head={['Index', 'Question it answers']} rows={[
      ['Semantic', 'Vector similarity to the query embedding.'],
      ['Entity', 'Does the memory mention auth / OAuth / a specific person?'],
      ['Bi-temporal', 'When was it true (valid_from) vs when we learned it (created_at)?'],
      ['Graph', 'What memories does it derive from / contradict / extend?'],
    ]} />
    <P>Today’s stacks serve these as separate systems fused in app code — each hop a network round-trip. ICARUS’s claim: the network hop, not the search algorithm, was the bottleneck all along.</P>

    <H2>The .amr format — the moat</H2>
    <P>Every memory is a fixed-stride <strong>202-byte slot</strong>; slot <em>i</em> lives at a computable offset — no index lookup to find a record. Explore the layout:</P>
    <InteractiveByteSlot />
    <P>The embedding is inline (PQ-compressed, not a foreign key); the entity filter is a single bitwise AND; bi-temporal anchors are inline i64s; graph adjacency is inline — a 2-hop traversal is pointer-following within the same mmap, never a join. One slot carries everything a recall needs.</P>

    {motionOk && (
      <FullBleed>
        <div className="relative h-[70vh] w-full overflow-hidden">
          <Suspense fallback={null}><IcarusHeroScene /></Suspense>
          <div className="pointer-events-none absolute inset-0 flex items-end p-8 md:p-14">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/55">The shard, live</p>
              <p className="font-['Space_Grotesk'] mt-3 max-w-xl text-3xl font-semibold leading-tight text-white md:text-4xl">Every memory is a slot. Recall sweeps the file in one mmap read.</p>
            </div>
          </div>
        </div>
      </FullBleed>
    )}

    <H2>Benchmarks — the production shadow eval</H2>
    <P>The decisive test: 8,682 real production vectors (the exact data serving live recall) were scrolled read-only out of production Qdrant; a local ICARUS shard was built from them; 200 leave-one-out queries compared top-10s — with zero production risk.</P>
    <Table head={['Metric', 'Result']} rows={[
      ['top-10 overlap (ICARUS vs prod Qdrant)', '99.80%'],
      ['top-1 agreement', '98.0% (196/200 identical #1)'],
      ['recall@10 p50 @ 1M', '1.33 ms'],
      ['storage per memory', '~600 B (vs ~4,500 B)'],
      ['vector compression (PQ + rescore)', '32× at 100% recall@10 overlap'],
      ['infrastructure', 'one 40 MB mmap’d file — no server'],
    ]} />
    <P>Stated honestly: ICARUS’s native engine beats a vector DB <em>over REST</em> (the network hop is the cost). Against a co-located Qdrant — and through the current Node binding — it is not yet a latency win; that is a binding-overhead problem, not a format one. The durable wins are equal recall, 7.5× smaller storage, and zero servers.</P>

    <H2>What it is — and isn’t</H2>
    <P>ICARUS is a vector + temporal + adjacency substrate, not a cognition layer. It deliberately does not implement typed graph edges, synthesis, or conflict resolution — those live above it. It replaces exactly one component: the vector store. The format is frozen in an RFC — magic, every field offset, the four file formats, the six invariants — published before the code, so the layout is the contract.</P>
  </>
);

/* ── v2 body — from thesis to production ────────────────────────────────── */
const V2Body = ({ motionOk }) => (
  <>
    <P><strong>v1 made a claim; v2 ships the system.</strong> Since June, ICARUS went from a frozen format RFC to a production Rust engine behind HIVEMIND: seven machine-verified gates, a live cutover serving real tenants, and — new in v2 — every memory it builds is <strong>post-quantum signed by default</strong>. This revision documents what was actually built, with the numbers each gate had to pass.</P>

    <H2>From thesis to production — seven gates</H2>
    <P>Nothing advanced on judgment. Each phase ended in a <em>gate</em>: a scripted, reproducible pass/fail check on real data — real <code className="rounded bg-[#efeee8] px-1.5 py-0.5 font-mono text-[13px]">bge-m3</code> embeddings of real production memories, never synthetic vectors. A phase that failed its gate could not advance.</P>
    <PhaseRail />
    <P>The engine that emerged: a Rust core (<code className="rounded bg-[#efeee8] px-1.5 py-0.5 font-mono text-[13px]">.mseg</code> slots + usearch HNSW overlay + PQ codebooks), write-path isolated from indexing, exposed to Node through a napi binding whose store class is a drop-in for the vector-DB client it replaces. Soak testing under concurrent load surfaced a real segfault in incremental indexing — found, root-caused to an unguarded reserve, fixed with a write-guard, and regression-tested. That is what the gates are for.</P>

    <H2>The .amr slot — unchanged, and that’s the point</H2>
    <P>The 202-byte slot frozen in the v1 RFC survived production contact without a single field change. The format <em>is</em> the contract:</P>
    <InteractiveByteSlot />

    {motionOk && (
      <FullBleed>
        <div className="relative h-[70vh] w-full overflow-hidden">
          <Suspense fallback={null}><IcarusHeroScene /></Suspense>
          <div className="pointer-events-none absolute inset-0 flex items-end p-8 md:p-14">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/55">In production</p>
              <p className="font-['Space_Grotesk'] mt-3 max-w-xl text-3xl font-semibold leading-tight text-white md:text-4xl">The format survived contact with production. Zero field changes.</p>
            </div>
          </div>
        </div>
      </FullBleed>
    )}

    <H2>How it runs live — anchor + engine</H2>
    <P>In production, ICARUS does not replace the relational layer — memory is a relational <em>hub</em> (provenance, projects, embeddings all reference it). The deployed topology keeps a thin relational anchor per memory and moves the hot path — semantic + entity + temporal + graph recall — onto the <code className="rounded bg-[#efeee8] px-1.5 py-0.5 font-mono text-[13px]">.amr</code> engine. One file per tenant, opened in-process by the memory engine, with the recall backend live-verified against the previous stack before cutover (recall-parity gate: 1.00).</P>
    <Table head={['Layer', 'Role in the live system']} rows={[
      ['Relational anchor', 'One row per memory — identity, provenance, project links. The FK hub stays.'],
      ['.amr shard (per tenant)', 'The recall engine: PQ vectors, entity bitmaps, bi-temporal anchors, adjacency — one mmap.'],
      ['HNSW overlay', 'Async-built index; writes never wait for indexing (p99 54.75 µs under rebuild).'],
      ['Engine binding', 'napi addon; store interface is a drop-in for the previous vector-DB client.'],
    ]} />

    <H2>New in v2 — every memory is post-quantum signed, by default</H2>
    <P>An agent-memory system asks for long-horizon trust: memories written today must still be <em>provably authentic</em> in ten years — against attackers who can rewrite a database, and eventually against quantum adversaries. So the write path signs every memory at creation with <strong>ML-DSA-65</strong> (NIST FIPS 204), on by default across managed and self-host deployments:</P>
    <PqcFlow />
    <P>Three properties matter. <strong>Default-on:</strong> not a tier or a toggle — the engine signs every write (30,000+ live signatures on managed hosting at publication). <strong>Key separation:</strong> signing keys live only in server env, never the database — DB compromise ≠ forgery ability. <strong>Independent verification:</strong> public keys and verify endpoints are exposed; an auditor needs zero trust in us. Around the memory layer, the same posture: hybrid <strong>X25519 + ML-KEM-768</strong> (FIPS 203) key exchange on the edge — defeating harvest-now/decrypt-later — and an <strong>SLH-DSA</strong> (FIPS 205) hash-chained, append-only audit trail with a signed checkpoint.</P>
    <Table head={['Surface', 'Post-quantum mechanism']} rows={[
      ['Memory writes', 'ML-DSA-65 signature per memory (FIPS 204) — on by default'],
      ['Transport', 'Hybrid X25519 + ML-KEM-768 key exchange (FIPS 203)'],
      ['Audit trail', 'SLH-DSA-SHA2-128s hash-chained signatures (FIPS 205), tamper-evident'],
      ['Verification', 'Public endpoints: /api/security/pqc · /verify-memory · /audit-verify'],
    ]} />
    <P>Honest edges: signing is currently fail-open (a write proceeds unsigned if keys are absent) — an enforce mode for high-assurance tenants is planned; and on self-host BYOD topologies the signature attaches at the engine anchor, with agent-side signing on the roadmap alongside customer-held keys (BYOK): <em>you</em> hold the key, and even we cannot forge your memory.</P>

    <H2>v2 numbers</H2>
    <Table head={['Metric', 'Result']} rows={[
      ['proof gate — mmap scan vs vector DB over REST (10k, real embeddings)', '13.3× faster (0.155 ms vs 2.057 ms p50)'],
      ['recall@10 p50 @ 1M vectors (HNSW)', '1.33 ms · 99.25% vs exact'],
      ['bi-temporal + 2-hop graph recall @ 1M', '1.93 ms p50'],
      ['write p99 under concurrent index rebuild', '54.75 µs — writes never block'],
      ['vector compression (PQ, ADC + rescore)', '32× at 100% recall@10 overlap'],
      ['production shadow eval (8,682 live vectors)', '99.80% top-10 overlap · 98% top-1'],
      ['cutover recall-parity gate (drop-in binding)', '1.00 vs previous stack'],
      ['memory integrity', 'ML-DSA-65 signature per write — default-on'],
    ]} />

    <H2>What’s next</H2>
    <P>The remaining arc is operational depth, not format change: long-soak burn-in under production write rates; signature enforcement mode (reject unsigned writes) for regulated tenants; agent-side signing on self-host so the signature is born on the customer’s box; and customer-held signing keys. The format stays frozen — the RFC published before the code is still the contract, and v2’s strongest result is that production never forced it to break.</P>
  </>
);

/* ── page ────────────────────────────────────────────────────────────────── */
const HERO_IMG = '/research-icarus-hero.png'; // drop the background image here to swap

const VERSION_META = {
  v1: {
    title: 'Introducing ICARUS',
    date: 'June 24, 2026',
    highlights: [
      'Production-equivalent recall: 99.8% top-10 overlap vs a live Qdrant on real production data.',
      '7.5× smaller storage (~600 B per memory) and 32× vector compression with no recall loss.',
      'Semantic + entity + bi-temporal + graph recall served from a single mmap read.',
      'One file per tenant — embedded, in-process, zero servers to operate.',
    ],
    seo: {
      title: 'ICARUS — A Memory Filesystem for AI Agents | SINGULANCE Research',
      description: "ICARUS is SINGULANCE's memory filesystem: the .amr byte layout co-locates embedding, entity bitmap, bi-temporal anchors, and graph adjacency in one fixed-stride slot. Equal recall to a live vector DB, 7.5× smaller storage, 32× compression, zero servers.",
      canonical: 'https://singulancelabs.com/research/icarus',
    },
  },
  v2: {
    title: 'ICARUS v2 — In Production',
    date: 'July 3, 2026',
    highlights: [
      'Thesis → production in seven machine-verified gates — every gate on real embeddings, never synthetic.',
      'Live cutover: per-tenant .amr shards serving recall behind HIVEMIND at parity 1.00 with the stack they replaced.',
      'Every memory is post-quantum signed by default — ML-DSA-65 (FIPS 204), 30,000+ live signatures, independently verifiable.',
      '1.33 ms recall@10 at 1M vectors · 32× compression at 100% overlap · writes never blocked by indexing.',
    ],
    seo: {
      title: 'ICARUS v2 — In Production, Post-Quantum Signed by Default | SINGULANCE Research',
      description: 'ICARUS v2: the .amr memory filesystem in production — seven machine-verified gates, live per-tenant shards at recall parity 1.00, and every memory post-quantum signed by default with ML-DSA-65 (FIPS 204). Verifiable by anyone.',
      canonical: 'https://singulancelabs.com/research/icarus',
    },
  },
};

const IcarusResearch = () => {
  const motionOk = useMotionOk();
  const [version, setVersion] = useState('v2');
  const meta = VERSION_META[version];

  return (
    <NewsArticleLayout
      badge="Research"
      title={meta.title}
      date={meta.date}
      author="SINGULANCE Labs"
      heroImg={HERO_IMG}
      heroScene={motionOk ? <Suspense fallback={null}><IcarusHeroScene /></Suspense> : null}
      heroAccessory={<AgentOnboardingPill />}
      seo={meta.seo}
      product={{ name: 'ICARUS', tag: '.amr format', desc: 'A memory filesystem for AI agents — one mmap’d file per tenant, no server.' }}
      highlights={meta.highlights}
    >
      <VersionToggle version={version} onChange={setVersion} />
      <div key={version} className="animate-[icarusFade_.45s_ease]">
        {version === 'v1' ? <V1Body motionOk={motionOk} /> : <V2Body motionOk={motionOk} />}
      </div>
      <style>{`@keyframes icarusFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </NewsArticleLayout>
  );
};

export default IcarusResearch;
