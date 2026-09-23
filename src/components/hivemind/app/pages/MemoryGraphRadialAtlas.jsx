import React, { forwardRef, useImperativeHandle, useMemo, useState } from "react";

const WIDTH = 1000;
const CENTER = WIDTH / 2;
const OUTER_RADIUS = 430;
const KIND_COLORS = {
  fact: "#2878d0", preference: "#7356c8", decision: "#d99a20", lesson: "#1e9c83",
  goal: "#e56d4a", event: "#67778c", relationship: "#ca628e", document: "#258b9b",
  entity: "#5b6ec9", default: "#59718a",
};
const EDGE_COLORS = {
  Updates: "#da8b24", Extends: "#36a47c", Derives: "#8060c4", Contradicts: "#dc554d",
  supports: "#4185d7", mentions: "#9aa8b5", default: "#bac4ce",
};
const KIND_ORDER = ["fact", "decision", "preference", "goal", "lesson", "event", "relationship", "document", "entity", "default"];
const KIND_ALIASES = {
  memory: "fact", note: "fact", fact_raw: "fact", fact_extracted: "fact", summary: "fact",
  report: "document", attachment: "document", meeting: "event", task: "event", person: "relationship",
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function timestamp(node) {
  for (const value of [node.updatedAt, node.createdAt, node.timestamp, node.lastAccessedAt]) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (Number.isFinite(node.daysSinceUpdate)) return Date.now() - node.daysSinceUpdate * 86400000;
  return null;
}

function nodeKind(node) {
  const raw = String(node.kind || node.type || node.category || "default").toLowerCase();
  const value = KIND_ALIASES[raw] || raw;
  if (KIND_COLORS[value]) return value;
  const type = String(node.type || "").toLowerCase();
  const aliasedType = KIND_ALIASES[type] || type;
  return KIND_COLORS[aliasedType] ? aliasedType : "default";
}

function hash(value) {
  let out = 2166136261;
  for (const char of String(value || "")) out = Math.imul(out ^ char.charCodeAt(0), 16777619);
  return out >>> 0;
}

function edgeId(value) {
  return typeof value === "object" ? value?.id : value;
}

export function buildRadialAtlasLayout(nodes = []) {
  let newest = Number.NEGATIVE_INFINITY;
  let oldest = Number.POSITIVE_INFINITY;
  for (const node of nodes) {
    const time = timestamp(node);
    if (time == null) continue;
    newest = Math.max(newest, time);
    oldest = Math.min(oldest, time);
  }
  if (!Number.isFinite(newest)) newest = Date.now();
  if (!Number.isFinite(oldest)) oldest = newest - 1;
  const span = Math.max(1, newest - oldest);
  const counts = new Map();
  const typed = nodes.map((node) => {
    const kind = nodeKind(node);
    counts.set(kind, (counts.get(kind) || 0) + 1);
    return { node, kind, time: timestamp(node) };
  });
  const sectors = KIND_ORDER.filter((kind) => counts.has(kind));
  const sectorIndex = new Map(sectors.map((kind, index) => [kind, index]));
  const sectorCounts = new Map();
  const sectorPositions = new Map();
  for (const kind of sectors) sectorPositions.set(kind, []);
  for (const entry of typed) sectorPositions.get(entry.kind).push(entry);

  const positions = new Map();
  for (const entry of typed) {
    const index = sectorIndex.get(entry.kind);
    const count = Math.max(1, sectorPositions.get(entry.kind).length);
    const rank = sectorCounts.get(entry.kind) || 0;
    sectorCounts.set(entry.kind, rank + 1);
    const wedge = (Math.PI * 2) / Math.max(1, sectors.length);
    const baseAngle = -Math.PI / 2 + index * wedge + wedge / 2;
    const fractional = ((hash(entry.node.id) % 100000) / 100000) * 0.58 + (rank / count) * 0.42;
    const angle = baseAngle + (fractional - 0.5) * wedge * 0.84;
    // Temporal age is the radial coordinate: newer records sit toward the
    // center and older records move outward. Category only controls angle.
    const ageFraction = entry.time == null ? 1 : (newest - entry.time) / span;
    const radius = entry.time == null
      ? OUTER_RADIUS + 18
      : 30 + clamp(ageFraction, 0, 1) * (OUTER_RADIUS - 30);
    positions.set(entry.node.id, {
      x: CENTER + Math.cos(angle) * radius,
      y: CENTER + Math.sin(angle) * radius,
      radius,
      angle,
      kind: entry.kind,
      color: KIND_COLORS[entry.kind],
      time: entry.time,
    });
  }
  return { positions, sectors, counts, oldest, newest };
}

function shortDate(value) {
  if (!Number.isFinite(value)) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const MemoryGraphRadialAtlas = forwardRef(function MemoryGraphRadialAtlas({
  graphData,
  selectedNode,
  highlightNodes = new Set(),
  filteredNodes = new Set(),
  onNodeClick,
  onNodeHover,
  onBackgroundClick,
  theme = "day",
}, ref) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: CENTER, y: CENTER });
  const nodes = graphData?.nodes || [];
  const links = graphData?.links || [];
  const { positions, sectors, counts, oldest, newest } = useMemo(() => buildRadialAtlasLayout(nodes), [nodes]);
  const visible = filteredNodes;
  const dark = theme === "night";
  const palette = dark
    ? { bg: "#101820", grid: "#253342", ring: "#516578", label: "#b4c4d2", title: "#eff5fa", card: "#16222e", stroke: "#314354" }
    : { bg: "#f4f7fa", grid: "#dfe7ed", ring: "#b8c8d5", label: "#607487", title: "#172c42", card: "#ffffff", stroke: "#d5e0e8" };

  useImperativeHandle(ref, () => ({
    fitView: () => { setZoom(1); setCenter({ x: CENTER, y: CENTER }); },
    zoomBy: (factor) => setZoom((value) => clamp(value * factor, 0.65, 4)),
    focusNode: (node) => {
      const point = positions.get(node?.id);
      if (point) { setCenter({ x: point.x, y: point.y }); setZoom(2.5); }
    },
    focusPoint: () => {},
  }), [positions]);

  const viewSize = WIDTH / zoom;
  const viewBox = `${center.x - viewSize / 2} ${center.y - viewSize / 2} ${viewSize} ${viewSize}`;
  const rings = [0.25, 0.5, 0.75, 1].map((fraction) => ({
    fraction,
    radius: 30 + fraction * (OUTER_RADIUS - 30),
    date: newest - (newest - oldest) * fraction,
  }));
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: palette.bg }}>
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: dark ? 0.18 : 0.7, backgroundImage: `radial-gradient(${palette.grid} 0.8px, transparent 0.8px)`, backgroundSize: "22px 22px" }} />
      <div className="absolute left-5 top-5 z-[1] rounded-2xl border px-4 py-3 shadow-sm backdrop-blur" style={{ background: `${palette.card}e8`, borderColor: palette.stroke }}>
        <div className="font-['Space_Grotesk'] text-sm font-semibold" style={{ color: palette.title }}>Company memory</div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: palette.label }}>Time moves outward · {nodes.length.toLocaleString()} memories</div>
      </div>
      <div className="absolute right-5 top-5 z-[1] rounded-xl border px-3 py-2 font-mono text-[10px]" style={{ background: `${palette.card}e8`, borderColor: palette.stroke, color: palette.label }}>
        {shortDate(oldest)} <span aria-hidden="true">← older · newer →</span> {shortDate(newest)}
      </div>
      <svg className="relative h-full w-full" viewBox={viewBox} role="img" aria-label="Company memory map. Radial distance represents time, with recent memories near the center and older memories toward the edge." onClick={onBackgroundClick}>
        <defs>
          <radialGradient id="memory-core-glow"><stop offset="0%" stopColor="#2c83d9" stopOpacity="0.2" /><stop offset="100%" stopColor="#2c83d9" stopOpacity="0" /></radialGradient>
          <filter id="memory-node-glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 28} fill="url(#memory-core-glow)" />
        {rings.map(({ fraction, radius, date }) => (
          <g key={fraction} pointerEvents="none">
            <circle cx={CENTER} cy={CENTER} r={radius} fill="none" stroke={palette.ring} strokeWidth={fraction === 1 ? 1.5 : 1} strokeDasharray={fraction === 1 ? "" : "2 7"} opacity={fraction === 1 ? 0.55 : 0.4} />
            <text x={CENTER + 8} y={CENTER - radius + 15} fill={palette.label} fontSize="11" fontFamily="monospace" opacity="0.85">{fraction === 0.25 ? "RECENT" : shortDate(date).toUpperCase()}</text>
          </g>
        ))}
        {sectors.map((kind, index) => {
          const wedge = (Math.PI * 2) / Math.max(1, sectors.length);
          const angle = -Math.PI / 2 + (index + 0.5) * wedge;
          const labelX = CENTER + Math.cos(angle) * (OUTER_RADIUS + 18);
          const labelY = CENTER + Math.sin(angle) * (OUTER_RADIUS + 18);
          return <g key={kind} pointerEvents="none">
            <line x1={CENTER} y1={CENTER} x2={CENTER + Math.cos(angle) * OUTER_RADIUS} y2={CENTER + Math.sin(angle) * OUTER_RADIUS} stroke={palette.ring} strokeWidth="0.8" strokeDasharray="3 10" opacity="0.35" />
            <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill={palette.label} fontSize="12" fontWeight="700" fontFamily="monospace" letterSpacing="1.2">{kind.toUpperCase()} · {counts.get(kind)}</text>
          </g>;
        })}
        <circle cx={CENTER} cy={CENTER} r="25" fill={palette.card} stroke="#4488d0" strokeWidth="2" />
        <circle cx={CENTER} cy={CENTER} r="5" fill="#4488d0" />
        <text x={CENTER} y={CENTER + 42} textAnchor="middle" fill={palette.title} fontSize="11" fontFamily="monospace" letterSpacing="1.2">LATEST</text>
        {links.map((link, index) => {
          const source = positions.get(edgeId(link.source));
          const target = positions.get(edgeId(link.target));
          if (!source || !target || (visible && (!visible.has(edgeId(link.source)) || !visible.has(edgeId(link.target))))) return null;
          const emphasized = selectedNode && (edgeId(link.source) === selectedNode.id || edgeId(link.target) === selectedNode.id);
          return <line key={`${edgeId(link.source)}-${edgeId(link.target)}-${index}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={EDGE_COLORS[link.type] || EDGE_COLORS.default} strokeWidth={emphasized ? 2 : 0.8} strokeDasharray={link.type === "mentions" ? "2 5" : undefined} opacity={emphasized ? 0.78 : 0.24} pointerEvents="none" />;
        })}
        {nodes.map((node) => {
          const point = positions.get(node.id);
          if (!point || (visible && !visible.has(node.id))) return null;
          const selected = selectedNode?.id === node.id;
          const matched = highlightNodes.has(node.id);
          const radius = clamp(3.2 + Math.sqrt(Math.max(1, Number(node.val) || 1)) * 0.85, 4, selected ? 12 : 9);
          const opacity = highlightNodes.size && !matched && !selected ? 0.22 : 0.88;
          const label = node.title || node.label || node.name || node.content || node.id;
          return <g key={node.id} transform={`translate(${point.x} ${point.y})`} role="button" tabIndex="0" aria-label={`${label}; ${point.time ? shortDate(point.time) : "date unknown"}; ${point.kind}`} onClick={(event) => { event.stopPropagation(); onNodeClick?.(node); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onNodeClick?.(node); } }} onMouseEnter={() => onNodeHover?.(node)} onMouseLeave={() => onNodeHover?.(null)} style={{ cursor: "pointer" }}>
            {selected && <circle r={radius + 8} fill={point.color} opacity="0.13" filter="url(#memory-node-glow)" />}
            <circle r={radius + (selected || matched ? 3 : 1.8)} fill={palette.card} stroke={point.color} strokeWidth={selected ? 2 : 1} opacity={opacity} />
            {point.kind === "decision" || point.kind === "goal"
              ? <path d={`M 0 ${-radius} L ${radius} 0 L 0 ${radius} L ${-radius} 0 Z`} fill={point.color} opacity={opacity} />
              : point.kind === "document"
                ? <rect x={-radius * 0.72} y={-radius * 0.72} width={radius * 1.44} height={radius * 1.44} rx="1.5" fill={point.color} opacity={opacity} />
                : <circle r={radius * 0.72} fill={point.color} opacity={opacity} />}
            {selected && <text x={radius + 9} y="-8" fill={palette.title} fontSize="13" fontWeight="700" fontFamily="'Space Grotesk', sans-serif" style={{ paintOrder: "stroke", stroke: palette.bg, strokeWidth: 5, strokeLinejoin: "round" }}>{String(label).slice(0, 34)}</text>}
          </g>;
        })}
      </svg>
      <div className="absolute bottom-5 left-5 z-[1] flex flex-wrap gap-2 rounded-2xl border p-3 shadow-sm backdrop-blur" style={{ maxWidth: "min(680px, calc(100% - 40px))", background: `${palette.card}e8`, borderColor: palette.stroke }} aria-label="Memory type legend">
        {sectors.slice(0, 8).map((kind) => <span key={kind} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase" style={{ color: palette.label }}><i className="h-2 w-2 rounded-full" style={{ background: KIND_COLORS[kind] }} />{kind}</span>)}
        <span className="basis-full border-t pt-2 font-mono text-[10px]" style={{ borderColor: palette.stroke, color: palette.label }}>Solid color = memory type · connection = recorded relationship · radial distance = time · outer markers = undated</span>
      </div>
      <div className="absolute bottom-5 right-5 z-[1] flex gap-2 rounded-xl border p-1.5 shadow-sm" style={{ background: `${palette.card}e8`, borderColor: palette.stroke }}>
        <button type="button" className="h-8 w-8 rounded-lg font-semibold" style={{ color: palette.title }} aria-label="Zoom out" onClick={() => setZoom((value) => clamp(value / 1.25, 0.65, 4))}>−</button>
        <button type="button" className="h-8 w-8 rounded-lg font-semibold" style={{ color: palette.title }} aria-label="Zoom in" onClick={() => setZoom((value) => clamp(value * 1.25, 0.65, 4))}>+</button>
        <button type="button" className="rounded-lg px-2 font-mono text-[10px] uppercase" style={{ color: palette.label }} onClick={() => { setZoom(1); setCenter({ x: CENTER, y: CENTER }); }}>Fit</button>
      </div>
      {nodes.length === 0 && <div className="absolute inset-0 grid place-items-center font-['Space_Grotesk'] text-sm" style={{ color: palette.label }}>No memories in this view.</div>}
      <span className="sr-only">{nodeMap.size} nodes plotted. Newer records are closer to the center and older records are farther away.</span>
    </div>
  );
});

export default MemoryGraphRadialAtlas;
