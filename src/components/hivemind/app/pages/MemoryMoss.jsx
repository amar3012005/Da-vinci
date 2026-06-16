/**
 * MemoryMoss — a calm, deterministic "organic growth" view of the memory graph.
 *
 * NOT a force simulation. Memories are laid out as a recursive radial tree that
 * spreads from a central glass core outward like moss / mycelium:
 *   core → category hubs (one per memory_type) → memory leaves (sub-fanned).
 * Big categories sprout a second tier so the structure fills the whole canvas.
 *
 * Rendering = SVG branches (curved bezier tendrils, drawn outward in a depth
 * stagger) + absolutely-positioned glassmorphic DOM nodes (frosted blur, soft
 * shadow, an emoji per memory type). Light / day theme to match the app.
 *
 * Props:
 *   memories        [{ id, title, memory_type, ... }]
 *   orgName         string   — label under the core
 *   onSelectMemory  (memory) => void
 *   onAddMemory     () => void
 */
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// ─── Per-type identity (emoji + tint) ───────────────────────────────────────
const TYPE_META = {
  fact:         { emoji: '💡', color: '#117dff', label: 'Facts' },
  conversation: { emoji: '💬', color: '#0ea5e9', label: 'Conversations' },
  decision:     { emoji: '✅', color: '#FF8A34', label: 'Decisions' },
  preference:   { emoji: '❤️', color: '#ec4899', label: 'Preferences' },
  event:        { emoji: '📅', color: '#9C27B0', label: 'Events' },
  goal:         { emoji: '🎯', color: '#16a34a', label: 'Goals' },
  lesson:       { emoji: '📘', color: '#0d9488', label: 'Lessons' },
  relationship: { emoji: '🔗', color: '#dc2626', label: 'Relationships' },
  note:         { emoji: '📝', color: '#607D8B', label: 'Notes' },
  document:     { emoji: '📄', color: '#7c6f5a', label: 'Documents' },
  default:      { emoji: '✨', color: '#525252', label: 'Memories' },
};
const metaFor = (type) => TYPE_META[type] || TYPE_META.default;

// Seeded jitter so layout is organic but STABLE across renders (no jump).
function seed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000; // 0..1
}

const truncate = (s, n = 22) => {
  const str = String(s || '').trim();
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
};

