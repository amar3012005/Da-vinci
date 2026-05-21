/**
 * MemoryGraph2DCanvas — pixel-replica of the MiroFish/Da-vinci scientific
 * reasoning graph (frontend/MiroFish/GraphPanel.vue paintNode + paintLink).
 *
 * Visual contract (matches the reference screenshot):
 *   • Cream background w/ subtle dot grid drawn by ForceGraph2D itself.
 *   • Each node gets THREE concentric halos before the body:
 *       r * 3.0 stroke α 0.06 + fill α 0.03
 *       r * 2.2 stroke α 0.10 + fill α 0.05
 *       r * 1.5 fill α 0.10
 *   • Body shape varies by memory_type:
 *       circle  — fact / conversation / goal / lesson  (large blue/green/teal)
 *       diamond — decision / preference / event        (orange/violet)
 *       square  — note                                 (small slate)
 *       circle  — relationship                          (red)
 *   • Always-on label (truncated to 18 chars + ellipsis) drawn below body.
 *   • Selection blue ring +3px, search/highlight amber ring +2px.
 *   • Edge line straight; dashed for derives / mentions / references OR
 *     confidence < 0.5; tiny directional arrow at 90% of the segment;
 *     midpoint label "<type> 70%" with white background pill.
 *   • Edge colours follow MiroFish EDGE_COLORS palette + heuristic fallback.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide, forceX, forceY } from 'd3-force';

// ─── Palettes (verbatim from MiroFish GraphPanel.vue) ───────────────────────

const TYPE_COLORS = {
  // HIVEMIND memory types mapped onto MiroFish CSI palette
  fact:         '#117dff', // blue   → Claim
  conversation: '#117dff',
  preference:   '#FF8A34', // orange → Trial
  decision:     '#FF8A34',
  event:        '#9C27B0', // purple → Agent (rare)
  goal:         '#16a34a', // green
  lesson:       '#0d9488', // teal
  relationship: '#dc2626', // red
  note:         '#607D8B', // slate  → AgentAction
  default:      '#525252',
};

const TYPE_SHAPE = {
  fact:         'circle',
  conversation: 'circle',
  preference:   'diamond',
  decision:     'diamond',
  event:        'diamond',
  goal:         'circle',
  lesson:       'circle',
  relationship: 'circle',
  note:         'square',
  default:      'circle',
};

const TYPE_SIZE = {
  fact:         1.1,
  conversation: 1.0,
  preference:   1.0,
  decision:     1.0,
  event:        1.0,
  goal:         1.0,
  lesson:       0.9,
  relationship: 1.0,
  note:         0.65,
  default:      0.85,
};

const EDGE_COLORS = {
  // canonical typed edges
  Updates:        '#117dff',
  Extends:        '#16a34a',
  Derives:        '#8b5cf6',
  Supports:       '#16a34a',
  Contradicts:    '#dc2626',
  References:    '#a3a3a3',
  // common lower-case aliases
  updates:        '#117dff',
  extends:        '#16a34a',
  derives:        '#8b5cf6',
  derived_from:   '#8b5cf6',
  supports:       '#16a34a',
  contradicts:    '#dc2626',
  references:    '#a3a3a3',
  // MiroFish CSI styles seen in the reference screenshot
  needs_revision: '#8b5cf6',
  revise_claim:   '#a3a3a3',
  peer_review:    '#a3a3a3',
  investigate_source: '#a3a3a3',
  PROPOSE_CLAIM:  '#a3a3a3',
  // fallback
  default:        '#c4c0ba',
};

// Heuristic colour from edge name when not in the table.
function getEdgeColor(relType) {
  if (!relType) return EDGE_COLORS.default;
  if (EDGE_COLORS[relType]) return EDGE_COLORS[relType];
  const lower = String(relType).toLowerCase();
  if (EDGE_COLORS[lower]) return EDGE_COLORS[lower];
  if (lower.includes('contra') || lower.includes('challeng')) return '#dc2626';
  if (lower.includes('support') || lower.includes('verif') || lower.includes('extend')) return '#16a34a';
  if (lower.includes('deriv') || lower.includes('infer') || lower.includes('revision')) return '#8b5cf6';
  if (lower.includes('update')) return '#117dff';
  if (lower.includes('search') || lower.includes('read') || lower.includes('source')) return '#0891b2';
  if (lower.includes('role') || lower.includes('agent')) return '#9C27B0';
  if (lower.includes('produc') || lower.includes('action')) return '#FF8A34';
  return EDGE_COLORS.default;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(120,120,120,${alpha})`;
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(120,120,120,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getTypeKey(node) {
  return (node.memoryType || node.memory_type || node.type || '').toLowerCase() || 'default';
}

function getNodeColor(node) {
  return TYPE_COLORS[getTypeKey(node)] || TYPE_COLORS.default;
}

function getNodeShape(node) {
  return TYPE_SHAPE[getTypeKey(node)] || 'circle';
}

function getNodeRadius(node) {
  const t = getTypeKey(node);
  const base = 6;
  const deg = Math.log2(1 + (node.degree || node.connections || 1));
  const r = (base + deg * 1.6) * (TYPE_SIZE[t] || 1);
  return Math.max(4, Math.min(18, r));
}

// Polyfill roundRect for older canvases.
function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) return ctx.roundRect(x, y, w, h, r);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ─── Component ──────────────────────────────────────────────────────────────

const MemoryGraph2DCanvas = forwardRef(function MemoryGraph2DCanvas(
  {
    graphData,
    selectedNode,
    highlightNodes,
    filteredNodes,
    onNodeClick,
    onNodeHover,
    onBackgroundClick,
    width,
    height,
    backgroundColor = 'rgba(250,249,244,1)',
  },
  ref
) {
  const fgRef = useRef(null);
  const hoverIdRef = useRef(null);

  const highlightSet = useMemo(() => new Set([...(highlightNodes || [])]), [highlightNodes]);
  const filteredSet = useMemo(() => new Set([...(filteredNodes || [])]), [filteredNodes]);
  const hasFilter = filteredSet.size > 0;

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => fgRef.current?.zoom(fgRef.current.zoom() * 1.4, 350),
      zoomOut: () => fgRef.current?.zoom(fgRef.current.zoom() / 1.4, 350),
      zoomToFit: (duration = 600, padding = 60) => fgRef.current?.zoomToFit(duration, padding),
      centerAt: (x, y, ms = 500) => fgRef.current?.centerAt(x, y, ms),
      focusNode: (node, ms = 600) => {
        if (!node) return;
        if (typeof node.x === 'number' && typeof node.y === 'number') {
          fgRef.current?.centerAt(node.x, node.y, ms);
          fgRef.current?.zoom(2.4, ms);
        }
      },
      refresh: () => fgRef.current?.refresh?.(),
    }),
    []
  );

  // Physics — MiroFish GraphPanel exact tuning.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    try {
      const charge = fg.d3Force('charge');
      if (charge) {
        charge.strength(-350);
        if (typeof charge.distanceMax === 'function') charge.distanceMax(500);
      }
      const link = fg.d3Force('link');
      if (link) link.distance(120).strength(0.3);
      const center = fg.d3Force('center');
      if (center) center.strength(0.03);

      const existingCollide = fg.d3Force('collide');
      if (existingCollide && typeof existingCollide.radius === 'function') {
        existingCollide.radius((d) => getNodeRadius(d) + 20).strength(0.8);
      } else {
        fg.d3Force('collide', forceCollide().radius((d) => getNodeRadius(d) + 20).strength(0.8));
      }
      if (!fg.d3Force('x')) fg.d3Force('x', forceX().strength(0.015));
      if (!fg.d3Force('y')) fg.d3Force('y', forceY().strength(0.015));
      if (typeof fg.d3ReheatSimulation === 'function') fg.d3ReheatSimulation();
    } catch (e) {
      console.warn('[MemoryGraph2DCanvas] physics setup partial:', e?.message);
    }
  }, [graphData]);

  // Auto-fit on first data load.
  useEffect(() => {
    if (graphData?.nodes?.length > 0) {
      const t = setTimeout(() => fgRef.current?.zoomToFit(700, 80), 800);
      return () => clearTimeout(t);
    }
  }, [graphData]);

  // ─── paintNode — MiroFish replica ─────────────────────────────────────────
  const paintNode = useCallback(
    (node, ctx, globalScale) => {
      const baseColor = getNodeColor(node);
      const r = getNodeRadius(node);
      const shape = getNodeShape(node);

      const isSelected = selectedNode?.id === node.id;
      const isHighlight = highlightSet.has(node.id);
      const isDim = hasFilter && !filteredSet.has(node.id) && !isSelected && !isHighlight;
      const glow = 0.3;

      // ── Concentric rings (3 layers) ──
      if (!isDim) {
        // Outer halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 3.0, 0, 2 * Math.PI);
        ctx.strokeStyle = hexToRgba(baseColor, 0.06);
        ctx.lineWidth = 0.5 / globalScale;
        ctx.stroke();
        ctx.fillStyle = hexToRgba(baseColor, 0.03);
        ctx.fill();

        // Middle halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2.2, 0, 2 * Math.PI);
        ctx.strokeStyle = hexToRgba(baseColor, 0.1);
        ctx.lineWidth = 0.5 / globalScale;
        ctx.stroke();
        ctx.fillStyle = hexToRgba(baseColor, 0.05);
        ctx.fill();

        // Inner glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba(baseColor, 0.1);
        ctx.fill();
      }

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = '#117dff';
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // Highlight ring (search / agent picked)
      if (isHighlight && !isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // Hover halo (extra soft ring on mouseover)
      if (hoverIdRef.current === node.id && !isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = hexToRgba(baseColor, 0.35);
        ctx.lineWidth = 1.2 / globalScale;
        ctx.stroke();
      }

      // ── Body shape ──
      const fillAlpha = isDim ? 0.15 : 0.6 + glow * 0.4;
      const strokeAlpha = isDim ? 0.1 : 0.8;

      if (shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - r);
        ctx.lineTo(node.x + r, node.y);
        ctx.lineTo(node.x, node.y + r);
        ctx.lineTo(node.x - r, node.y);
        ctx.closePath();
      } else if (shape === 'square') {
        const s = r * 0.6;
        roundRect(ctx, node.x - s, node.y - s, s * 2, s * 2, 2);
      } else if (shape === 'hexagon') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          ctx.lineTo(node.x + r * Math.cos(angle), node.y + r * Math.sin(angle));
        }
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      }
      ctx.fillStyle = hexToRgba(baseColor, fillAlpha);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(baseColor, strokeAlpha);
      ctx.lineWidth = 0.5 / globalScale;
      ctx.stroke();

      // ── Always-on label (truncated to 18 chars) ──
      if (!isDim) {
        const raw = node.title || node.label || node.name || (node.content || '').slice(0, 60) || 'memory';
        const truncated = raw.length > 18 ? raw.substring(0, 18) + '…' : raw;
        const fontSize = Math.max(9, 10 / globalScale);
        ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(10,10,10,0.7)';
        ctx.fillText(truncated, node.x, node.y + r + 2);
      }
    },
    [selectedNode, highlightSet, filteredSet, hasFilter]
  );

  // ─── paintLink — MiroFish replica ─────────────────────────────────────────
  const paintLink = useCallback(
    (link, ctx, globalScale) => {
      const src = typeof link.source === 'object' ? link.source : null;
      const tgt = typeof link.target === 'object' ? link.target : null;
      if (!src || !tgt) return;
      const sx = src.x;
      const sy = src.y;
      const tx = tgt.x;
      const ty = tgt.y;
      if (sx === 0 && sy === 0 && tx === 0 && ty === 0) return;

      const sourceId = src.id;
      const targetId = tgt.id;
      const sourceImportant = selectedNode?.id === sourceId || highlightSet.has(sourceId);
      const targetImportant = selectedNode?.id === targetId || highlightSet.has(targetId);
      const isImportant = sourceImportant || targetImportant;
      const isDim = hasFilter && !filteredSet.has(sourceId) && !filteredSet.has(targetId) && !isImportant;

      const confidence = link.confidence != null
        ? link.confidence
        : (link.rawData?.confidence ?? 0.7);
      const relType = link.type || link.relation || link.label || 'RELATED';
      const color = getEdgeColor(relType);
      let opacity = 0.35 + (confidence || 0.5) * 0.3;
      if (isImportant) opacity = Math.min(1, opacity + 0.3);
      if (isDim) opacity = 0.08;
      const lineWidth = 0.5 + (confidence || 0.5) * 2;

      ctx.strokeStyle = hexToRgba(color, opacity);
      ctx.lineWidth = lineWidth;

      const isDashed = confidence < 0.5
        || /deriv|infer|revision|mentions|references/i.test(relType);
      if (isDashed) ctx.setLineDash([5, 4]);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      if (isDashed) ctx.setLineDash([]);

      // Directional arrow at 90% of segment.
      const t = 0.9;
      const ax = sx + (tx - sx) * t;
      const ay = sy + (ty - sy) * t;
      const arrowLen = 3;
      const angle = Math.atan2(ty - sy, tx - sx);
      ctx.fillStyle = hexToRgba(color, Math.min(1, opacity + 0.15));
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - arrowLen * Math.cos(angle - 0.4), ay - arrowLen * Math.sin(angle - 0.4));
      ctx.lineTo(ax - arrowLen * Math.cos(angle + 0.4), ay - arrowLen * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();

      // Edge label at midpoint w/ white background pill.
      if (globalScale > 0.8 && !isDim) {
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;
        const labelText = `${relType} ${Math.round((confidence || 0.7) * 100)}%`;
        const fontSize = 10 / globalScale;
        ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(labelText).width;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(midX - tw / 2 - 2, midY - 6, tw + 4, 12);
        ctx.fillStyle = 'rgba(10,10,10,0.8)';
        ctx.fillText(labelText, midX, midY);
      }
    },
    [selectedNode, highlightSet, filteredSet, hasFilter]
  );

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData || { nodes: [], links: [] }}
      width={width}
      height={height}
      backgroundColor={backgroundColor}
      nodeRelSize={6}
      cooldownTicks={400}
      warmupTicks={30}
      d3AlphaMin={0.001}
      d3AlphaDecay={0.015}
      d3VelocityDecay={0.25}
      minZoom={0.1}
      maxZoom={8}
      enableNodeDrag
      enableZoomInteraction
      enablePanInteraction
      onNodeClick={(node) => onNodeClick?.(node)}
      onNodeHover={(node) => {
        hoverIdRef.current = node?.id || null;
        onNodeHover?.(node);
      }}
      onBackgroundClick={() => onBackgroundClick?.()}
      nodeCanvasObject={paintNode}
      nodePointerAreaPaint={(node, color, ctx) => {
        const r = getNodeRadius(node) + 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }}
      linkCanvasObject={paintLink}
      linkDirectionalParticles={(link) => {
        const t = (link.type || link.relation || '').toLowerCase();
        if (/contradict|updates/.test(t)) return 2;
        return 0;
      }}
      linkDirectionalParticleSpeed={0.005}
      linkDirectionalParticleColor={(link) => getEdgeColor(link.type || link.relation || '')}
    />
  );
});

export default MemoryGraph2DCanvas;
