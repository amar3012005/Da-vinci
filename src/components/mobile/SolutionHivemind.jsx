import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, t } from './ThemeContext';
import { Link } from 'react-router-dom';
import HiveMind from '../hivemind/cartesia/HiveMind';

/* ─── Interactive Demo Card ─── */
const DemoCard = ({ isDark, c }) => {
  const [query, setQuery] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);

  const demos = [
    { q: 'What did we decide about the rebrand?', a: 'In the March strategy call, the team decided to shift to a minimal brand identity with blue as the primary accent. Sarah noted this aligns with the Q2 launch timeline.', sources: 3, time: '42ms' },
    { q: 'When is Lisa\'s birthday?', a: 'Lisa\'s birthday is on September 14th. Last year you got her a book about marine biology.', sources: 1, time: '28ms' },
    { q: 'What was my workout routine last week?', a: 'Monday: upper body at 7am. Wednesday: 5K run (26:34). Friday: yoga session. You mentioned your shoulder felt better after Wednesday.', sources: 4, time: '35ms' },
  ];

  const handleDemo = (idx) => {
    setActiveDemo(idx);
    setQuery(demos[idx].q);
    setShowResult(false);
    setTimeout(() => setShowResult(true), 600);
  };

  return (
    <div className={`${isDark ? 'bg-[#121315]/72' : 'bg-white/70'} border ${c.border} backdrop-blur-xl overflow-hidden`}>
      {/* Query bar */}
      <div className={`px-5 py-4 border-b ${c.border}`}>
        <div className={`flex items-center gap-3 px-4 py-3 border ${c.border} ${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]'}`}>
          <span className={`text-xs font-mono ${c.textMuted}`}>&gt;</span>
          <motion.span
            key={activeDemo}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-sm ${c.text} flex-1`}
          >
            {query || 'Ask your memory anything...'}
          </motion.span>
          <span className={`text-[9px] font-mono ${isDark ? 'text-[#7ddc6f]' : 'text-[#16a34a]'}`}>
            {showResult ? `${demos[activeDemo].sources} found` : ''}
          </span>
        </div>
      </div>

      {/* Result */}
      <div className="px-5 py-5 min-h-[120px]">
        <AnimatePresence mode="wait">
          {showResult ? (
            <motion.div
              key={`result-${activeDemo}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className={`text-sm ${c.text} leading-relaxed mb-3`}>{demos[activeDemo].a}</p>
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-mono ${c.textMuted}`}>{demos[activeDemo].sources} memories</span>
                <span className={`text-[9px] font-mono ${c.textMuted}`}>{demos[activeDemo].time}</span>
              </div>
            </motion.div>
          ) : query ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white/40' : 'bg-black/30'} animate-pulse`} />
              <span className={`text-xs font-mono ${c.textMuted}`}>Searching memories...</span>
            </motion.div>
          ) : (
            <p className={`text-sm ${c.textMuted}`}>Try one of the examples below</p>
          )}
        </AnimatePresence>
      </div>

      {/* Example buttons */}
      <div className={`px-5 pb-5 flex flex-wrap gap-2`}>
        {demos.map((d, i) => (
          <button
            key={i}
            onClick={() => handleDemo(i)}
            className={`px-3 py-1.5 text-[10px] font-mono border ${c.border} cursor-pointer transition-all ${
              activeDemo === i && showResult
                ? (isDark ? 'bg-white/[0.1] text-white border-white/20' : 'bg-black/[0.06] text-black border-black/15')
                : (isDark ? 'bg-white/[0.03] text-white/60 hover:bg-white/[0.06]' : 'bg-black/[0.02] text-black/50 hover:bg-black/[0.04]')
            }`}
          >
            {d.q.slice(0, 30)}...
          </button>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   FULL PAGE — HIVEMIND: Your Second Brain
   ═══════════════════════════════════════════════════════════ */

const SolutionHivemind = () => {
  const { isDark } = useTheme();
  const c = t(isDark);

  const features = [
    {
      num: '01',
      title: 'It remembers everything',
      desc: 'Every conversation, email, document, and decision — stored and connected. Ask a question six months later and get the exact answer.',
      tag: 'Total recall',
    },
    {
      num: '02',
      title: 'It connects the dots',
      desc: 'Your second brain doesn\'t just store information — it links related ideas across sources. A Slack message, a PDF, and an email about the same topic? Connected automatically.',
      tag: 'Knowledge graph',
    },
    {
      num: '03',
      title: 'It gets smarter over time',
      desc: 'Three AI agents continuously scan your knowledge for duplicates, contradictions, and missing links. Your memory actually improves the more you use it.',
      tag: 'Self-improving',
    },
    {
      num: '04',
      title: 'Your data stays yours',
      desc: 'Hosted in Frankfurt, Germany. GDPR-compliant by architecture. No US data transfers. Your memories never leave European soil.',
      tag: 'EU sovereign',
    },
  ];

  const useCases = [
    { emoji: '💼', title: 'For founders', desc: 'Never lose a meeting insight, investor feedback, or product decision again.' },
    { emoji: '🧑‍💻', title: 'For developers', desc: 'Your codebase context, debugging history, and architectural decisions — always retrievable.' },
    { emoji: '📝', title: 'For researchers', desc: 'Connect papers, notes, and conversations into one searchable knowledge base.' },
    { emoji: '🏢', title: 'For teams', desc: 'Shared organizational memory. When someone leaves, their knowledge stays.' },
  ];

  return (
    <section className={`${c.bg} border-t ${c.border} relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute inset-0 ${isDark ? 'bg-[radial-gradient(circle_at_18%_16%,rgba(98,135,94,0.18),transparent_28%),radial-gradient(circle_at_76%_44%,rgba(126,145,156,0.16),transparent_30%)]' : 'bg-[radial-gradient(circle_at_18%_16%,rgba(130,160,120,0.10),transparent_28%),radial-gradient(circle_at_76%_44%,rgba(120,130,140,0.10),transparent_30%)]'}`} />
        <div className={`absolute inset-0 ${isDark ? 'bg-black/72' : 'bg-[#f7f4ed]/78'} backdrop-blur-[40px]`} />
      </div>
      <div className={`max-w-[1200px] mx-auto border-x ${c.border}`}>

        {/* ─── Hero ─── */}
        <div className="px-6 md:px-10 lg:px-20 pt-20 lg:pt-32 pb-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex flex-wrap gap-2 mb-8">
              {['Your Second Brain', 'AI-Powered', 'EU Sovereign', '87.2% Accuracy'].map(tag => (
                <span key={tag} className={`px-4 py-2.5 border ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-black/10 bg-black/[0.03]'}`}>
                  <span className={`text-[9px] font-mono uppercase tracking-[0.2em] ${isDark ? 'text-white/72' : 'text-black/55'}`}>{tag}</span>
                </span>
              ))}
            </div>
            <p className={`text-xs font-mono uppercase tracking-widest ${c.textMuted} mb-4`}>
              Solutions / 02
            </p>
            <h2 className={`text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] ${c.text} font-['Space_Grotesk'] mb-6`}>
              <span className={c.accent}>HIVEMIND</span>
              <br />
              Your Second Brain
            </h2>
            <p className={`text-xl md:text-2xl ${c.textSecondary} leading-relaxed max-w-2xl`}>
              A memory that never forgets. Connect your tools, ask any question, get the exact answer — even months later. Like having a photographic memory for your entire digital life.
            </p>
          </motion.div>
        </div>

        {/* ─── Interactive Demo + Live Graph ─── */}
        <div className="px-6 md:px-10 lg:px-20 pb-16 relative">
          <div className="grid lg:grid-cols-2 gap-8 items-start">

            {/* Left — Interactive recall demo */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <DemoCard isDark={isDark} c={c} />
            </motion.div>

            {/* Right — Live brain network */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <div className={`${isDark ? 'bg-[#121315]/72' : 'bg-white/70'} border ${c.border} backdrop-blur-xl overflow-hidden`}>
                <div className={`px-5 py-3 border-b ${c.border} flex items-center justify-between`}>
                  <span className={`text-[9px] font-mono uppercase tracking-widest ${c.textMuted}`}>Knowledge Graph — Live</span>
                  <span className={`text-[9px] font-mono ${isDark ? 'text-[#7ddc6f]' : 'text-[#16a34a]'}`}>● Connected</span>
                </div>
                <div className="flex items-center justify-center min-h-[340px]">
                  <HiveMind
                    width={480}
                    height={320}
                    nodeCount={80}
                    connectionDistance={50}
                    nodeColor={isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(10, 10, 10, 0.6)'}
                    lineColor={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(10, 10, 10, 0.08)'}
                    backgroundColor="transparent"
                  />
                </div>
                <div className={`px-5 py-3 border-t ${c.border} flex items-center justify-between`}>
                  <span className={`text-[9px] font-mono ${c.textMuted}`}>Every dot is a memory. Every line is a connection.</span>
                  <span className={`text-[9px] font-mono ${c.textMuted}`}>87.2% recall accuracy</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ─── Features — human-readable ─── */}
        <div className={`px-6 md:px-10 lg:px-20 py-16 border-t ${c.border}`}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>
              How it works
            </span>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`${c.bgCard} border ${c.border} p-6 ${c.shadow} group hover:border-opacity-40 transition-all`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-[#080808]' : 'text-white'}`}>{f.num}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className={`text-base font-semibold ${c.text} font-['Space_Grotesk']`}>{f.title}</h4>
                      <span className={`text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 ${isDark ? 'bg-white/[0.06] text-white/50' : 'bg-black/[0.04] text-black/40'}`}>
                        {f.tag}
                      </span>
                    </div>
                    <p className={`text-sm ${c.textSecondary} leading-relaxed`}>{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ─── Use cases ─── */}
        <div className={`px-6 md:px-10 lg:px-20 py-16 border-t ${c.border}`}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted} block mb-3`}>
              Built for
            </span>
            <h3 className={`text-2xl md:text-3xl font-bold ${c.text} font-['Space_Grotesk']`}>
              Anyone who thinks for a living
            </h3>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {useCases.map((u, i) => (
              <motion.div
                key={u.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className={`${c.bgCard} border ${c.border} p-5 ${c.shadow}`}
              >
                <span className="text-2xl mb-3 block">{u.emoji}</span>
                <h4 className={`text-sm font-semibold ${c.text} font-['Space_Grotesk'] mb-1`}>{u.title}</h4>
                <p className={`text-xs ${c.textSecondary} leading-relaxed`}>{u.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ─── CTA ─── */}
        <div className={`px-6 md:px-10 lg:px-20 py-16 border-t ${c.border} text-center`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className={`text-xl md:text-2xl font-medium ${c.text} font-['Space_Grotesk'] mb-6`}>
              Stop forgetting. Start remembering.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/hivemind/login"
                className={`px-6 py-3 ${isDark ? 'bg-white text-black' : 'bg-[#0a0a0a] text-white'} text-sm font-semibold font-['Space_Grotesk'] no-underline hover:opacity-90 transition-opacity`}
              >
                Try HIVEMIND Free &rarr;
              </Link>
              <Link
                to="/benchmark"
                className={`px-6 py-3 border ${c.border} ${c.text} text-sm font-medium font-['Space_Grotesk'] no-underline hover:opacity-80 transition-opacity`}
              >
                See Benchmark
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="h-8" />
      </div>
    </section>
  );
};

export default SolutionHivemind;