// Curved tendril path between two points (perpendicular control offset).
function tendril(x1, y1, x2, y2, bend = 0.18) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // perpendicular
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export default function MemoryMoss({ memories = [], orgName = 'Your memory', onSelectMemory, onAddMemory }) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [hoverCat, setHoverCat] = useState(null);

  // Measure container.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 50 && r.height > 50) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Build the layout (deterministic radial tree) ──────────────────────────
  const layout = useMemo(() => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const R = Math.min(size.w, size.h);
    const R1 = R * 0.185;         // category ring
    const leafBase = R * 0.40;    // first leaf ring (clear of the core label)
    const leafStep = R * 0.092;   // radial gap between stacked leaves

    // Group memories by type, biggest first.
    const groups = {};
    for (const m of memories) {
      const tkey = (m.memory_type || 'default');
      (groups[tkey] = groups[tkey] || []).push(m);
    }
    const cats = Object.entries(groups)
      .map(([type, items]) => ({ type, items }))
      .sort((a, b) => b.items.length - a.items.length)
      .slice(0, 12); // cap category spokes for breathing room

    const total = cats.reduce((s, c) => s + c.items.length, 0) || 1;
    const branches = [];
    const catNodes = [];
    const leafNodes = [];

    let angleCursor = -Math.PI / 2; // start at top
    const GAP = 0.12;               // angular padding between wedges
    cats.forEach((cat, ci) => {
      // Wedge width weighted by share of memories (min floor so small cats show).
      const share = cat.items.length / total;
      const wedge = Math.max(share * (Math.PI * 2 - GAP * cats.length), 0.34);
      const mid = angleCursor + wedge / 2;
      const j = (seed(cat.type) - 0.5) * 0.12;
      const catAngle = mid + j;

      const cxp = cx + Math.cos(catAngle) * R1;
      const cyp = cy + Math.sin(catAngle) * R1;
      const meta = metaFor(cat.type);
      catNodes.push({ id: `cat-${cat.type}`, type: cat.type, x: cxp, y: cyp, meta, count: cat.items.length });
      branches.push({ id: `b-core-${cat.type}`, d: tendril(cx, cy, cxp, cyp, 0.10), color: meta.color, depth: 0, cat: cat.type, w: 2.2 });

      // Leaves: fan within the wedge, stacked outward in rings (moss spread).
      const leaves = cat.items.slice(0, 14);
      const perRing = Math.min(7, Math.max(3, Math.ceil(Math.sqrt(leaves.length) * 2)));
      leaves.forEach((m, li) => {
        const ring = Math.floor(li / perRing);
        const inRing = li % perRing;
        const ringCount = Math.min(perRing, leaves.length - ring * perRing);
        const spread = wedge * 0.62;
        const a = ringCount === 1
          ? catAngle
          : catAngle - spread / 2 + (spread * inRing) / (ringCount - 1);
        const aj = a + (seed(m.id + 'a') - 0.5) * 0.10;
        const rad = leafBase + ring * leafStep + (seed(m.id + 'r') - 0.5) * leafStep * 0.5;
        const lx = cx + Math.cos(aj) * rad;
        const ly = cy + Math.sin(aj) * rad;
        leafNodes.push({ id: m.id, m, x: lx, y: ly, meta, cat: cat.type, title: truncate(m.title || m.content || 'Memory') });
        // branch from category hub (or previous ring node) → leaf
        branches.push({ id: `b-${cat.type}-${m.id}`, d: tendril(cxp, cyp, lx, ly, 0.16), color: meta.color, depth: 1 + ring, cat: cat.type, w: 1.1 });
      });
      angleCursor += wedge + GAP;
    });

    return { cx, cy, catNodes, leafNodes, branches };
  }, [memories, size]);

  const handleLeaf = useCallback((m) => { if (onSelectMemory) onSelectMemory(m); }, [onSelectMemory]);
  const dim = (cat) => hoverCat && hoverCat !== cat;

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full min-h-[600px] overflow-hidden bg-[#faf9f4]"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(10,10,10,0.05) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      {/* ── Branch tendrils ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" width={size.w} height={size.h}>
        {layout.branches.map((b) => (
          <motion.path
            key={b.id}
            d={b.d}
            fill="none"
            stroke={b.color}
            strokeWidth={b.w}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: dim(b.cat) ? 0.05 : (hoverCat === b.cat ? 0.65 : 0.28) }}
            transition={{ pathLength: { duration: 0.7, delay: b.depth * 0.12, ease: 'easeOut' }, opacity: { duration: 0.3 } }}
          />
        ))}
      </svg>

      {/* ── Core orb ── */}
      <CoreOrb cx={layout.cx} cy={layout.cy} orgName={orgName} count={memories.length} />

      {/* ── Add memory (just below core, like the reference) ── */}
      {onAddMemory && (
        <motion.button
          onClick={onAddMemory}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute z-20 flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2"
          style={{ left: layout.cx, top: layout.cy + Math.min(size.w, size.h) * 0.165 }}
        >
          <span className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_6px_18px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#117dff] text-xl font-light active:scale-95 transition-transform">+</span>
          <span className="text-[11px] font-medium text-[#8a8a8a]">Add memory</span>
        </motion.button>
      )}

      {/* ── Category hubs ── */}
      {layout.catNodes.map((c, i) => (
        <motion.button
          key={c.id}
          onMouseEnter={() => setHoverCat(c.type)}
          onMouseLeave={() => setHoverCat(null)}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: dim(c.type) ? 0.4 : 1, scale: 1 }}
          transition={{ delay: 0.15 + i * 0.04, type: 'spring', stiffness: 260, damping: 20 }}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full backdrop-blur-md border shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
          style={{
            left: c.x, top: c.y, width: 50, height: 50,
            background: 'rgba(255,255,255,0.62)',
            borderColor: hoverCat === c.type ? c.meta.color : 'rgba(255,255,255,0.8)',
            boxShadow: hoverCat === c.type ? `0 8px 28px ${c.meta.color}33` : undefined,
          }}
          title={`${c.meta.label} · ${c.count}`}
        >
          <span className="text-[20px] leading-none">{c.meta.emoji}</span>
          <span className="absolute -bottom-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-white border text-[9px] font-bold flex items-center justify-center"
            style={{ borderColor: c.meta.color, color: c.meta.color }}>{c.count}</span>
        </motion.button>
      ))}

      {/* ── Memory leaves (glass pills) ── */}
      {layout.leafNodes.map((n, i) => (
        <motion.button
          key={n.id}
          onClick={() => handleLeaf(n.m)}
          onMouseEnter={() => setHoverCat(n.cat)}
          onMouseLeave={() => setHoverCat(null)}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: dim(n.cat) ? 0.22 : 1, scale: 1 }}
          transition={{ delay: 0.3 + (i % 14) * 0.02, type: 'spring', stiffness: 240, damping: 22 }}
          whileHover={{ scale: 1.06, y: -1 }}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md border border-white/75 bg-white/60 shadow-[0_4px_14px_rgba(0,0,0,0.06)] max-w-[180px]"
          style={{ left: n.x, top: n.y }}
        >
          <span className="text-[12px] leading-none flex-shrink-0">{n.meta.emoji}</span>
          <span className="text-[11.5px] font-medium text-[#2a2520] truncate">{n.title}</span>
        </motion.button>
      ))}
    </div>
  );
}

// Central glass core with a soft brand glow.
function CoreOrb({ cx, cy, orgName, count }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
      style={{ left: cx, top: cy }}
    >
      {/* glow */}
      <div className="relative">
        <div className="absolute -inset-8 rounded-full blur-2xl opacity-60"
          style={{ background: 'radial-gradient(circle, #7dd3fc 0%, #117dff55 45%, transparent 70%)' }} />
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-[92px] h-[92px] rounded-full backdrop-blur-md border border-white/80 shadow-[0_12px_40px_rgba(17,125,255,0.25)] flex items-center justify-center"
          style={{ background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), rgba(125,211,252,0.55) 55%, rgba(17,125,255,0.35))' }}
        >
          <span className="text-[34px] leading-none drop-shadow-sm">🧠</span>
        </motion.div>
      </div>
      <div className="mt-3 text-center pointer-events-none">
        <div className="text-[15px] font-bold text-[#0a0a0a] leading-tight">{orgName}</div>
        <div className="text-[12px] text-[#8a8a8a]">{count} memories · learning from every chat</div>
      </div>
    </motion.div>
  );
}
