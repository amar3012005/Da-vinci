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
import { FolderOpen, Mic, Plug, Users, UserRound, BookOpen, Plus, Brain } from 'lucide-react';

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
    nodeBg: '#ffffff', nodeBorder: '#ece9e2', nodeIcon: '#4b4b4b', tinted: true, coreIcon: '#117dff',
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
    nodeBg: 'rgba(255,255,255,0.05)', nodeBorder: 'rgba(255,255,255,0.16)', nodeIcon: '#e7e7e3', tinted: false, coreIcon: '#9ca3af',
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
  const { T } = data;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <Handle type="source" position={Position.Top} style={hidden} isConnectable={false} />
      {/* white glass sphere + glass brain — blends into the background, no colour glow */}
      <div className="relative rounded-full flex items-center justify-center" style={{
        width: 108, height: 108,
        background: 'radial-gradient(circle at 38% 30%, #ffffff 0%, #f6f4ef 58%, #ece9e2 100%)',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 14px 38px rgba(20,20,30,0.10), inset 0 3px 6px rgba(255,255,255,0.95), inset 0 -6px 14px rgba(0,0,0,0.05)',
        backdropFilter: 'blur(6px)',
      }}>
        {/* glossy highlight */}
        <div className="absolute rounded-full pointer-events-none" style={{ left: '26%', top: '18%', width: 34, height: 22, background: 'radial-gradient(circle, rgba(255,255,255,0.95), transparent 72%)', filter: 'blur(2px)' }} />
        <Brain size={46} strokeWidth={1.4} style={{ color: T.coreIcon, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))' }} />
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

const PROJECT_PALETTES = [
  { color: '#117dff', border: 'rgba(17,125,255,0.22)' }, // blue
  { color: '#10b981', border: 'rgba(16,185,129,0.22)' }, // emerald
  { color: '#8b5cf6', border: 'rgba(139,92,246,0.22)' }, // violet
  { color: '#f59e0b', border: 'rgba(245,158,11,0.22)' }, // amber
  { color: '#ef4444', border: 'rgba(239,68,68,0.22)' },  // red
  { color: '#0ea5e9', border: 'rgba(14,165,233,0.22)' }, // sky
  { color: '#ec4899', border: 'rgba(236,72,153,0.22)' }, // pink
  { color: '#14b8a6', border: 'rgba(20,184,166,0.22)' }, // teal
];

