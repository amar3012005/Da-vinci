import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Settings2, ChevronDown, ArrowRight, Sparkles } from 'lucide-react';

const Hero = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Memories');
  const [isPlaying, setIsPlaying] = useState(false);

  const tabs = ['Memories', 'Knowledge Base', 'Web Intel'];
  const demoTexts = {
    Memories: '"What was the deployment fix from last Tuesday?"',
    'Knowledge Base': '"Show me the Q4 roadmap document"',
    'Web Intel': '"Find latest news about AI memory systems"',
  };

  const handlePlayDemo = () => {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 2000);
  };

  return (
    <section className="relative pt-24 sm:pt-28 pb-12 sm:pb-20 min-h-screen flex items-center overflow-hidden bg-[#faf9f4]">
      {/* Background Glows - Reduced for mobile */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[80vw] sm:w-[50vw] h-[80vw] sm:h-[50vw] bg-[#117dff]/[0.04] rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[40vw] sm:w-[30vw] h-[40vw] sm:h-[30vw] bg-[#117dff]/[0.02] rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-4 sm:px-6 w-full">
        <div className="flex flex-col items-center text-center relative z-10">
          {/* Eyebrow with sparkle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4 sm:mb-6"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#117dff]/[0.08] border border-[#117dff]/15 text-[#117dff] text-xs font-semibold tracking-wide uppercase">
              <Sparkles size={12} className="text-[#117dff]" />
              The Sovereign Memory Engine
            </span>
          </motion.div>

          {/* Main Heading - Smaller on mobile */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-4 sm:mb-6 max-w-4xl text-[#0a0a0a] font-['Space_Grotesk']"
          >
            Give your AI<br />
            <span className="text-[#117dff]">a perfect memory.</span>
          </motion.h1>

          {/* Subtext - Tighter on mobile */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-base sm:text-lg md:text-xl text-[#525252] mb-6 sm:mb-8 max-w-xl leading-relaxed px-2"
          >
            Europe's sovereign memory engine and API. We handle the vector graphs, context, and compliance — your agents just remember.
          </motion.p>

          {/* CTA Buttons - Stacked on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 sm:mb-12 w-full sm:w-auto"
          >
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(17,125,255,0.25)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/hivemind/login')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-7 py-3 bg-[#117dff] text-white font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors group cursor-pointer border-none text-xs sm:text-sm uppercase tracking-[0.075em] shadow-[0_2px_8px_rgba(17,125,255,0.15)]"
            >
              Start Building Free
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const el = document.querySelector('#features');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-white text-[#0a0a0a] font-medium rounded-lg border border-[#e3e0db] hover:border-[#d4d0ca] hover:bg-[#f3f1ec] transition-colors cursor-pointer text-xs sm:text-sm"
            >
              See the Dashboard
            </motion.button>
          </motion.div>

          {/* Demo Widget - Mobile optimized */}
          <motion.div
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full"
          >
            <div className="relative bg-white rounded-xl sm:rounded-[20px] border border-[#e3e0db] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              {/* Top bar */}
              <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-[#e3e0db]">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#e3e0db] bg-[#f3f1ec] hover:bg-[#eae7e1] transition-colors text-xs font-medium cursor-pointer text-[#0a0a0a]"
                >
                  <span className="w-2 h-2 rounded-full bg-[#117dff] animate-pulse" />
                  <span className="hidden sm:inline">Model Context</span>
                  <span className="sm:hidden">Context</span>
                  <ChevronDown className="w-3 h-4 text-[#a3a3a3]" />
                </motion.button>
                <div className="hidden sm:flex items-center gap-1.5">
                  {tabs.map((tab) => (
                    <motion.button
                      key={tab}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        activeTab === tab
                          ? 'bg-[#117dff]/[0.08] border-[#117dff]/30 text-[#117dff]'
                          : 'border-[#e3e0db] text-[#525252] hover:bg-[#f3f1ec]'
                      }`}
                    >
                      {tab}
                    </motion.button>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 sm:p-2 rounded-lg border border-[#e3e0db] hover:bg-[#f3f1ec] transition-colors cursor-pointer bg-white"
                >
                  <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#a3a3a3]" />
                </motion.button>
              </div>

              {/* Content - Animated */}
              <div className="p-4 sm:p-6 min-h-[100px] sm:min-h-[120px]">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#faf9f4] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[#e3e0db]"
                >
                  <p className="text-sm sm:text-base leading-relaxed text-[#0a0a0a]">
                    <span className="text-[#117dff] font-mono text-xs sm:text-sm">&gt; recall</span>{' '}
                    <span className={isPlaying ? 'text-[#117dff]' : ''}>{demoTexts[activeTab]}</span>
                    {isPlaying && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[#16a34a] font-mono text-xs sm:text-sm ml-2"
                      >
                        [3 memories found]
                      </motion.span>
                    )}
                  </p>
                </motion.div>
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-t border-[#e3e0db] bg-[#f3f1ec]/50">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#e3e0db] bg-white cursor-pointer"
                >
                  <span className="text-base">🇪🇺</span>
                  <span className="text-xs text-[#525252] hidden sm:inline">EU Sovereign</span>
                  <ChevronDown className="w-2.5 h-2.5 text-[#a3a3a3]" />
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 2px 8px rgba(17,125,255,0.2)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlayDemo}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 sm:py-2 bg-[#117dff] text-white rounded-[4px] font-semibold hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-xs uppercase tracking-[0.075em]"
                >
                  {isPlaying ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <Play className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" />
                  )}
                  <span className="hidden sm:inline">{isPlaying ? 'Running...' : 'Try Live'}</span>
                </motion.button>
              </div>
            </div>

            {/* Glow */}
            <div className="absolute -inset-2 sm:-inset-4 bg-[#117dff]/[0.04] blur-2xl sm:blur-3xl -z-10 rounded-2xl sm:rounded-[40px]" />
          </motion.div>

          {/* Trust signals - Wrap on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs text-[#a3a3a3] font-mono"
          >
            {[
              '9 MCP Tools',
              'Sub-50ms Recall',
              'Cross-Platform Memory',
              'European Sovereign Cloud',
            ].map((item, i, arr) => (
              <React.Fragment key={item}>
                <span>{item}</span>
                {i < arr.length - 1 && <span className="w-1 h-1 rounded-full bg-[#d4d0ca]" />}
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
