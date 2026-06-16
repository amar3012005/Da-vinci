/**
 * MemoryMoss — organisation memory constellation (premium dark edition).
 *
 * Aesthetic: deep-space "second brain". A living yellow-green sun at the centre
 * (the org), straight light-spokes fading into the dark toward glass hub nodes
 * (Projects / Meetings / Connectors / Employees / Personal / Knowledge), each
 * wrapped in a soft halo ring. Faint secondary pills drift beyond. Atmosphere
 * from a layered radial vignette, fine dot-grid, and a subtle grain overlay.
 *
 * Orchestrated load: sun blooms → spokes draw outward → hubs pop in sequence →
 * pills fade. Idle: the sun breathes and hubs float gently. Click a hub to
 * re-centre (recenter hook). `theme="day"` flips to the light app skin.
 *
 * React + framer-motion + tailwind. No new deps.
 */
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Mic, Plug, Users, UserRound, BookOpen } from 'lucide-react';

const DEFAULT_PRIMARIES = [
  { key: 'projects',   label: 'Projects',   Icon: FolderOpen },
  { key: 'meetings',   label: 'Meetings',   Icon: Mic },
  { key: 'connectors', label: 'Connectors', Icon: Plug },
  { key: 'employees',  label: 'Employees',  Icon: Users },
  { key: 'personal',   label: 'Personal',   Icon: UserRound },
  { key: 'knowledge',  label: 'Knowledge',  Icon: BookOpen },
];

const THEMES = {
  night: {
    bg: '#070708', vignette: 'rgba(40,44,30,0.16)', dot: 'rgba(255,255,255,0.045)',
    line: '#e9ff6a', title: '#f6f6f4', sub: 'rgba(246,246,244,0.45)',
    nodeBg: 'rgba(255,255,255,0.05)', nodeBorder: 'rgba(255,255,255,0.16)',
    halo: 'rgba(233,255,106,0.0)', haloHover: 'rgba(233,255,106,0.30)',
    nodeIcon: '#e7e7e3', pill: 'rgba(255,255,255,0.045)', pillBorder: 'rgba(255,255,255,0.07)',
    addBg: 'rgba(255,255,255,0.06)', addBorder: 'rgba(255,255,255,0.16)', addIcon: '#e7e7e3',
  },
  day: {
    bg: '#faf9f4', vignette: 'rgba(17,125,255,0.05)', dot: 'rgba(10,10,10,0.05)',
    line: '#117dff', title: '#0a0a0a', sub: '#8a8a8a',
    nodeBg: 'rgba(255,255,255,0.7)', nodeBorder: 'rgba(255,255,255,0.85)',
    halo: 'rgba(17,125,255,0)', haloHover: 'rgba(17,125,255,0.22)',
    nodeIcon: '#525252', pill: 'rgba(255,255,255,0.62)', pillBorder: 'rgba(255,255,255,0.8)',
    addBg: 'rgba(255,255,255,0.7)', addBorder: 'rgba(255,255,255,0.85)', addIcon: '#117dff',
  },
};

