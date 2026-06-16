/**
 * MemoryMoss — organisation memory constellation, built on React Flow.
 *
 * Why React Flow: edges anchor to node geometry, so the radial spokes ALWAYS
 * hit node centres — no hand-computed pixel drift / misalignment. fitView keeps
 * the whole constellation centred and scaled to the viewport automatically.
 * Custom glass nodes carry the premium look; a custom floating edge draws
 * straight centre-to-centre spokes.
 *
 * Center = the org (a glowing sun). Primary hubs (Projects / Meetings /
 * Connectors / Employees / Personal / Knowledge) ring it; faint secondary
 * pills sit beyond. "Add memory" below the core. Day theme by default; pass
 * theme="night" for the deep-space skin.
 *
 * Props: orgName, subtitle, primaries[{key,label,Icon}], theme, hubCounts{},
 *        memories[], onSelectPrimary(p), onAddMemory().
 */
import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow, Background, BaseEdge, Handle, Position,
  useInternalNode, getStraightPath,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FolderOpen, Mic, Plug, Users, UserRound, BookOpen, Plus } from 'lucide-react';

// Per-type tint — mirrors the app's soft tinted icon chips (MCP Server page).
const TINT = {
  projects:   { fg: '#117dff', bg: 'rgba(17,125,255,0.10)' },
  meetings:   { fg: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
  connectors: { fg: '#FF8A34', bg: 'rgba(255,138,52,0.12)' },
  employees:  { fg: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
  personal:   { fg: '#0ea5e9', bg: 'rgba(14,165,233,0.10)' },
  knowledge:  { fg: '#117dff', bg: 'rgba(17,125,255,0.10)' },
};

const DEFAULT_PRIMARIES = [
  { key: 'projects',   label: 'Projects',   Icon: FolderOpen },
  { key: 'meetings',   label: 'Meetings',   Icon: Mic },
  { key: 'connectors', label: 'Connectors', Icon: Plug },
  { key: 'employees',  label: 'Employees',  Icon: Users },
  { key: 'personal',   label: 'Personal',   Icon: UserRound },
  { key: 'knowledge',  label: 'Knowledge',  Icon: BookOpen },
];

const THEMES = {
  // Matches the HIVEMIND / Da-vinci light app theme: warm off-white canvas,
  // white cards w/ #ece9e2 borders + soft shadow, blue brand accent.
  day: {
    bg: '#faf9f4', dot: '#e3ded3', line: 'rgba(17,125,255,0.30)', lineDim: 'rgba(17,125,255,0.10)',
    title: '#0a0a0a', sub: '#737373',
    nodeBg: '#ffffff', nodeBorder: '#ece9e2', nodeIcon: '#4b4b4b', tinted: true,
    badgeBg: '#ffffff', badgeText: '#6b6b6b',
    pill: '#ffffff', pillBorder: '#ece9e2', pillText: '#3a3530',
    addBg: '#ffffff', addBorder: '#ece9e2', addIcon: '#117dff',
    vignette: 'rgba(17,125,255,0.05)',
    orb: 'radial-gradient(circle at 38% 32%, #ffffff 0%, #bfe0ff 32%, #5aa6ff 62%, #117dff 92%, #0a63d6 100%)',
    orbGlow: 'radial-gradient(circle, rgba(17,125,255,0.30) 0%, rgba(17,125,255,0.12) 38%, transparent 66%)',
    orbShadow: '0 0 50px 6px rgba(17,125,255,0.30), inset 0 -8px 22px rgba(10,80,180,0.4), inset 0 6px 16px rgba(255,255,255,0.85)',
  },
  night: {
    bg: '#070708', dot: 'rgba(255,255,255,0.06)', line: 'rgba(233,255,106,0.5)', lineDim: 'rgba(233,255,106,0.12)',
    title: '#f6f6f4', sub: 'rgba(246,246,244,0.5)',
    nodeBg: 'rgba(255,255,255,0.05)', nodeBorder: 'rgba(255,255,255,0.16)', nodeIcon: '#e7e7e3', tinted: false,
    badgeBg: '#101010', badgeText: '#cfcfcf',
    pill: 'rgba(255,255,255,0.05)', pillBorder: 'rgba(255,255,255,0.1)', pillText: '#cfcfcf',
    addBg: 'rgba(20,22,16,0.85)', addBorder: 'rgba(255,255,255,0.16)', addIcon: '#e9ff6a',
    vignette: 'rgba(40,44,30,0.18)',
    orb: 'radial-gradient(circle at 40% 34%, #fdffe6 0%, #eaff5a 30%, #c8f02a 60%, #97c81f 88%, #7faf17 100%)',
    orbGlow: 'radial-gradient(circle, rgba(216,255,63,0.30) 0%, rgba(150,200,40,0.12) 38%, transparent 66%)',
    orbShadow: '0 0 50px 6px rgba(216,255,63,0.42), inset 0 -8px 22px rgba(120,160,20,0.55), inset 0 6px 16px rgba(255,255,220,0.7)',
  },
};

function seed(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}
const truncate = (s, n = 34) => { const t = String(s || '').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

// ── Floating straight edge: centre-of-source → centre-of-target ─────────────
function FloatingEdge({ id, source, target, style }) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const sc = { x: s.internals.positionAbsolute.x + (s.measured?.width || 0) / 2, y: s.internals.positionAbsolute.y + (s.measured?.height || 0) / 2 };
  const tc = { x: t.internals.positionAbsolute.x + (t.measured?.width || 0) / 2, y: t.internals.positionAbsolute.y + (t.measured?.height || 0) / 2 };
  const [path] = getStraightPath({ sourceX: sc.x, sourceY: sc.y, targetX: tc.x, targetY: tc.y });
  return <BaseEdge id={id} path={path} style={style} />;
}

const hidden = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 };

// ── Custom nodes ────────────────────────────────────────────────────────────
function SunNode({ data }) {
  const { orgName, subtitle, T, isNight } = data;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 132, height: 132 }}>
      <Handle type="source" position={Position.Top} style={hidden} isConnectable={false} />
      {/* title above */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ bottom: '100%', marginBottom: 26 }}>
        <div className="font-bold tracking-[-0.02em]" style={{
          fontSize: 30, color: isNight ? 'transparent' : T.title,
          background: isNight ? 'linear-gradient(180deg,#fff,#c9c9c4)' : 'none',
          WebkitBackgroundClip: isNight ? 'text' : undefined, backgroundClip: isNight ? 'text' : undefined,
        }}>{orgName}</div>
        <div style={{ fontSize: 14, color: T.sub, marginTop: 2 }}>{subtitle}</div>
      </div>
      {/* glow */}
      <div className="absolute rounded-full pointer-events-none" style={{ width: 240, height: 240, background: T.orbGlow }} />
      {/* orb */}
      <div className="relative rounded-full" style={{ width: 104, height: 104, background: T.orb, boxShadow: T.orbShadow }}>
        <div className="absolute rounded-full" style={{ left: '30%', top: '24%', width: 26, height: 18, background: 'radial-gradient(circle, rgba(255,255,255,0.95), transparent 70%)', filter: 'blur(2px)' }} />
      </div>
    </div>
  );
}

