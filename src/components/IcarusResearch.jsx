import React from 'react';
import NewsArticleLayout, { H2, P, Table } from './research/NewsArticleLayout';

/**
 * ICARUS — SINGULANCE's memory filesystem (mneme engine, .amr format).
 * Rendered in the Mistral news-article style. Hero background swaps via HERO_IMG.
 */
const HERO_IMG = '/research-icarus-hero.png'; // drop the background image here to swap

const IcarusResearch = () => (
  <NewsArticleLayout
    badge="Research"
    title="Introducing ICARUS"
    date="June 24, 2026"
    author="SINGULANCE Labs"
    heroImg={HERO_IMG}
    seo={{
      title: 'ICARUS — A Memory Filesystem for AI Agents | SINGULANCE Research',
      description: "ICARUS is SINGULANCE's memory filesystem: the .amr byte layout co-locates embedding, entity bitmap, bi-temporal anchors, and graph adjacency in one fixed-stride slot. Equal recall to a live vector DB, 7.5× smaller storage, 32× compression, zero servers.",
      canonical: 'https://singulancelabs.com/research/icarus',
    }}
    product={{ name: 'ICARUS', tag: '.amr format', desc: 'A memory filesystem for AI agents — one mmap’d file per tenant, no server.' }}
    highlights={[
      'Production-equivalent recall: 99.8% top-10 overlap vs a live Qdrant on real production data.',
      '7.5× smaller storage (~600 B per memory) and 32× vector compression with no recall loss.',
      'Semantic + entity + bi-temporal + graph recall served from a single mmap read.',
      'One file per tenant — embedded, in-process, zero servers to operate.',
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
    <P>Every memory is a fixed-stride <strong>202-byte slot</strong>; slot <em>i</em> lives at a computable offset — no index lookup to find a record. The frozen, little-endian layout:</P>
    <Table head={['Offset', 'Size', 'Field', 'Purpose']} rows={[
      ['0', '4', 'id', 'stable slot id (never renumbered)'],
      ['4', '2', 'flags', 'TOMBSTONE · PQ_TRAINED · TEXT_INLINE · GRAPH_DIRTY'],
      ['6', '8', 'created_at', 'ingestion time — bi-temporal axis 1 (ns)'],
      ['14', '8', 'valid_from', 'fact validity — bi-temporal axis 2 (ns)'],
      ['22', '12', 'text_ptr / lens', 'offset + LZ4 + raw length into the text region'],
      ['34', '128', 'vector_pq', '1024-dim embedding → 128 B via Product Quantization (32×)'],
      ['162', '8', 'entity_bitmap', '64 canonical entities, 1 bit each → O(1) AND filter'],
      ['170', '32', 'adjacency', '8 graph-neighbour slot ids inline → no join'],
    ]} />
    <P>The embedding is inline (PQ-compressed, not a foreign key); the entity filter is a single bitwise AND; bi-temporal anchors are inline i64s; graph adjacency is inline — a 2-hop traversal is pointer-following within the same mmap, never a join. One slot carries everything a recall needs.</P>

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
  </NewsArticleLayout>
);

export default IcarusResearch;
