import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  X, Search, RefreshCw,
  ZoomIn, ZoomOut, Crosshair,
  ChevronDown, Clock, GitBranch, Brain as BrainIcon,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';

/* ─── Constants ──────────────────────────────────────────────────── */
const DARK_EDGE_COLORS = {
  Updates: '#60a5fa',
  Extends: '#4ade80',
  Derives: '#c084fc',
  Contradicts: '#f87171',
};

const DARK_TYPE_COLORS = {
  fact: '#60a5fa',
  preference: '#fbbf24',
  decision: '#f87171',
  lesson: '#4ade80',
  goal: '#c084fc',
  event: '#22d3ee',
  relationship: '#f472b6',
  default: '#94a3b8',
};

const DARK_LAYER_COLORS = {
  fact: '#34d399',
  observation: '#fbbf24',
  promoted: '#f87171',
  verified: '#4ade80',
  tara: '#c084fc',
  'tara-insight': '#fb923c',
  memory: null,
};

/* ─── Helpers ────────────────────────────────────────────────────── */
function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/* ─── Source Icon Drawing ────────────────────────────────────────── */
function drawSourceIcon(ctx, x, y, platform, color) {
  const s = 2; // half-size of the icon
  ctx.fillStyle = hexToRgba(color, 0.6);
  ctx.strokeStyle = hexToRgba(color, 0.6);
  ctx.lineWidth = 0.6;

  switch (platform?.toLowerCase()) {
    case 'gmail':
    case 'email':
      // Envelope: small rect + triangle flap
      ctx.beginPath();
      ctx.rect(x - s, y - s * 0.6, s * 2, s * 1.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - s, y - s * 0.6);
      ctx.lineTo(x, y + s * 0.1);
      ctx.lineTo(x + s, y - s * 0.6);
      ctx.stroke();
      break;
    case 'slack':
      // Hash symbol
      ctx.font = `bold ${s * 2.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('#', x, y);
      break;
    case 'github':
      // Circle
      ctx.beginPath();
      ctx.arc(x, y, s, 0, 2 * Math.PI);
      ctx.fill();
      break;
    case 'claude':
      // Diamond
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s, y);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      // Dot for manual / unknown
      ctx.beginPath();
      ctx.arc(x, y, s * 0.7, 0, 2 * Math.PI);
      ctx.fill();
      break;
  }
}

/* ─── Node Detail Panel (Dark Themed) ───────────────────────────── */
function NodeDetail({ node, edges, onClose, onNavigate }) {
  if (!node) return null;

  const inbound = edges.filter(e => e.target === node.id || e.target?.id === node.id);
  const outbound = edges.filter(e => e.source === node.id || e.source?.id === node.id);

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute top-0 right-0 w-[340px] h-full bg-[#0d1117] border-l border-white/10 shadow-[-8px_0_30px_rgba(0,0,0,0.4)] z-20 overflow-y-auto"
    >
      <div className="sticky top-0 bg-[#0d1117]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Memory Detail</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors">
          <X size={14} className="text-white/40" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        {/* Title & type */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: DARK_TYPE_COLORS[node.memoryType] || DARK_TYPE_COLORS.default }}
            />
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              {node.memoryType || 'memory'}
            </span>
            {node.nodeLayer && node.nodeLayer !== 'memory' && (
              <span
                className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: hexToRgba(DARK_LAYER_COLORS[node.nodeLayer] || '#94a3b8', 0.15),
                  color: DARK_LAYER_COLORS[node.nodeLayer] || '#94a3b8',
                }}
              >
                {node.nodeLayer}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold font-['Space_Grotesk'] text-white/90 leading-snug">
            {node.title || 'Untitled Memory'}
          </h3>
        </div>

        {/* Content */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="text-xs text-white/60 font-['Space_Grotesk'] leading-relaxed whitespace-pre-wrap">
            {node.content || 'No content'}
          </p>
        </div>

        {/* Tags */}
        {node.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {node.tags.map(t => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Scores */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Importance', value: node.importanceScore?.toFixed(2) },
            { label: 'Strength', value: node.strength?.toFixed(2) },
            { label: 'Recalls', value: node.recallCount },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
              <p className="text-[10px] text-white/40 font-mono">{s.label}</p>
              <p className="text-sm font-semibold font-['Space_Grotesk'] text-white/90">{s.value ?? '--'}</p>
            </div>
          ))}
        </div>

        {/* Temporal */}
        <div className="flex items-center gap-2 text-[11px] text-white/40 font-['Space_Grotesk']">
          <Clock size={12} />
          <span>{node.daysSinceUpdate != null ? `${node.daysSinceUpdate.toFixed(1)} days ago` : '--'}</span>
          <span className="ml-auto">Glow: {((node.temporalWeight || 0) * 100).toFixed(0)}%</span>
        </div>

        {/* Relationships */}
        {(inbound.length > 0 || outbound.length > 0) && (
          <div>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Relationships</p>
            <div className="space-y-1.5">
              {outbound.map((e, i) => {
                const targetId = typeof e.target === 'object' ? e.target.id : e.target;
                return (
                  <button
                    key={`out-${i}`}
                    onClick={() => onNavigate(targetId)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-left transition-colors"
                  >
                    <GitBranch size={10} style={{ color: DARK_EDGE_COLORS[e.type] || '#94a3b8' }} />
                    <span className="text-[10px] font-mono" style={{ color: DARK_EDGE_COLORS[e.type] }}>
                      {e.type}
                    </span>
                    <span className="text-[11px] text-white/50 font-['Space_Grotesk'] truncate flex-1">
                      {truncate(targetId, 20)}
                    </span>
                  </button>
                );
              })}
              {inbound.map((e, i) => {
                const sourceId = typeof e.source === 'object' ? e.source.id : e.source;
                return (
                  <button
                    key={`in-${i}`}
                    onClick={() => onNavigate(sourceId)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-left transition-colors"
                  >
                    <GitBranch size={10} className="rotate-180" style={{ color: DARK_EDGE_COLORS[e.type] || '#94a3b8' }} />
                    <span className="text-[10px] font-mono opacity-50" style={{ color: DARK_EDGE_COLORS[e.type] }}>
                      {'<-'} {e.type}
                    </span>
                    <span className="text-[11px] text-white/50 font-['Space_Grotesk'] truncate flex-1">
                      {truncate(sourceId, 20)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="text-[10px] text-white/30 font-mono space-y-0.5">
          <p>ID: {node.id}</p>
          {node.sourcePlatform && <p>Source: {node.sourcePlatform}</p>}
          {node.project && <p>Project: {node.project}</p>}
          {node.createdAt && <p>Created: {new Date(node.createdAt).toLocaleString()}</p>}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function Brain() {
  const { org } = useAuth();
  const graphRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [rawEdges, setRawEdges] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [projectFilter, setProjectFilter] = useState('');
  const [scope, setScope] = useState('personal');
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showScopeMenu, setShowScopeMenu] = useState(false);

  /* ─── Fetch graph data ─────────────────────────────────────────── */
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getGraph({ project: projectFilter || undefined, limit: 300, scope });
      const nodes = (data.nodes || []).map(n => ({
        ...n,
        val: Math.max(2, (n.importanceScore || 0.5) * 8 + (n.recallCount || 0) * 0.5),
      }));
      const links = (data.edges || []).map(e => ({
        source: e.source,
        target: e.target,
        type: e.type,
        confidence: e.confidence || 1,
      }));
      setGraphData({ nodes, links });
      setRawEdges(data.edges || []);
      setMeta(data.meta || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  }, [projectFilter, scope]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  /* ─── Search highlighting ──────────────────────────────────────── */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightNodes(new Set());
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = new Set();
    graphData.nodes.forEach(n => {
      if (
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.tags?.some(t => t.toLowerCase().includes(q))
      ) {
        matches.add(n.id);
      }
    });
    setHighlightNodes(matches);

    if (matches.size > 0 && graphRef.current) {
      const firstId = [...matches][0];
      const node = graphData.nodes.find(n => n.id === firstId);
      if (node) {
        graphRef.current.centerAt(node.x, node.y, 600);
        graphRef.current.zoom(3, 600);
      }
    }
  }, [searchQuery, graphData.nodes]);

  /* ─── Ambient animation (breathing drift) ──────────────────────── */
  useEffect(() => {
    if (!graphRef.current) return;
    let frame;
    let time = 0;
    const animate = () => {
      time += 0.01;
      const fg = graphRef.current;
      if (fg) {
        const data = fg.graphData();
        data.nodes.forEach((node, i) => {
          if (!node._fx && !node._fy) {
            node.x += Math.sin(time + i * 0.7) * 0.08;
            node.y += Math.cos(time + i * 0.5) * 0.06;
          }
        });
        fg.refresh();
      }
      frame = requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, 3000);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [graphData]);

  /* ─── Node interactions ────────────────────────────────────────── */
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 400);
      graphRef.current.zoom(4, 400);
    }
  }, []);

  const handleNavigate = useCallback((nodeId) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) handleNodeClick(node);
  }, [graphData.nodes, handleNodeClick]);

  /* ─── Custom node painting ─────────────────────────────────────── */
  const paintNode = useCallback((node, ctx, globalScale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

    const isHighlighted = highlightNodes.size > 0 && highlightNodes.has(node.id);
    const isDimmed = highlightNodes.size > 0 && !highlightNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;

    const layerColor = DARK_LAYER_COLORS[node.nodeLayer];
    const baseColor = layerColor
      || DARK_TYPE_COLORS[node.memoryType]
      || DARK_TYPE_COLORS.default;

    const glow = node.temporalWeight || 0.3;
    let radius = Math.sqrt(node.val || 4) * 2.2;

    // Size adjustments per layer
    if (node.nodeLayer === 'fact') radius = Math.max(radius * 0.7, 3);
    if (node.nodeLayer === 'promoted') radius = radius * 1.5;
    if (node.nodeLayer === 'tara') radius = radius * 1.2;
    if (node.nodeLayer === 'tara-insight') radius = radius * 1.1;

    // Outer glow ring (temporal energy)
    if (!isDimmed) {
      const glowRadius = radius + 4 + glow * 8;
      const gradient = ctx.createRadialGradient(node.x, node.y, radius * 0.5, node.x, node.y, glowRadius);
      gradient.addColorStop(0, hexToRgba(baseColor, 0.4));
      gradient.addColorStop(0.6, hexToRgba(baseColor, 0.08));
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Highlight ring
    if (isHighlighted) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    // ── Node body — shape per layer type ──
    if (node.nodeLayer === 'tara-insight') {
      // 4-point star for clinical insights
      const spikes = 4;
      const outerR = radius;
      const innerR = radius * 0.45;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        ctx.lineTo(node.x + r * Math.cos(angle), node.y + r * Math.sin(angle));
      }
      ctx.closePath();
      ctx.fillStyle = isDimmed ? hexToRgba(baseColor, 0.08) : hexToRgba(baseColor, 0.85);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(baseColor, 0.95);
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();

    } else if (node.nodeLayer === 'tara') {
      // Hexagon for TARA conversation turns
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        ctx.lineTo(node.x + radius * Math.cos(angle), node.y + radius * Math.sin(angle));
      }
      ctx.closePath();
      ctx.fillStyle = isDimmed ? hexToRgba(baseColor, 0.08) : hexToRgba(baseColor, 0.8);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(baseColor, 0.95);
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();

    } else if (node.nodeLayer === 'fact') {
      // Diamond for extracted facts
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - radius);
      ctx.lineTo(node.x + radius, node.y);
      ctx.lineTo(node.x, node.y + radius);
      ctx.lineTo(node.x - radius, node.y);
      ctx.closePath();
      ctx.fillStyle = isDimmed ? hexToRgba(baseColor, 0.08) : hexToRgba(baseColor, 0.75);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(baseColor, 0.9);
      ctx.lineWidth = 0.5 / globalScale;
      ctx.stroke();

    } else if (node.nodeLayer === 'observation') {
      // Rounded square for observations
      const s = radius * 0.85;
      ctx.beginPath();
      ctx.roundRect(node.x - s, node.y - s, s * 2, s * 2, 3);
      ctx.fillStyle = isDimmed ? hexToRgba(baseColor, 0.08) : hexToRgba(baseColor, 0.65);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(baseColor, 0.85);
      ctx.lineWidth = 0.5 / globalScale;
      ctx.stroke();

    } else {
      // Circle for regular memories
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isDimmed ? hexToRgba(baseColor, 0.08) : hexToRgba(baseColor, 0.65 + glow * 0.35);
      ctx.fill();
      ctx.strokeStyle = isDimmed ? hexToRgba(baseColor, 0.05) : hexToRgba(baseColor, 0.85);
      ctx.lineWidth = 0.5 / globalScale;
      ctx.stroke();
    }

    // Source icon badge (bottom-right of node)
    if (node.sourcePlatform && !isDimmed && globalScale > 0.8) {
      drawSourceIcon(ctx, node.x + radius * 0.7, node.y + radius * 0.7, node.sourcePlatform, baseColor);
    }

    // Labels: progressive opacity based on zoom level
    const labelOpacity = Math.min(1, Math.max(0, (globalScale - 1.2) / 1.0));
    if (labelOpacity > 0.05 && !isDimmed) {
      const label = truncate(node.title || '', 25);
      ctx.font = `${Math.max(10, 11 / globalScale)}px Space Grotesk, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = `rgba(255,255,255,${labelOpacity * 0.85})`;
      ctx.fillText(label, node.x, node.y + radius + 3);
    }
  }, [highlightNodes, selectedNode]);

  /* ─── Custom link painting (curved Bezier) ─────────────────────── */
  const paintLink = useCallback((link, ctx) => {
    const sx = link.source?.x ?? link.source;
    const sy = link.source?.y ?? link.source;
    const tx = link.target?.x ?? link.target;
    const ty = link.target?.y ?? link.target;
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(tx) || !Number.isFinite(ty)) return;

    const color = DARK_EDGE_COLORS[link.type] || '#334155';
    const confidence = link.confidence || 0.5;

    ctx.strokeStyle = hexToRgba(color, 0.2 + confidence * 0.4);
    ctx.lineWidth = 0.5 + confidence * 1.5;

    if (link.type === 'Derives') {
      ctx.setLineDash([4, 4]);
    }

    // Bezier curve
    const dx = link.target.x - link.source.x;
    const dy = link.target.y - link.source.y;
    const curvature = 0.15;
    const cx = (link.source.x + link.target.x) / 2 - dy * curvature;
    const cy = (link.source.y + link.target.y) / 2 + dx * curvature;

    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.quadraticCurveTo(cx, cy, link.target.x, link.target.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  /* ─── Stats ────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const nodeCount = meta?.nodeCount || graphData.nodes.length;
    const edgeCount = meta?.edgeCount || graphData.links?.length || 0;
    const sources = new Set(graphData.nodes.map(n => n.sourcePlatform).filter(Boolean)).size;
    const clusters = meta?.clusters || Math.max(1, Math.floor(nodeCount / 40));
    return { nodes: nodeCount, edges: edgeCount, sources, clusters };
  }, [meta, graphData]);

  /* ─── Scope label ──────────────────────────────────────────────── */
  const scopeLabel = scope === 'personal' ? 'Personal' : scope === 'team' ? 'Team' : 'All';

  return (
    <div className="h-screen w-full relative overflow-hidden" style={{ backgroundColor: '#08080c' }}>
      {/* Radial gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #0d1117 0%, #08080c 70%)',
        }}
      />

      {/* ─── Top bar overlay ───────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-8 pr-3 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-xs font-['Space_Grotesk'] text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {/* Scope toggle */}
        <div className="relative">
          <button
            onClick={() => { setShowScopeMenu(!showScopeMenu); setShowProjectMenu(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-['Space_Grotesk'] bg-white/5 backdrop-blur-md border border-white/10 text-white/70 hover:border-white/20 transition-colors"
          >
            {scopeLabel}
            <ChevronDown size={10} className="text-white/40" />
          </button>
          <AnimatePresence>
            {showScopeMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1 left-0 bg-[#0d1117]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-lg z-30 py-1 min-w-[120px]"
              >
                {[
                  { key: 'personal', label: 'Personal' },
                  { key: 'team', label: 'Team', disabled: org?.plan !== 'enterprise' },
                  { key: 'all', label: 'All', disabled: org?.plan !== 'enterprise' },
                ].map(option => (
                  <button
                    key={option.key}
                    disabled={option.disabled}
                    onClick={() => { if (!option.disabled) { setScope(option.key); setShowScopeMenu(false); } }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-['Space_Grotesk'] hover:bg-white/5 transition-colors ${
                      scope === option.key ? 'text-[#60a5fa]' : 'text-white/60'
                    } ${option.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Project filter */}
        <div className="relative">
          <button
            onClick={() => { setShowProjectMenu(!showProjectMenu); setShowScopeMenu(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-['Space_Grotesk'] bg-white/5 backdrop-blur-md border border-white/10 text-white/70 hover:border-white/20 transition-colors"
          >
            {projectFilter || 'All Projects'}
            <ChevronDown size={10} className="text-white/40" />
          </button>
          <AnimatePresence>
            {showProjectMenu && meta?.projects?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1 left-0 bg-[#0d1117]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-lg z-30 py-1 min-w-[160px]"
              >
                <button
                  onClick={() => { setProjectFilter(''); setShowProjectMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs font-['Space_Grotesk'] text-white/60 hover:bg-white/5"
                >
                  All Projects
                </button>
                {meta.projects.map(p => (
                  <button
                    key={p}
                    onClick={() => { setProjectFilter(p); setShowProjectMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-['Space_Grotesk'] hover:bg-white/5 ${
                      projectFilter === p ? 'text-[#60a5fa] font-semibold' : 'text-white/60'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchGraph}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors disabled:opacity-30"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>

        {/* Zoom controls */}
        <button
          onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 200)}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={13} />
        </button>
        <button
          onClick={() => graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 200)}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={() => graphRef.current?.zoomToFit(400, 40)}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
          title="Fit to view"
        >
          <Crosshair size={13} />
        </button>
      </div>

      {/* ─── Graph canvas ──────────────────────────────────────────── */}
      {loading && graphData.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#60a5fa] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-white/40 font-['Space_Grotesk']">Loading second brain...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-xl px-4 py-2 text-xs text-red-400 font-['Space_Grotesk']">
          {error}
        </div>
      )}

      {graphData.nodes.length > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeCanvasObject={paintNode}
          linkCanvasObject={paintLink}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => { setSelectedNode(null); setShowProjectMenu(false); setShowScopeMenu(false); }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const r = Math.sqrt(node.val || 4) * 2.2 + 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={0.9}
          linkDirectionalArrowColor={(link) => DARK_EDGE_COLORS[link.type] || '#334155'}
          cooldownTicks={100}
          warmupTicks={50}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          backgroundColor="rgba(0,0,0,0)"
          width={typeof window !== 'undefined' ? window.innerWidth - (selectedNode ? 340 : 0) : 800}
          height={typeof window !== 'undefined' ? window.innerHeight : 600}
        />
      )}

      {graphData.nodes.length === 0 && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <BrainIcon size={32} className="text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30 font-['Space_Grotesk']">
              No memories found. Save some memories to see your second brain.
            </p>
          </div>
        </div>
      )}

      {/* ─── Stats bar (bottom) ────────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-5 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
        {[
          { label: 'Memories', value: formatNumber(stats.nodes) },
          { label: 'Connections', value: formatNumber(stats.edges) },
          { label: 'Sources', value: String(stats.sources) },
          { label: 'Clusters', value: String(stats.clusters) },
        ].map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <span className="text-white/10">|</span>}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-white/40 font-['Space_Grotesk']">{item.label}:</span>
              <span className="text-[11px] text-white/80 font-mono tabular-nums">{item.value}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ─── Node detail sidecar ───────────────────────────────────── */}
      <AnimatePresence>
        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            edges={rawEdges}
            onClose={() => setSelectedNode(null)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
