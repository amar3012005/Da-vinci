import React from 'react';
import { motion } from 'framer-motion';
import { useTheme, t } from './ThemeContext';
import { Link } from 'react-router-dom';
import HiveMind from '../hivemind/cartesia/HiveMind';

/* ── Pixel / Dither decorative elements ─────────────────── */

const DitherCorner = ({ isDark }) => {
  const fg = isDark ? 'bg-white' : 'bg-[#0a0a0a]';
  const fgSoft = isDark ? 'bg-white/15' : 'bg-black/8';
  return (
    <div className="flex flex-col gap-0">
      {Array.from({ length: 8 }).map((_, row) => (
        <div key={row} className="flex gap-0">
          {Array.from({ length: 8 }).map((_, col) => {
            const dist = row + col;
            const show = dist < 4;
            const edge = dist >= 4 && dist < 6;
            const scatter = dist >= 6 && dist < 8 && (row + col) % 3 === 0;
            return <div key={col} className={`w-[5px] h-[5px] ${show ? fg : edge ? fgSoft : scatter ? fgSoft : 'bg-transparent'}`} />;
          })}
        </div>
      ))}
    </div>
  );
};

const DataMatrix = ({ isDark }) => {
  const nums = [[1,0,1,2,1],[2,1,0,1,0],[1,2,1,1,2]];
  const fg = isDark ? 'text-white/25' : 'text-black/15';
  const fgFill = isDark ? 'bg-white text-[#080808]' : 'bg-[#0a0a0a] text-white';
  return (
    <div className="flex flex-col gap-0">
      {nums.map((row, ri) => (
        <div key={ri} className="flex gap-0">
          {row.map((n, ci) => {
            const filled = (ri === 1 && ci === 2) || (ri === 0 && ci === 4);
            return <div key={ci} className={`w-4 h-4 flex items-center justify-center text-[6px] font-mono ${filled ? fgFill : fg}`}>{n}</div>;
          })}
        </div>
      ))}
    </div>
  );
};

const CheckerBlock = ({ isDark, size = 4 }) => {
  const fg = isDark ? 'bg-white' : 'bg-[#0a0a0a]';
  return (
    <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${size}, 5px)` }}>
      {Array.from({ length: size * size }).map((_, i) => {
        const on = (Math.floor(i / size) + i % size) % 2 === 0;
        return <div key={i} className={`w-[5px] h-[5px] ${on ? fg : 'bg-transparent'}`} />;
      })}
    </div>
  );
};

const TermLabel = ({ text, isDark }) => (
  <div className={`inline-flex items-center px-2 py-1 border ${isDark ? 'border-white/15' : 'border-black/10'}`}>
    <span className={`text-[7px] font-mono uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-black/30'}`}>{text}</span>
  </div>
);