function seed(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

export default function MemoryMoss({
  orgName = 'Supercomputer memory',
  subtitle = 'Learning from every chat',
  primaries = DEFAULT_PRIMARIES,
  theme = 'night',
  onSelectPrimary,
  onAddMemory,
  memories = [],       // real memory nodes from graphData
  hubCounts = {},      // { projects, meetings, connectors, employees, personal, knowledge }
}) {
  const T = THEMES[theme] || THEMES.night;
  const isNight = theme !== 'day';
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 1180, h: 980 });
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      // Clamp to the visible viewport — guards against an over-tall host so the
      // composition stays centred in what the user actually sees.
      const vh = typeof window !== 'undefined' ? window.innerHeight : r?.height || 800;
      if (r && r.width > 50 && r.height > 50) setSize({ w: r.width, h: Math.min(r.height, vh) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    const cx = size.w / 2, cy = size.h / 2;
    const R = Math.min(size.w, size.h);
    const rNode = R * 0.27;
    const rSec = R * 0.42;
    const N = primaries.length || 1;
    const nodes = [], lines = [], ghosts = [];

    primaries.forEach((p, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const x = cx + Math.cos(a) * rNode, y = cy + Math.sin(a) * rNode;
      nodes.push({ ...p, x, y, a, float: 4 + seed(p.key) * 4, delay: seed(p.key) * 2, count: hubCounts[p.key] ?? null });
      lines.push({ id: `l-${p.key}`, key: p.key, x1: cx, y1: cy, x2: x, y2: y });
      // Use real memories for ghost pills when available, fall back to generated placeholders.
      const hubMemories = memories.filter((m) => (m.category || m.type || '').toLowerCase() === p.key || (m.projectKey || '').toLowerCase() === p.key);
      const ghostMemories = hubMemories.length > 0 ? hubMemories.slice(0, 3) : [];
      const ghostCount = ghostMemories.length || (1 + Math.round(seed(p.key)));
      for (let g = 0; g < ghostCount; g++) {
        const ga = a + (g === 0 ? -0.17 : 0.19) + (seed(p.key + g) - 0.5) * 0.05;
        const gr = rSec + (seed(p.key + 'r' + g) - 0.5) * R * 0.06;
        const gx = cx + Math.cos(ga) * gr, gy = cy + Math.sin(ga) * gr;
        // Suppress any placeholder that would land in the top title band.
        if (gy < size.h * 0.17) continue;
        const realMem = ghostMemories[g];
        const label = realMem?.title || realMem?.content?.slice(0, 40) || null;
        const w = label ? Math.min(200, 80 + label.length * 5.5) : (78 + seed(p.key + g) * 78);
        ghosts.push({ id: `g-${p.key}-${g}`, x: gx, y: gy, key: p.key, w, label });
        lines.push({ id: `lg-${p.key}-${g}`, key: p.key, x1: x, y1: y, x2: gx, y2: gy, ghost: true });
      }
    });
    return { cx, cy, R, nodes, lines, ghosts };
  }, [primaries, size, hubCounts, memories]);

  const dim = (key) => hover && hover !== key;

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full min-h-[640px] overflow-hidden select-none"
      style={{ background: T.bg }}
    >
      {/* Atmosphere: radial vignette glow + fine dot grid + grain */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 50%, ${T.vignette} 0%, transparent 55%)` }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `radial-gradient(circle, ${T.dot} 1px, transparent 1px)`, backgroundSize: '28px 28px', maskImage: 'radial-gradient(circle at 50% 50%, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 30%, transparent 80%)' }} />
      {isNight && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-screen"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      )}

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
        className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none z-30" style={{ top: '6.5%' }}
      >
        <div className="font-bold tracking-[-0.03em]" style={{
          fontSize: 'clamp(26px, 3.2vw, 40px)',
          background: isNight ? 'linear-gradient(180deg, #ffffff 0%, #c9c9c4 100%)' : 'none',
          color: isNight ? 'transparent' : T.title,
          WebkitBackgroundClip: isNight ? 'text' : undefined, backgroundClip: isNight ? 'text' : undefined,
          textShadow: isNight ? '0 2px 30px rgba(233,255,106,0.10)' : 'none',
        }}>{orgName}</div>
        <div className="mt-1" style={{ color: T.sub, fontSize: 'clamp(13px,1.4vw,17px)', letterSpacing: '0.01em' }}>{subtitle}</div>
      </motion.div>

      {/* Spokes (gradient: bright at core → fade) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" width={size.w} height={size.h}>
        <defs>
          {layout.lines.map((l) => (
            <linearGradient key={`grad-${l.id}`} id={`grad-${l.id}`} gradientUnits="userSpaceOnUse" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}>
              <stop offset="0%" stopColor={T.line} stopOpacity={l.ghost ? 0.22 : 0.7} />
              <stop offset="100%" stopColor={T.line} stopOpacity={l.ghost ? 0.05 : 0.2} />
            </linearGradient>
          ))}
        </defs>
        {layout.lines.map((l) => (
          <motion.line
            key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={`url(#grad-${l.id})`} strokeWidth={l.ghost ? 0.8 : 1.4} strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: dim(l.key) ? 0.25 : (hover === l.key ? 1 : 0.9) }}
            transition={{ pathLength: { duration: 0.7, delay: l.ghost ? 0.5 : 0.15, ease: 'easeOut' }, opacity: { duration: 0.3 } }}
          />
        ))}
      </svg>

      {/* Secondary placeholder pills */}
      {layout.ghosts.map((g) => (
        <motion.div
          key={g.id}
          initial={{ opacity: 0 }} animate={{ opacity: dim(g.key) ? 0.12 : 0.5 }} transition={{ delay: 0.6, duration: 0.5 }}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full z-10 flex items-center justify-center px-3"
          style={{ left: g.x, top: g.y, width: g.w, height: 28, background: T.pill, border: `1px solid ${T.pillBorder}`, backdropFilter: 'blur(8px)' }}
        >
          {g.label && (
            <span className="text-[10px] truncate whitespace-nowrap" style={{ color: T.sub, maxWidth: g.w - 24 }}>
              {g.label}
            </span>
          )}
        </motion.div>
      ))}

      {/* Sun core — layered atmospheric glow + breathing sphere + rotating sheen */}
      <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: layout.cx, top: layout.cy }}>
        {/* far atmospheric haze — perfectly symmetric, centred, no directional leak */}
        <motion.div
          animate={{ opacity: [0.45, 0.62, 0.45], scale: [1, 1.06, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{ left: '50%', top: '50%', width: 280, height: 280, background: 'radial-gradient(circle, rgba(216,255,63,0.20) 0%, rgba(150,200,40,0.08) 38%, transparent 66%)' }}
        />
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          className="relative"
        >
          <motion.div
            animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-[104px] h-[104px] rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              left: '50%', top: '50%',
              background: 'radial-gradient(circle at 40% 34%, #fdffe6 0%, #eaff5a 30%, #c8f02a 60%, #97c81f 88%, #7faf17 100%)',
              boxShadow: '0 0 50px 6px rgba(216,255,63,0.42), inset 0 -8px 22px rgba(120,160,20,0.55), inset 0 6px 16px rgba(255,255,220,0.7)',
            }}
          >
            <div className="absolute rounded-full" style={{ left: '30%', top: '24%', width: 26, height: 18, background: 'radial-gradient(circle, rgba(255,255,255,0.95), transparent 70%)', filter: 'blur(2px)' }} />
          </motion.div>
        </motion.div>
      </div>

      {/* Add memory — below the core */}
      <motion.button
        onClick={() => onAddMemory && onAddMemory()}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
        className="absolute z-30 flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2 group"
        style={{ left: layout.cx, top: layout.cy + layout.R * 0.225 }}
      >
        <span className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-extralight transition-all group-hover:scale-105 group-active:scale-95"
          style={{ background: isNight ? 'rgba(20,22,16,0.82)' : T.addBg, border: `1px solid ${T.addBorder}`, color: T.addIcon, backdropFilter: 'blur(12px)', boxShadow: isNight ? '0 6px 20px rgba(0,0,0,0.5)' : '0 6px 20px rgba(0,0,0,0.08)' }}>+</span>
        <span className="text-[12px] tracking-wide" style={{ color: T.sub }}>Add memory</span>
      </motion.button>

      {/* Primary glass hubs (halo ring + glass disc + icon, gentle float) */}
      {layout.nodes.map((n, i) => {
        const Icon = n.Icon;
        const active = hover === n.key;
        return (
          <motion.div
            key={n.key}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: n.x, top: n.y }}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: dim(n.key) ? 0.45 : 1, scale: 1, y: [0, -n.float, 0] }}
            transition={{
              opacity: { delay: 0.25 + i * 0.07, duration: 0.4 },
              scale: { delay: 0.25 + i * 0.07, type: 'spring', stiffness: 240, damping: 18 },
              y: { duration: 6 + n.float, repeat: Infinity, ease: 'easeInOut', delay: n.delay },
            }}
          >
            <button
              onMouseEnter={() => setHover(n.key)} onMouseLeave={() => setHover(null)}
              onClick={() => onSelectPrimary && onSelectPrimary(n)}
              className="relative flex items-center justify-center rounded-full transition-transform duration-300 hover:scale-110"
              style={{ width: 56, height: 56 }}
              title={`${n.label}${n.count != null ? ` · ${n.count}` : ''}`}
            >
              {/* halo ring */}
              <span className="absolute rounded-full transition-all duration-300"
                style={{ inset: -7, border: `1px solid ${active ? T.haloHover : T.nodeBorder}`, opacity: active ? 1 : 0.5, boxShadow: active ? `0 0 22px ${T.haloHover}` : 'none' }} />
              {/* glass disc */}
              <span className="absolute inset-0 rounded-full"
                style={{ background: T.nodeBg, border: `1px solid ${T.nodeBorder}`, backdropFilter: 'blur(12px)', boxShadow: isNight ? 'inset 0 1px 1px rgba(255,255,255,0.12), 0 8px 22px rgba(0,0,0,0.5)' : 'inset 0 1px 2px rgba(255,255,255,0.9), 0 8px 22px rgba(0,0,0,0.08)' }} />
              {Icon ? <Icon size={20} strokeWidth={1.6} style={{ color: T.nodeIcon, position: 'relative', filter: active ? `drop-shadow(0 0 6px ${T.haloHover})` : 'none' }} /> : null}
              {n.count != null && (
                <span className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9.5px] font-bold flex items-center justify-center z-10"
                  style={{ background: T.bg, border: `1px solid ${T.nodeBorder}`, color: T.nodeIcon }}>{n.count}</span>
              )}
            </button>
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[11px] font-medium tracking-wide whitespace-nowrap transition-opacity duration-200"
              style={{ color: isNight ? '#e7e7e3' : '#525252', opacity: active ? 1 : 0 }}>{n.label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
