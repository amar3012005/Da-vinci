import React, { Suspense, lazy, useEffect, useState } from 'react';
import NewsArticleLayout, { H2, P, Table, FullBleed } from './research/NewsArticleLayout';
import InteractiveByteSlot from './research/InteractiveByteSlot';

const IcarusHeroScene = lazy(() => import('./research/three/IcarusHeroScene'));

const useMotionOk = () => {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOk(window.matchMedia('(min-width: 768px)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  return ok;
};

/**
 * ICARUS — SINGULANCE's memory filesystem (mneme engine, .amr format).
 * Rendered in the Mistral news-article style. Hero background swaps via HERO_IMG.
 */
const HERO_IMG = '/research-icarus-hero.png'; // drop the background image here to swap

const IcarusResearch = () => {
  const motionOk = useMotionOk();
  return (
  <NewsArticleLayout
    badge="Research · v2"
    title="ICARUS v2 — the whole memory database in one file"
    date="June 26, 2026"
    author="SINGULANCE Labs"
    heroImg={HERO_IMG}
    heroScene={motionOk ? <Suspense fallback={null}><IcarusHeroScene /></Suspense> : null}
    seo={{
      title: 'ICARUS v2 — The Whole Agent-Memory Database in One File | SINGULANCE Research',
      description: "ICARUS v2: the .amr format graduated from a vector-store replacement to the entire agent-memory database — semantic + entity + bi-temporal + typed graph + the full relational subgraph — in one mmap'd file per tenant. A live tenant now runs with its memory cortex entirely off Postgres, validated on a real corpus, zero servers.",
      canonical: 'https://singulancelabs.com/research/icarus',
    }}
    product={{ name: 'ICARUS', tag: '.amr format · v2', desc: 'The whole agent-memory database in one mmap’d file per tenant — vector, typed graph, and relational, no Postgres, no server.' }}
    highlights={[
      'A live production tenant now runs its entire memory cortex off Postgres — 12 relational tables, the graph, and the vectors, all in .amr + sidecars. Zero Postgres rows for that tenant.',
      'Validated on a real corpus (the SOLVIS engagement, 20 documents): 584 memories + 1,701 entity mentions + 879 derivations ingested with zero foreign-key, embedding, or promotion errors.',
      'Production-equivalent recall: 99.8% top-10 overlap vs a live Qdrant on real production data.',
      '7.5× smaller storage (~600 B per memory), 32× vector compression, one file per tenant — embedded, in-process, zero servers.',
    ]}
  >
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

    <H2>v2 — from vector store to the whole database</H2>
    <P>v1 replaced exactly one component: the vector store. v2 asks the harder question — <em>why keep Postgres at all?</em> In a real agent-memory system the <code className="rounded bg-[#efeee8] px-1.5 py-0.5 font-mono text-[13px]">memory</code> row is a relational hub: a dozen tables (source provenance, versions, project links, derivations, evidence links, entity mentions, the typed-relationship graph) foreign-key to it. Moving only the vectors out leaves that hub — and its operational weight — in Postgres.</P>
    <P>v2 moves the <strong>entire subgraph</strong> into the file. Memories and their typed-edge graph live in the <code className="rounded bg-[#efeee8] px-1.5 py-0.5 font-mono text-[13px]">.amr</code> shard; the FK-child tables become per-model sidecars in the same per-tenant bundle. A drop-in store router resolves each query by tenant and sends that one tenant’s memory traffic to the file instead of Postgres — every other tenant is byte-for-byte unchanged. Because nothing off-Postgres enforces foreign keys, the relational hub leaves the database cleanly; the typed graph it was said to <em>not</em> implement is now inline adjacency in the slot itself.</P>

    <H2>Proof on a live tenant, real corpus</H2>
    <P>v2 is not a benchmark harness — it is wired into a live production deployment, flag-gated to a single tenant, instantly reversible. That tenant’s real engagement corpus (the SOLVIS account — 20 documents: pitch decks, white papers, personas, brand manuals) was ingested through the unchanged production pipeline.</P>
    <Table head={['Result', 'Value']} rows={[
      ['Postgres rows for the tenant (memory + 12 child tables)', '0'],
      ['Ingest errors (foreign-key / embedding / promotion)', '0'],
      ['Memories generated → .amr', '584'],
      ['Entity mentions / derivations / versions → sidecars', '1,701 / 879 / 584'],
      ['Recall served from', '.amr (in-process, no Postgres, no Qdrant for this tenant)'],
      ['Blast radius / rollback', 'one tenant · flip a flag'],
    ]} />
    <P>The whole memory cortex of a production tenant — records, versions, provenance, the derivation chain, the entity index, and the typed relationship graph — now lives in one mmap’d bundle and is served in-process. Postgres is touched zero times for that tenant.</P>

    <H2>What it is — and isn’t</H2>
    <P>v1 was a vector + temporal + adjacency substrate that replaced one component. v2 is the <strong>complete agent-memory database</strong> for a tenant: vector, bi-temporal, typed graph, and the relational subgraph, in one file, with no Postgres and no server in the path. What still lives above it is cognition — synthesis, conflict resolution, the dreaming loop — by design; ICARUS is the store, not the mind. The byte layout remains frozen in an RFC — magic, every field offset, the file formats, the invariants — published before the code, so the layout stays the contract.</P>
  </NewsArticleLayout>
  );
};

export default IcarusResearch;
