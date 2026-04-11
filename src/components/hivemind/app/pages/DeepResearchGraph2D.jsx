/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Network, X, Search, RefreshCw, Layers, GitBranch
} from 'lucide-react';
import apiClient from '../shared/api-client';

/* ──── Colors & Constants ──────────────────────────────────────── */
const LAYER_COLORS = {
  sources: '#117dff',
  claims: '#16a34a',
  trails: '#9333ea',
  blueprints: '#d97706',
  observations: '#3b82f6',
  live: '#f59e0b',
};

const LAYER_ORDER = ['sources', 'claims', 'trails', 'observations', 'blueprints'];

const LAYER_META = {
  sources:      { label: 'Sources',      icon: '◉', z: 4 },
  claims:       { label: 'Claims',       icon: '◇', z: 3 },
  trails:       { label: 'Trails',       icon: '⬡', z: 2 },
  observations: { label: 'Observations', icon: '•', z: 1 },
  blueprints:   { label: 'Blueprints',   icon: '◆', z: 0 },
};

const EDGE_COLORS = {
  derived_from: '#117dff',
  supports: '#16a34a',
  contradicts: '#dc2626',
  discovered: '#9333ea',
  explored: '#9333ea',
  found: '#3b82f6',
  related: '#a3a3a3',
  used_blueprint: '#d97706',
};

/* ──── Helpers ──────────────────────────────────────────────────── */
function truncate(str, len = 60) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ──── Shared: build nodes + links from API response ──────────── */
function buildGraphFromLayers(layers) {
  const nodes = [];
  const links = [];

  if (layers.sources?.length > 0) {
    layers.sources.forEach((s) => {
      nodes.push({
        id: `source-${s.id}`, title: s.title || s.url || 'Source',
        type: 'source', layer: 'sources', url: s.url,
        runtime: s.runtime, val: 8,
      });
    });
  }
  if (layers.claims?.length > 0) {
    layers.claims.forEach((c) => {
      nodes.push({
        id: `claim-${c.id}`, title: c.content?.slice(0, 80) || 'Claim',
        type: 'claim', layer: 'claims', confidence: c.confidence,
        content: c.content, agent: c.agent, val: 8,
      });
    });
  }
  if (layers.trails?.length > 0) {
    layers.trails.forEach((t) => {
      nodes.push({
        id: `trail-${t.id}`, title: `${t.agent}: ${t.action}`,
        type: 'trail', layer: 'trails', agent: t.agent,
        action: t.action, val: 6,
      });
    });
  }
  if (layers.observations?.length > 0) {
    layers.observations.forEach((o) => {
      nodes.push({
        id: `obs-${o.id}`,
        title: `${o.agent}/${o.action}: ${o.title?.slice(0, 40) || 'Obs'}`,
        type: 'observation', layer: 'observations', agent: o.agent,
        action: o.action, confidence: o.confidence, val: 6,
      });
    });
  }
  if (layers.executionEvents?.length > 0) {
    layers.executionEvents.forEach((e) => {
      nodes.push({
        id: `exec-${e.id}`, title: `${e.agent}/${e.action}`,
        type: 'execution-event', layer: 'observations',
        agent: e.agent, action: e.action, success: e.success, val: 5,
      });
    });
  }
  if (layers.blueprints?.length > 0) {
    layers.blueprints.forEach((b) => {
      nodes.push({
        id: `blueprint-${b.blueprintId}`, title: b.name || 'Blueprint',
        type: 'blueprint', layer: 'blueprints', domain: b.domain,
        timesReused: b.timesReused, val: 10,
      });
    });
  }

  const nodeIds = new Set(nodes.map(n => n.id));
  if (layers.weights?.edges?.length > 0) {
    layers.weights.edges.forEach((edge) => {
      if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
        links.push({
          source: edge.from, target: edge.to,
          type: edge.type || 'related', confidence: edge.confidence,
        });
      }
    });
  }

  return { nodes, links };
}

