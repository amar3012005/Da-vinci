import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Hexagon, Brain, Key, Cable, Zap } from 'lucide-react';

// Import Cartesia Sections
import Navbar from './Navbar';
import Hero from './Hero';
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
  show: { transition: { staggerChildren: 0.06 } },
};

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
    <section className="bg-[#faf9f4] relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#117dff]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 py-24 lg:py-32 relative z-10">
        {/* Heading */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#117dff]/20 bg-[#117dff]/[0.06] mb-6">
              <Hexagon size={14} className="text-[#117dff]" />
              <span className="text-[#117dff] text-xs font-medium tracking-wide uppercase">
                Your Control Plane
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#0a0a0a] font-['Space_Grotesk']">
              Everything you need,<br />
              <span className="text-[#a3a3a3]">in one dashboard.</span>
            </h2>
            <p className="text-lg text-[#525252] max-w-xl mx-auto mb-8">
              Sign in to access memory management, API keys, MCP configurations, and retrieval analytics — all from a single enterprise control surface.
            </p>
            <button
              onClick={() => navigate('/hivemind/login')}
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#117dff] text-white font-semibold rounded-[4px] hover:bg-[#0066e0] transition-all text-sm uppercase tracking-[0.075em] group cursor-pointer border-none"
            >
              Open Dashboard
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Feature Cards */}
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feat) => (
            <motion.button
              key={feat.title}
              variants={fadeUp}
              onClick={() => navigate(feat.link)}
              className="text-left bg-white border border-[#e3e0db] rounded-xl p-6 hover:border-[#d4d0ca] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center mb-4 group-hover:bg-[#117dff]/[0.12] transition-colors">
                <feat.icon size={18} className="text-[#117dff]" />
              </div>
              <h3 className="text-[#0a0a0a] text-base font-semibold font-['Space_Grotesk'] mb-2">{feat.title}</h3>
              <p className="text-[#737373] text-sm leading-relaxed">{feat.description}</p>
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

/**
 * Cartesia Container
 * Full marketing + product entry points
 */
const CartesiaReplica = () => {
  useEffect(() => {
    document.body.style.backgroundColor = '#faf9f4';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f4] text-[#0a0a0a] font-sans selection:bg-[#117dff]/20">
      <Navbar />
      <Hero />
      <Features />

      {/* Interactive Graph Preview */}
      <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 text-center mt-10 font-['Space_Grotesk']">
          The "Brain" Live.<br />
          <span className="text-[#a3a3a3]">Interactive Graph Preview</span>
        </h2>
        <div className="bg-white rounded-[24px] border border-[#e3e0db] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
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
