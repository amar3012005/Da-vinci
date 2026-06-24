import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import Seo from './Seo';

/**
 * ICARUS — SINGULANCE's memory filesystem (mneme engine, .amr format).
 * Research page rendered in the Mistral editorial style: warm-paper canvas,
 * black ink, one ember accent, Space Grotesk display + JetBrains Mono labels,
 * numbered sections, byte-layout + benchmark tables, a full-bleed accent block.
 */

const PAPER = '#FBFBF8';
const INK = '#0a0a0a';
const EMBER = '#FF5229';
const BORDER = '#E4E3DE';

const Eyebrow = ({ children }) => (
  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8a8a82]">{children}</p>
);

const Section = ({ n, title, children }) => (
  <section className="border-t py-16 md:py-20" style={{ borderColor: BORDER }}>
    <div className="mx-auto grid max-w-[1100px] gap-8 px-6 md:grid-cols-[120px_1fr] md:gap-12">
      <div>
        <span className="font-mono text-[13px] text-[#b9b8b1]">{n}</span>
      </div>
      <div>
        <h2 className="font-['Space_Grotesk'] text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: INK }}>{title}</h2>
        <div className="mt-6 space-y-5 text-[16px] leading-relaxed text-[#3a3a36]">{children}</div>
      </div>
    </div>
  </section>
);

