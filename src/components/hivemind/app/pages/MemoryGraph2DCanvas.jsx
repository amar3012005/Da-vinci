/**
 * MemoryGraph2DCanvas — 2D ForceGraph canvas that mirrors the look and
 * interactions of MemoryGraph3D. Same node colours, same edge palette,
 * same hover/click/select callbacks, same monochrome cream background.
 *
 * Used by MemoryGraph.jsx when `dimension === '2d'`.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import ForceGraph2D from 'react-force-graph-2d';

// ─── Palettes — mirrors MemoryGraph3D ───────────────────────────────────────

const TYPE_COLORS = {
  fact:         '#117dff',
  preference:   '#d97706',
  decision:     '#d97706',
  goal:         '#16a34a',
  event:        '#7c3aed',
  lesson:       '#0d9488',
  relationship: '#dc2626',
  note:         '#475569',
  conversation: '#117dff',
  default:      '#525252',
};

const EDGE_COLORS = {
  Updates:     '#f59e0b',
  Extends:     '#22c55e',
  Derives:     '#8b5cf6',
  Contradicts: '#ef4444',
  Supports:    '#3b82f6',
  supports:    '#3b82f6',
  References:  '#94a3b8',
  mentions:    '#94a3b8',
  default:     '#cbd5e1',
};

function getNodeColor(node) {
  const t = (node.memoryType || node.memory_type || node.type || '').toLowerCase();
  return TYPE_COLORS[t] || TYPE_COLORS.default;
}

function getNodeRadius(node) {
  const deg = node.degree || node.connections || 1;
  return Math.max(4, Math.min(16, 4 + Math.log2(deg + 1) * 2.4));
}

function getEdgeColor(link) {
  const k = link.type || link.relation || link.label || 'default';
  return EDGE_COLORS[k] || EDGE_COLORS[k?.toLowerCase?.()] || EDGE_COLORS.default;
}

// Word-wrap text into N lines for label rendering.
function wrapLabel(text, maxLen = 22, maxLines = 2) {
  if (!text) return [];
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxLen) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length + 4) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,3}$/, '…');
  }
  return lines;
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

  // Highlight + filter sets (memoised so the render loop is cheap).
  const highlightSet = useMemo(() => new Set([...(highlightNodes || [])]), [highlightNodes]);
  const filteredSet = useMemo(() => new Set([...(filteredNodes || [])]), [filteredNodes]);

  const hasFilter = filteredSet.size > 0;

  // Expose imperative methods to parent (mirrors MemoryGraph3D forwardRef API).
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

  // Tune the simulation — slightly tighter than the lib defaults so clusters
  // form quickly without spinning forever.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    try {
      fg.d3Force('charge')?.strength(-180);
      fg.d3Force('link')?.distance(48).strength(0.35);
      fg.d3Force('center')?.strength(0.04);
    } catch {}
  }, [graphData]);

  // Auto-fit on first data load.
  useEffect(() => {
    if (graphData?.nodes?.length > 0) {
      const t = setTimeout(() => fgRef.current?.zoomToFit(600, 80), 600);
      return () => clearTimeout(t);
    }
  }, [graphData]);

  // ─── Canvas painters ──────────────────────────────────────────────────────

  const paintNode = useCallback(
    (node, ctx, globalScale) => {
      const isSelected = selectedNode?.id === node.id;
      const isHighlight = highlightSet.has(node.id);
      const isDim = hasFilter && !filteredSet.has(node.id) && !isSelected && !isHighlight;
      const r = getNodeRadius(node) * (isSelected ? 1.6 : isHighlight ? 1.25 : 1);
      const color = getNodeColor(node);

      // Soft outer glow on selected / hovered.
      if (isSelected || hoverIdRef.current === node.id) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2.4, 0, Math.PI * 2);
        const grd = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r * 2.4);
        grd.addColorStop(0, color + '55');
        grd.addColorStop(1, color + '00');
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Body
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isDim ? '#cbd5e1' : color;
      ctx.globalAlpha = isDim ? 0.35 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Ring (selected gets primary blue)
      ctx.lineWidth = isSelected ? 2.2 / globalScale : 1.2 / globalScale;
      ctx.strokeStyle = isSelected ? '#117dff' : 'rgba(10,10,10,0.18)';
      ctx.stroke();

      // Label (only when zoomed in OR selected / highlighted)
      const showLabel = globalScale > 1.8 || isSelected || isHighlight;
      if (showLabel) {
        const title = node.title || node.label || (node.content || '').slice(0, 60) || 'memory';
        const lines = wrapLabel(title, 24, isSelected ? 3 : 2);
        const fontSize = (isSelected ? 11 : 9) / globalScale;
        ctx.font = `${isSelected ? 700 : 500} ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const lineHeight = fontSize * 1.2;
        // Soft white-cream pill bg behind text for readability
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
        const padX = 4 / globalScale;
        const padY = 2 / globalScale;
        const boxW = widest + padX * 2;
        const boxH = lineHeight * lines.length + padY * 2;
        const boxX = node.x - boxW / 2;
        const boxY = node.y + r + 4 / globalScale;
        ctx.fillStyle = 'rgba(250,249,244,0.88)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 3 / globalScale);
        else ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();

        ctx.fillStyle = isDim ? '#94a3b8' : '#0a0a0a';
        lines.forEach((ln, i) => {
          ctx.fillText(ln, node.x, boxY + padY + i * lineHeight);
        });
      }
    },
    [selectedNode, highlightSet, filteredSet, hasFilter]
  );

  const paintLink = useCallback(
    (link, ctx, globalScale) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const sourceImportant = selectedNode?.id === sourceId || highlightSet.has(sourceId);
      const targetImportant = selectedNode?.id === targetId || highlightSet.has(targetId);
      const isImportant = sourceImportant || targetImportant;
      const isDim = hasFilter && !filteredSet.has(sourceId) && !filteredSet.has(targetId) && !isImportant;

      const color = getEdgeColor(link);
      const op = isDim ? 0.05 : isImportant ? 0.85 : 0.32;

      ctx.strokeStyle = color
        .replace(/^#/, '')
        .match(/.{2}/g)
        ? `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)},${op})`
        : `rgba(120,120,120,${op})`;
      ctx.lineWidth = (isImportant ? 1.4 : 0.8) / globalScale;

      // Dashed for soft-relation edges (Derives / mentions / References)
      const dashed = /derives|mentions|references/i.test(link.type || link.relation || '');
      if (dashed) ctx.setLineDash([4 / globalScale, 3 / globalScale]);

      const src = typeof link.source === 'object' ? link.source : null;
      const tgt = typeof link.target === 'object' ? link.target : null;
      if (!src || !tgt) return;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
      if (dashed) ctx.setLineDash([]);

      // Edge label — only when both endpoints important + zoomed in.
      if (isImportant && globalScale > 1.6) {
        const label = link.type || link.relation || link.label;
        const conf = link.confidence != null ? Math.round(link.confidence * 100) + '%' : null;
        if (label) {
          const mx = (src.x + tgt.x) / 2;
          const my = (src.y + tgt.y) / 2;
          const fontSize = 8 / globalScale;
          ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const text = conf ? `${label} ${conf}` : label;
          ctx.fillText(text, mx, my - 4 / globalScale);
        }
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
      nodeRelSize={5}
      cooldownTicks={120}
      d3AlphaDecay={0.025}
      d3VelocityDecay={0.32}
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
      linkDirectionalParticleColor={(link) => getEdgeColor(link)}
    />
  );
});

export default MemoryGraph2DCanvas;
