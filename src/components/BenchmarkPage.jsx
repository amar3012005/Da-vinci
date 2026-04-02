import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Menu, X, ArrowLeft, Brain, Network, Layers, Search,
  CheckCircle2, XCircle, Database, Cpu,
  GitBranch, Zap
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
    { label: 'Overview', id: 'overview' },
    { label: 'LongMemEval', id: 'longmemeval' },
    { label: 'Architecture', id: 'architecture' },
    { label: 'Results', id: 'results' },
    { label: 'Comparison', id: 'comparison' },
  ];

  return (
    <>
      <nav className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${scrolled ? 'bg-[#faf9f4]/90 backdrop-blur-xl border-b border-[#e3e0db]' : 'bg-transparent'}`}>
        <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">
          <div className="px-6 h-16 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer">
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
              <button onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-sm font-medium text-[#525252] hover:text-[#0a0a0a] transition-colors px-4 py-2 rounded-lg border border-[#e3e0db] hover:border-[#d4d0ca] bg-white cursor-pointer">
                <ArrowLeft size={14} /> Home
              </button>
            </div>
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[#525252] hover:text-[#0a0a0a] bg-transparent border-none cursor-pointer">
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
            <button onClick={() => { setMobileOpen(false); navigate('/'); }}
              className="mt-8 w-full py-3.5 rounded-lg border border-[#e3e0db] text-[#0a0a0a] font-medium text-base bg-white cursor-pointer flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Back to Home
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
};

/* ─── Reusable helpers ─── */
const Section = ({ id, children, className = '', border = true }) => (
  <section id={id} className={`${border ? 'border-b border-[#e3e0db]' : ''} ${className}`}>
    <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 md:px-10 lg:px-20">{children}</div>
  </section>
);

const FadeUp = ({ children, delay = 0, className = '' }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }} transition={{ duration: 0.35, ease: 'easeOut', delay }} className={className}>
    {children}
  </motion.div>
);

const Pill = ({ children }) => (
  <span className="px-4 py-2 text-sm font-semibold text-[#0a0a0a] bg-white border border-[#e3e0db] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
    {children}
  </span>
);

/* ─── Score Bar ─── */
const ScoreRow = ({ category, hivemind, supermemory, delay = 0 }) => {
  const diff = hivemind - supermemory;
  const color = diff > 2 ? '#22c55e' : diff >= -2 ? '#f59e0b' : '#ef4444';
  return (
    <FadeUp delay={delay}>
      <div className="grid grid-cols-[1fr_100px_100px_1fr] md:grid-cols-[200px_1fr_80px_80px] items-center gap-4 py-4 border-b border-[#e3e0db] last:border-b-0">
        <span className="text-sm font-medium text-[#0a0a0a]">{category}</span>
        <div className="hidden md:block">
          <div className="relative h-6 bg-[#f5f3ee] rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} whileInView={{ width: `${hivemind}%` }}
              viewport={{ once: true }} transition={{ duration: 0.8, delay: delay + 0.2 }}
              className="absolute inset-y-0 left-0 rounded-full" style={{ backgroundColor: color }} />
          </div>
        </div>
        <span className="text-sm font-mono font-semibold text-[#0a0a0a] text-right">{hivemind}%</span>
        <span className="text-sm font-mono text-[#a3a3a3] text-right">{supermemory}%</span>
      </div>
    </FadeUp>
  );
};

/* ─── Feature Comparison Row ─── */
const FeatureRow = ({ feature, hivemind, supermemory, delay = 0 }) => (
  <FadeUp delay={delay}>
    <div className="grid grid-cols-[1fr_80px_80px] items-center gap-4 py-4 border-b border-[#e3e0db] last:border-b-0">
      <span className="text-sm font-medium text-[#0a0a0a]">{feature}</span>
      <div className="flex justify-center">
        {hivemind ? <CheckCircle2 size={18} className="text-[#22c55e]" /> : <XCircle size={18} className="text-[#d4d0ca]" />}
      </div>
      <div className="flex justify-center">
        {supermemory ? <CheckCircle2 size={18} className="text-[#22c55e]" /> : <XCircle size={18} className="text-[#d4d0ca]" />}
      </div>
    </div>
  </FadeUp>
);

/* ════════════════════════════════════════ */
/*            BENCHMARK PAGE                */
/* ════════════════════════════════════════ */

const BenchmarkPage = () => {
  const categories = [
    { category: 'Single-Session Asst', hivemind: 100, supermemory: 96.4 },
    { category: 'Single-Session User', hivemind: 97.1, supermemory: 97.1 },
    { category: 'Temporal Reasoning', hivemind: 85, supermemory: 76.7 },
    { category: 'Single-Session Pref', hivemind: 83.3, supermemory: 70.0 },
    { category: 'Multi-Session', hivemind: 75.9, supermemory: 71.4 },
    { category: 'Knowledge Update', hivemind: 70.5, supermemory: 88.5 },
  ];

  const features = [
    { feature: 'Self-improving agents (Faraday / Turing / Feynman)', hivemind: true, supermemory: false },
    { feature: 'Graph self-repair & conflict resolution', hivemind: true, supermemory: false },
    { feature: 'Cross-project semantic connections', hivemind: true, supermemory: false },
    { feature: 'Decision intelligence & blueprint mining', hivemind: true, supermemory: false },
    { feature: 'EU data sovereignty (GDPR-compliant hosting)', hivemind: true, supermemory: false },
    { feature: 'Stigmergic agent coordination', hivemind: true, supermemory: false },
    { feature: 'Open-source memory layer', hivemind: false, supermemory: true },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f4]">
      <BenchmarkNavbar />

      {/* ── HERO ── */}
      <Section id="hero" className="pt-28 pb-20 lg:pt-36 lg:pb-28 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#117dff]/[0.04] rounded-full blur-[150px] pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <FadeUp>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 text-xs font-mono uppercase tracking-widest text-[#117dff] bg-[#117dff]/[0.06] border border-[#117dff]/20 rounded-full">
                Benchmark
              </span>
              <span className="text-xs font-mono text-[#a3a3a3]">LongMemEval-S / 2026</span>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-[#0a0a0a] font-['Space_Grotesk'] mb-6">
              HIVEMIND <span className="text-[#117dff]">Benchmark</span> Results
            </h1>
          </FadeUp>
          <FadeUp delay={0.15}>
            <p className="text-xl md:text-2xl font-medium text-[#525252] leading-relaxed mb-8">
              Proving memory intelligence with LongMemEval — the standard benchmark for long-term conversational memory systems.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="flex flex-wrap gap-3">
              <Pill>81% Overall</Pill>
              <Pill>100% Single-Session</Pill>
              <Pill>500 Questions</Pill>
              <Pill>6 Categories</Pill>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── OVERVIEW ── */}
      <Section id="overview">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[01] Platform</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10">
              What is <span className="text-[#117dff]">HIVEMIND</span>
            </h2>
          </FadeUp>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Brain, title: 'Self-Improving Memory', desc: 'Three resident AI agents (Faraday, Turing, Feynman) continuously validate, enrich, and consolidate your knowledge graph.' },
              { icon: Network, title: 'Semantic Knowledge Graph', desc: 'Every piece of information becomes a node with typed relationships, enabling cross-domain reasoning and contextual retrieval.' },
              { icon: Database, title: 'Universal Ingestion', desc: 'Connects to Gmail, Slack, GitHub, documents, and more. All sources feed into one unified memory layer.' },
              { icon: Search, title: 'Contextual Retrieval', desc: 'Retrieves with human-level understanding — not just keyword matching, but temporal, relational, and preference-aware recall.' },
            ].map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.08}>
                <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#d4d0ca] transition-colors h-full">
                  <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center mb-4">
                    <item.icon size={18} className="text-[#117dff]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#525252] leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </Section>

      {/* ── LONGMEMEVAL ── */}
      <Section id="longmemeval">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[02] The Benchmark</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-4">
              LongMemEval-S
            </h2>
          </FadeUp>
          <FadeUp delay={0.05}>
            <p className="text-lg text-[#525252] leading-relaxed mb-8 max-w-2xl">
              The standard evaluation suite for long-term conversational memory. 500 questions across 6 categories, testing whether a system can accurately recall information from extended conversation histories.
            </p>
          </FadeUp>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Temporal Reasoning', desc: 'Can the system reason about when events happened and their chronological order?' },
              { title: 'Knowledge Update', desc: 'When information changes over time, does the system track the latest version?' },
              { title: 'Multi-Session', desc: 'Can the system connect information mentioned across separate conversations?' },
              { title: 'Single-Session User', desc: 'Can the system recall specific facts the user mentioned in a conversation?' },
              { title: 'Single-Session Asst', desc: 'Can the system recall what it (the assistant) previously said?' },
              { title: 'Single-Session Pref', desc: 'Can the system remember user preferences expressed during conversation?' },
            ].map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.06}>
                <div className="bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                  <span className="text-xs font-mono text-[#117dff] mb-2 block">0{i + 1}</span>
                  <h4 className="text-base font-semibold text-[#0a0a0a] mb-1">{item.title}</h4>
                  <p className="text-sm text-[#525252] leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.4}>
            <p className="text-sm text-[#a3a3a3] mt-8">
              Used by Supermemory, MemGPT, and other leading memory systems for standardized evaluation.
            </p>
          </FadeUp>
        </div>
      </Section>

      {/* ── ARCHITECTURE ── */}
      <Section id="architecture">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[03] How We Score</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10">
              Retrieval <span className="text-[#117dff]">architecture</span>
            </h2>
          </FadeUp>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Layers, title: 'Fact-Augmented Key Expansion', desc: 'Each memory is decomposed into atomic facts. Facts are embedded independently, searched separately, then mapped back to their source context for full-fidelity retrieval.' },
              { icon: Cpu, title: 'bge-m3 Embeddings', desc: '1024-dimensional multilingual embeddings. Dense retrieval with cosine similarity over factSentences, giving precise semantic matching across languages.' },
              { icon: GitBranch, title: 'Contextual Embedding', desc: 'factSentences enrich the vector representation of each memory node. The embedding captures not just what was said, but the atomic meaning units within it.' },
              { icon: Zap, title: 'Type-Specific Routing', desc: 'Different question types trigger different retrieval strategies. Temporal queries use time-aware ranking. Preference queries boost user-stated facts. Multi-session queries widen the search window.' },
            ].map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.08}>
                <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                  <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center mb-4">
                    <item.icon size={18} className="text-[#117dff]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#525252] leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </Section>

      {/* ── RESULTS ── */}
      <Section id="results">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[04] Scores</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-4">
              Category-by-category <span className="text-[#117dff]">results</span>
            </h2>
          </FadeUp>
          <FadeUp delay={0.05}>
            <div className="bg-white border border-[#e3e0db] rounded-xl p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="grid grid-cols-[1fr_100px_100px_1fr] md:grid-cols-[200px_1fr_80px_80px] items-center gap-4 pb-3 border-b-2 border-[#e3e0db] mb-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[#a3a3a3]">Category</span>
                <span className="hidden md:block" />
                <span className="text-xs font-mono uppercase tracking-wider text-[#0a0a0a] text-right">HIVEMIND</span>
                <span className="text-xs font-mono uppercase tracking-wider text-[#a3a3a3] text-right">Supermem</span>
              </div>
              {categories.map((c, i) => (
                <ScoreRow key={c.category} {...c} delay={i * 0.06} />
              ))}
              <div className="grid grid-cols-[1fr_100px_100px_1fr] md:grid-cols-[200px_1fr_80px_80px] items-center gap-4 pt-4 mt-2 border-t-2 border-[#117dff]/30">
                <span className="text-sm font-bold text-[#0a0a0a]">Overall</span>
                <div className="hidden md:block" />
                <span className="text-sm font-mono font-bold text-[#117dff] text-right">81.0%</span>
                <span className="text-sm font-mono font-semibold text-[#a3a3a3] text-right">~83%</span>
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={0.4}>
            <p className="text-sm text-[#525252] mt-6 max-w-2xl">
              HIVEMIND leads in 4 of 6 categories. The Knowledge Update gap reflects a known fact-extraction bottleneck currently being addressed in the SOTA engine pipeline.
            </p>
          </FadeUp>
        </div>
      </Section>

      {/* ── COMPARISON ── */}
      <Section id="comparison">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[05] Beyond Scores</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-4">
              Feature <span className="text-[#117dff]">comparison</span>
            </h2>
            <p className="text-base text-[#525252] leading-relaxed mb-8 max-w-2xl">
              Benchmark scores measure retrieval accuracy. These capabilities determine whether a memory system can actually improve over time.
            </p>
          </FadeUp>
          <FadeUp delay={0.05}>
            <div className="bg-white border border-[#e3e0db] rounded-xl p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="grid grid-cols-[1fr_80px_80px] items-center gap-4 pb-3 border-b-2 border-[#e3e0db] mb-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[#a3a3a3]">Capability</span>
                <span className="text-xs font-mono uppercase tracking-wider text-[#0a0a0a] text-center">HIVEMIND</span>
                <span className="text-xs font-mono uppercase tracking-wider text-[#a3a3a3] text-center">Supermem</span>
              </div>
              {features.map((f, i) => (
                <FeatureRow key={f.feature} {...f} delay={i * 0.05} />
              ))}
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <Section border={false}>
        <div className="py-16 text-center">
          <FadeUp>
            <p className="text-sm text-[#a3a3a3] mb-3">
              Built by the HIVEMIND team. EU-hosted, GDPR-compliant.
            </p>
            <button onClick={() => window.location.href = '/hivemind'}
              className="text-sm font-medium text-[#117dff] hover:text-[#0066e0] transition-colors bg-transparent border-none cursor-pointer">
              Back to HIVEMIND
            </button>
          </FadeUp>
        </div>
      </Section>
    </div>
  );
};

export default BenchmarkPage;