const DotBar = ({ value = 70, isDark }) => {
  const total = 20;
  const filled = Math.round((value / 100) * total);
  return (
    <div className="flex gap-[1px]">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`w-[4px] h-[6px] ${i < filled ? (isDark ? 'bg-white' : 'bg-[#0a0a0a]') : (isDark ? 'bg-white/10' : 'bg-black/5')}`} />
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   FULL PAGE — HIVEMIND Memory Engine
   ═══════════════════════════════════════════════════════════ */

const SolutionHivemind = () => {
  const { isDark } = useTheme();
  const c = t(isDark);

  const coreFeatures = [
    { title: 'Knowledge Graph', desc: 'Structured relationships between entities, decisions, and execution traces' },
    { title: 'Cross-Platform Sync', desc: 'Gmail, Slack, GitHub, Notion — unified into one sovereign memory' },
    { title: 'EU Sovereign', desc: 'Runs exclusively on Hetzner, OVH, Scaleway. Zero transatlantic transfer' },
    { title: 'MCP Protocol', desc: 'Native Model Context Protocol — Claude, Cursor, VS Code out of the box' },
  ];

  const stats = [
    { label: 'Recall', value: '<50ms', pct: 20 },
    { label: 'Languages', value: '40+', pct: 85 },
    { label: 'Uptime', value: '99.9%', pct: 99 },
  ];

  const tools = [
    'add_memory', 'search_memories', 'get_memory', 'delete_memory',
    'add_relation', 'get_relations', 'knowledge_upload', 'memory_health', 'bulk_ingest',
  ];

  return (
    <section className={`${c.bg} border-t ${c.border}`}>
      <div className={`max-w-[1200px] mx-auto border-x ${c.border}`}>

        {/* ─── Hero area ─── */}
        <div className="px-6 md:px-10 lg:px-20 pt-20 lg:pt-32 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <p className={`text-xs font-mono uppercase tracking-widest ${c.textMuted} mb-4`}>
              Solutions / 02
            </p>
            <h2 className={`text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] ${c.text} font-['Space_Grotesk'] mb-6`}>
              <span className={c.accent}>HIVEMIND</span>
              <br />
              Memory Engine
            </h2>
            <p className={`text-xl md:text-2xl ${c.textSecondary} leading-relaxed max-w-2xl`}>
              Give your AI a perfect memory. Europe's sovereign memory engine and API — we handle the vector graphs, context, and compliance. Your agents just remember.
            </p>
          </motion.div>
        </div>

        {/* ─── Brain visualization + Stats ─── */}
        <div className="px-6 md:px-10 lg:px-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — Live brain network */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              {/* Pixel decorations */}
              <div className="absolute -top-3 -left-3 z-10"><DitherCorner isDark={isDark} /></div>
              <div className="absolute -top-5 right-6 z-10"><DataMatrix isDark={isDark} /></div>
              <div className="absolute -bottom-3 -right-2 z-10"><CheckerBlock isDark={isDark} size={5} /></div>

              <div className={`${c.bgCard} border ${c.border} ${c.shadow} relative overflow-hidden`}>
                <div className={`px-5 py-2.5 border-b ${c.border} flex items-center justify-between`}>
                  <span className={`text-[8px] font-mono uppercase tracking-[0.2em] ${c.textMuted}`}>
                    HIVEMIND // NEURAL MAP
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} animate-pulse`} />
                    <span className={`text-[7px] font-mono ${c.textMuted}`}>LIVE</span>
                  </div>
                </div>

                <div className="flex items-center justify-center">
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

                <div className={`px-5 py-2.5 border-t ${c.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <TermLabel text="Vector" isDark={isDark} />
                    <TermLabel text="Graph" isDark={isDark} />
                    <TermLabel text="Search" isDark={isDark} />
                  </div>
                  <span className={`text-[7px] font-mono ${c.textMuted}`}>DV-02</span>
                </div>
              </div>
            </motion.div>

            {/* Right — Stats + recall demo */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="space-y-4"
            >
              {/* Stats card */}
              <div className={`${c.bgCard} border ${c.border} p-5`}>
                <div className={`text-[8px] font-mono ${c.textMuted} uppercase tracking-widest mb-4`}>Performance</div>
                {stats.map((s, i) => (
                  <div key={i} className={`py-3 ${i < stats.length - 1 ? `border-b ${c.border}` : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[9px] font-mono uppercase tracking-widest ${c.textMuted}`}>{s.label}</span>
                      <span className={`text-sm font-semibold ${c.text} font-mono`}>{s.value}</span>
                    </div>
                    <DotBar value={s.pct} isDark={isDark} />
                  </div>
                ))}
              </div>

              {/* Recall demo card */}
              <div className={`${c.bgCard} border ${c.border} p-5`}>
                <div className={`text-[8px] font-mono ${c.textMuted} uppercase tracking-widest mb-3`}>Context-Aware Recall</div>
                <div className={`${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]'} border ${c.border} p-4`}>
                  <p className={`text-sm ${c.text} leading-relaxed`}>
                    <span className={`font-mono text-xs ${c.textMuted}`}>&gt; recall</span> "What was the deployment fix from last Tuesday?"
                  </p>
                  <div className={`mt-3 pt-3 border-t ${c.border}`}>
                    <span className={`text-[9px] font-mono ${c.textMuted}`}>[3 memories found — 42ms]</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ─── Core features ─── */}
        <div className={`px-6 md:px-10 lg:px-20 py-16 border-t ${c.border}`}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>
              Core capabilities
            </span>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {coreFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`${c.bgCard} border ${c.border} p-6 ${c.shadow}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-[#080808]' : 'text-white'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div>
                    <h4 className={`text-base font-semibold ${c.text} font-['Space_Grotesk'] mb-2`}>{f.title}</h4>
                    <p className={`text-sm ${c.textSecondary} leading-relaxed`}>{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ─── MCP Tools grid ─── */}
        <div className={`px-6 md:px-10 lg:px-20 py-16 border-t ${c.border}`}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>
                9 MCP Tools
              </span>
              <Link to="/hivemind" className={`${c.accent} hover:underline text-sm font-medium`}>
                Explore HIVEMIND &rarr;
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {tools.map((tool) => (
                <div
                  key={tool}
                  className={`px-3 py-1.5 border ${c.border} ${c.bgCard} text-[10px] font-mono ${c.textMuted} tracking-wide`}
                >
                  {tool}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </section>
  );
};

export default SolutionHivemind;
