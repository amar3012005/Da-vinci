/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Network, X, Search, Filter, RefreshCw, ZoomIn, ZoomOut, Crosshair, Clock
} from 'lucide-react';
import apiClient from '../shared/api-client';

/* ──── Colors & Constants ──────────────────────────────────────── */
const LAYER_COLORS = {
  sources: '#117dff',     // blue
  claims: '#16a34a',      // green
  trails: '#9333ea',      // purple
  blueprints: '#d97706',  // orange
  observations: '#3b82f6',// cyan
  live: '#f59e0b',        // amber
};

const LAYER_FILTERS = [
  { key: 'all', label: 'All', icon: null },
  { key: 'sources', label: 'Sources', icon: '🌐', color: '#117dff' },
  { key: 'claims', label: 'Claims', icon: '✓', color: '#16a34a' },
  { key: 'trails', label: 'Trails', icon: '📜', color: '#9333ea' },
  { key: 'blueprints', label: 'Blueprints', icon: '🏆', color: '#d97706' },
  { key: 'observations', label: 'Obs', icon: '•', color: '#3b82f6' },
  { key: 'live', label: 'Live', icon: '○', color: '#f59e0b' },
];

const EDGE_COLORS = {
  references: '#117dff',
  supports: '#16a34a',
  contradicts: '#dc2626',
  refines: '#8b5cf6',
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

/* ──── Node Detail Sidecar ──────────────────────────────────────── */
function NodeDetail({ node, edges, nodes, onClose, onNavigate }) {
  const nodeMap = useMemo(() => {
    const map = {};
    nodes?.forEach((n) => { map[n.id] = n; });
    return map;
  }, [nodes]);

  if (!node) return null;

  const inbound = edges.filter(e => e.target === node.id || e.target?.id === node.id);
  const outbound = edges.filter(e => e.source === node.id || e.source?.id === node.id);

  return (
    <motion.div
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      className="absolute top-0 right-0 w-[340px] h-full bg-white border-l border-[#e3e0db] shadow-lg z-20 overflow-y-auto"
    >
      <div className="sticky top-0 bg-white border-b border-[#e3e0db] px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-mono text-[#a3a3a3] uppercase">
          {node.layer || 'node'}
        </span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f3f1ec]">
          <X size={14} className="text-[#a3a3a3]" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0a0a0a]">
            {node.title || 'Untitled'}
          </h3>
          {node.agent && <p className="text-[10px] text-[#a3a3a3] mt-1">Agent: {node.agent}</p>}
        </div>

        {node.content && (
          <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-3">
            <p className="text-xs text-[#525252] whitespace-pre-wrap">
              {truncate(node.content, 200)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#a3a3a3]">
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
            <p className="text-[10px] font-mono text-[#a3a3a3] mb-2">RELATIONSHIPS</p>
            <div className="space-y-1.5">
              {outbound.map((e, i) => (
                <button
                  key={`out-${i}`}
                  onClick={() => onNavigate(e.target)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#faf9f4] border border-[#e3e0db] text-left hover:border-[#117dff] transition-colors"
                >
                  <span className="text-[10px] text-[#117dff]">→</span>
                  <span className="text-[10px] flex-1 truncate">
                    {nodes.find(n => n.id === e.target)?.title || e.target}
                  </span>
                  {e.confidence && (
                    <span className="text-[9px] text-[#a3a3a3]">
                      {(e.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </button>
              ))}
              {inbound.map((e, i) => (
                <button
                  key={`in-${i}`}
                  onClick={() => onNavigate(e.source)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#faf9f4] border border-[#e3e0db] text-left hover:border-[#117dff] transition-colors"
                >
                  <span className="text-[10px] text-[#117dff]">←</span>
                  <span className="text-[10px] flex-1 truncate">
                    {nodes.find(n => n.id === e.source)?.title || e.source}
                  </span>
                  {e.confidence && (
                    <span className="text-[9px] text-[#a3a3a3]">
                      {(e.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ──── Main Component ──────────────────────────────────────────── */
export default function DeepResearchGraph2D({ sessionId }) {
  const graphRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [layerFilter, setLayerFilter] = useState('all');
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // SSE stream handler - adds nodes/edges in real-time
  useEffect(() => {
    if (!sessionId) return;

    const baseUrl = apiClient.controlPlane.defaults?.baseURL || '';
    const streamUrl = `${baseUrl}/v1/proxy/research/${sessionId}/stream`;
    console.log('[DeepResearchGraph2D] Connecting to SSE stream:', streamUrl);
    console.log('[DeepResearchGraph2D] API Client baseURL:', apiClient.controlPlane.defaults?.baseURL);

    let source;
    let fallbackInterval;

    try {
      source = new EventSource(streamUrl);
    } catch (e) {
      console.warn('[DeepResearchGraph2D] Failed to create EventSource:', e);
      return;
    }

    source.onopen = () => {
      console.log('[DeepResearchGraph2D] ✓ SSE stream connected for session:', sessionId);
    };

    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        console.log('[DeepResearchGraph2D] Received SSE event:', event.type);

        // Handle graph.node.created events
        if (event.type === 'graph.node.created') {
          console.log('[DeepResearchGraph2D] Adding node:', event.nodeId, event.title);
          setGraphData(prev => {
            // Check if node exists
            const exists = prev.nodes.find(n => n.id === event.nodeId);
            if (exists) return prev;

            return {
              ...prev,
              nodes: [...prev.nodes, {
                id: event.nodeId,
                title: event.title,
                type: event.nodeType,
                layer: event.layer,
                content: event.content,
                agent: event.metadata?.agentId,
                confidence: event.metadata?.confidence,
                val: 6,
                createdAt: Date.now(),
              }]
            };
          });
        }

        // Handle graph.edge.created events
        if (event.type === 'graph.edge.created') {
          console.log('[DeepResearchGraph2D] Adding edge:', event.source, '->', event.target);
          setGraphData(prev => ({
            ...prev,
            links: [...prev.links, {
              source: event.source,
              target: event.target,
              type: event.relationshipType,
              confidence: event.confidence,
            }]
          }));
        }
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    source.onerror = (err) => {
      console.error('[DeepResearchGraph2D] ✗ SSE error, falling back to polling:', err);
      source.close();

      // Fallback polling every 2 seconds
      fallbackInterval = setInterval(async () => {
        try {
          const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sessionId}/graph`);
          if (!data || !data.layers) return;

          const layers = data.layers || {};
          const nodes = [];
          const links = [];

          // Build nodes from all layers
          if (layers.sources) {
            layers.sources.forEach((s, idx) => {
              nodes.push({
                id: `source-${s.id || idx}`,
                title: s.title || s.url || 'Source',
                type: 'source',
                layer: 'sources',
                val: 8,
              });
            });
          }

          if (layers.claims) {
            layers.claims.forEach((c, idx) => {
              nodes.push({
                id: `claim-${c.id || idx}`,
                title: c.content?.slice(0, 80) || 'Claim',
                type: 'claim',
                layer: 'claims',
                confidence: c.confidence,
                val: 8,
              });
            });
          }

          if (layers.trails) {
            layers.trails.forEach((t, idx) => {
              nodes.push({
                id: `trail-${t.id || idx}`,
                title: `${t.agent}: ${t.action}`,
                type: 'trail',
                layer: 'trails',
                agent: t.agent,
                val: 6,
              });
            });
          }

          if (layers.blueprints) {
            layers.blueprints.forEach((b, idx) => {
              nodes.push({
                id: `blueprint-${b.blueprintId || idx}`,
                title: b.name || 'Blueprint',
                type: 'blueprint',
                layer: 'blueprints',
                val: 10,
              });
            });
          }

          setGraphData(prev => {
            // Only update if we got new nodes
            if (nodes.length > prev.nodes.length) {
              return { nodes, links };
            }
            return prev;
          });
        } catch (e) {
          console.error('[Fallback] Polling error:', e.message);
        }
      }, 2000);
    };

    return () => {
      source.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [sessionId]);

  // Calculate filtered nodes for search/layer filtering
  const filteredNodes = useMemo(() => {
    let result = new Set(graphData.nodes.map(n => n.id));

    // Layer filter
    if (layerFilter !== 'all') {
      result = new Set(graphData.nodes
        .filter(n => n.layer === layerFilter)
        .map(n => n.id));
    }

    // Search filter
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      const matches = new Set();
      graphData.nodes.forEach(n => {
        if (
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q) ||
          n.agent?.toLowerCase().includes(q)
        ) {
          matches.add(n.id);
        }
      });
      result = new Set([...result].filter(id => matches.has(id)));
    }

    setHighlightNodes(result);
    return result;
  }, [graphData.nodes, layerFilter, searchInput]);

  // Paint node with shape per layer
  const paintNode = useCallback((node, ctx, globalScale) => {
    const isHighlighted = highlightNodes.has(node.id);
    const isDimmed = (highlightNodes.size > 0 && !isHighlighted) ||
                     (layerFilter !== 'all' && !filteredNodes.has(node.id));
    const isSelected = selectedNode?.id === node.id;

    const color = LAYER_COLORS[node.layer] || '#525252';
    let radius = Math.sqrt(node.val || 6) * 2.5;

    // Size adjustments per layer
    if (node.layer === 'trails') radius = Math.max(radius * 0.8, 3);
    if (node.layer === 'blueprints') radius = radius * 1.3;
    if (node.layer === 'live') radius = radius * 1.1;

    // Glow for live nodes
    if (node.layer === 'live' && !isDimmed) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
      ctx.fillStyle = hexToRgba(color, 0.2);
      ctx.fill();
    }

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = '#117dff';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Highlight ring
    if (isHighlighted) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    // Shape per layer
    if (node.layer === 'trails') {
      // Hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        ctx.lineTo(
          node.x + radius * Math.cos(angle),
          node.y + radius * Math.sin(angle)
        );
      }
      ctx.closePath();
      ctx.fillStyle = isDimmed ? hexToRgba(color, 0.15) : hexToRgba(color, 0.7);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(color, 0.9);
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    } else if (node.layer === 'blueprints') {
      // Diamond
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - radius);
      ctx.lineTo(node.x + radius, node.y);
      ctx.lineTo(node.x, node.y + radius);
      ctx.lineTo(node.x - radius, node.y);
      ctx.closePath();
      ctx.fillStyle = isDimmed ? hexToRgba(color, 0.15) : hexToRgba(color, 0.7);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(color, 0.9);
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    } else {
      // Circle (default)
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isDimmed ? hexToRgba(color, 0.15) : hexToRgba(color, 0.6);
      ctx.fill();
      ctx.strokeStyle = isDimmed ? hexToRgba(color, 0.1) : hexToRgba(color, 0.8);
      ctx.lineWidth = 0.5 / globalScale;
      ctx.stroke();
    }

    // Label (only at zoom > 1.8)
    if (globalScale > 1.8 && !isDimmed) {
      const label = truncate(node.title, 30);
      ctx.font = `${Math.max(10, 11 / globalScale)}px Space Grotesk, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(10,10,10,0.8)';
      ctx.fillText(label, node.x, node.y + radius + 2);
    }
  }, [highlightNodes, selectedNode, layerFilter, filteredNodes]);

  // Paint edges
  const paintLink = useCallback((link, ctx, globalScale) => {
    const color = EDGE_COLORS[link.type] || '#e3e0db';
    const opacity = 0.35 + (link.confidence || 0.5) * 0.3;
    const width = 0.5 + (link.confidence || 0.5) * 2;

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

    // Edge label at zoom > 2.5
    if (globalScale > 2.5) {
      const midX = (link.source.x + link.target.x) / 2;
      const midY = (link.source.y + link.target.y) / 2;
      const label = `${link.type} ${((link.confidence || 1) * 100).toFixed(0)}%`;
      ctx.font = `${10 / globalScale}px Space Grotesk, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(10,10,10,0.8)';
      ctx.fillText(label, midX, midY);
    }
  }, []);

  // Node click handler
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 400);
      graphRef.current.zoom(3, 400);
    }
  }, []);

  // Navigate to node from sidecar
  const handleNavigate = useCallback((nodeId) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) handleNodeClick(node);
  }, [graphData.nodes, handleNodeClick]);

  // Stats
  const stats = useMemo(() => ({
    nodes: graphData.nodes.length,
    edges: graphData.links.length,
    matches: highlightNodes.size,
  }), [graphData, highlightNodes]);

  // Layer counts
  const layerCounts = useMemo(() => {
    const counts = {};
    LAYER_FILTERS.forEach(l => { counts[l.key] = 0; });
    graphData.nodes.forEach(n => {
      if (counts[n.layer] !== undefined) counts[n.layer]++;
      else if (n.layer) counts[n.layer] = 1;
    });
    return counts;
  }, [graphData.nodes]);

  return (
    <div className="h-screen bg-[#faf9f4] flex flex-col overflow-hidden relative">
      {/* Top Bar */}
      <div className="shrink-0 border-b border-[#e3e0db] bg-white px-4 py-3 flex items-center gap-3 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#117dff]/10 flex items-center justify-center">
            <Network size={16} className="text-[#117dff]" />
          </div>
          <h1 className="text-sm font-bold text-[#0a0a0a]">Deep Research Graph</h1>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={stats.matches > 0 ? `Search... (${stats.matches})` : 'Search nodes...'}
            className="w-full pl-8 pr-3 py-1.5 border border-[#e3e0db] rounded-lg text-xs text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40 bg-[#faf9f4]"
          />
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {LAYER_FILTERS.map(l => (
            <button
              key={l.key}
              onClick={() => setLayerFilter(l.key)}
              className={`px-2 py-1 text-[10px] rounded whitespace-nowrap transition-all ${
                layerFilter === l.key
                  ? 'font-semibold'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: layerFilter === l.key ? `${l.color || '#e3e0db'}20` : '#e3e0db',
                color: layerFilter === l.key ? l.color || '#525252' : '#a3a3a3',
                border: layerFilter === l.key ? `1px solid ${l.color || '#e3e0db'}` : 'none',
              }}
            >
              {l.icon && <span className="mr-1">{l.icon}</span>}
              {l.label}
              {layerCounts[l.key] > 0 && (
                <span className="ml-1 text-[9px] opacity-60">
                  ({layerCounts[l.key]})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="ml-auto text-[11px] text-[#a3a3a3] font-mono">
          <span>{stats.nodes} nodes · {stats.edges} edges</span>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="title"
            nodeColor={() => '#117dff'}
            nodeRelSize={1}
            linkColor={link => EDGE_COLORS[link.type] || '#e3e0db'}
            linkOpacity={0.4}
            enableNodeDrag={true}
            enableZoomPan={true}
            minZoom={0.5}
            maxZoom={5}
            onNodeClick={handleNodeClick}
            nodeCanvasObject={paintNode}
            linkCanvasObject={paintLink}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            width={selectedNode ? window.innerWidth - 340 : window.innerWidth}
            height={window.innerHeight - 52}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#a3a3a3]">
            <p className="text-sm">No nodes yet. Agents will create nodes as they work...</p>
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
