import React from 'react';
import { motion } from 'framer-motion';
import { useTheme, t } from './ThemeContext';
import { Link } from 'react-router-dom';
import HiveMind from '../hivemind/cartesia/HiveMind';

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

const CrosshairMark = ({ className = '', isDark }) => (
  <div className={`absolute w-8 h-8 pointer-events-none ${className}`}>
    <div className={`absolute left-0 top-1/2 w-8 h-px ${isDark ? 'bg-white/38' : 'bg-black/25'}`} />
    <div className={`absolute top-0 left-1/2 h-8 w-px ${isDark ? 'bg-white/38' : 'bg-black/25'}`} />
  </div>
);

const HudChip = ({ children, isDark, strong = false }) => (
  <div className={`px-4 py-3 border ${isDark ? 'border-white/10' : 'border-black/10'} ${strong ? (isDark ? 'bg-white/[0.08]' : 'bg-black/[0.05]') : (isDark ? 'bg-white/[0.04]' : 'bg-black/[0.03]')}`}>
    <span className={`text-[8px] font-mono uppercase tracking-[0.24em] ${isDark ? 'text-white/72' : 'text-black/55'}`}>{children}</span>
  </div>
);

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

  const cities = [
    { time: '04:00:34', city: 'Paris', line1: '3 Pl. des Victoires', line2: '75001 Paris, France' },
    { time: '04:00:34', city: 'Berlin', line1: 'Unter den Linden 77', line2: '10117 Berlin, Germany' },
    { time: '04:00:34', city: 'Dubai', line1: 'DIFC Node Cluster', line2: 'Sovereign relay zone' },
  ];

  return (
    <section className={`${c.bg} border-t ${c.border} relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute inset-0 ${isDark ? 'bg-[radial-gradient(circle_at_18%_16%,rgba(98,135,94,0.18),transparent_28%),radial-gradient(circle_at_76%_44%,rgba(126,145,156,0.16),transparent_30%),radial-gradient(circle_at_72%_78%,rgba(173,128,72,0.18),transparent_34%)]' : 'bg-[radial-gradient(circle_at_18%_16%,rgba(130,160,120,0.10),transparent_28%),radial-gradient(circle_at_76%_44%,rgba(120,130,140,0.10),transparent_30%),radial-gradient(circle_at_72%_78%,rgba(176,150,120,0.12),transparent_34%)]'}`} />
        <div className={`absolute inset-0 ${isDark ? 'bg-black/72' : 'bg-[#f7f4ed]/78'} backdrop-blur-[40px]`} />
      </div>
      <div className={`max-w-[1200px] mx-auto border-x ${c.border}`}>

        {/* ─── Hero area ─── */}
        <div className="px-6 md:px-10 lg:px-20 pt-20 lg:pt-32 pb-16 relative">
          <CrosshairMark isDark={isDark} className="left-0 top-24 -translate-x-1/2" />
          <CrosshairMark isDark={isDark} className="right-0 top-24 translate-x-1/2" />
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex flex-wrap gap-2 mb-8">
              <HudChip isDark={isDark} strong>HIVEMIND</HudChip>
              <HudChip isDark={isDark}>Memory sync</HudChip>
              <HudChip isDark={isDark}>EU sovereign</HudChip>
              <HudChip isDark={isDark}>MCP native</HudChip>
            </div>
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
        <div className="px-6 md:px-10 lg:px-20 pb-16 relative">
          <CrosshairMark isDark={isDark} className="left-0 bottom-8 -translate-x-1/2" />
          <CrosshairMark isDark={isDark} className="right-0 bottom-8 translate-x-1/2" />
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — Live brain network */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="absolute -top-4 right-4 z-10"><CheckerBlock isDark={isDark} size={4} /></div>

              <div className={`${isDark ? 'bg-[#121315]/72' : 'bg-white/70'} border ${c.border} ${c.shadow} relative overflow-hidden backdrop-blur-xl`}>
                <div className="px-5 pt-5">
                  <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-2">
                    <HudChip isDark={isDark} strong>HIVEMIND</HudChip>
                    <HudChip isDark={isDark}>Map</HudChip>
                    <HudChip isDark={isDark}>Recall</HudChip>
                    <HudChip isDark={isDark}>Contact</HudChip>
                  </div>
                </div>

                <div className="px-5 pt-16 pb-10 flex items-center justify-center min-h-[360px]">
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

                <div className="px-5 pb-5 space-y-2">
                  <div className="grid grid-cols-[1fr_1fr] gap-2">
                    <HudChip isDark={isDark}>Info & credits</HudChip>
                    <HudChip isDark={isDark}>Launch campaign</HudChip>
                  </div>
                  <div className={`px-4 py-3 border ${c.border} ${isDark ? 'bg-white/[0.05]' : 'bg-black/[0.03]'} flex items-center justify-between gap-3`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2.5 h-2.5 bg-[#f97316]" />
                      <span className={`text-[8px] font-mono uppercase tracking-[0.24em] ${c.text}`}>Pause</span>
                      <div className={`h-px flex-1 min-w-[80px] ${isDark ? 'bg-white/20' : 'bg-black/12'}`} />
                    </div>
                    <span className={`text-[8px] font-mono uppercase tracking-[0.24em] ${c.textMuted}`}>00:54</span>
                    <span className="text-[8px] font-mono uppercase tracking-[0.24em] text-[#7ddc6f]">Sound on</span>
                  </div>
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
              <div className={`${isDark ? 'bg-[#17181a]/66' : 'bg-white/64'} border ${c.border} p-5 backdrop-blur-xl`}>
                <div className="grid grid-cols-[1.15fr_1fr] gap-2 mb-4">
                  <HudChip isDark={isDark} strong>Info & credits</HudChip>
                  <HudChip isDark={isDark}>Memory relay</HudChip>
                </div>
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
              <div className={`${isDark ? 'bg-[#17181a]/66' : 'bg-white/64'} border ${c.border} p-5 backdrop-blur-xl`}>
                <div className={`text-[8px] font-mono ${c.textMuted} uppercase tracking-widest mb-3`}>Context-Aware Recall</div>
                <div className={`${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]'} border ${c.border} p-4`}>
                  <p className={`text-sm ${c.text} leading-relaxed`}>
                    <span className={`font-mono text-xs ${c.textMuted}`}>&gt; recall</span> "What was the deployment fix from last Tuesday?"
                  </p>
                  <div className={`mt-3 pt-3 border-t ${c.border}`}>
                    <span className={`text-[9px] font-mono ${c.textMuted}`}>[3 memories found — 42ms]</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {cities.map((item) => (
                    <div key={item.city}>
                      <div className={`text-[8px] font-mono uppercase tracking-[0.2em] ${c.textMuted}`}>{item.time}</div>
                      <div className={`mt-4 text-[11px] font-mono uppercase tracking-[0.16em] ${c.text}`}>{item.city}</div>
                      <div className={`mt-3 text-[10px] font-mono leading-[1.35] ${c.textMuted}`}>
                        <div>{item.line1}</div>
                        <div>{item.line2}</div>
                      </div>
                    </div>
                  ))}
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
