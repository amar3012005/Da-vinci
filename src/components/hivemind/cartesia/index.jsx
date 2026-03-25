import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, Shield, Zap, Globe, BookOpen, Cable } from 'lucide-react';

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
    <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 py-6">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex flex-wrap items-center justify-center gap-8 md:gap-16"
      >
        {[
          { icon: Shield, label: 'EU Sovereign', sub: 'Frankfurt' },
          { icon: Zap, label: 'Sub-50ms', sub: 'Recall' },
          { icon: Brain, label: '6 SOTA', sub: 'Features' },
          { icon: Globe, label: 'MCP Native', sub: 'Protocol' },
          { icon: BookOpen, label: 'Knowledge', sub: 'Base' },
          { icon: Cable, label: 'Gmail +', sub: 'Connectors' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <item.icon size={18} className="text-[#117dff]" />
            <div>
              <span className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] block leading-tight">{item.label}</span>
              <span className="text-[#a3a3a3] text-[10px] font-mono">{item.sub}</span>
            </div>
          </div>
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

      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 py-24 lg:py-32 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-[#0a0a0a] font-['Space_Grotesk']">
              Ready to give your<br />
              <span className="text-[#117dff]">AI a memory?</span>
            </h2>
            <p className="text-lg text-[#525252] max-w-xl mx-auto mb-10 leading-relaxed">
              Join the teams building the next generation of AI agents with persistent, sovereign memory.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => navigate('/hivemind/login')}
                className="flex items-center gap-2 px-8 py-4 bg-[#117dff] text-white font-semibold rounded-[4px] hover:bg-[#0066e0] transition-all text-sm uppercase tracking-[0.1em] group cursor-pointer border-none shadow-[0_4px_24px_rgba(17,125,255,0.25)]"
              >
                Start Building Free
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/hivemind/login')}
                className="flex items-center gap-2 px-8 py-4 bg-white text-[#0a0a0a] font-medium rounded-[4px] border border-[#e3e0db] hover:border-[#d4d0ca] hover:bg-[#f3f1ec] transition-all text-sm cursor-pointer"
              >
                Open Dashboard
              </button>
            </div>
          </motion.div>
        </div>

        {/* Platform Cards */}
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Brain, title: 'Memory Dashboard', desc: 'Browse, search, and manage your entire knowledge graph.', link: '/hivemind/app/memories' },
            { icon: BookOpen, title: 'Knowledge Base', desc: 'Upload PDFs, docs, and text — chunked into searchable memories.', link: '/hivemind/app/knowledge' },
            { icon: Cable, title: 'Connectors', desc: 'Gmail, Slack, GitHub — sync your tools into one memory layer.', link: '/hivemind/app/connectors' },
            { icon: Zap, title: 'Memory Health', desc: 'Monitor retrieval quality, search performance, and graph health.', link: '/hivemind/app/evaluation' },
          ].map((feat) => (
            <motion.button
              key={feat.title}
              variants={fadeUp}
              onClick={() => navigate(feat.link)}
              className="text-left bg-white border border-[#e3e0db] rounded-xl p-6 hover:border-[#117dff]/30 hover:shadow-[0_4px_16px_rgba(17,125,255,0.08)] transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center mb-4 group-hover:bg-[#117dff]/[0.15] transition-colors">
                <feat.icon size={18} className="text-[#117dff]" />
              </div>
              <h3 className="text-[#0a0a0a] text-base font-semibold font-['Space_Grotesk'] mb-2">{feat.title}</h3>
              <p className="text-[#525252] text-sm leading-relaxed">{feat.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-[#117dff] text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight size={12} />
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
    <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <span className="text-[#117dff] text-xs font-semibold tracking-wider uppercase">Under the Hood</span>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-3 text-[#0a0a0a] font-['Space_Grotesk']">
          A living knowledge graph<br />
          <span className="text-[#a3a3a3]">that grows with every interaction.</span>
        </h2>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="bg-white rounded-[24px] border border-[#e3e0db] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
      >
        <HivemindGraphPreview />
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