function HubNode({ data }) {
  const { Icon, count, label, T, isNight, tint } = data;
  const iconColor = T.tinted && tint ? tint.fg : T.nodeIcon;
  return (
    <div className="relative flex items-center justify-center rounded-full"
      style={{ width: 58, height: 58, background: T.nodeBg, border: `1px solid ${T.nodeBorder}`, backdropFilter: 'blur(12px)',
        boxShadow: isNight ? 'inset 0 1px 1px rgba(255,255,255,0.12), 0 8px 22px rgba(0,0,0,0.5)' : '0 4px 16px rgba(20,20,30,0.07)' }}
      title={`${label}${count != null ? ` · ${count}` : ''}`}
    >
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
      {/* tinted inner halo (day) — echoes the app's soft icon chips */}
      {T.tinted && tint && <span className="absolute rounded-full" style={{ inset: 9, background: tint.bg }} />}
      {Icon ? <Icon size={20} strokeWidth={1.7} style={{ color: iconColor, position: 'relative' }} /> : null}
      {count != null && (
        <span className="absolute left-1/2 -translate-x-1/2 rounded-full font-bold flex items-center justify-center"
          style={{ bottom: -7, fontSize: 9.5, minWidth: 22, height: 16, padding: '0 5px', background: T.badgeBg, border: `1px solid ${T.nodeBorder}`, color: T.badgeText }}>{count}</span>
      )}
      <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-medium"
        style={{ top: 'calc(100% + 12px)', fontSize: 11, color: T.sub }}>{label}</span>
    </div>
  );
}

