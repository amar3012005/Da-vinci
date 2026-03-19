import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Hexagon, Brain, Key, Cable, Zap } from 'lucide-react';

// Import Cartesia Replica Sections
import Navbar from './Navbar';
import Hero from './Hero';
import Features from './Features';
import Languages from './Languages';
import Developers from './Developers';
import HivemindGraphPreview from './HivemindGraphPreview';

/**
 * Full-Feature CTA Section
 * Drives users from marketing page into the product dashboard
 */
const ProductCTA = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: 'Memory Dashboard',
      description: 'Browse, search, and manage your entire knowledge graph in one place.',
      link: '/hivemind/app/memories',
    },
    {
      icon: Key,
      title: 'API Key Management',
      description: 'Create, rotate, and revoke API keys. One-time secure key display.',
      link: '/hivemind/app/keys',
    },
    {
      icon: Cable,
      title: 'MCP Connectors',
      description: 'One-click config for Claude, VS Code, Antigravity, and remote MCP.',
      link: '/hivemind/app/connectors',
    },
    {
      icon: Zap,
      title: 'Retrieval Evaluation',
      description: 'Measure precision, recall, and F1 scores across cross-client scenarios.',
      link: '/hivemind/app/evaluation',
    },
  ];

  return (
    <section className="bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#bdf213]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto border-x border-[#222] px-6 py-24 lg:py-32 relative z-10">
        {/* Heading */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#bdf213]/20 bg-[#bdf213]/5 mb-6">
              <Hexagon size={14} className="text-[#bdf213]" />
              <span className="text-[#bdf213] text-xs font-medium tracking-wide uppercase">
                Your Control Plane
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">
              Everything you need,<br />
              <span className="text-white/40">in one dashboard.</span>
            </h2>
            <p className="text-lg text-white/50 max-w-xl mx-auto mb-8 font-light">
              Sign in to access memory management, API keys, MCP configurations, and retrieval analytics — all from a single enterprise control surface.
            </p>
            <button
              onClick={() => navigate('/hivemind/login')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#bdf213] text-[#0a0a0a] font-semibold rounded-full hover:bg-[#d4ff3a] transition-all text-base group cursor-pointer border-none"
            >
              Open Dashboard
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feat, i) => (
            <motion.button
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              onClick={() => navigate(feat.link)}
              className="text-left bg-[#111]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 hover:border-[#bdf213]/20 hover:bg-[#111] transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center mb-4 group-hover:bg-[#bdf213]/15 transition-colors">
                <feat.icon size={18} className="text-[#bdf213]" />
              </div>
              <h3 className="text-white text-base font-medium mb-2">{feat.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{feat.description}</p>
              <div className="mt-4 flex items-center gap-1 text-[#bdf213] text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight size={12} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * Cartesia Replica Container
 * Full marketing + product entry points
 */
const CartesiaReplica = () => {
  useEffect(() => {
    document.body.style.backgroundColor = '#000000';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#bdf213]/30">
      <Navbar />
      <Hero />
      <Features />

      {/* Interactive Graph Preview */}
      <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8 text-center mt-10">
          The "Brain" Live.<br />
          <span className="text-white/40">Interactive Graph Preview</span>
        </h2>
        <div className="bg-[#09090b] rounded-[32px] border border-white/10 overflow-hidden">
          <HivemindGraphPreview />
        </div>
      </div>

      <Languages />

      {/* Product CTA — drives into dashboard */}
      <ProductCTA />

      <Developers />
    </div>
  );
};

export default CartesiaReplica;
