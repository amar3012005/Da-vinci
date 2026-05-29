import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  X, Search, RefreshCw,
  ZoomIn, ZoomOut, Crosshair,
  ChevronDown, Clock, GitBranch, Brain as BrainIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';
import { useTeamContext } from '../shared/team-context';

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
  const { t } = useTranslation('dashboard');
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
        <span className="text-xs font-mono text-white/40 uppercase tracking-wider">{t('brain.memoryDetail', 'Memory Detail')}</span>
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
            {node.title || t('brain.untitledMemory', 'Untitled Memory')}
          </h3>
        </div>

        {/* Content */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="text-xs text-white/60 font-['Space_Grotesk'] leading-relaxed whitespace-pre-wrap">
            {node.content || t('brain.noContent', 'No content')}
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
            { label: t('brain.importance', 'Importance'), value: node.importanceScore?.toFixed(2) },
            { label: t('brain.strength', 'Strength'), value: node.strength?.toFixed(2) },
            { label: t('brain.recalls', 'Recalls'), value: node.recallCount },
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
          <span>{node.daysSinceUpdate != null ? t('brain.daysAgo', '{{n}} days ago', { n: node.daysSinceUpdate.toFixed(1) }) : '--'}</span>
          <span className="ml-auto">{t('brain.glow', 'Glow: {{pct}}%', { pct: ((node.temporalWeight || 0) * 100).toFixed(0) })}</span>
        </div>

        {/* Relationships */}
        {(inbound.length > 0 || outbound.length > 0) && (
          <div>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">{t('brain.relationships', 'Relationships')}</p>
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
  const { t } = useTranslation('dashboard');
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

  // Sync local projectFilter with TeamSwitcher active project (parity with
  // Chat, Memories, Overview, MemoryGraph). Pages now share one scope source.
  const { activeProject } = useTeamContext() || {};
  useEffect(() => {
    if (activeProject) setProjectFilter(activeProject.slug || activeProject.name || '');
    else setProjectFilter('');
  }, [activeProject]);

  /* ─── Fetch graph data ─────────────────────────────────────────── */
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getGraph({
        project: projectFilter || undefined,
        project_id: activeProject?.id || undefined,
        limit: 300,
        scope,
      });
      const nodes = (data.nodes || []).map(n => ({
        ...n,
        val: Math.max(2, (n.importanceScore || 0.5) * 8 + (n.recallCount || 0) * 0.5),
        _pulsePhase: Math.random() * Math.PI * 2, // random phase so nodes pulse independently
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
  }, [projectFilter, scope, activeProject?.id]);

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
            node.x += Math.sin(time + i * 0.7) * 0.15;
            node.y += Math.cos(time * 0.8 + i * 0.5) * 0.12;
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

  /* ─── Animate time ref for pulsing effects ──────────────────────── */
  const timeRef = useRef(0);
  useEffect(() => {
    let frame;
    const tick = () => { timeRef.current += 0.015; frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  /* ─── Custom node painting — NEURAL ORBS ──────────────────────── */
  const paintNode = useCallback((node, ctx, globalScale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

    const isHighlighted = highlightNodes.size > 0 && highlightNodes.has(node.id);
    const isDimmed = highlightNodes.size > 0 && !highlightNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;

    const layerColor = DARK_LAYER_COLORS[node.nodeLayer];
    const baseColor = layerColor || DARK_TYPE_COLORS[node.memoryType] || DARK_TYPE_COLORS.default;

    const glow = node.temporalWeight || 0.3;
    const t = timeRef.current;
    // Pulsing factor — each node pulses at its own phase
    const pulse = 0.85 + Math.sin(t * 1.2 + (node._pulsePhase || 0)) * 0.15;

    let radius = Math.sqrt(node.val || 4) * 2.5 * pulse;
    if (node.nodeLayer === 'promoted') radius *= 1.4;
    if (node.nodeLayer === 'tara') radius *= 1.15;

    if (isDimmed) {
      // Dimmed: just a tiny faint dot
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius * 0.5, 0, 2 * Math.PI);
      ctx.fillStyle = hexToRgba(baseColor, 0.06);
      ctx.fill();
      return;
    }

    // ── Layer 1: Outer nebula halo (large, very faint) ──
    const nebulaR = radius * 4 + glow * 12;
    const nebula = ctx.createRadialGradient(node.x, node.y, radius, node.x, node.y, nebulaR);
    nebula.addColorStop(0, hexToRgba(baseColor, 0.12 * glow));
    nebula.addColorStop(0.4, hexToRgba(baseColor, 0.04 * glow));
    nebula.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(node.x, node.y, nebulaR, 0, 2 * Math.PI);
    ctx.fillStyle = nebula;
    ctx.fill();

    // ── Layer 2: Inner glow ring ──
    const glowR = radius * 2.2;
    const innerGlow = ctx.createRadialGradient(node.x, node.y, radius * 0.3, node.x, node.y, glowR);
    innerGlow.addColorStop(0, hexToRgba(baseColor, 0.5));
    innerGlow.addColorStop(0.5, hexToRgba(baseColor, 0.15));
    innerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(node.x, node.y, glowR, 0, 2 * Math.PI);
    ctx.fillStyle = innerGlow;
    ctx.fill();

    // ── Layer 3: Core orb (bright center) ──
    const coreGrad = ctx.createRadialGradient(
      node.x - radius * 0.15, node.y - radius * 0.15, radius * 0.1,
      node.x, node.y, radius
    );
    coreGrad.addColorStop(0, hexToRgba('#ffffff', 0.9));
    coreGrad.addColorStop(0.2, hexToRgba(baseColor, 0.95));
    coreGrad.addColorStop(0.7, hexToRgba(baseColor, 0.6));
    coreGrad.addColorStop(1, hexToRgba(baseColor, 0.15));
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // ── Layer 4: Specular highlight (tiny bright spot top-left) ──
    const specR = radius * 0.35;
    const spec = ctx.createRadialGradient(
      node.x - radius * 0.3, node.y - radius * 0.3, 0,
      node.x - radius * 0.3, node.y - radius * 0.3, specR
    );
    spec.addColorStop(0, 'rgba(255,255,255,0.7)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(node.x - radius * 0.3, node.y - radius * 0.3, specR, 0, 2 * Math.PI);
    ctx.fillStyle = spec;
    ctx.fill();

    // ── Selection: glowing ring ──
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = hexToRgba('#60a5fa', 0.9);
      ctx.lineWidth = 2.5 / globalScale;
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ── Highlight: warm ring ──
    if (isHighlighted) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = hexToRgba('#fbbf24', 0.8);
      ctx.lineWidth = 1.8 / globalScale;
      ctx.stroke();
    }

    // ── Promoted risk: pulsing red halo ──
    if (node.nodeLayer === 'promoted') {
      const pr = radius + 6 + Math.sin(t * 2) * 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, pr, 0, 2 * Math.PI);
      ctx.strokeStyle = hexToRgba('#f87171', 0.3 + Math.sin(t * 2) * 0.15);
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    // ── Source icon badge ──
    if (node.sourcePlatform && globalScale > 0.8) {
      drawSourceIcon(ctx, node.x + radius * 0.8, node.y + radius * 0.8, node.sourcePlatform, '#ffffff');
    }

    // ── Labels: progressive reveal ──
    const labelOpacity = Math.min(1, Math.max(0, (globalScale - 1.0) / 0.8));
    if (labelOpacity > 0.05) {
      const label = truncate(node.title || '', 25);
      const fontSize = Math.max(9, 10 / globalScale);
      ctx.font = `${fontSize}px Space Grotesk, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // Text shadow for readability on dark bg
      ctx.fillStyle = `rgba(0,0,0,${labelOpacity * 0.6})`;
      ctx.fillText(label, node.x + 0.5, node.y + radius + 4.5);
      ctx.fillStyle = `rgba(255,255,255,${labelOpacity * 0.9})`;
      ctx.fillText(label, node.x, node.y + radius + 4);
    }
  }, [highlightNodes, selectedNode]);

  /* ─── Custom link painting — GLOWING SYNAPTIC CONNECTIONS ──────── */
  const paintLink = useCallback((link, ctx) => {
    const sx = link.source?.x ?? link.source;
    const sy = link.source?.y ?? link.source;
    const tx = link.target?.x ?? link.target;
    const ty = link.target?.y ?? link.target;
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(tx) || !Number.isFinite(ty)) return;

    const color = DARK_EDGE_COLORS[link.type] || '#334155';
    const confidence = link.confidence || 0.5;

    // Bezier curve control point
    const dx = tx - sx;
    const dy = ty - sy;
    const curvature = 0.2;
    const cx = (sx + tx) / 2 - dy * curvature;
    const cy = (sy + ty) / 2 + dx * curvature;

    // Layer 1: Wide faint glow (synaptic channel)
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.strokeStyle = hexToRgba(color, 0.06 + confidence * 0.06);
    ctx.lineWidth = 3 + confidence * 3;
    ctx.stroke();

    // Layer 2: Core line
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.strokeStyle = hexToRgba(color, 0.15 + confidence * 0.35);
    ctx.lineWidth = 0.4 + confidence * 1.2;
    if (link.type === 'Derives') ctx.setLineDash([3, 5]);
    else if (link.type === 'Contradicts') ctx.setLineDash([2, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Layer 3: Bright center highlight (thin)
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.strokeStyle = hexToRgba(color, 0.08 + confidence * 0.15);
    ctx.lineWidth = 0.3;
    ctx.stroke();
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
  const scopeLabel = scope === 'personal' ? t('brain.scopePersonal', 'Personal') : scope === 'team' ? t('brain.scopeTeam', 'Team') : t('brain.scopeAll', 'All');

  return (
    <div className="h-screen w-full relative overflow-hidden" style={{ backgroundColor: '#08080c' }}>
      {/* Radial gradient background with subtle blue tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #0c1220 0%, #080a10 50%, #06060a 100%)',
        }}
      />
      {/* Subtle grid overlay for depth perception */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #60a5fa 0.5px, transparent 0.5px)',
          backgroundSize: '40px 40px',
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
            placeholder={t('brain.searchPlaceholder', 'Search memories...')}
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
                  { key: 'personal', label: t('brain.scopePersonal', 'Personal') },
                  { key: 'team', label: t('brain.scopeTeam', 'Team'), disabled: org?.plan !== 'enterprise' },
                  { key: 'all', label: t('brain.scopeAll', 'All'), disabled: org?.plan !== 'enterprise' },
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
            {projectFilter || t('brain.allProjects', 'All Projects')}
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
                  {t('brain.allProjects', 'All Projects')}
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
          title={t('brain.refresh', 'Refresh')}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>

        {/* Zoom controls */}
        <button
          onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 200)}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
          title={t('brain.zoomIn', 'Zoom in')}
        >
          <ZoomIn size={13} />
        </button>
        <button
          onClick={() => graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 200)}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
          title={t('brain.zoomOut', 'Zoom out')}
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={() => graphRef.current?.zoomToFit(400, 40)}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
          title={t('brain.fitToView', 'Fit to view')}
        >
          <Crosshair size={13} />
        </button>
      </div>

      {/* ─── Graph canvas ──────────────────────────────────────────── */}
      {loading && graphData.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#60a5fa] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-white/40 font-['Space_Grotesk']">{t('brain.loading', 'Loading second brain...')}</span>
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
          cooldownTicks={150}
          warmupTicks={80}
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.25}
          d3Force="charge"
          d3ReheatSimulation={false}
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
              {t('brain.noMemories', 'No memories found. Save some memories to see your second brain.')}
            </p>
          </div>
        </div>
      )}

      {/* ─── Stats bar (bottom) ────────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-5 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
        {[
          { label: t('brain.statMemories', 'Memories'), value: formatNumber(stats.nodes) },
          { label: t('brain.statConnections', 'Connections'), value: formatNumber(stats.edges) },
          { label: t('brain.statSources', 'Sources'), value: String(stats.sources) },
          { label: t('brain.statClusters', 'Clusters'), value: String(stats.clusters) },
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