function GhostNode({ data }) {
  const { label, w, T } = data;
  return (
    <div className="rounded-full flex items-center px-3" style={{ width: w, height: 28, background: T.pill, border: `1px solid ${T.pillBorder}`, backdropFilter: 'blur(8px)' }}>
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      {label ? <span className="truncate" style={{ fontSize: 11, color: T.pillText }}>{label}</span> : null}
    </div>
  );
}

function AddNode({ data }) {
  const { T } = data;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <span className="rounded-full flex items-center justify-center" style={{ width: 46, height: 46, background: T.addBg, border: `1px solid ${T.addBorder}`, backdropFilter: 'blur(10px)' }}>
        <Plus size={20} strokeWidth={1.8} style={{ color: T.addIcon }} />
      </span>
      <span style={{ fontSize: 12, color: T.sub }}>Add memory</span>
    </div>
  );
}

const NODE_TYPES = { sun: SunNode, hub: HubNode, ghost: GhostNode, add: AddNode };
const EDGE_TYPES = { floating: FloatingEdge };

export default function MemoryMoss({
  orgName = 'Supercomputer memory',
  subtitle = 'Learning from every chat',
  primaries = DEFAULT_PRIMARIES,
  theme = 'day',
  hubCounts = {},
  memories = [],
  onSelectPrimary,
  onAddMemory,
}) {
  const T = THEMES[theme] || THEMES.day;
  const isNight = theme === 'night';

  const { nodes, edges } = useMemo(() => {
    const R = 240;            // hub ring radius (flow units; fitView scales)
    const Rsec = 400;         // secondary pill radius
    const N = primaries.length || 1;
    const ns = [{ id: 'core', type: 'sun', position: { x: -66, y: -66 }, draggable: false, selectable: false, data: { orgName, subtitle, T, isNight } }];
    const es = [];
    // half-sizes for centre-anchored placement
    const HUB = 29, GH = 14, ADD = 23;

    primaries.forEach((p, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const hx = Math.cos(a) * R, hy = Math.sin(a) * R;
      const id = `hub-${p.key}`;
      ns.push({ id, type: 'hub', position: { x: hx - HUB, y: hy - HUB }, draggable: false,
        data: { ...p, count: hubCounts[p.key] ?? null, tint: TINT[p.key], T, isNight } });
      es.push({ id: `e-${p.key}`, source: 'core', target: id, type: 'floating', style: { stroke: T.line, strokeWidth: 1.4 } });

      // secondary memory pills on-spoke
      const hubMem = memories.filter((m) => (m.category || m.memory_type || m.type || '').toLowerCase() === p.key);
      const picks = hubMem.slice(0, 2);
      const gc = picks.length || 1;
      for (let g = 0; g < gc; g++) {
        const ga = a + (g === 0 ? -0.16 : 0.18);
        const gr = Rsec + (seed(p.key + g) - 0.5) * 60;
        const gx = Math.cos(ga) * gr, gy = Math.sin(ga) * gr;
        const label = picks[g] ? truncate(picks[g].title || picks[g].content) : null;
        const w = label ? Math.min(210, 84 + label.length * 5.6) : 96;
        const gid = `ghost-${p.key}-${g}`;
        ns.push({ id: gid, type: 'ghost', position: { x: gx - w / 2, y: gy - GH }, draggable: false, selectable: false, data: { label, w, T } });
        es.push({ id: `eg-${p.key}-${g}`, source: id, target: gid, type: 'floating', style: { stroke: T.lineDim, strokeWidth: 0.9 } });
      }
    });

    // add-memory below core
    ns.push({ id: 'add', type: 'add', position: { x: -ADD, y: R * 0.62 }, draggable: false, data: { T } });
    es.push({ id: 'e-add', source: 'core', target: 'add', type: 'floating', style: { stroke: T.lineDim, strokeWidth: 0.9 } });

    return { nodes: ns, edges: es };
  }, [primaries, hubCounts, memories, T, isNight, orgName, subtitle]);

  const onNodeClick = useCallback((_e, node) => {
    if (node.id === 'add') { onAddMemory && onAddMemory(); return; }
    if (node.type === 'hub' && onSelectPrimary) onSelectPrimary(node.data);
  }, [onAddMemory, onSelectPrimary]);

  return (
    <div className="relative w-full h-full min-h-[600px] overflow-hidden" style={{ background: T.bg }}>
      {/* atmosphere vignette behind the flow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${T.vignette} 0%, transparent 58%)` }} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.28 }}
        minZoom={0.4}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        style={{ background: 'transparent' }}
      >
        <Background gap={26} size={1} color={T.dot} />
      </ReactFlow>
    </div>
  );
}
