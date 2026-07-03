import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Zap, RefreshCcw, ChevronDown } from 'lucide-react';

/**
 * ChatDemoCard — the interactive recall terminal from the original Hero:
 * tabbed queries (Memories / Knowledge Base / Web Intel), typing animation,
 * live "results found in Nms" reveal. Restored into the new hero's card slot.
 */

const demoQueries = {
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
};

const ChatDemoCard = () => {
  const [activeTab, setActiveTab] = useState('Memories');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [resultCount, setResultCount] = useState(0);

  const tabs = useMemo(() => Object.keys(demoQueries), []);

  useEffect(() => {
    if (!isPlaying) return undefined;
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
          setIsPlaying(false);
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
  }, [isPlaying, activeTab]);

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
    <div className="bg-white">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#efece5] bg-[#faf9f4] px-4 py-2">
        {tabs.map((tab) => (
          <motion.button
            key={tab}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleTabChange(tab)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
              activeTab === tab ? 'border border-[#e3e0db] bg-white text-[#117dff] shadow-sm' : 'text-[#6b6b6b] hover:text-[#0a0a0a]'
            }`}
          >
            {tab}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div className={`p-5 ${isPlaying || showResult ? 'min-h-[220px]' : 'min-h-[150px]'}`}>
        <div className="mb-4 rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-3.5">
          <p className="font-mono text-[13.5px] leading-relaxed text-[#0a0a0a]">
            <span className="text-[#117dff]">&gt;</span>{' '}
            <span className={isPlaying ? 'text-[#117dff]' : ''}>
              {typedText || demoQueries[activeTab].query}
              {isPlaying && (
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity }}
                  className="ml-0.5 inline-block h-4 w-0.5 bg-[#117dff]" />
              )}
            </span>
          </p>
        </div>

        <AnimatePresence>
          {showResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-[11px] text-[#0fa36b]">
                <Zap size={12} />
                <span>{resultCount} memories found in {45 + resultCount * 3}ms</span>
              </div>
              {demoQueries[activeTab].results.slice(0, resultCount).map((result, idx) => (
                <motion.div key={idx}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.08 }}
                  className="group flex items-center gap-3 rounded-lg border border-[#e3e0db] bg-white p-2.5 transition-all hover:border-[#117dff]/30 hover:shadow-sm">
                  <span className="shrink-0 text-base">{result.icon}</span>
                  <span className="flex-1 text-left text-[12.5px] text-[#0a0a0a] transition-colors group-hover:text-[#117dff]">{result.text}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between border-t border-[#efece5] bg-[#faf9f4] px-4 py-2.5">
        <div className="flex items-center gap-1.5 rounded-lg border border-[#e3e0db] bg-white px-2.5 py-1.5">
          <span className="text-sm">🇪🇺</span>
          <span className="hidden text-[11px] text-[#6b6b6b] sm:inline">EU Sovereign</span>
          <ChevronDown size={12} className="text-[#a3a3a3]" />
        </div>
        <div className="flex items-center gap-2">
          {showResult && (
            <motion.button initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-[#e3e0db] bg-white px-2.5 py-1.5 transition-colors hover:bg-[#f3f1ec]">
              <RefreshCcw size={12} className="text-[#6b6b6b]" />
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
            onClick={() => setIsPlaying(true)} disabled={isPlaying}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-all ${showResult ? 'bg-[#0fa36b]' : 'bg-[#117dff]'} ${isPlaying ? 'cursor-not-allowed opacity-70' : ''}`}>
            {isPlaying ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-3 w-3 rounded-full border-2 border-white border-t-transparent" />
            ) : showResult ? <Zap size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            {isPlaying ? 'Running…' : showResult ? 'Run again' : 'Try live'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatDemoCard;
