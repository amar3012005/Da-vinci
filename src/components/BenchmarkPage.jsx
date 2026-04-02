import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Menu, X, ArrowLeft, Brain, Network, Layers, Search,
  Database, Cpu, GitBranch, Zap, Clock, Users, MessageSquare
} from 'lucide-react';

/* ─── Navbar ─── */
const BenchmarkNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const sections = [
    { label: 'Results', id: 'results' },
    { label: 'LongMemEval', id: 'longmemeval' },
    { label: 'Architecture', id: 'architecture' },
    { label: 'Engine', id: 'engine' },
  ];

  return (
    <>
      <nav className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${scrolled ? 'bg-[#faf9f4]/90 backdrop-blur-xl border-b border-[#e3e0db]' : 'bg-transparent'}`}>
        <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">
          <div className="px-6 h-16 flex items-center justify-between">
            <button onClick={() => navigate('/hivemind')} className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer">
              <img src="/images/davinci-logo.svg" alt="Da Vinci" className="h-5" />
              <span className="text-[#0a0a0a]/30 text-lg font-light">|</span>
              <span className="text-lg font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk']">Benchmark</span>
            </button>
            <div className="hidden md:flex items-center gap-8">
              {sections.map((s) => (
                <button key={s.id} onClick={() => scrollTo(s.id)}
                  className="text-sm font-medium text-[#525252] hover:text-[#117dff] transition-colors bg-transparent border-none cursor-pointer">
                  {s.label}
                </button>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => navigate('/hivemind')}
                className="flex items-center gap-1.5 text-sm font-medium text-[#525252] hover:text-[#0a0a0a] transition-colors px-4 py-2 rounded-lg border border-[#e3e0db] hover:border-[#d4d0ca] bg-white cursor-pointer">
                <ArrowLeft size={14} /> Home
              </button>
            </div>
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[#525252] bg-transparent border-none cursor-pointer">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>
      {mobileOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[99] bg-[#faf9f4]/95 backdrop-blur-xl md:hidden">
          <div className="pt-24 px-8 flex flex-col gap-2">
            {sections.map((s, i) => (
              <motion.button key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => scrollTo(s.id)}
                className="text-left text-2xl font-medium text-[#0a0a0a] hover:text-[#117dff] py-3 border-b border-[#e3e0db] bg-transparent border-x-0 border-t-0 cursor-pointer">
                {s.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </>
  );
};

/* ─── Helpers ─── */
const Section = ({ id, children, className = '', bg = '' }) => (
  <section id={id} className={`border-b border-[#e3e0db] ${bg} ${className}`}>
    <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 md:px-10 lg:px-20">{children}</div>
  </section>
);

const FadeUp = ({ children, delay = 0, className = '' }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }} transition={{ duration: 0.4, ease: 'easeOut', delay }} className={className}>
    {children}
  </motion.div>
);

