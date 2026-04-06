import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronDown, ArrowRight, Sparkles, Zap, Brain, Cable, RefreshCcw } from 'lucide-react';

const Hero = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Memories');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [resultCount, setResultCount] = useState(0);

  const demoQueries = useMemo(() => ({
    Memories: {
      query: '"What was the deployment fix from last Tuesday?"',
      results: [
        { icon: '🔧', text: 'Kubernetes pod scaling fix — increased replicas to 5' },
        { icon: '📝', text: 'Meeting notes: DevOps sync 2024-01-15' },
        { icon: '🔗', text: 'GitHub PR #342: Hotfix deployment pipeline' },
      ],
    },
    'Knowledge Base': {
      query: '"Show me the Q4 roadmap document"',
      results: [
        { icon: '📊', text: 'Q4 2024 Product Roadmap — v3.2' },
        { icon: '🎯', text: 'OKRs Q4: Memory performance improvements' },
        { icon: '📋', text: 'Engineering sprint planning template' },
      ],
    },
    'Web Intel': {
      query: '"Find latest news about AI memory systems"',
      results: [
        { icon: '📰', text: 'TechCrunch: Memory layers for AI agents trend up' },
        { icon: '🔬', text: 'arXiv: Long-context retrieval benchmarks 2024' },
        { icon: '💼', text: 'EU AI Act: Memory compliance requirements' },
      ],
    },
  }), []);

  // Typing effect
  useEffect(() => {
    if (isPlaying) {
      const currentQuery = demoQueries[activeTab].query;
      let charIndex = 0;
      setTypedText('');
      setShowResult(false);
      setResultCount(0);

      const typeInterval = setInterval(() => {
        if (charIndex < currentQuery.length) {
          setTypedText(currentQuery.slice(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => {
            setShowResult(true);
            let count = 0;
            const countInterval = setInterval(() => {
              count++;
              setResultCount(count);
              if (count >= 3) clearInterval(countInterval);
            }, 200);
          }, 400);
        }
      }, 40);

      return () => clearInterval(typeInterval);
    }
  }, [isPlaying, activeTab, demoQueries]);

  const handlePlayDemo = () => {
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setShowResult(false);
    setTypedText('');
    setResultCount(0);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    handleReset();
  };

  return (
    <section className="relative pt-20 sm:pt-24 lg:pt-28 pb-12 sm:pb-16 lg:pb-20 min-h-screen flex items-center overflow-hidden bg-[#faf9f4]">
      {/* Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[80vw] sm:w-[50vw] h-[80vw] sm:h-[50vw] bg-[#117dff]/[0.04] rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[40vw] sm:w-[30vw] h-[40vw] sm:h-[30vw] bg-[#117dff]/[0.02] rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-4 sm:px-6 w-full">
        <div className="flex flex-col items-center text-center relative z-10">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 sm:mb-6"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#117dff]/[0.08] border border-[#117dff]/15 text-[#117dff] text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
              <Sparkles size={10} className="sm:w-3 sm:h-3 text-[#117dff]" />
              Built in Hannover, Germany
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-4 sm:mb-6 max-w-4xl text-[#0a0a0a] font-['Space_Grotesk']"
          >
            Europe's AI<br />
            <span className="text-[#117dff]">Memory Engine.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm sm:text-base md:text-lg lg:text-xl text-[#525252] mb-6 sm:mb-8 max-w-2xl leading-relaxed px-2"
          >
            Sovereign. Sub-50ms. GDPR-compliant. Built in Hannover for individuals, developers, and enterprise teams.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 sm:mb-12 w-full sm:w-auto"
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

          {/* Demo Widget - Redesigned */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative w-full max-w-2xl"
          >
            <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-[#e3e0db] overflow-hidden shadow-2xl">
              {/* Top Bar - Terminal Style */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#e3e0db] bg-gradient-to-b from-[#faf9f4] to-white">
                {/* Window Controls */}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dba520]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
                </div>

                {/* Desktop Tabs */}
                <div className="hidden sm:flex items-center gap-1 bg-[#e3e0db]/50 rounded-lg p-0.5">
                  {Object.keys(demoQueries).map((tab) => (
                    <motion.button
                      key={tab}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTabChange(tab)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        activeTab === tab
                          ? 'bg-white text-[#117dff] shadow-sm border border-[#e3e0db]'
                          : 'text-[#525252] hover:text-[#0a0a0a]'
                      }`}
                    >
                      {tab}
                    </motion.button>
                  ))}
                </div>

                {/* Mobile Tabs */}
                <div className="sm:hidden flex items-center gap-0.5 bg-[#e3e0db]/50 rounded-md p-0.5">
                  {Object.keys(demoQueries).map((tab) => (
                    <motion.button
                      key={tab}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleTabChange(tab)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer ${
                        activeTab === tab
                          ? 'bg-white text-[#117dff] shadow-sm'
                          : 'text-[#525252]'
                      }`}
                    >
                      {tab.slice(0, 3)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div className={`p-4 sm:p-5 lg:p-6 ${isPlaying || showResult ? 'min-h-[200px] sm:min-h-[220px] lg:min-h-[240px]' : 'min-h-[120px] sm:min-h-[140px] lg:min-h-[160px]'}`}>
                {/* Query Box */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <div className="bg-[#faf9f4] rounded-xl p-3 sm:p-4 border border-[#e3e0db]">
                    <p className="text-sm sm:text-base leading-relaxed text-[#0a0a0a] font-mono">
                      <span className="text-[#117dff]">&gt;</span>{' '}
                      <span className={isPlaying ? 'text-[#117dff]' : ''}>
                        {typedText || demoQueries[activeTab].query}
                        {isPlaying && (
                          <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="inline-block w-0.5 h-4 ml-0.5 bg-[#117dff]"
                          />
                        )}
                      </span>
                    </p>
                  </div>
                </motion.div>

                {/* Results */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2.5"
                    >
                      {/* Status Line */}
                      <div className="flex items-center gap-2 text-xs text-[#16a34a] font-mono">
                        <Zap size={12} />
                        <span>{resultCount} memories found in {45 + resultCount * 3}ms</span>
                      </div>
                      {/* Result Cards */}
                      {demoQueries[activeTab].results.slice(0, resultCount).map((result, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#e3e0db] hover:border-[#117dff]/30 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <span className="text-lg flex-shrink-0">{result.icon}</span>
                          <span className="text-xs sm:text-sm text-[#0a0a0a] flex-1 text-left group-hover:text-[#117dff] transition-colors">
                            {result.text}
                          </span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Bar */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-[#e3e0db] bg-[#faf9f4]">
                {/* EU Badge */}
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e3e0db] bg-white cursor-pointer"
                >
                  <span className="text-base">🇪🇺</span>
                  <span className="text-xs text-[#525252] hidden sm:inline">EU Sovereign</span>
                  <ChevronDown className="w-3 h-3 text-[#a3a3a3]" />
                </motion.div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {showResult && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleReset}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e3e0db] bg-white hover:bg-[#f3f1ec] transition-colors cursor-pointer"
                    >
                      <RefreshCcw size={14} className="text-[#525252]" />
                      <span className="text-xs text-[#525252] hidden sm:inline">Reset</span>
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: showResult ? '0 2px 8px rgba(22,163,74,0.3)' : '0 2px 8px rgba(17,125,255,0.2)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePlayDemo}
                    disabled={isPlaying}
                    className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 rounded-[4px] font-semibold transition-all cursor-pointer border-none text-xs sm:text-sm uppercase tracking-[0.075em] ${
                      showResult
                        ? 'bg-[#16a34a] text-white hover:bg-[#158f3a]'
                        : 'bg-[#117dff] text-white hover:bg-[#0066e0]'
                    } ${isPlaying ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {isPlaying ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : showResult ? (
                      <Zap size={14} fill="currentColor" />
                    ) : (
                      <Play size={14} fill="currentColor" />
                    )}
                    <span className="hidden sm:inline">
                      {isPlaying ? 'Running...' : showResult ? 'Run Again' : 'Try Live'}
                    </span>
                    <span className="sm:hidden">{isPlaying ? '...' : showResult ? 'Again' : 'Try'}</span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Glow Effect */}
            <div className="absolute -inset-3 sm:-inset-4 bg-gradient-to-b from-[#117dff]/[0.06] to-transparent blur-2xl sm:blur-3xl -z-10 rounded-3xl sm:rounded-[40px]" />
          </motion.div>

          {/* Trust Signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
          >
            {[
              { icon: Zap, label: 'Sub-50ms Recall', color: '#117dff' },
              { icon: Brain, label: '9 MCP Tools', color: '#16a34a' },
              { icon: Cable, label: 'Cross-Platform', color: '#ea580c' },
              { label: '🇪🇺 EU Sovereign', color: '#117dff' },
            ].map((item, i, arr) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[#525252]"
              >
                {item.icon && <item.icon size={12} style={{ color: item.color }} />}
                <span>{item.label}</span>
                {i < arr.length - 1 && <span className="w-1 h-1 rounded-full bg-[#d4d0ca] hidden sm:inline" />}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
