import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Settings2, ChevronDown, ArrowRight } from 'lucide-react';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative pt-28 pb-20 min-h-screen flex items-center overflow-hidden bg-[#faf9f4]">
      {/* Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[50vw] h-[50vw] bg-[#117dff]/[0.04] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-[#117dff]/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 w-full">
        <div className="flex flex-col items-center text-center relative z-10">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <span className="text-[#117dff] text-sm font-semibold tracking-wide uppercase">
              Meet HIVEMIND for Teams
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-8 max-w-4xl text-[#0a0a0a] font-['Space_Grotesk']"
          >
            Your Enterprise<br />
            <span className="text-[#a3a3a3]">Memory, Sovereignly</span><br />
            <span className="text-[#a3a3a3]">Reimagined.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-[#525252] mb-10 max-w-xl leading-relaxed"
          >
            HIVEMIND is the universal memory layer for your AI stack. Preserve context, automate intelligence, and sever the "siloed memory" problem.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-center gap-4 mb-16"
          >
            <button
              onClick={() => navigate('/hivemind/login')}
              className="flex items-center gap-2 px-7 py-3 bg-[#117dff] text-white font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors group cursor-pointer border-none text-sm uppercase tracking-[0.075em]"
            >
              Start Free
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => {
                const el = document.querySelector('#pricing');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 bg-white text-[#0a0a0a] font-medium rounded-lg border border-[#e3e0db] hover:border-[#d4d0ca] hover:bg-[#f3f1ec] transition-colors cursor-pointer text-sm"
            >
              View Pricing
            </button>
          </motion.div>

          {/* Demo Widget */}
          <motion.div
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-3xl"
          >
            <div className="relative bg-white rounded-[20px] border border-[#e3e0db] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e3e0db]">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#e3e0db] bg-[#f3f1ec] hover:bg-[#eae7e1] transition-colors text-sm font-medium cursor-pointer text-[#0a0a0a]">
                    <span className="w-2 h-2 rounded-full bg-[#117dff]"></span>
                    Model Context
                    <ChevronDown className="w-4 h-4 text-[#a3a3a3]" />
                  </button>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  {['Memories', 'Knowledge Base', 'Web Intel'].map((tab) => (
                    <button
                      key={tab}
                      className="px-4 py-2 rounded-lg border border-[#e3e0db] text-sm font-medium text-[#525252] hover:text-[#0a0a0a] hover:bg-[#f3f1ec] transition-colors cursor-pointer bg-white"
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <button className="p-2 rounded-lg border border-[#e3e0db] hover:bg-[#f3f1ec] transition-colors cursor-pointer bg-white">
                  <Settings2 className="w-4 h-4 text-[#a3a3a3]" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="bg-[#faf9f4] rounded-xl p-6 border border-[#e3e0db]">
                  <p className="text-base leading-relaxed text-[#0a0a0a]">
                    <span className="text-[#117dff] font-mono text-sm">&gt; recall</span> "What did the team decide about the auth migration?"<br/>
                    <span className="text-[#117dff] font-mono text-sm">[3 memories found]</span> On March 12, Sarah proposed moving to OAuth2 in <span className="font-medium">#engineering</span>. Jake approved the RFC on March 14. The migration deadline is April 1st.
                  </p>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#e3e0db] bg-[#f3f1ec]/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e3e0db] bg-white">
                    <span className="text-lg">🇪🇺</span>
                    <span className="text-sm text-[#525252]">EU Sovereign</span>
                    <ChevronDown className="w-3 h-3 text-[#a3a3a3]" />
                  </div>
                </div>
                <button
                  onClick={() => navigate('/hivemind/login')}
                  className="flex items-center gap-2 px-5 py-2 bg-[#117dff] text-white rounded-[4px] font-semibold hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-sm uppercase tracking-[0.075em]"
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  Try Live
                </button>
              </div>
            </div>

            {/* Glow */}
            <div className="absolute -inset-4 bg-[#117dff]/[0.04] blur-3xl -z-10 rounded-[40px]" />
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-[#a3a3a3] font-mono"
          >
            <span>9 MCP Tools</span>
            <span className="w-1 h-1 rounded-full bg-[#d4d0ca]" />
            <span>Sub-50ms Recall</span>
            <span className="w-1 h-1 rounded-full bg-[#d4d0ca]" />
            <span>Cross-Platform Memory</span>
            <span className="w-1 h-1 rounded-full bg-[#d4d0ca]" />
            <span>European Sovereign Cloud</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