/* ─── Vertical Bar Chart ─── */
const BarChart = ({ categories }) => {
  const maxVal = 100;
  const barColors = {
    'Single-Session Asst': '#117dff',
    'Single-Session User': '#117dff',
    'Temporal Reasoning': '#8b5cf6',
    'Single-Session Pref': '#d97706',
    'Knowledge Update': '#0891b2',
    'Multi-Session': '#16a34a',
  };

  return (
    <div className="flex items-end justify-between gap-3 md:gap-6 h-[280px] md:h-[340px]">
      {categories.map((c, i) => (
        <div key={c.category} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          {/* Value label */}
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="text-sm md:text-base font-mono font-bold text-[#0a0a0a]"
          >
            {c.score}%
          </motion.span>
          {/* Bar */}
          <div className="w-full max-w-[64px] relative rounded-t-lg overflow-hidden bg-[#f3f1ec]" style={{ height: '100%' }}>
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${(c.score / maxVal) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
              className="absolute bottom-0 left-0 right-0 rounded-t-lg"
              style={{ backgroundColor: barColors[c.category] || '#117dff' }}
            />
          </div>
          {/* Label */}
          <span className="text-[10px] md:text-xs font-['Space_Grotesk'] font-medium text-[#525252] text-center leading-tight h-8">
            {c.category}
          </span>
          {/* Engine tag */}
          <span className="text-[8px] md:text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3] px-1.5 py-0.5 rounded bg-[#f3f1ec] border border-[#e3e0db] text-center leading-tight">
            {c.engine}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════ */
/*            BENCHMARK PAGE                */
/* ════════════════════════════════════════ */

const BenchmarkPage = () => {
  const categories = [
    { category: 'Single-Session Asst', score: 100, engine: 'Recall + Facts' },
    { category: 'Single-Session User', score: 97.1, engine: 'Fact Extraction' },
    { category: 'Temporal Reasoning', score: 87.2, engine: 'Bi-Temporal' },
    { category: 'Single-Session Pref', score: 83.3, engine: 'Operator Layer' },
    { category: 'Knowledge Update', score: 79.5, engine: 'Predict-Calibrate' },
    { category: 'Multi-Session', score: 75.9, engine: 'Graph Expansion' },
  ];

  const overall = (categories.reduce((sum, c) => sum + c.score, 0) / categories.length).toFixed(1);

  return (
    <div className="min-h-screen bg-[#faf9f4]">
      <BenchmarkNavbar />

      {/* ── HERO ── */}
      <Section id="hero" className="pt-28 pb-16 lg:pt-36 lg:pb-24 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#117dff]/[0.04] rounded-full blur-[150px] pointer-events-none" />
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <FadeUp>
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="px-3 py-1 text-xs font-mono uppercase tracking-widest text-[#117dff] bg-[#117dff]/[0.06] border border-[#117dff]/20 rounded-full">
                LongMemEval-S
              </span>
              <span className="text-xs font-mono text-[#a3a3a3]">500 questions / 6 categories</span>
            </div>
          </FadeUp>
          <FadeUp delay={0.08}>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-2">
              <span className="text-[#117dff]">{overall}%</span>
            </h1>
            <p className="text-xl md:text-2xl font-medium text-[#525252] mb-8">
              overall accuracy on the standard benchmark for long-term memory systems
            </p>
          </FadeUp>
          <FadeUp delay={0.14}>
            <p className="text-sm text-[#a3a3a3] max-w-lg mx-auto leading-relaxed">
              Every score below is powered by the HIVEMIND memory engine — fact extraction, semantic graph, temporal indexing, and type-specific retrieval working together.
            </p>
          </FadeUp>
        </div>
      </Section>

      {/* ── RESULTS — Vertical Bar Chart ── */}
      <Section id="results" bg="bg-white">
        <div className="py-16 lg:py-24">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">Results</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-3">
              Score by category
            </h2>
            <p className="text-sm text-[#525252] mb-10 max-w-xl">
              Each category tests a different memory capability. The tag below each bar shows which HIVEMIND engine component is primarily responsible for that score.
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-2xl p-6 md:p-10">
              <BarChart categories={categories} />
            </div>
          </FadeUp>
          <FadeUp delay={0.4}>
            <div className="flex flex-wrap gap-4 mt-8 justify-center">
              {[
                { label: 'Overall', value: `${overall}%`, accent: true },
                { label: 'Questions', value: '500' },
                { label: 'Categories', value: '6' },
                { label: 'Embedding', value: 'bge-m3 1024d' },
              ].map(s => (
                <div key={s.label} className={`px-5 py-3 rounded-xl border ${s.accent ? 'bg-[#117dff]/[0.06] border-[#117dff]/20' : 'bg-white border-[#e3e0db]'}`}>
                  <span className={`text-lg font-bold font-mono ${s.accent ? 'text-[#117dff]' : 'text-[#0a0a0a]'}`}>{s.value}</span>
                  <span className="text-xs text-[#a3a3a3] ml-2 font-mono uppercase">{s.label}</span>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── WHAT IS LONGMEMEVAL ── */}
      <Section id="longmemeval">
        <div className="py-16 lg:py-24">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">The Benchmark</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-6">
              What is LongMemEval?
            </h2>
          </FadeUp>
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <FadeUp delay={0.05}>
              <div className="space-y-5">
                <p className="text-base text-[#525252] leading-relaxed">
                  LongMemEval is the standard evaluation framework for testing whether an AI memory system can accurately recall information from long conversational histories. It was designed to test the capabilities that matter in production: remembering what users said, tracking how information changes, and connecting facts across separate conversations.
                </p>
                <p className="text-base text-[#525252] leading-relaxed">
                  The benchmark consists of 500 questions spanning six categories, each testing a distinct memory capability. Unlike simple retrieval benchmarks, LongMemEval embeds answers within multi-turn conversations containing over 115,000 tokens of context — creating realistic "needle in a haystack" scenarios.
                </p>
                <p className="text-base text-[#525252] leading-relaxed">
                  What makes LongMemEval particularly rigorous is its evaluation method: an LLM judge compares the system's answer against the ground truth, allowing for semantic equivalence rather than exact string matching. This means a system must truly understand the information, not just locate keywords.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={0.12}>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Why it matters</h3>
                <div className="space-y-3">
                  {[
                    { icon: MessageSquare, text: 'Tests real human-AI conversation patterns, not synthetic data' },
                    { icon: Clock, text: 'Evaluates temporal reasoning — can the system understand when events happened?' },
                    { icon: GitBranch, text: 'Tests knowledge updates — when facts change, does the system track the latest version?' },
                    { icon: Users, text: 'Multi-session coverage — can it connect information across separate conversations?' },
                    { icon: Brain, text: 'Preference tracking — does the system remember what users care about?' },
                    { icon: Search, text: 'Abstention — can it correctly say "I don\'t know" when information isn\'t available?' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-[#e3e0db]">
                      <div className="w-8 h-8 rounded-lg bg-[#117dff]/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <item.icon size={14} className="text-[#117dff]" />
                      </div>
                      <span className="text-sm text-[#525252] leading-relaxed">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </Section>

      {/* ── HOW HIVEMIND SCORES — Engine Attribution ── */}
      <Section id="architecture" bg="bg-white">
        <div className="py-16 lg:py-24">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">Architecture</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-3">
              How each score is earned
            </h2>
            <p className="text-sm text-[#525252] mb-10 max-w-xl">
              Every category in LongMemEval maps to a specific engine capability. Here is which part of HIVEMIND is responsible for each.
            </p>
          </FadeUp>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { score: '100%', category: 'Single-Session Assistant', engine: 'Recall + Fact Injection', icon: Search,
                desc: 'Atomic facts extracted from each conversation, embedded independently, and injected as focused context. The LLM sees the exact answer, not a wall of text.' },
              { score: '97.1%', category: 'Single-Session User', engine: 'Fact Extraction Pipeline', icon: Layers,
                desc: 'MemoryProcessor extracts user statements as exact quotes. Each quote becomes a searchable fact-memory with its own embedding vector.' },
              { score: '87.2%', category: 'Temporal Reasoning', engine: 'Bi-Temporal Engine', icon: Clock,
                desc: 'Every memory carries both document_date (when stored) and event_dates (when it happened). Time-aware retrieval enables precise date arithmetic.' },
              { score: '83.3%', category: 'Single-Session Preference', engine: 'Operator Layer', icon: Brain,
                desc: 'Intent detection identifies preference queries and dynamically boosts opinion/preference memory types in the ranking algorithm.' },
              { score: '79.5%', category: 'Knowledge Update', engine: 'Predict-Calibrate', icon: GitBranch,
                desc: 'When new information contradicts old, the engine creates Updates relationships and marks superseded versions. Retrieval surfaces the latest version.' },
              { score: '75.9%', category: 'Multi-Session', engine: 'Graph Expansion', icon: Network,
                desc: 'Memories are connected via typed relationships (Updates, Extends, Derives). Graph traversal discovers related information across sessions.' },
            ].map((item, i) => (
              <FadeUp key={item.category} delay={i * 0.06}>
                <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center">
                      <item.icon size={16} className="text-[#117dff]" />
                    </div>
                    <span className="text-2xl font-bold font-mono text-[#117dff]">{item.score}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mb-1">{item.category}</h3>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#117dff] bg-[#117dff]/[0.06] px-2 py-0.5 rounded self-start mb-3">
                    {item.engine}
                  </span>
                  <p className="text-sm text-[#525252] leading-relaxed flex-1">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </Section>

      {/* ── ENGINE CAPABILITIES ── */}
      <Section id="engine">
        <div className="py-16 lg:py-24">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">Beyond Retrieval</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-3">
              What benchmarks don't measure
            </h2>
            <p className="text-sm text-[#525252] mb-10 max-w-xl">
              LongMemEval tests retrieval accuracy at a point in time. HIVEMIND's real value is that it gets smarter over time — capabilities no benchmark captures yet.
            </p>
          </FadeUp>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { title: 'Self-Improving Agents', desc: 'Three resident agents (Faraday, Feynman, Turing) continuously scan, analyze, and repair the knowledge graph. Duplicates get merged, stale truths get linked, patterns get promoted.', icon: Brain },
              { title: 'Graph Self-Repair', desc: 'Turing executes verified graph actions: merge duplicates, link update chains, suppress noise, promote risks. Second scan finds zero new anomalies — the graph heals itself.', icon: Network },
              { title: 'Cross-Project Connections', desc: 'Faraday detects related memories across different projects and creates semantic links between them. Knowledge doesn\'t stay siloed.', icon: Layers },
              { title: 'EU Data Sovereignty', desc: 'All data stored in Frankfurt, Germany. GDPR-compliant by architecture, not by policy. No US data transfer. Full encryption at rest and in transit.', icon: Database },
            ].map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.06}>
                <div className="bg-white border border-[#e3e0db] rounded-xl p-6 hover:border-[#d4d0ca] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center mb-4">
                    <item.icon size={16} className="text-[#117dff]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#525252] leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <section className="border-b-0">
        <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 py-16 text-center">
          <FadeUp>
            <p className="text-lg font-medium text-[#0a0a0a] font-['Space_Grotesk'] mb-2">
              Intelligence without memory is just randomness.
            </p>
            <p className="text-sm text-[#a3a3a3] mb-6">
              HIVEMIND — EU-hosted, GDPR-compliant, self-improving.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => window.location.href = '/hivemind/login'}
                className="px-6 py-3 bg-[#117dff] text-white text-sm font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors cursor-pointer border-none uppercase tracking-wider">
                Get Started
              </button>
              <button onClick={() => window.location.href = '/research'}
                className="px-6 py-3 bg-white text-[#0a0a0a] text-sm font-medium rounded-lg border border-[#e3e0db] hover:border-[#d4d0ca] transition-colors cursor-pointer">
                Read Research
              </button>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
};

export default BenchmarkPage;
