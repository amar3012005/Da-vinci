import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTheme, t } from './ThemeContext';
import { Link } from 'react-router-dom';
import HiveMind from '../hivemind/cartesia/HiveMind';

const ease = [0.16, 1, 0.3, 1];
const fade = (delay) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.8, delay, ease },
});

/* ═══════════════════════════════════════════════════════════
   HIVEMIND — Your Second Brain
   Editorial layout matching MobileHero style
   ═══════════════════════════════════════════════════════════ */

const SolutionHivemind = () => {
  const { isDark } = useTheme();
  const c = t(isDark);
  const [activeDemo, setActiveDemo] = useState(-1);

  const demos = [
    { q: 'What did we decide about the rebrand?', a: 'In the March strategy call, the team decided to shift to a minimal identity. Sarah noted this aligns with the Q2 launch.', n: 3 },
    { q: 'When is Lisa\'s birthday?', a: 'September 14th. Last year you got her a book about marine biology.', n: 1 },
    { q: 'What was my workout last week?', a: 'Monday: upper body. Wednesday: 5K run, 26:34. Friday: yoga. You said your shoulder felt better.', n: 4 },
  ];

  const handleDemo = (i) => {
    setActiveDemo(-1);
    setTimeout(() => setActiveDemo(i), 100);
  };

  return (
    <section className={`${c.bg} border-t ${c.border} relative overflow-hidden`}>
      <div className={`max-w-[1200px] mx-auto border-x ${c.border} relative`}>

        {/* Subtle grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 left-1/3 w-px h-full ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`} />
          <div className={`absolute top-0 left-2/3 w-px h-full ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`} />
        </div>

        <div className="relative px-6 md:px-10 lg:px-20 pt-20 lg:pt-28 pb-0">

          {/* Top metadata row */}
          <motion.div className="flex items-center justify-between mb-8" {...fade(0)}>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>Solutions / 02</span>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>Memory Engine</span>
          </motion.div>

          {/* Two-column editorial layout */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-0 items-start relative">

            {/* ─── Left column — Text ─── */}
            <div className="relative z-10 pb-12 lg:pb-20">
              {/* Accent square */}
              <motion.div className={`w-8 h-8 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} mb-8`} {...fade(0.05)} />

              {/* Label */}
              <motion.p className={`text-[10px] font-mono uppercase tracking-[0.3em] ${c.textMuted} mb-6`} {...fade(0.1)}>
                DV-HM002
                <span className="ml-8">Second Brain</span>
              </motion.p>

              {/* Main headline */}
              <motion.h2
                className={`text-5xl md:text-6xl lg:text-[5.5rem] font-bold tracking-tight leading-[0.95] ${c.text} font-['Space_Grotesk']`}
                {...fade(0.15)}
              >
                <span className={`block ${c.accent}`}>HIVEMIND</span>
                <span className="block text-[0.6em]">Your Sovereign</span>
                <span className="block text-[0.6em]">Memory Engine</span>
              </motion.h2>

              {/* Subtitle */}
              <motion.p className={`text-sm ${c.textSecondary} mt-8 max-w-md leading-relaxed`} {...fade(0.2)}>
                Your second brain that never forgets. Connect your emails, notes, conversations — ask any question months later and get the{' '}
                <span className={`${c.text} font-medium`}>exact answer.</span>
              </motion.p>

              {/* CTA row */}
              <motion.div className="flex items-center gap-6 mt-10" {...fade(0.25)}>
                <Link
                  to="/hivemind/login"
                  className={`flex items-center gap-3 ${c.accentBg} ${c.accentText} font-semibold rounded-full ${c.accentHover} uppercase tracking-[0.1em] pl-7 pr-5 py-3.5 text-xs transition-colors no-underline`}
                >
                  Try Free
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/benchmark"
                  className={`${c.text} font-medium text-sm transition-colors no-underline border-b ${c.border} pb-0.5 ${isDark ? 'hover:text-white/60' : 'hover:text-[#525252]'}`}
                >
                  87.2% Accuracy
                </Link>
              </motion.div>

              {/* Key numbers */}
              <motion.div className={`flex gap-8 mt-12 pt-8 border-t ${c.border}`} {...fade(0.3)}>
                {[
                  { val: '<50ms', label: 'Recall' },
                  { val: '87.2%', label: 'Accuracy' },
                  { val: '∞', label: 'Memory' },
                ].map(s => (
                  <div key={s.label}>
                    <span className={`text-2xl font-bold font-mono ${c.text}`}>{s.val}</span>
                    <span className={`block text-[9px] font-mono uppercase tracking-widest ${c.textMuted} mt-1`}>{s.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ─── Right column — Interactive demo + graph ─── */}
            <motion.div
              className="relative lg:-mr-10"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2, ease }}
            >
              <div className="relative">
                {/* Accent square overlay */}
                <div className={`absolute -top-4 -left-4 w-16 h-16 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} z-20`} />

                {/* Brain graph — raw, no bounding box */}
                <div className="flex items-center justify-center h-[320px] md:h-[380px] relative">
                  <HiveMind
                    width={500}
                    height={360}
                    nodeCount={90}
                    connectionDistance={52}
                    nodeColor={isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(10, 10, 10, 0.45)'}
                    lineColor={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(10, 10, 10, 0.06)'}
                    backgroundColor="transparent"
                  />
                  {/* Subtle label on graph */}
                  <span className={`absolute bottom-4 right-4 text-[8px] font-mono uppercase tracking-[0.2em] ${c.textMuted}`}>
                    Interactive · hover to explore
                  </span>
                </div>

                {/* Interactive recall demo — below graph, minimal border */}
                <div className={`mt-4 border ${c.border} ${isDark ? 'bg-[#0c0d0f]/60' : 'bg-white/60'} backdrop-blur-sm`}>
                    <div className={`px-5 py-3 border-b ${c.border}`}>
                      <div className={`flex items-center gap-3 px-4 py-3 border ${c.border} ${isDark ? 'bg-white/[0.02]' : 'bg-black/[0.02]'}`}>
                        <span className={`text-xs font-mono ${c.textMuted}`}>&gt;</span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={activeDemo}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`text-sm ${c.text} flex-1`}
                          >
                            {activeDemo >= 0 ? demos[activeDemo].q : 'Ask your memory anything...'}
                          </motion.span>
                        </AnimatePresence>
                        {activeDemo >= 0 && (
                          <span className={`text-[8px] font-mono ${isDark ? 'text-[#7ddc6f]' : 'text-[#16a34a]'}`}>{demos[activeDemo].n} found</span>
                        )}
                      </div>
                    </div>

                    {/* Answer area */}
                    <div className="px-5 py-4 min-h-[60px]">
                      <AnimatePresence mode="wait">
                        {activeDemo >= 0 ? (
                          <motion.p
                            key={`a-${activeDemo}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`text-sm ${c.text} leading-relaxed`}
                          >
                            {demos[activeDemo].a}
                          </motion.p>
                        ) : (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} className={`text-sm ${c.textMuted}`}>
                            Try an example below
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Example buttons */}
                    <div className={`px-5 pb-4 flex flex-wrap gap-1.5`}>
                      {demos.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => handleDemo(i)}
                          className={`px-3 py-1.5 text-[9px] font-mono border cursor-pointer transition-all ${
                            activeDemo === i
                              ? (isDark ? 'bg-white/[0.08] border-white/20 text-white' : 'bg-black/[0.05] border-black/15 text-black')
                              : `${c.border} ${isDark ? 'bg-white/[0.02] text-white/50 hover:bg-white/[0.05]' : 'bg-black/[0.01] text-black/40 hover:bg-black/[0.03]'}`
                          }`}
                        >
                          {d.q.length > 28 ? d.q.slice(0, 28) + '...' : d.q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom accent square */}
                <div className={`absolute -bottom-3 -right-3 w-10 h-10 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} z-20`} />
              </div>
            </motion.div>
          </div>

          {/* ─── Feature cards ─── */}
          <motion.div className={`py-16 border-t ${c.border}`} {...fade(0)}>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted} block mb-10`}>How it works</span>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { n: '01', title: 'It remembers everything', desc: 'Every conversation, email, and document — stored, indexed, and connected.', tag: 'Total recall' },
                { n: '02', title: 'It connects the dots', desc: 'Related ideas from Slack, Gmail, and your docs? Linked automatically.', tag: 'Knowledge graph' },
                { n: '03', title: 'It gets smarter over time', desc: 'Three AI agents scan for duplicates, conflicts, and missing links.', tag: 'Self-improving' },
                { n: '04', title: 'Your data stays yours', desc: 'Hosted in Frankfurt. GDPR by architecture. Zero US data transfers.', tag: 'EU sovereign' },
              ].map((f, i) => (
                <motion.div
                  key={f.n}
                  {...fade(0.05 + i * 0.06)}
                  className={`${c.bgCard} border ${c.border} p-5 ${c.shadow}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-7 h-7 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} flex items-center justify-center shrink-0`}>
                      <span className={`text-[9px] font-mono font-bold ${isDark ? 'text-[#080808]' : 'text-white'}`}>{f.n}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className={`text-sm font-semibold ${c.text} font-['Space_Grotesk']`}>{f.title}</h4>
                        <span className={`text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 ${isDark ? 'bg-white/[0.05] text-white/40' : 'bg-black/[0.03] text-black/35'}`}>{f.tag}</span>
                      </div>
                      <p className={`text-xs ${c.textSecondary} leading-relaxed`}>{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ─── Use cases ─── */}
          <motion.div className={`pb-16 border-t ${c.border} pt-12`} {...fade(0)}>
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted} block mb-3`}>Built for</span>
            <h3 className={`text-2xl md:text-3xl font-bold ${c.text} font-['Space_Grotesk'] mb-8`}>
              Anyone who thinks for a living
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { e: '💼', t: 'Founders', d: 'Never lose a meeting insight or investor feedback.' },
                { e: '🧑‍💻', t: 'Developers', d: 'Codebase context and decisions — always retrievable.' },
                { e: '📝', t: 'Researchers', d: 'Connect papers, notes, and conversations.' },
                { e: '🏢', t: 'Teams', d: 'Shared memory. When someone leaves, knowledge stays.' },
              ].map((u, i) => (
                <motion.div key={u.t} {...fade(0.05 + i * 0.04)} className={`${c.bgCard} border ${c.border} p-4 ${c.shadow}`}>
                  <span className="text-xl mb-2 block">{u.e}</span>
                  <h4 className={`text-xs font-semibold ${c.text} font-['Space_Grotesk'] mb-1`}>{u.t}</h4>
                  <p className={`text-[11px] ${c.textSecondary} leading-relaxed`}>{u.d}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom metadata row */}
          <motion.div className={`flex items-center justify-between py-6 border-t ${c.border}`} {...fade(0.3)}>
            <span className={`text-[10px] font-mono ${c.textMuted}`}>HIVEMIND Memory Engine</span>
            <span className={`text-[10px] font-mono ${c.textMuted}`}>EU Sovereign · GDPR Native</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SolutionHivemind;
