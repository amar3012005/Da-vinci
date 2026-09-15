import React, { useState } from 'react';
import { Check } from 'lucide-react';
import NewsArticleLayout, { H2, P, Table } from './research/NewsArticleLayout';

/**
 * Benchmark — singulancelabs.com/benchmark. Same Mistral-news editorial
 * frame as /research/icarus, built around the published LongMemEval score
 * and the retrieval metrics HIVEMIND's Evaluation surface tracks.
 */

const EMBER = '#FF5229';
const BLUE = '#117dff';
const BORDER = '#E4E3DE';

/* ── headline metric bars — interactive, click to inspect ───────────── */
const METRICS = [
  { id: 'longmemeval', label: 'LongMemEval', value: 87.2, unit: '%', detail: 'Overall accuracy on LongMemEval — the industry-standard benchmark for long-context conversational memory. Single-session and multi-session recall, temporal reasoning, and knowledge-update questions, evaluated end-to-end against the published hypothesis format.', accent: true },
  { id: 'p5', label: 'P@5', value: 91, unit: '%', detail: 'Precision at 5 — of the top 5 memories returned for a query, the fraction that are actually relevant. Measured continuously via the in-app retrieval benchmark (Evaluation surface).' },
  { id: 'r10', label: 'R@10', value: 88, unit: '%', detail: 'Recall at 10 — of all relevant memories that exist for a query, the fraction surfaced within the top 10 results.' },
  { id: 'ndcg', label: 'NDCG@10', value: 0.89, unit: '', detail: 'Normalized Discounted Cumulative Gain — rewards relevant results appearing higher in the ranking, not just present somewhere in the top 10.' },
  { id: 'mrr', label: 'MRR', value: 0.85, unit: '', detail: 'Mean Reciprocal Rank — how close to position 1 the first relevant result lands, averaged across the eval set.' },
];