const Table = ({ head, rows }) => (
  <div className="overflow-x-auto rounded-lg border" style={{ borderColor: BORDER }}>
    <table className="w-full border-collapse text-[14px]">
      <thead>
        <tr className="bg-[#f3f2ec] text-left font-mono text-[11px] uppercase tracking-wider text-[#737367]">
          {head.map((h) => <th key={h} className="border-b px-4 py-3 font-medium" style={{ borderColor: BORDER }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="align-top">
            {r.map((c, j) => (
              <td key={j} className="border-b px-4 py-3" style={{ borderColor: BORDER, color: j === 0 ? INK : '#3a3a36', fontWeight: j === 0 ? 500 : 400 }}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StatCard = ({ value, label }) => (
  <div className="rounded-lg border p-5" style={{ borderColor: BORDER, background: '#fff' }}>
    <div className="font-['Space_Grotesk'] text-3xl font-semibold" style={{ color: INK }}>{value}</div>
    <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-[#8a8a82]">{label}</div>
  </div>
);

const IcarusResearch = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: PAPER, color: INK, minHeight: '100vh' }} className="font-['Inter']">
      <Seo
        title="ICARUS — A Memory Filesystem for AI Agents | SINGULANCE Research"
        description="ICARUS is SINGULANCE's memory filesystem: the .amr byte layout co-locates embedding, entity bitmap, bi-temporal anchors, and graph adjacency in one fixed-stride slot. Equal recall to a live vector DB, 7.5× smaller storage, 32× compression, zero servers."
        canonical="https://singulancelabs.com/research/icarus"
      />

      {/* nav */}
      <nav className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: BORDER, background: 'rgba(251,251,248,0.85)' }}>
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-transparent text-[14px] font-medium text-[#525252] hover:text-black">
            <ArrowLeft size={15} /> SINGULANCE
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8a8a82]">Research</span>
        </div>
      </nav>

      {/* hero */}
      <header className="mx-auto max-w-[1100px] px-6 pb-16 pt-20 md:pt-28">
        <Eyebrow>Research · Memory Filesystem · .amr</Eyebrow>
        <h1 className="font-['Space_Grotesk'] mt-6 text-6xl font-semibold tracking-tight md:text-8xl" style={{ color: INK }}>ICARUS</h1>
        <p className="mt-6 max-w-2xl text-xl font-light leading-snug text-[#3a3a36] md:text-2xl">
          A memory filesystem for AI agents — where the <span className="font-medium" style={{ color: INK }}>byte layout</span>, not the query engine, is the innovation.
        </p>
        <p className="mt-8 max-w-3xl text-[16px] leading-relaxed text-[#525252]">
          General-purpose vector databases are built for document retrieval. Agent <em>memory</em> has a different
          access pattern: a single recall must fuse semantic similarity, entity filter, bi-temporal range, and graph
          traversal — per tenant, in milliseconds. ICARUS collapses all four indexes into one byte layout
          (<code className="rounded bg-[#efeee8] px-1.5 py-0.5 font-mono text-[13px]">.amr</code>), served from one
          memory-mapped file. It is to a vector database what <strong>SQLite is to Postgres</strong>: embedded,
          single-file, in-process.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {['Apache-2.0', 'Rust core', 'Node binding', 'Single file per tenant', 'Zero servers'].map((t) => (
            <span key={t} className="rounded border px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[#737367]" style={{ borderColor: BORDER }}>{t}</span>
          ))}
        </div>

        {/* headline stats */}
        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard value="99.8%" label="recall vs live Qdrant" />
          <StatCard value="7.5×" label="smaller storage" />
          <StatCard value="32×" label="vector compression" />
          <StatCard value="0" label="servers to operate" />
        </div>
      </header>

      {/* §01 problem */}
      <Section n="01" title="Agent memory is not document search">
        <p>A document store answers “find the most similar chunk among millions.” An agent-memory store must answer:</p>
        <blockquote className="border-l-2 pl-5 text-[17px] italic text-[#2a2a26]" style={{ borderColor: EMBER }}>
          “What did this user say about authentication three weeks ago, across 47 conversations, that’s still valid — and what entities does it connect to?”
        </blockquote>
        <p>That single question touches four indexes at once:</p>
        <Table
          head={['Index', 'Question it answers']}
          rows={[
            ['Semantic', 'Vector similarity to the query embedding.'],
            ['Entity', 'Does the memory mention auth / OAuth / a specific person?'],
            ['Bi-temporal', 'When was it true (valid_from) vs when we learned it (created_at)?'],
            ['Graph', 'What memories does it derive from / contradict / extend?'],
          ]}
        />
        <p>Today’s stacks serve these as separate systems — a vector DB over REST, Postgres for rows and edges — fused in app code. Each hop is a network round-trip. ICARUS’s claim: the network hop, not the search algorithm, was the bottleneck all along.</p>
      </Section>

      {/* §02 the .amr format */}
      <Section n="02" title="The .amr format — the moat">
        <p>Every memory is a <strong>fixed-stride 202-byte slot</strong>. Fixed stride means slot <em>i</em> lives at a computable offset — no index lookup to find a record. The frozen, little-endian layout:</p>
        <Table
          head={['Offset', 'Size', 'Field', 'Purpose']}
          rows={[
            ['0', '4', 'id', 'stable slot id (never renumbered)'],
            ['4', '2', 'flags', 'TOMBSTONE · PQ_TRAINED · TEXT_INLINE · GRAPH_DIRTY'],
            ['6', '8', 'created_at', 'ingestion time — bi-temporal axis 1 (ns)'],
            ['14', '8', 'valid_from', 'fact validity — bi-temporal axis 2 (ns)'],
            ['22', '4', 'text_ptr', 'offset into the LZ4 text region'],
            ['26', '4', 'text_len_lz4', 'compressed text length'],
            ['30', '4', 'text_len_raw', 'uncompressed text length'],
            ['34', '128', 'vector_pq', '1024-dim embedding → 128 B via Product Quantization (32×)'],
            ['162', '8', 'entity_bitmap', '64 canonical entities, 1 bit each → O(1) AND filter'],
            ['170', '32', 'adjacency', '8 graph-neighbour slot ids inline → no join'],
          ]}
        />
        <p>The decisions that matter: the <strong>embedding is inline</strong> (PQ-compressed, not a foreign key); the <strong>entity filter is a single bitwise AND</strong> (O(1), no posting list); <strong>bi-temporal anchors are inline i64s</strong> (a time-travel query is a byte range already in the cache line); and <strong>graph adjacency is inline</strong> — a 2-hop traversal is pointer-following within the same <code className="rounded bg-[#efeee8] px-1.5 py-0.5 font-mono text-[13px]">mmap</code>, never a join.</p>
        <p className="font-medium" style={{ color: INK }}>One slot = one cache-line-friendly record carrying everything a recall needs.</p>

        <p className="pt-2">The companion files, one shard per org (a directory <em>is</em> the tenancy boundary):</p>
        <Table
          head={['File', 'Role']}
          rows={[
            ['shard.amr', '64-byte header + fixed-stride slot array (mmap’d)'],
            ['shard.vec', 'raw f32 vectors — exact-rescore source'],
            ['shard.txt', 'append-only LZ4 text region'],
            ['shard.mnsw', 'usearch HNSW index — the candidate accelerator'],
            ['shard.mpq', 'per-org PQ codebook (M=128, K=256)'],
            ['shard.lock', 'fcntl advisory lock — one writer per org'],
          ]}
        />
      </Section>

      {/* §03 architecture */}
      <Section n="03" title="One recall(), four indexes">
        <p>Everything after the candidate search reads bytes already resident in the <code className="rounded bg-[#efeee8] px-1.5 py-0.5 font-mono text-[13px]">mmap</code>. No second system, no second round-trip, no join.</p>
        <pre className="overflow-x-auto rounded-lg border p-5 font-mono text-[13px] leading-relaxed text-[#2a2a26]" style={{ borderColor: BORDER, background: '#fff' }}>{`recall(query, Filter{ entity_mask, created_at_range, valid_from_range }, hops, top_k)
   ├─ HNSW candidate search (usearch, f32 graph)   → wide candidate pool
   ├─ post-filter: tombstone + entity AND + temporal range   (bytes in slot)
   ├─ exact f32 cosine rerank over .vec source      → float32 recall parity
   └─ 2-hop adjacency BFS (when hops > 0)           → graph-reachable memories`}</pre>
        <p>The innovation budget is spent on exactly three things — the <strong>.amr byte layout</strong>, the <strong>entity-bitmap AND filter</strong>, and the <strong>per-org PQ codebook with drift detection</strong>. Everything else (usearch HNSW, memmap2, zerocopy, lz4_flex, napi-rs) is a battle-tested dependency, wrapped not rebuilt.</p>
      </Section>

      {/* §04 PQ */}
      <Section n="04" title="Product Quantization — 32× without losing recall">
        <p>A 1024-dim vector (4096 B) is split into M=128 subspaces; per-subspace k-means learns K=256 centroids; the code is <strong>128 bytes</strong> — 32× compression. Pure-PQ recall is ~79% (too lossy alone), so ICARUS uses the production pattern: a fast ADC scan over the compact codes retrieves a wide pool, then an exact float32 rescore delivers the final top-k.</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard value="100%" label="recall@10 overlap vs float32" />
          <StatCard value="128 B" label="PQ code (from 4096 B)" />
          <StatCard value="0.85" label="drift retrain threshold" />
        </div>
        <p><strong>Drift detection:</strong> as an org’s vector distribution shifts, an alignment score (mean cosine between each vector and its PQ reconstruction) falls. Below 0.85, a retrain is <em>enqueued, never run inline</em> — the same kill-condition guard as the index rebuild.</p>
      </Section>

      {/* §05 benchmarks */}
      <Section n="05" title="Benchmarks — real bge-m3, vs Qdrant 1.18.2">
        <p className="font-medium" style={{ color: INK }}>Production shadow eval — the decisive test.</p>
        <p>One production org’s <strong>8,682 real vectors</strong> (1024-dim, the exact data serving live recall) were scrolled read-only out of production Qdrant. A local ICARUS shard was built from them. Over 200 leave-one-out queries, ICARUS’s top-10 was compared to production Qdrant’s top-10 — zero production risk.</p>
        <Table
          head={['Metric', 'Result']}
          rows={[
            ['top-10 overlap (ICARUS vs prod Qdrant)', '99.80%'],
            ['top-1 agreement', '98.0% (196/200 identical #1)'],
            ['ICARUS shard', 'one 40 MB mmap’d file, no server'],
            ['recall@5 vs exact (Node binding)', '1.00 (= Qdrant float32)'],
          ]}
        />
        <p className="pt-2 font-medium" style={{ color: INK }}>Scale + write path (@ 1M memories).</p>
        <Table
          head={['Metric', 'Value']}
          rows={[
            ['recall@10 p50 @ 1M', '1.33 ms'],
            ['bi-temporal filter + 2-hop BFS p50 @ 1M', '1.93 ms'],
            ['storage per memory', '~600 B (vs ~4,500 B)'],
            ['insert p50 / p99 under concurrent rebuild', '3.79 µs / 54.75 µs'],
          ]}
        />
        <p className="text-[15px] text-[#737367]">Stated honestly: ICARUS’s native engine beats a vector DB <em>over REST</em> (the network hop is the cost). Against a co-located Qdrant — and through the current Node binding — it is not yet a latency win; that is a binding-overhead problem, not a format one. The durable wins are equal recall, 7.5× smaller storage, and zero servers.</p>
      </Section>

      {/* §06 differs */}
      <Section n="06" title="How the .amr slot differs from every other store">
        <Table
          head={['', 'ICARUS .amr', 'Qdrant', 'pgvector', 'Pinecone']}
          rows={[
            ['Embedding', 'inline, PQ 128 B', 'separate', 'column f32', 'managed'],
            ['Entity filter', 'inline 64-bit AND, O(1)', 'payload index', 'WHERE column', 'metadata'],
            ['Bi-temporal', 'two inline i64 axes', 'payload range', 'two columns', 'metadata'],
            ['Graph adjacency', 'inline 8 neighbours', 'none', 'join edge table', 'none'],
            ['Recall fusion', 'one mmap read', 'vector call + payload', 'scan + filter', 'service call'],
            ['Per-tenant', 'a directory', 'a collection', 'a table', 'a namespace'],
            ['Infra', 'one file, no server', 'cluster', 'Postgres', 'SaaS'],
          ]}
        />
        <p>ICARUS is a <strong>vector + temporal + adjacency substrate</strong>, not a cognition layer. It deliberately does not implement typed graph edges, synthesis, or conflict resolution — those live above it. It replaces exactly one component: the <strong>vector store</strong>.</p>
      </Section>

      {/* full-bleed accent block (Mistral signature) */}
      <section className="px-0 py-0">
        <div className="px-6 py-20 md:py-28" style={{ background: EMBER }}>
          <div className="mx-auto max-w-[1100px]">
            <p className="font-['Space_Grotesk'] text-3xl font-semibold leading-tight text-white md:text-5xl">
              Build it, don’t buy it —<br />when you know exactly what you’re storing.
            </p>
            <p className="mt-5 max-w-xl text-[16px] text-white/85">
              The format is frozen in an RFC: magic, every field offset, the four file formats, the six invariants — published before the code, so the layout is the contract.
            </p>
            <a href="/research" className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-[14px] font-semibold text-white no-underline transition-transform hover:scale-[1.02]">
              More SINGULANCE research <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* footer strip */}
      <footer className="border-t py-10" style={{ borderColor: BORDER }}>
        <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-6 text-[13px] text-[#8a8a82] md:flex-row md:items-center md:justify-between">
          <span>ICARUS — the memory filesystem inside HIVEMIND. Apache-2.0.</span>
          <span className="font-mono uppercase tracking-wider">SINGULANCE Research · 2026</span>
        </div>
      </footer>
    </div>
  );
};

export default IcarusResearch;