/* ──── Node Detail Sidecar ──────────────────────────────────────── */
function NodeDetail({ node, edges, nodes, onClose, onNavigate }) {
  if (!node) return null;

  const inbound = edges.filter(e => {
    const tid = typeof e.target === 'object' ? e.target.id : e.target;
    return tid === node.id;
  });
  const outbound = edges.filter(e => {
    const sid = typeof e.source === 'object' ? e.source.id : e.source;
    return sid === node.id;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      className="absolute bottom-4 right-4 w-[320px] max-w-[calc(100%-2rem)] max-h-[70%] bg-white/98 backdrop-blur border border-[#e3e0db] rounded-2xl shadow-2xl z-20 overflow-y-auto"
    >
      <div className="sticky top-0 bg-[#faf9f4]/95 backdrop-blur border-b border-[#e3e0db] px-4 py-3 flex items-center justify-between rounded-t-2xl">
        <span className="text-xs font-mono uppercase tracking-wider" style={{ color: LAYER_COLORS[node.layer] || '#525252' }}>
          {node.layer || 'node'}
        </span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#e3e0db]/50">
          <X size={14} className="text-[#525252]" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0a0a0a]">
            {node.title || 'Untitled'}
          </h3>
          {node.agent && <p className="text-[10px] text-[#737373] mt-1">Agent: {node.agent}</p>}
        </div>

        {node.content && (
          <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-3">
            <p className="text-xs text-[#525252] whitespace-pre-wrap">
              {truncate(node.content, 300)}
            </p>
          </div>
        )}

        {node.url && (
          <a href={node.url} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-[#117dff] hover:underline block truncate">
            {node.url}
          </a>
        )}

        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#737373]">
          <div>
            <p>Type: {node.type || 'unknown'}</p>
            <p>Layer: {node.layer || 'default'}</p>
          </div>
          {node.confidence != null && (
            <div>
              <p>Confidence:</p>
              <p className="font-semibold text-[#0a0a0a]">
                {(node.confidence * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </div>

        {(inbound.length > 0 || outbound.length > 0) && (
          <div>
            <p className="text-[10px] font-mono text-[#737373] mb-2">Connections</p>
            <div className="space-y-1.5">
              {outbound.map((e, i) => {
                const tid = typeof e.target === 'object' ? e.target.id : e.target;
                return (
                  <button key={`out-${i}`} onClick={() => onNavigate(tid)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#e3e0db] text-left hover:border-[#117dff]/30 transition-colors">
                    <span className="text-[10px] text-[#117dff]">→</span>
                    <span className="text-[10px] flex-1 truncate text-[#525252]">
                      {nodes.find(n => n.id === tid)?.title || tid}
                    </span>
                    <span className="text-[9px] text-[#737373]">{e.type}</span>
                  </button>
                );
              })}
              {inbound.map((e, i) => {
                const sid = typeof e.source === 'object' ? e.source.id : e.source;
                return (
                  <button key={`in-${i}`} onClick={() => onNavigate(sid)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#e3e0db] text-left hover:border-[#117dff]/30 transition-colors">
                    <span className="text-[10px] text-[#117dff]">←</span>
                    <span className="text-[10px] flex-1 truncate text-[#525252]">
                      {nodes.find(n => n.id === sid)?.title || sid}
                    </span>
                    <span className="text-[9px] text-[#737373]">{e.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ──── Layered Isometric View ────────────────────────────────────── */
function LayeredView({ graphData, selectedNode, onNodeClick }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Group nodes by layer
  const layerGroups = useMemo(() => {
    const groups = {};
    LAYER_ORDER.forEach(l => { groups[l] = []; });
    graphData.nodes.forEach(n => {
      const layer = n.layer || 'observations';
      if (!groups[layer]) groups[layer] = [];
      groups[layer].push(n);
    });
    return groups;
  }, [graphData.nodes]);

  // Assign x,y positions per layer using force-like spreading
  const nodePositions = useMemo(() => {
    const positions = {};
    const planeW = dims.w * 0.7;
    const planeH = dims.h * 0.35;

    LAYER_ORDER.forEach((layerKey) => {
      const layerNodes = layerGroups[layerKey] || [];
      if (layerNodes.length === 0) return;

      // Spread nodes in a grid/spiral pattern within the plane
      const cols = Math.max(1, Math.ceil(Math.sqrt(layerNodes.length)));
      const cellW = planeW / (cols + 1);
      const rows = Math.ceil(layerNodes.length / cols);
      const cellH = planeH / (rows + 1);

      layerNodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        // Add slight randomness to avoid grid look
        const jitterX = (Math.sin(node.id.length * 7 + i * 13) * 0.3) * cellW;
        const jitterY = (Math.cos(node.id.length * 11 + i * 17) * 0.3) * cellH;
        positions[node.id] = {
          x: cellW * (col + 1) + jitterX,
          y: cellH * (row + 1) + jitterY,
          layer: layerKey,
        };
      });
    });
    return positions;
  }, [layerGroups, dims]);

  // Cross-layer edges
  const crossEdges = useMemo(() => {
    return graphData.links.filter(l => {
      const sid = typeof l.source === 'object' ? l.source.id : l.source;
      const tid = typeof l.target === 'object' ? l.target.id : l.target;
      const sp = nodePositions[sid];
      const tp = nodePositions[tid];
      return sp && tp && sp.layer !== tp.layer;
    });
  }, [graphData.links, nodePositions]);

  const planeSpacing = 120;
  const totalHeight = LAYER_ORDER.length * planeSpacing;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative bg-gradient-to-b from-[#faf9f4] to-white"
      style={{ perspective: '1200px', perspectiveOrigin: '50% 40%' }}>

      <div className="absolute inset-0 flex items-center justify-center"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(55deg) rotateZ(-5deg)',
        }}>

        {/* Layer labels on left */}
        <div className="absolute left-4 top-0 h-full flex flex-col justify-around z-30"
          style={{ transform: 'rotateZ(5deg) rotateX(-55deg)', transformStyle: 'preserve-3d' }}>
          {LAYER_ORDER.map((layerKey, i) => {
            const meta = LAYER_META[layerKey];
            const count = (layerGroups[layerKey] || []).length;
            return (
              <div key={layerKey} className="flex items-center gap-2 text-xs" style={{ color: LAYER_COLORS[layerKey] }}>
                <span className="text-lg">{meta.icon}</span>
                <span className="font-mono uppercase text-[10px]">{meta.label}</span>
                <span className="text-[9px] opacity-50">({count})</span>
              </div>
            );
          })}
        </div>

        {/* Stacked planes */}
        {LAYER_ORDER.map((layerKey, layerIndex) => {
          const meta = LAYER_META[layerKey];
          const color = LAYER_COLORS[layerKey];
          const layerNodes = layerGroups[layerKey] || [];
          const zOffset = (LAYER_ORDER.length - 1 - layerIndex) * planeSpacing;

          return (
            <div key={layerKey}
              className="absolute"
              style={{
                width: dims.w * 0.7,
                height: dims.h * 0.35,
                transform: `translateZ(${zOffset}px)`,
                transformStyle: 'preserve-3d',
                background: hexToRgba(color, 0.03),
                border: `1px solid ${hexToRgba(color, 0.12)}`,
                borderRadius: '8px',
                boxShadow: `0 0 30px ${hexToRgba(color, 0.06)}`,
              }}>

              {/* Nodes on this plane */}
              {layerNodes.map(node => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const isSelected = selectedNode?.id === node.id;
                const size = Math.sqrt(node.val || 6) * 3;

                return (
                  <button key={node.id}
                    onClick={() => onNodeClick(node)}
                    className="absolute rounded-full transition-all duration-200 hover:scale-150"
                    style={{
                      left: pos.x - size / 2,
                      top: pos.y - size / 2,
                      width: size,
                      height: size,
                      background: isSelected
                        ? color
                        : hexToRgba(color, 0.7),
                      boxShadow: isSelected
                        ? `0 0 20px ${color}, 0 0 40px ${hexToRgba(color, 0.4)}`
                        : `0 0 8px ${hexToRgba(color, 0.3)}`,
                      border: isSelected ? '2px solid white' : 'none',
                      zIndex: isSelected ? 10 : 1,
                    }}
                    title={node.title}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Cross-layer connection lines (SVG overlay) */}
        <svg className="absolute pointer-events-none"
          style={{
            width: dims.w * 0.7,
            height: totalHeight + dims.h * 0.35,
            transform: `translateZ(${(LAYER_ORDER.length - 1) * planeSpacing / 2}px)`,
            transformStyle: 'preserve-3d',
            overflow: 'visible',
          }}>
          {crossEdges.map((edge, i) => {
            const sid = typeof edge.source === 'object' ? edge.source.id : edge.source;
            const tid = typeof edge.target === 'object' ? edge.target.id : edge.target;
            const sp = nodePositions[sid];
            const tp = nodePositions[tid];
            if (!sp || !tp) return null;

            const sLayerIdx = LAYER_ORDER.indexOf(sp.layer);
            const tLayerIdx = LAYER_ORDER.indexOf(tp.layer);
            const sY = sp.y + (LAYER_ORDER.length - 1 - sLayerIdx) * planeSpacing * 0.4;
            const tY = tp.y + (LAYER_ORDER.length - 1 - tLayerIdx) * planeSpacing * 0.4;
            const edgeColor = EDGE_COLORS[edge.type] || '#444';

            return (
              <line key={`cross-${i}`}
                x1={sp.x} y1={sY} x2={tp.x} y2={tY}
                stroke={edgeColor} strokeWidth={0.5}
                strokeOpacity={0.3} strokeDasharray="3,3"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ──── Main Component ──────────────────────────────────────────── */
export default function DeepResearchGraph2D({ sessionId, showChrome = true }) {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [layerFilter, setLayerFilter] = useState('all');
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('force'); // 'force' | 'layered'

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const obs = new ResizeObserver(([entry]) => {
      setDims({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fetch graph data with incremental updates
  useEffect(() => {
    if (!sessionId) return;

    const fetchGraphData = async () => {
      try {
        const { data } = await apiClient.controlPlane.get(
          `/v1/proxy/research/${sessionId}/graph`,
          { timeout: 30000 }
        );
        if (!data || !data.layers) return;

        const { nodes: newNodes, links: newLinks } = buildGraphFromLayers(data.layers);

        setGraphData((prev) => {
          const existingIds = new Set(prev.nodes.map(n => n.id));
          const nodesToAdd = newNodes.filter(n => !existingIds.has(n.id));

          const existingLinkKeys = new Set(
            prev.links.map(l => {
              const sid = typeof l.source === 'object' ? l.source.id : l.source;
              const tid = typeof l.target === 'object' ? l.target.id : l.target;
              return `${sid}|${tid}`;
            })
          );
          const linksToAdd = newLinks.filter(
            l => !existingLinkKeys.has(`${l.source}|${l.target}`)
          );

          if (nodesToAdd.length > 0 || linksToAdd.length > 0) {
            return {
              nodes: [...prev.nodes, ...nodesToAdd],
              links: [...prev.links, ...linksToAdd],
            };
          }
          return prev;
        });
      } catch (e) {
        console.error('[DeepResearchGraph2D] Fetch failed:', e.message);
      }
    };

    fetchGraphData();
    const poll = setInterval(fetchGraphData, 3000);
    return () => clearInterval(poll);
  }, [sessionId]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    let result = new Set(graphData.nodes.map(n => n.id));

    if (layerFilter !== 'all') {
      result = new Set(graphData.nodes.filter(n => n.layer === layerFilter).map(n => n.id));
    }
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      const matches = new Set();
      graphData.nodes.forEach(n => {
        if (n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q) || n.agent?.toLowerCase().includes(q)) {
          matches.add(n.id);
        }
      });
      result = new Set([...result].filter(id => matches.has(id)));
    }
    setHighlightNodes(result);
    return result;
  }, [graphData.nodes, layerFilter, searchInput]);

  // Paint node (force view)
  const paintNode = useCallback((node, ctx, globalScale) => {
    const isDimmed = layerFilter !== 'all' && !filteredNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const color = LAYER_COLORS[node.layer] || '#525252';
    let radius = Math.sqrt(node.val || 6) * 2.5;

    if (node.layer === 'trails') radius = Math.max(radius * 0.8, 3);
    if (node.layer === 'blueprints') radius = radius * 1.3;

    // Glow
    if (!isDimmed) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
      ctx.fillStyle = hexToRgba(color, 0.12);
      ctx.fill();
    }

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Shape per layer
    if (node.layer === 'trails') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        ctx.lineTo(node.x + radius * Math.cos(angle), node.y + radius * Math.sin(angle));
      }
      ctx.closePath();
    } else if (node.layer === 'blueprints') {
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - radius);
      ctx.lineTo(node.x + radius, node.y);
      ctx.lineTo(node.x, node.y + radius);
      ctx.lineTo(node.x - radius, node.y);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    }

    ctx.fillStyle = isDimmed ? hexToRgba(color, 0.15) : hexToRgba(color, 0.7);
    ctx.fill();
    ctx.strokeStyle = isDimmed ? hexToRgba(color, 0.1) : hexToRgba(color, 0.9);
    ctx.lineWidth = 0.8 / globalScale;
    ctx.stroke();

    // Label
    if (globalScale > 1.2 && !isDimmed) {
      const label = truncate(node.title, 25);
      ctx.font = `${Math.max(9, 10 / globalScale)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#0a0a0a';
      ctx.fillText(label, node.x, node.y + radius + 2);
    }
  }, [selectedNode, layerFilter, filteredNodes]);

  // Paint edges (force view)
  const paintLink = useCallback((link, ctx, globalScale) => {
    const color = EDGE_COLORS[link.type] || '#333';
    const opacity = 0.25 + (link.confidence || 0.5) * 0.3;
    const width = 0.5 + (link.confidence || 0.5) * 1.5;

    ctx.strokeStyle = hexToRgba(color, opacity);
    ctx.lineWidth = width;
    if (link.type === 'contradicts' || (link.confidence || 1) < 0.5) {
      ctx.setLineDash([4, 3]);
    }
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    if (viewMode === 'force' && graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 400);
      graphRef.current.zoom(3, 400);
    }
  }, [viewMode]);

  const handleNavigate = useCallback((nodeId) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) handleNodeClick(node);
  }, [graphData.nodes, handleNodeClick]);

  const handleRefresh = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const { data } = await apiClient.controlPlane.get(
        `/v1/proxy/research/${sessionId}/graph`, { timeout: 30000 }
      );
      if (data?.layers) {
        setGraphData(buildGraphFromLayers(data.layers));
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const stats = useMemo(() => ({
    nodes: graphData.nodes.length,
    edges: graphData.links.length,
  }), [graphData]);

  const layerCounts = useMemo(() => {
    const counts = {};
    LAYER_ORDER.forEach(l => { counts[l] = 0; });
    graphData.nodes.forEach(n => {
      if (counts[n.layer] !== undefined) counts[n.layer]++;
    });
    return counts;
  }, [graphData.nodes]);

  return (
    <div className="h-full bg-gradient-to-b from-[#faf9f4] to-white flex flex-col overflow-hidden relative">
      {showChrome && (
        <div className="shrink-0 border-b border-[#e3e0db] bg-[#faf9f4] px-4 py-2.5 flex items-center gap-3 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#117dff]/10 flex items-center justify-center">
              <Network size={14} className="text-[#117dff]" />
            </div>
            <h1 className="text-xs font-bold text-[#0a0a0a] tracking-wide">RESEARCH GRAPH</h1>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-0.5 bg-white rounded-lg p-0.5 border border-[#e3e0db]">
            <button onClick={() => setViewMode('force')}
              className={`px-2.5 py-1 text-[10px] rounded-md transition-all ${
                viewMode === 'force' ? 'bg-[#117dff] text-white' : 'text-[#525252] hover:text-[#117dff]'
              }`}>
              <GitBranch size={11} className="inline mr-1" />Force
            </button>
            <button onClick={() => setViewMode('layered')}
              className={`px-2.5 py-1 text-[10px] rounded-md transition-all ${
                viewMode === 'layered' ? 'bg-[#117dff] text-white' : 'text-[#525252] hover:text-[#117dff]'
              }`}>
              <Layers size={11} className="inline mr-1" />Layers
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
            <input type="text" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search nodes..."
              className="w-full pl-7 pr-3 py-1.5 border border-[#e3e0db] rounded-lg text-xs text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40 bg-white"
            />
          </div>

          {/* Refresh */}
          <button onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-[#e3e0db]/60 text-[#525252] transition-colors" title="Refresh">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Layer Filters */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button onClick={() => setLayerFilter('all')}
              className={`px-2 py-1 text-[10px] rounded transition-all ${
                layerFilter === 'all' ? 'bg-[#117dff] text-white' : 'text-[#525252] hover:text-[#117dff]'
              }`}>All</button>
            {LAYER_ORDER.map(l => (
              <button key={l} onClick={() => setLayerFilter(l)}
                className="px-2 py-1 text-[10px] rounded whitespace-nowrap transition-all"
                style={{
                  backgroundColor: layerFilter === l ? hexToRgba(LAYER_COLORS[l], 0.2) : '#111',
                  color: layerFilter === l ? LAYER_COLORS[l] : '#525252',
                  border: layerFilter === l ? `1px solid ${hexToRgba(LAYER_COLORS[l], 0.4)}` : '1px solid #e3e0db',
                }}>
                {LAYER_META[l]?.icon} {LAYER_META[l]?.label}
                {layerCounts[l] > 0 && <span className="ml-1 opacity-50">({layerCounts[l]})</span>}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="ml-auto text-[10px] text-[#737373] font-mono">
            {stats.nodes} · {stats.edges}
          </div>
        </div>
      )}

      {/* Graph Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {graphData.nodes.length > 0 ? (
          viewMode === 'force' ? (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeLabel="title"
              nodeColor={node => LAYER_COLORS[node.layer] || '#525252'}
              nodeRelSize={2}
              nodeVal={node => node.val || 6}
              linkColor={(link) => EDGE_COLORS[link.type] || '#b7c7db'}
              linkOpacity={0.42}
              enableNodeDrag={true}
              enableZoomPan={true}
              minZoom={0.3}
              maxZoom={6}
              onNodeClick={handleNodeClick}
              nodeCanvasObject={paintNode}
              linkCanvasObject={paintLink}
              numDimensions={2}
              cooldownTicks={300}
              d3AlphaDecay={0.06}
              d3VelocityDecay={0.25}
              linkDistance={70}
              d3AlphaMin={0.005}
              warmupTicks={30}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={1.2}
              linkDirectionalParticleSpeed={0.004}
              backgroundColor="#faf9f4"
              width={dims.w}
              height={dims.h}
            />
          ) : (
            <LayeredView
              graphData={graphData}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#444] gap-2">
            <Network size={32} className="text-[#222]" />
            <p className="text-sm text-[#555]">
              {isLoading ? 'Loading graph...' : 'No graph data yet'}
            </p>
          </div>
        )}
      </div>

      {/* Node Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            nodes={graphData.nodes}
            edges={graphData.links}
            onClose={() => setSelectedNode(null)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
