import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Settings2, ChevronDown, ArrowRight } from 'lucide-react';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative pt-32 pb-20 min-h-screen flex items-center overflow-hidden bg-[#111] text-white">
      {/* Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[50vw] h-[50vw] bg-[#bdf213]/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none opacity-30" />
      <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-[#4f00ff]/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none opacity-20" />

      <div className="max-w-[1200px] mx-auto border-x border-[#222] xl:border-[#222] px-6 w-full">
        <div className="flex flex-col items-center text-center relative z-10">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <span className="text-[#bdf213] text-sm font-medium tracking-wide uppercase">
              Meet HIVEMIND for Teams
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.05] mb-8 max-w-4xl"
          >
            Your Enterprise<br />
            <span className="text-white/40">Memory, Sovereignly</span><br />
            <span className="text-white/40">Reimagined.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-white/50 mb-10 max-w-xl leading-relaxed font-light"
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
              className="flex items-center gap-2 px-7 py-3.5 bg-[#bdf213] text-[#0a0a0a] font-semibold rounded-full hover:bg-[#d4ff3a] transition-colors group cursor-pointer border-none"
            >
              Start Free
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => {
                const el = document.querySelector('#pricing');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3.5 bg-transparent text-white font-medium rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5 transition-colors cursor-pointer"
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
            <div className="relative bg-[#161616] rounded-[24px] border border-white/10 overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-[#1a1a1a] hover:bg-[#222] transition-colors text-sm font-medium cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-[#bdf213]"></span>
                    Model Context
                    <ChevronDown className="w-4 h-4 text-white/50" />
                  </button>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  {['Concierge', 'Support', 'Gaming'].map((tab) => (
                    <button
                      key={tab}
                      className="px-4 py-2 rounded-full border border-white/10 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer bg-transparent"
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <button className="p-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors cursor-pointer bg-transparent">
                  <Settings2 className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-white/5">
                  <p className="text-lg leading-relaxed text-white/90">
                    <span className="text-[#bdf213]">&lt;context value="project" /&gt;</span> Oh wow, Project Apollo has been delayed? <span className="text-[#bdf213]">[insight]</span> Don't worry—we'll get you back on track. Let me pull the relevant PRs and Slack threads.
                  </p>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#1a1a1a]/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-[#0a0a0a]">
                    <span className="text-lg">🇺🇸</span>
                    <span className="text-sm text-white/70">English</span>
                    <ChevronDown className="w-3 h-3 text-white/50" />
                  </div>
                </div>
                <button
                  onClick={() => navigate('/hivemind/login')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#bdf213] text-[#0a0a0a] rounded-full font-medium hover:bg-[#d4ff3a] transition-colors cursor-pointer border-none"
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  Try Live
                </button>
              </div>
            </div>

            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#bdf213]/5 to-[#4f00ff]/10 blur-3xl -z-10 rounded-[40px] opacity-40" />
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-white/30"
          >
            <span>9 MCP Tools</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Sub-50ms Recall</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Cross-Platform Memory</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>European Sovereign Cloud</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