const MetricBars = () => {
  const [active, setActive] = useState('longmemeval');
  const m = METRICS.find((x) => x.id === active);
  const max = Math.max(...METRICS.map((x) => (x.unit === '%' ? x.value : x.value * 100)));
  return (
    <div className="my-10">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#8a8a82]">retrieval quality — click a metric</span>
        <span className="font-mono text-[11px] text-[#a3a3a3]">singulancelabs.com/benchmark</span>
      </div>
      <div className="flex items-end gap-3 overflow-x-auto rounded-lg border p-4 sm:p-6" style={{ borderColor: BORDER, background: '#fff' }}>
        {METRICS.map((met) => {
          const pct = met.unit === '%' ? met.value : met.value * 100;
          const isActive = met.id === active;
          return (
            <button
              key={met.id}
              onClick={() => setActive(met.id)}
              onMouseEnter={() => setActive(met.id)}
              className="group flex w-16 shrink-0 flex-col items-center gap-2 bg-transparent sm:w-auto sm:flex-1"
            >
              <span className="font-mono text-[11px] font-semibold" style={{ color: isActive ? EMBER : '#8a8a82' }}>
                {met.unit === '%' ? `${met.value}%` : met.value.toFixed(2)}
              </span>
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{
                  height: `${Math.max(24, (pct / max) * 130)}px`,
                  background: isActive ? EMBER : met.accent ? '#FF522933' : '#e7e4dd',
                }}
              />
              <span className={`font-mono text-[10px] uppercase tracking-wide ${isActive ? 'text-[#0a0a0a]' : 'text-[#a3a3a3]'}`}>{met.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border p-4" style={{ borderColor: BORDER, background: '#fbfbf8' }}>
        <div className="flex items-baseline gap-3">
          <span className="font-['Space_Grotesk'] text-[15px] font-semibold text-[#0a0a0a]">{m.label}</span>
          <span className="rounded px-2 py-0.5 font-mono text-[11px] font-semibold" style={{ background: '#FF522915', color: EMBER }}>
            {m.unit === '%' ? `${m.value}%` : m.value.toFixed(2)}
          </span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-[#4a4a44]">{m.detail}</p>
      </div>
    </div>
  );
};

/* ── comparison table ────────────────────────────────────────────────── */
const COMPARE_HEAD = ['Metric', 'HIVEMIND', 'Keyword search', 'Naive vector RAG'];
const COMPARE_ROWS = [
  ['LongMemEval accuracy', '87.2%', '41.3%', '68.9%'],
  ['Recall latency (p50)', '<50ms', '~120ms', '~200ms'],
  ['Multi-session reasoning', 'Native', 'None', 'Partial'],
  ['Temporal / bi-temporal queries', 'Native', 'None', 'None'],
  ['Contradiction resolution', 'Automatic', 'None', 'Manual'],
];

/* ── gate strip — how the number is kept honest ─────────────────────── */
const GATES = [
  { id: 'g1', title: 'Published methodology', detail: 'LongMemEval question set + evaluation harness are public. Anyone can re-run the exact same questions against the exact same corpus.' },
  { id: 'g2', title: 'No cherry-picked runs', detail: 'The reported score is the full-set average, not a best-of-N run. Regressions below the pass/fail gate block deploys.' },
  { id: 'g3', title: 'Live regression gate', detail: 'Every recall-path change re-runs the retrieval benchmark (P@5 / R@10 / NDCG@10 / MRR) before shipping — a regression fails the gate, not the customer.' },
  { id: 'g4', title: 'Reproducible on your data', detail: 'The same Evaluation surface ships inside every HIVEMIND workspace — run the benchmark against your own memories, not just ours.' },
];

const GateStrip = () => (
  <div className="my-10 grid gap-4 sm:grid-cols-2">
    {GATES.map((g) => (
      <div key={g.id} className="rounded-lg border p-4" style={{ borderColor: BORDER, background: '#fff' }}>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: '#0fa36b1a' }}>
            <Check size={12} style={{ color: '#0fa36b' }} />
          </span>
          <span className="font-['Space_Grotesk'] text-[14px] font-semibold text-[#0a0a0a]">{g.title}</span>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#4a4a44]">{g.detail}</p>
      </div>
    ))}
  </div>
);

const BenchmarkResearch = () => (
  <NewsArticleLayout
    badge="Benchmark"
    title="87.2% on LongMemEval. Published. Reproducible."
    date="Jun 26, 2026"
    author="SINGULANCE Labs"
    seo={{
      title: 'HIVEMIND Benchmark — LongMemEval 87.2% | SINGULANCE',
      description: 'HIVEMIND scores 87.2% on LongMemEval, the industry-standard long-context memory benchmark — published methodology, live regression gates, sub-50ms recall.',
      canonical: 'https://singulancelabs.com/benchmark',
    }}
    product={{ name: 'HIVEMIND', tag: 'Evaluation', desc: 'The Evaluation surface inside every HIVEMIND workspace — health, retrieval benchmarks, and A/B regression gates, live.' }}
    highlights={[
      '87.2% accuracy on LongMemEval — single-session, multi-session, temporal, and knowledge-update questions',
      'Sub-50ms recall latency at production scale, measured continuously',
      'Live retrieval benchmark (P@5 / R@10 / NDCG@10 / MRR) with pass/fail regression gates before every deploy',
      'Methodology and question set are public — reproducible by anyone, on your own memories too',
    ]}
  >
    <MetricBars />

    <H2>What LongMemEval actually tests</H2>
    <P>
      LongMemEval is the benchmark long-context memory systems get judged against — not a synthetic
      retrieval toy, but multi-session conversational histories with single-session questions,
      multi-session reasoning, temporal reasoning across sessions, and knowledge-update questions where
      an earlier fact is later corrected. A system that only does keyword lookup or flat vector similarity
      collapses on the multi-session and temporal categories. HIVEMIND's bi-temporal graph — memories
      that update, extend, derive from, and contradict each other with typed relationships — is built for
      exactly this shape of question.
    </P>

    <GateStrip />

    <H2>HIVEMIND vs. the alternatives</H2>
    <P>
      Keyword search fails the moment a question is phrased differently from the source text. Naive
      vector RAG improves recall but has no concept of time, contradiction, or multi-hop reasoning across
      sessions — it retrieves chunks, not a coherent memory. The gap widens exactly where enterprise
      memory matters most: knowing what changed, when, and why.
    </P>
    <Table head={COMPARE_HEAD} rows={COMPARE_ROWS} />

    <H2>Run it yourself</H2>
    <P>
      The published run lives at{' '}
      <a href="https://singulancelabs.com/benchmark" className="font-medium" style={{ color: BLUE }}>
        singulancelabs.com/benchmark
      </a>
      . Every HIVEMIND workspace — personal, managed, or self-hosted — ships the same Evaluation
      surface: health overview, an interactive search tester with confidence and relevance scoring, and
      the retrieval benchmark itself. Don't take the number on faith — point it at your own memory and
      watch the gate run.
    </P>
  </NewsArticleLayout>
);

export default BenchmarkResearch;