function getProjectInitials(name) {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function ProjectNode({ data }) {
  const { name, initials, colorPalette, isNight } = data;
  return (
    <div 
      className="rounded-full flex items-center gap-2 px-2 py-0.5 transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]" 
      style={{ 
        height: 32, 
        minWidth: 100, 
        maxWidth: 220, 
        background: isNight ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)', 
        border: `1px solid ${colorPalette.border}`, 
        backdropFilter: 'blur(10px)',
        boxShadow: isNight ? '0 4px 14px rgba(0,0,0,0.3)' : '0 4px 10px rgba(0,0,0,0.06)',
      }}
    >
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      {/* Circle logo */}
      <div 
        className="rounded-full flex items-center justify-center font-bold text-[10px] tracking-tight text-white shrink-0 antialiased"
        style={{ 
          width: 22,
          height: 22,
          background: colorPalette.color,
          boxShadow: `0 2px 6px ${colorPalette.color}40`,
        }}
      >
        {initials}
      </div>
      {/* Project name */}
      <span className="truncate pr-1 font-['Space_Grotesk'] text-[11px] font-semibold" style={{ color: isNight ? '#f6f6f4' : '#1a1a1a' }}>
        {name}
      </span>
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

const NODE_TYPES = { sun: SunNode, hub: HubNode, ghost: GhostNode, add: AddNode, projectNode: ProjectNode };
const EDGE_TYPES = { floating: FloatingEdge };

export default function MemoryMoss({
  orgName = 'Supercomputer memory',
  subtitle = 'Learning from every chat',
  primaries = DEFAULT_PRIMARIES,
  theme = 'day',
  hubCounts = {},
  hubLeaves = {},          // { projects: ['Acme', ...], ... } real labels per hub
  memories = [],
  projects = [],           // user's accessible projects
  onSelectPrimary,
  onAddMemory,
  onSelectProject,
}) {
  const T = THEMES[theme] || THEMES.day;
  const isNight = theme === 'night';

  const { nodes, edges } = useMemo(() => {
    const R = 240;            // hub ring radius (flow units; fitView scales)
    const Rsec = 400;         // secondary pill base radius
    const N = primaries.length || 1;
    const DASH = '5 5';
    const ns = [{ id: 'core', type: 'sun', position: { x: -60, y: -60 }, draggable: false, selectable: false, data: { T } }];
    const es = [];
    const HUB = 29, GH = 14, ADD = 23;

    primaries.forEach((p, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const hx = Math.cos(a) * R, hy = Math.sin(a) * R;
      const id = `hub-${p.key}`;
      ns.push({ id, type: 'hub', position: { x: hx - HUB, y: hy - HUB }, draggable: false,
        data: { ...p, count: hubCounts[p.key] ?? null, tint: TINT[p.key], T, isNight } });
      es.push({ id: `e-${p.key}`, source: 'core', target: id, type: 'floating', style: { stroke: T.line, strokeWidth: 1.3, strokeDasharray: DASH } });

      if (p.key === 'projects' && Array.isArray(projects) && projects.length > 0) {
        const gc = projects.length;
        // Fan wider as projects grow + step radius in 3 tiers so the ~160px
        // project chips never collide horizontally.
        const wedge = Math.min(1.35, 0.42 + gc * 0.14);
        for (let g = 0; g < gc; g++) {
          const ga = gc === 1 ? a : a - wedge / 2 + (wedge * g) / (gc - 1);
          const gr = Rsec + 20 + (g % 3) * 92;
          const gx = Math.cos(ga) * gr, gy = Math.sin(ga) * gr;
          
          const proj = projects[g];
          const projName = proj.name || 'Project';
          const initials = getProjectInitials(projName);
          const colorIdx = Math.floor(seed(projName + g) * PROJECT_PALETTES.length);
          const colorPalette = PROJECT_PALETTES[colorIdx] || PROJECT_PALETTES[0];
          
          const pid = `projNode-${proj.id || g}`;
          ns.push({
            id: pid,
            type: 'projectNode',
            position: { x: gx - 80, y: gy - 17 },
            draggable: false,
            data: { name: projName, initials, T, colorPalette, isNight, ...proj },
          });
          es.push({
            id: `ep-${p.key}-${g}`,
            source: id,
            target: pid,
            type: 'floating',
            style: { stroke: colorPalette.color, strokeWidth: 1.1, strokeDasharray: DASH, opacity: 0.85 },
          });
        }
      } else {
        // Leaf labels: explicit hubLeaves (e.g. real project names) take priority,
        // else fall back to matching memory titles.
        let labels = Array.isArray(hubLeaves[p.key]) && hubLeaves[p.key].length
          ? hubLeaves[p.key]
          : memories.filter((m) => (m.category || m.memory_type || m.type || '').toLowerCase() === p.key).slice(0, 2).map((m) => m.title || m.content);
        labels = labels.filter(Boolean).slice(0, 6);
        const gc = labels.length;
        const wedge = 0.52; // angular fan within the spoke sector
        for (let g = 0; g < gc; g++) {
          const ga = gc === 1 ? a : a - wedge / 2 + (wedge * g) / (gc - 1);
          const gr = Rsec + (g % 2) * 72 + (seed(p.key + g) - 0.5) * 26;
          const gx = Math.cos(ga) * gr, gy = Math.sin(ga) * gr;
          const label = truncate(labels[g]);
          const w = Math.min(210, 84 + label.length * 5.6);
          const gid = `ghost-${p.key}-${g}`;
          ns.push({ id: gid, type: 'ghost', position: { x: gx - w / 2, y: gy - GH }, draggable: false, selectable: false, data: { label, w, T } });
          es.push({ id: `eg-${p.key}-${g}`, source: id, target: gid, type: 'floating', style: { stroke: T.lineDim, strokeWidth: 0.9, strokeDasharray: DASH } });
        }
      }
    });

    // add-memory below core
    ns.push({ id: 'add', type: 'add', position: { x: -ADD, y: R * 0.62 }, draggable: false, data: { T } });
    es.push({ id: 'e-add', source: 'core', target: 'add', type: 'floating', style: { stroke: T.lineDim, strokeWidth: 0.9, strokeDasharray: DASH } });

    return { nodes: ns, edges: es };
  }, [primaries, hubCounts, hubLeaves, memories, projects, T, isNight]);

  const onNodeClick = useCallback((_e, node) => {
    if (node.id === 'add') { onAddMemory && onAddMemory(); return; }
    if (node.type === 'hub' && onSelectPrimary) onSelectPrimary(node.data);
    if (node.type === 'projectNode' && onSelectProject) onSelectProject(node.data);
  }, [onAddMemory, onSelectPrimary, onSelectProject]);

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
