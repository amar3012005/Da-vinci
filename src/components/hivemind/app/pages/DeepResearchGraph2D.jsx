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

  // Fetch graph data with incremental updates (nodes stay in place, new nodes added)
  useEffect(() => {
    if (!sessionId) return;

    const fetchGraphData = async () => {
      try {
        const { data } = await apiClient.controlPlane.get(
          `/v1/proxy/research/${sessionId}/graph`,
          { timeout: 30000 }
        );

        if (!data || !data.layers) {
          console.log('[DeepResearchGraph2D] No layers in response');
          return;
        }

        const layers = data.layers || {};
        const newNodes = [];
        const newLinks = [];

        // Build new nodes from all layers
        if (layers.sources?.length > 0) {
          layers.sources.forEach((s) => {
            newNodes.push({
              id: `source-${s.id}`,
              title: s.title || s.url || 'Source',
              type: 'source',
              layer: 'sources',
              url: s.url,
              runtime: s.runtime,
              val: 8,
            });
          });
        }

        if (layers.claims?.length > 0) {
          layers.claims.forEach((c) => {
            newNodes.push({
              id: `claim-${c.id}`,
              title: c.content?.slice(0, 80) || 'Claim',
              type: 'claim',
              layer: 'claims',
              confidence: c.confidence,
              content: c.content,
              agent: c.agent,
              val: 8,
            });
          });
        }

        if (layers.trails?.length > 0) {
          layers.trails.forEach((t) => {
            newNodes.push({
              id: `trail-${t.id}`,
              title: `${t.agent}: ${t.action}`,
              type: 'trail',
              layer: 'trails',
              agent: t.agent,
              action: t.action,
              val: 6,
            });
          });
        }

        if (layers.observations?.length > 0) {
          layers.observations.forEach((o) => {
            newNodes.push({
              id: `obs-${o.id}`,
              title: `${o.agent}/${o.action}: ${o.title?.slice(0, 40) || 'Obs'}`,
              type: 'observation',
              layer: 'observations',
              agent: o.agent,
              action: o.action,
              confidence: o.confidence,
              val: 6,
            });
          });
        }

        if (layers.executionEvents?.length > 0) {
          layers.executionEvents.forEach((e) => {
            newNodes.push({
              id: `exec-${e.id}`,
              title: `${e.agent}/${e.action}`,
              type: 'execution-event',
              layer: 'executionEvents',
              agent: e.agent,
              action: e.action,
              success: e.success,
              val: 5,
            });
          });
        }

        if (layers.blueprints?.length > 0) {
          layers.blueprints.forEach((b) => {
            newNodes.push({
              id: `blueprint-${b.blueprintId}`,
              title: b.name || 'Blueprint',
              type: 'blueprint',
              layer: 'blueprints',
              domain: b.domain,
              timesReused: b.timesReused,
              val: 10,
            });
          });
        }

        // Build edges from weights.edges
        const newNodeIds = new Set(newNodes.map(n => n.id));
        if (layers.weights?.edges?.length > 0) {
          layers.weights.edges.forEach((edge) => {
            if (newNodeIds.has(edge.from) && newNodeIds.has(edge.to)) {
              newLinks.push({
                source: edge.from,
                target: edge.to,
                type: edge.type || 'related',
                confidence: edge.confidence,
              });
            }
          });
        }

        // Incremental update: only add new nodes, keep existing ones in place
        setGraphData((prevData) => {
          const existingIds = new Set(prevData.nodes.map(n => n.id));
          const nodesToAdd = newNodes.filter(n => !existingIds.has(n.id));

          const existingLinkKeys = new Set(
            prevData.links.map(l => `${l.source}|${l.target}`)
          );
          const linksToAdd = newLinks.filter(
            l => !existingLinkKeys.has(`${l.source}|${l.target}`)
          );

          if (nodesToAdd.length > 0 || linksToAdd.length > 0) {
            console.log('[DeepResearchGraph2D] Adding nodes:', nodesToAdd.length, 'links:', linksToAdd.length);
            return {
              nodes: [...prevData.nodes, ...nodesToAdd],
              links: [...prevData.links, ...linksToAdd],
            };
          }
          return prevData;
        });
      } catch (e) {
        console.error('[DeepResearchGraph2D] Failed to fetch graph:', e.message);
      }
    };

    // Initial fetch
    fetchGraphData();

    // Poll every 3 seconds while research is running
    const pollInterval = setInterval(fetchGraphData, 3000);

    return () => clearInterval(pollInterval);
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

  // Node click handler - opens detail panel
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

        {/* Refresh Button */}
        <button
          onClick={async () => {
            setIsLoading(true);
            try {
              const { data } = await apiClient.controlPlane.get(
                `/v1/proxy/research/${sessionId}/graph`,
                { timeout: 30000 }
              );
              if (data?.layers) {
                const layers = data.layers || {};
                const nodes = [];
                const links = [];

                // Process all layers - use prefixed IDs to match backend edge references
                if (layers.sources?.length > 0) {
                  layers.sources.forEach((s) => {
                    nodes.push({
                      id: `source-${s.id}`, // Match edge prefixes from backend
                      title: s.title || s.url || 'Source',
                      type: 'source',
                      layer: 'sources',
                      url: s.url,
                      runtime: s.runtime,
                      val: 8,
                    });
                  });
                }

                if (layers.claims?.length > 0) {
                  layers.claims.forEach((c) => {
                    nodes.push({
                      id: `claim-${c.id}`, // Match edge prefixes from backend
                      title: c.content?.slice(0, 80) || 'Claim',
                      type: 'claim',
                      layer: 'claims',
                      confidence: c.confidence,
                      content: c.content,
                      agent: c.agent,
                      val: 8,
                    });
                  });
                }

                if (layers.trails?.length > 0) {
                  layers.trails.forEach((t) => {
                    nodes.push({
                      id: `trail-${t.id}`, // Match edge prefixes from backend
                      title: `${t.agent}: ${t.action}`,
                      type: 'trail',
                      layer: 'trails',
                      agent: t.agent,
                      action: t.action,
                      val: 6,
                    });
                  });
                }

                if (layers.observations?.length > 0) {
                  layers.observations.forEach((o) => {
                    nodes.push({
                      id: `obs-${o.id}`, // Match edge prefixes from backend
                      title: `${o.agent}/${o.action}: ${o.title?.slice(0, 40) || 'Obs'}`,
                      type: 'observation',
                      layer: 'observations',
                      agent: o.agent,
                      action: o.action,
                      confidence: o.confidence,
                      val: 6,
                    });
                  });
                }

                if (layers.executionEvents?.length > 0) {
                  layers.executionEvents.forEach((e) => {
                    nodes.push({
                      id: `exec-${e.id}`, // Match edge prefixes from backend
                      title: `${e.agent}/${e.action}`,
                      type: 'execution-event',
                      layer: 'executionEvents',
                      agent: e.agent,
                      action: e.action,
                      success: e.success,
                      val: 5,
                    });
                  });
                }

                if (layers.blueprints?.length > 0) {
                  layers.blueprints.forEach((b) => {
                    nodes.push({
                      id: `blueprint-${b.blueprintId}`, // Match edge prefixes from backend
                      title: b.name || 'Blueprint',
                      type: 'blueprint',
                      layer: 'blueprints',
                      domain: b.domain,
                      timesReused: b.timesReused,
                      val: 10,
                    });
                  });
                }

                // Validate edges reference existing nodes
                const nodeIds = new Set(nodes.map(n => n.id));
                if (layers.weights?.edges?.length > 0) {
                  layers.weights.edges.forEach((edge) => {
                    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
                      links.push({
                        source: edge.from,
                        target: edge.to,
                        type: edge.type || 'related',
                        confidence: edge.confidence,
                      });
                    }
                  });
                }

                setGraphData({ nodes, links });
              }
            } finally {
              setIsLoading(false);
            }
          }}
          className="px-2 py-1.5 rounded hover:bg-[#e3e0db] text-[#525252] transition-colors"
          title="Refresh graph"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>

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
            nodeColor={node => LAYER_COLORS[node.layer] || '#525252'}
            nodeRelSize={2}
            nodeVal={node => node.val || 6}
            linkColor={link => EDGE_COLORS[link.type] || '#e3e0db'}
            linkOpacity={0.4}
            enableNodeDrag={true}
            enableZoomPan={true}
            minZoom={0.5}
            maxZoom={5}
            onNodeClick={handleNodeClick}
            nodeCanvasObject={paintNode}
            linkCanvasObject={paintLink}
            // Force simulation parameters for tighter layout
            numDimensions={2}
            cooldownTicks={300}
            d3AlphaDecay={0.08}        // Faster convergence (0.02→0.08)
            d3VelocityDecay={0.25}     // More viscous movement (0.3→0.25)
            linkDistance={80}          // Closer nodes (default ~100)
            chargeStrength={-200}      // Stronger repulsion (tighter spacing)
            nodeStrength={-50}         // Additional node repulsion
            warmupTicks={20}
            width={selectedNode ? window.innerWidth - 340 : window.innerWidth}
            height={window.innerHeight - 52}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#a3a3a3] gap-2">
            <p className="text-sm">No graph data yet</p>
            <p className="text-xs text-[#a3a3a3]/60">
              {isLoading ? 'Fetching graph...' : 'Start a research to see the graph grow in real-time'}
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
