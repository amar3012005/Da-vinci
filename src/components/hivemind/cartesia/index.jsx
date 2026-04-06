import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, Shield, Zap, Globe, BookOpen, Cable, Layers, Database } from 'lucide-react';

// Sections
import Navbar from './Navbar';
import Hero from './Hero';
import Marquee from './Marquee';
import Features from './Features';
import Languages from './Languages';
import Developers from './Developers';
import HivemindGraphPreview from './HivemindGraphPreview';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* ─── Trust Bar — immediately below Hero ─────────────────────────── */

const TrustBar = () => (
  <section className="bg-[#faf9f4] border-b border-[#e3e0db]">
    <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-4 sm:px-6 py-8 sm:py-10">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="grid grid-cols-2 md:flex md:flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-12"
      >
        {[
          { icon: Shield, label: 'EU Sovereign', sub: 'Frankfurt' },
          { icon: Zap, label: 'Sub-50ms', sub: 'Recall' },
          { icon: Brain, label: '6 SOTA', sub: 'Features' },
          { icon: Globe, label: 'MCP Native', sub: 'Protocol' },
          { icon: BookOpen, label: 'Knowledge', sub: 'Base' },
          { icon: Cable, label: 'Gmail +', sub: 'Connectors' },
        ].map((item) => (
          <motion.div
            key={item.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center justify-center text-center gap-1.5 p-3 sm:p-4 rounded-xl hover:bg-[#f3f1ec] transition-colors cursor-pointer"
          >
            <item.icon size={16} className="sm:w-5 sm:h-5 text-[#117dff]" />
            <div>
              <span className="text-[#0a0a0a] text-[11px] sm:text-sm font-semibold font-['Space_Grotesk'] block leading-tight">{item.label}</span>
              <span className="text-[#a3a3a3] text-[9px] sm:text-[10px] font-mono">{item.sub}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

/* ─── Final CTA — drives conversion at page bottom ──────────────── */

const FinalCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-[#faf9f4] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#117dff]/[0.02] to-[#117dff]/[0.04] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-4 sm:px-6 py-16 sm:py-20 lg:py-28 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#117dff]/[0.08] border border-[#117dff]/20 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-[#117dff] animate-pulse" />
              <span className="text-[11px] font-mono text-[#117dff] uppercase tracking-wider">Now in Public Beta</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 text-[#0a0a0a] font-['Space_Grotesk']">
              Ready to give your<br />
              <span className="text-[#117dff]">AI a memory?</span>
            </h2>
            <p className="text-base sm:text-lg text-[#525252] max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
              Join the teams building the next generation of AI agents with persistent, sovereign memory.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 6px 24px rgba(17,125,255,0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/hivemind/login')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-[#117dff] text-white font-semibold rounded-[4px] hover:bg-[#0066e0] transition-all text-xs sm:text-sm uppercase tracking-[0.1em] group cursor-pointer border-none shadow-[0_4px_24px_rgba(17,125,255,0.25)]"
              >
                Start Building Free
                <ArrowRight size={14} className="sm:group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/hivemind/login')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-white text-[#0a0a0a] font-medium rounded-[4px] border border-[#e3e0db] hover:border-[#d4d0ca] hover:bg-[#f3f1ec] transition-all text-xs sm:text-sm cursor-pointer"
              >
                Open Dashboard
              </motion.button>
            </div>
            <p className="text-[10px] sm:text-xs text-[#a3a3a3] mt-6 font-mono">
              Free tier includes 100 memories, 500 monthly tokens, unlimited searches
            </p>
          </motion.div>
        </div>

        {/* Platform Cards */}
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: Brain, title: 'Memory Dashboard', desc: 'Browse, search, and manage your entire knowledge graph.', link: '/hivemind/app/memories' },
            { icon: BookOpen, title: 'Knowledge Base', desc: 'Upload PDFs, docs, and text — chunked into searchable memories.', link: '/hivemind/app/knowledge' },
            { icon: Cable, title: 'Connectors', desc: 'Gmail, Slack, GitHub — sync your tools into one memory layer.', link: '/hivemind/app/connectors' },
            { icon: Zap, title: 'Memory Health', desc: 'Monitor retrieval quality, search performance, and graph health.', link: '/hivemind/app/evaluation' },
          ].map((feat) => (
            <motion.button
              key={feat.title}
              variants={fadeUp}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(feat.link)}
              className="text-left bg-white border border-[#e3e0db] rounded-xl p-4 sm:p-5 hover:border-[#117dff]/30 hover:shadow-[0_4px_16px_rgba(17,125,255,0.08)] transition-all group cursor-pointer"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#117dff]/[0.15] transition-colors">
                <feat.icon size={16} className="sm:w-[18px] sm:h-[18px] text-[#117dff]" />
              </div>
              <h3 className="text-[#0a0a0a] text-sm sm:text-base font-semibold font-['Space_Grotesk'] mb-2">{feat.title}</h3>
              <p className="text-[#525252] text-[11px] sm:text-sm leading-relaxed">{feat.desc}</p>
              <div className="mt-3 sm:mt-4 flex items-center gap-1 text-[#117dff] text-[10px] sm:text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight size={10} className="sm:w-3 sm:h-3" />
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ─── Graph Section — visual proof ──────────────────────────────── */

const GraphSection = () => (
  <section className="bg-[#faf9f4] relative">
    <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8 sm:mb-10"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#117dff]/[0.08] border border-[#117dff]/20 mb-4"
        >
          <Layers size={12} className="text-[#117dff]" />
          <span className="text-[10px] font-mono text-[#117dff] uppercase tracking-wider">Triple Operator Framework</span>
        </motion.div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mt-3 text-[#0a0a0a] font-['Space_Grotesk']">
          A living knowledge graph<br />
          <span className="text-[#a3a3a3]">that grows with every interaction.</span>
        </h2>
        <p className="text-sm sm:text-base text-[#525252] mt-3 max-w-lg mx-auto">
          Watch your memory evolve in real-time as the triple-operator framework ingests, indexes, and connects knowledge.
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="bg-white rounded-[20px] sm:rounded-[24px] border border-[#e3e0db] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
      >
        <HivemindGraphPreview />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 sm:mt-10"
      >
        {[
          { label: 'Nodes', value: 'Real-time', icon: Database },
          { label: 'Edges', value: 'Dynamic', icon: Layers },
          { label: 'Traversal', value: '< 50ms', icon: Zap },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white border border-[#e3e0db] rounded-xl p-3 sm:p-4 text-center hover:border-[#117dff]/20 transition-colors cursor-pointer"
          >
            <stat.icon size={14} className="sm:w-4 sm:h-4 text-[#117dff] mx-auto mb-1.5 sm:mb-2" />
            <div className="text-base sm:text-lg font-bold text-[#0a0a0a] font-mono">{stat.value}</div>
            <div className="text-[9px] sm:text-[10px] text-[#a3a3a3] uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

/* ─── Page Assembly — AIDA flow ─────────────────────────────────── */
/*
 *  1. Hero          — Attention: "Give your AI a perfect memory"
 *  2. Trust Bar     — Instant credibility signals
 *  3. Marquee       — Feature phrases scrolling
 *  4. Features      — Interest: What it does, how it works
 *  5. Graph         — Visual proof: the knowledge graph
 *  6. EU Sovereign  — Desire: The unique differentiator
 *  7. Developers    — Desire: API, SDK, Pricing
 *  8. Final CTA     — Action: Start building / Open dashboard
 */

const CartesiaReplica = () => {
  useEffect(() => {
    document.body.style.backgroundColor = '#faf9f4';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f4] text-[#0a0a0a] font-sans selection:bg-[#117dff]/20">
      <Navbar />

      {/* 1. ATTENTION */}
      <Hero />

      {/* 2. TRUST */}
      <TrustBar />

      {/* 3. SOCIAL PROOF */}
      <Marquee />

      {/* 4. INTEREST */}
      <Features />

      {/* 5. VISUAL PROOF */}
      <GraphSection />

      {/* Benchmark Proof */}
      <section className="bg-white border-b border-[#e3e0db]">
        <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/20 mb-4">
              Benchmark Results
            </span>
            <h2 className="text-3xl font-bold font-['Space_Grotesk'] text-[#0a0a0a] mb-3">
              87.2% on LongMemEval
            </h2>
            <p className="text-[#525252] text-sm max-w-md mx-auto">
              Tested against 500 questions across 6 categories. Outperforming industry baselines.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Overall', value: '81%', color: '#117dff' },
              { label: 'Single-Session', value: '100%', color: '#16a34a' },
              { label: 'Multi-Session', value: '75.9%', color: '#117dff' },
              { label: 'Preference', value: '83.3%', color: '#117dff' },
            ].map(s => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-5 text-center">
                <div className="text-3xl font-bold font-mono mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[#a3a3a3] text-xs font-mono uppercase tracking-wider">{s.label}</div>
              </motion.div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={() => window.location.href = '/benchmark'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#e3e0db] rounded-lg text-sm font-medium text-[#0a0a0a] hover:border-[#117dff]/30 hover:shadow-[0_2px_12px_rgba(17,125,255,0.08)] transition-all cursor-pointer">
              View Full Benchmark
              <span className="text-[#117dff]">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6. DESIRE — EU Sovereign */}
      <Languages />

      {/* 7. DESIRE — Developer Experience */}
      <Developers />

      {/* 8. ACTION */}
      <FinalCTA />
    </div>
  );
};

export default CartesiaReplica;
