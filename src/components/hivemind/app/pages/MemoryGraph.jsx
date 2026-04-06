import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import ForceGraph2D from "react-force-graph-2d";
import {
  Network,
  X,
  Search,
  Filter,
  RefreshCw,
  Maximize2,
  GitBranch,
  Clock,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Circle,
  Square,
  Star,
  Hexagon,
} from "lucide-react";
import apiClient from "../shared/api-client";
import { useAuth } from "../auth/AuthProvider";

/* ─── Constants ──────────────────────────────────────────────────── */
const EDGE_COLORS = {
  Updates: "#117dff", // blue — evolution
  Extends: "#16a34a", // green — deepening
  Derives: "#8b5cf6", // purple — inference
};
const EDGE_LABELS = {
  Updates: "Updates",
  Extends: "Extends",
  Derives: "Derives",
};
const TYPE_COLORS = {
  fact: "#117dff",
  preference: "#d97706",
  decision: "#dc2626",
  lesson: "#16a34a",
  goal: "#8b5cf6",
  event: "#0891b2",
  relationship: "#db2777",
  default: "#525252",
};
// Resident layer visual encodings
const LAYER_COLORS = {
  fact: "#10b981", // emerald — extracted facts
  observation: "#f59e0b", // amber — observations
  promoted: "#ef4444", // red — promoted risks
  verified: "#22c55e", // green — turing verified
  tara: "#a855f7", // purple — TARA conversation turns
  "tara-insight": "#f97316", // orange — clinical reasoning insights
  memory: null, // use TYPE_COLORS
};

// Layer filter definitions for UI
const LAYER_FILTERS = [
  { key: "all", label: "All", icon: null },
  { key: "fact", label: "Facts", icon: "◆", color: "#10b981" },
  { key: "tara", label: "TARA", icon: "⬡", color: "#a855f7" },
  { key: "tara-insight", label: "Insights", icon: "⭐", color: "#f97316" },
  { key: "promoted", label: "Risks", icon: "⚠", color: "#ef4444" },
  { key: "verified", label: "Verified", icon: "✓", color: "#22c55e" },
  { key: "observation", label: "Obs", icon: "▢", color: "#f59e0b" },
];
const USER_COLORS = [
  "#117dff",
  "#16a34a",
  "#d97706",
  "#8b5cf6",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#525252",
];

/* ─── Helpers ────────────────────────────────────────────────────── */
function truncate(str, len = 80) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "..." : str;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ─── Node Detail Sidecar ────────────────────────────────────────── */
function NodeDetail({ node, edges, nodes, onClose, onNavigate }) {
  // Create node lookup for resolving IDs to titles
  const nodeMap = useMemo(() => {
    const map = {};
    nodes?.forEach((n) => {
      map[n.id] = n;
    });
    return map;
  }, [nodes]);

  if (!node) return null;

  const inbound = edges.filter(
    (e) => e.target === node.id || e.target?.id === node.id,
  );
  const outbound = edges.filter(
    (e) => e.source === node.id || e.source?.id === node.id,
  );

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      className="absolute top-0 right-0 w-[340px] h-full bg-white border-l border-[#e3e0db] shadow-[-4px_0_20px_rgba(0,0,0,0.06)] z-20 overflow-y-auto"
    >
      <div className="sticky top-0 bg-white border-b border-[#e3e0db] px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-mono text-[#a3a3a3] uppercase tracking-wider">
          Memory Detail
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[#f3f1ec] transition-colors"
        >
          <X size={14} className="text-[#a3a3a3]" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        {/* Title & type */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  TYPE_COLORS[node.memoryType] || TYPE_COLORS.default,
              }}
            />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">
              {node.memoryType || "memory"}
            </span>
          </div>
          <h3 className="text-sm font-semibold font-['Space_Grotesk'] text-[#0a0a0a] leading-snug">
            {node.title || "Untitled Memory"}
          </h3>
        </div>

        {/* Content */}
        <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-3">
          <p className="text-xs text-[#525252] font-['Space_Grotesk'] leading-relaxed whitespace-pre-wrap">
            {node.content || "No content"}
          </p>
        </div>

        {/* Tags */}
        {node.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {node.tags.map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/20"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Scores */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Importance", value: node.importanceScore?.toFixed(2) },
            { label: "Strength", value: node.strength?.toFixed(2) },
            { label: "Recalls", value: node.recallCount },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-2 text-center"
            >
              <p className="text-[10px] text-[#a3a3a3] font-mono">{s.label}</p>
              <p className="text-sm font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">
                {s.value ?? "—"}
              </p>
            </div>
          ))}
        </div>

        {/* Temporal */}
        <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3] font-['Space_Grotesk']">
          <Clock size={12} />
          <span>
            {node.daysSinceUpdate != null
              ? `${node.daysSinceUpdate.toFixed(1)} days ago`
              : "—"}
          </span>
          <span className="ml-auto">
            Glow: {((node.temporalWeight || 0) * 100).toFixed(0)}%
          </span>
        </div>

        {/* Relationships */}
        {(inbound.length > 0 || outbound.length > 0) && (
          <div>
            <p className="text-[10px] font-mono text-[#a3a3a3] uppercase tracking-wider mb-2">
              Relationships
            </p>
            <div className="space-y-1.5">
              {outbound.map((e, i) => {
                const targetId =
                  typeof e.target === "object" ? e.target.id : e.target;
                const targetNode = nodeMap[targetId];
                const targetTitle = targetNode?.title || truncate(targetId, 20);
                return (
                  <button
                    key={`out-${i}`}
                    onClick={() => onNavigate(targetId)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#faf9f4] border border-[#e3e0db] hover:border-[#117dff]/20 text-left transition-colors group"
                  >
                    <GitBranch
                      size={10}
                      style={{ color: EDGE_COLORS[e.type] || "#a3a3a3" }}
                    />
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: EDGE_COLORS[e.type] }}
                    >
                      {e.type}
                    </span>
                    <span className="text-[9px] font-mono text-[#a3a3a3]">
                      ({((e.confidence || 0) * 100).toFixed(0)}%)
                    </span>
                    <span className="text-[11px] text-[#525252] font-['Space_Grotesk'] truncate flex-1 group-hover:text-[#117dff]">
                      {targetTitle}
                    </span>
                  </button>
                );
              })}
              {inbound.map((e, i) => {
                const sourceId =
                  typeof e.source === "object" ? e.source.id : e.source;
                const sourceNode = nodeMap[sourceId];
                const sourceTitle = sourceNode?.title || truncate(sourceId, 20);
                return (
                  <button
                    key={`in-${i}`}
                    onClick={() => onNavigate(sourceId)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#faf9f4] border border-[#e3e0db] hover:border-[#117dff]/20 text-left transition-colors group"
                  >
                    <GitBranch
                      size={10}
                      className="rotate-180"
                      style={{ color: EDGE_COLORS[e.type] || "#a3a3a3" }}
                    />
                    <span
                      className="text-[10px] font-mono opacity-50"
                      style={{ color: EDGE_COLORS[e.type] }}
                    >
                      ← {e.type}
                    </span>
                    <span className="text-[9px] font-mono text-[#a3a3a3]">
                      ({((e.confidence || 0) * 100).toFixed(0)}%)
                    </span>
                    <span className="text-[11px] text-[#525252] font-['Space_Grotesk'] truncate flex-1 group-hover:text-[#117dff]">
                      {sourceTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="text-[10px] text-[#a3a3a3] font-mono space-y-0.5">
          <p>ID: {node.id}</p>
          {node.sourcePlatform && <p>Source: {node.sourcePlatform}</p>}
          {node.project && <p>Project: {node.project}</p>}
          {node.createdAt && (
            <p>Created: {new Date(node.createdAt).toLocaleString()}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function MemoryGraph() {
  const { org } = useAuth();
  const graphRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [rawEdges, setRawEdges] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchInput, setSearchInput] = useState(""); // Immediate
  const [searchQuery, setSearchQuery] = useState(""); // Debounced
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [projectFilter, setProjectFilter] = useState("");
  const [scope, setScope] = useState("personal");
  const [showFilters, setShowFilters] = useState(false);
  const [layerFilter, setLayerFilter] = useState("all");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getGraph({
        project: projectFilter || undefined,
        limit: 300,
        scope,
      });
      const nodes = (data.nodes || []).map((n) => ({
        ...n,
        val: Math.max(
          2,
          (n.importanceScore || 0.5) * 8 + (n.recallCount || 0) * 0.5,
        ),
      }));
      const links = (data.edges || []).map((e) => ({
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

  const userColorMap = useMemo(() => {
    const ids = [
      ...new Set(graphData.nodes.map((node) => node.userId).filter(Boolean)),
    ];
    return ids.reduce((acc, id, index) => {
      acc[id] = USER_COLORS[index % USER_COLORS.length];
      return acc;
    }, {});
  }, [graphData.nodes]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Search highlighting
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightNodes(new Set());
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = new Set();
    graphData.nodes.forEach((n) => {
      if (
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.tags?.some((t) => t.toLowerCase().includes(q))
      ) {
        matches.add(n.id);
      }
    });
    setHighlightNodes(matches);

    // Zoom to first match
    if (matches.size > 0 && graphRef.current) {
      const firstId = [...matches][0];
      const node = graphData.nodes.find((n) => n.id === firstId);
      if (node) {
        graphRef.current.centerAt(node.x, node.y, 600);
        graphRef.current.zoom(3, 600);
      }
    }
  }, [searchQuery, graphData.nodes]);

  // Node click
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 400);
      graphRef.current.zoom(4, 400);
    }
  }, []);

  // Navigate to node from sidecar
  const handleNavigate = useCallback(
    (nodeId) => {
      const node = graphData.nodes.find((n) => n.id === nodeId);
      if (node) handleNodeClick(node);
    },
    [graphData.nodes, handleNodeClick],
  );

  // Custom node painting — shapes per layer type
  const paintNode = useCallback(
    (node, ctx, globalScale) => {
      const isHighlighted =
        highlightNodes.size > 0 && highlightNodes.has(node.id);
      const isDimmed =
        (highlightNodes.size > 0 && !highlightNodes.has(node.id)) ||
        (layerFilter !== "all" && !filteredNodes.has(node.id));
      const isSelected = selectedNode?.id === node.id;

      // Color: layer-specific > user-specific (team scope) > type-specific
      const layerColor = LAYER_COLORS[node.nodeLayer];
      const baseColor =
        layerColor ||
        (scope === "team" || scope === "all"
          ? userColorMap[node.userId] || TYPE_COLORS.default
          : null) ||
        TYPE_COLORS[node.memoryType] ||
        TYPE_COLORS.default;

      const glow = node.temporalWeight || 0.3;
      let radius = Math.sqrt(node.val || 4) * 2.5;

      // Size adjustments per layer
      if (node.nodeLayer === "fact") radius = Math.max(radius * 0.7, 3);
      if (node.nodeLayer === "promoted") radius = radius * 1.5;
      if (node.nodeLayer === "tara") radius = radius * 1.2;
      if (node.nodeLayer === "tara-insight") radius = radius * 1.1;

      // Outer glow (temporal decay)
      if (glow > 0.3 && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4 + glow * 6, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba(baseColor, glow * 0.15);
        ctx.fill();
      }

      // Promoted risk — red halo
      if (node.nodeLayer === "promoted" && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba("#ef4444", 0.15);
        ctx.fill();
      }

      // Verified — green badge glow
      if (node.nodeLayer === "verified" && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba("#22c55e", 0.12);
        ctx.fill();
      }

      // TARA turn — purple halo
      if (node.nodeLayer === "tara" && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba("#a855f7", 0.12);
        ctx.fill();
      }

      // Clinical insight — orange glow
      if (node.nodeLayer === "tara-insight" && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba("#f97316", 0.15);
        ctx.fill();
      }

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = "#117dff";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // Highlight ring
      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // ── Node body — shape per layer type ──

      if (node.nodeLayer === "tara-insight") {
        // 4-point star for clinical insights
        const spikes = 4;
        const outerR = radius;
        const innerR = radius * 0.45;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / spikes) * i - Math.PI / 2;
          ctx.lineTo(
            node.x + r * Math.cos(angle),
            node.y + r * Math.sin(angle),
          );
        }
        ctx.closePath();
        ctx.fillStyle = isDimmed
          ? hexToRgba(baseColor, 0.15)
          : hexToRgba(baseColor, 0.8);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(baseColor, 0.95);
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
      } else if (node.nodeLayer === "tara") {
        // Hexagon for TARA conversation turns
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          ctx.lineTo(
            node.x + radius * Math.cos(angle),
            node.y + radius * Math.sin(angle),
          );
        }
        ctx.closePath();
        ctx.fillStyle = isDimmed
          ? hexToRgba(baseColor, 0.15)
          : hexToRgba(baseColor, 0.75);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(baseColor, 0.95);
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
      } else if (node.nodeLayer === "fact") {
        // Diamond for extracted facts
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - radius);
        ctx.lineTo(node.x + radius, node.y);
        ctx.lineTo(node.x, node.y + radius);
        ctx.lineTo(node.x - radius, node.y);
        ctx.closePath();
        ctx.fillStyle = isDimmed
          ? hexToRgba(baseColor, 0.15)
          : hexToRgba(baseColor, 0.7);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(baseColor, 0.9);
        ctx.lineWidth = 0.5 / globalScale;
        ctx.stroke();
      } else if (node.nodeLayer === "observation") {
        // Rounded square for observations
        const s = radius * 0.85;
        ctx.beginPath();
        ctx.roundRect(node.x - s, node.y - s, s * 2, s * 2, 3);
        ctx.fillStyle = isDimmed
          ? hexToRgba(baseColor, 0.15)
          : hexToRgba(baseColor, 0.6);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(baseColor, 0.8);
        ctx.lineWidth = 0.5 / globalScale;
        ctx.stroke();
      } else {
        // Circle for regular memories
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isDimmed
          ? hexToRgba(baseColor, 0.15)
          : hexToRgba(baseColor, 0.6 + glow * 0.4);
        ctx.fill();
        ctx.strokeStyle = isDimmed
          ? hexToRgba(baseColor, 0.1)
          : hexToRgba(baseColor, 0.8);
        ctx.lineWidth = 0.5 / globalScale;
        ctx.stroke();
      }

      // Label (only at zoom)
      if (globalScale > 1.8 && !isDimmed) {
        const label = truncate(node.title || "", 30);
        ctx.font = `${Math.max(10, 11 / globalScale)}px Space Grotesk, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = isDimmed ? "rgba(0,0,0,0.1)" : "rgba(10,10,10,0.8)";
        ctx.fillText(label, node.x, node.y + radius + 2);
      }
    },
    [highlightNodes, selectedNode, scope, userColorMap, layerFilter, filteredNodes],
  );

  // Custom link painting
  const paintLink = useCallback((link, ctx, globalScale) => {
    const color = EDGE_COLORS[link.type] || "#e3e0db";
    const opacity = 0.35 + (link.confidence || 0.5) * 0.3;
    const width = 0.5 + (link.confidence || 0.5) * 2;

    ctx.strokeStyle = hexToRgba(color, opacity);
    ctx.lineWidth = width;
    if (link.type === "Derives" || (link.confidence || 1) < 0.5) {
      ctx.setLineDash([4, 3]);
    }
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Add label at midpoint (only at high zoom)
    if (globalScale > 2.5) {
      const midX = (link.source.x + link.target.x) / 2;
      const midY = (link.source.y + link.target.y) / 2;
      const label = `${link.type} ${((link.confidence || 1) * 100).toFixed(0)}%`;
      ctx.font = `${10 / globalScale}px Space Grotesk, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(10,10,10,0.7)";

      // Background for readability
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(midX - textWidth / 2 - 2, midY - 6, textWidth + 4, 12);

      ctx.fillStyle = "rgba(10,10,10,0.8)";
      ctx.fillText(label, midX, midY);
    }
  }, []);

  // Stats
  const stats = useMemo(() => {
    if (!meta) return null;
    return {
      nodes: meta.nodeCount || graphData.nodes.length,
      edges: meta.edgeCount || graphData.links?.length || 0,
      projects: meta.projects?.length || 0,
    };
  }, [meta, graphData]);

  // Layer breakdown
  const layerCounts = useMemo(() => {
    const counts = {
      fact: 0,
      observation: 0,
      promoted: 0,
      verified: 0,
      tara: 0,
      "tara-insight": 0,
      memory: 0,
    };
    graphData.nodes.forEach((n) => {
      const layer = n.nodeLayer || "memory";
      counts[layer] = (counts[layer] || 0) + 1;
    });
    return counts;
  }, [graphData.nodes]);

  // Filtered nodes based on layer filter
  const filteredNodes = useMemo(() => {
    if (layerFilter === "all") return new Set(graphData.nodes.map((n) => n.id));
    const matches = new Set();
    graphData.nodes.forEach((n) => {
      if (n.nodeLayer === layerFilter) matches.add(n.id);
    });
    return matches;
  }, [graphData.nodes, layerFilter]);

  const matchCount = highlightNodes.size;

  return (
    <div className="h-screen bg-[#faf9f4] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 border-b border-[#e3e0db] bg-white px-4 py-3 flex items-center gap-3 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
            <Network size={16} className="text-[#8b5cf6]" />
          </div>
          <h1 className="text-sm font-bold font-['Space_Grotesk'] text-[#0a0a0a]">
            Memory Graph
          </h1>
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
            placeholder={matchCount > 0 ? `Search nodes... (${matchCount} matches)` : 'Search nodes...'}
            className="w-full pl-8 pr-3 py-1.5 border border-[#e3e0db] rounded-lg text-xs font-['Space_Grotesk'] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40 bg-[#faf9f4]"
          />
        </div>

        {/* Filters */}
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Space_Grotesk'] border border-[#e3e0db] text-[#525252] hover:border-[#117dff]/20 transition-colors"
          >
            <Filter size={12} />
            {projectFilter || "All Projects"}
            <ChevronDown size={10} />
          </button>
          <AnimatePresence>
            {showFilters && meta?.projects?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1 left-0 bg-white border border-[#e3e0db] rounded-lg shadow-lg z-30 py-1 min-w-[160px]"
              >
                <button
                  onClick={() => {
                    setProjectFilter("");
                    setShowFilters(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs font-['Space_Grotesk'] text-[#525252] hover:bg-[#faf9f4]"
                >
                  All Projects
                </button>
                {meta.projects.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setProjectFilter(p);
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-['Space_Grotesk'] hover:bg-[#faf9f4] ${projectFilter === p ? "text-[#117dff] font-semibold" : "text-[#525252]"}`}
                  >
                    {p}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[#e3e0db] bg-white p-1">
          {[
            { key: "personal", label: "My" },
            {
              key: "team",
              label: "Team",
              disabled: org?.plan !== "enterprise",
            },
            { key: "all", label: "All", disabled: org?.plan !== "enterprise" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              disabled={option.disabled}
              onClick={() => !option.disabled && setScope(option.key)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.08em] ${
                scope === option.key
                  ? "bg-[#117dff]/10 text-[#117dff]"
                  : "text-[#737373]"
              } ${option.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Layer filter buttons */}
        <div className="flex items-center gap-1">
          {LAYER_FILTERS.map((layer) => (
            <button
              key={layer.key}
              onClick={() => setLayerFilter(layer.key)}
              className={`px-2 py-1 rounded text-[10px] font-['Space_Grotesk'] ${
                layerFilter === layer.key
                  ? 'bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/20'
                  : 'text-[#525252] border border-transparent'
              }`}
            >
              {layer.icon && (
                <span style={{ color: layer.color }}>{layer.icon} </span>
              )}
              {layer.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <button
          onClick={fetchGraph}
          disabled={loading}
          className="p-1.5 rounded-lg border border-[#e3e0db] text-[#a3a3a3] hover:text-[#525252] hover:border-[#117dff]/20 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => graphRef.current?.zoomToFit(400, 40)}
          className="p-1.5 rounded-lg border border-[#e3e0db] text-[#a3a3a3] hover:text-[#525252] hover:border-[#117dff]/20 transition-colors"
          title="Fit to view"
        >
          <Maximize2 size={13} />
        </button>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-3 ml-auto text-[10px] font-mono text-[#a3a3a3]">
            <span>{stats.nodes} nodes</span>
            <span>{stats.edges} edges</span>
            <span>{stats.projects} projects</span>
            <span className="flex items-center gap-1">
              <span className="text-[#10b981]">◆</span> {layerCounts.fact}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[#a855f7]">⬡</span> {layerCounts.tara}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[#f97316]">⭐</span>{" "}
              {layerCounts["tara-insight"]}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[#ef4444]">⚠</span> {layerCounts.promoted}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[#22c55e]">✓</span> {layerCounts.verified}
            </span>
          </div>
        )}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative">
        {loading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#a3a3a3] font-['Space_Grotesk']">
                Loading memory graph...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-[#dc2626] font-['Space_Grotesk']">
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
            onNodeHover={(node, event) => {
              setHoveredNode(node);
              if (event) {
                setTooltipPosition({ x: event.clientX, y: event.clientY });
              }
            }}
            onBackgroundClick={() => {
              setSelectedNode(null);
              setHoveredNode(null);
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              const r = Math.sqrt(node.val || 4) * 2.5 + 2;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={0.9}
            linkDirectionalArrowColor={(link) =>
              EDGE_COLORS[link.type] || "#e3e0db"
            }
            cooldownTicks={100}
            warmupTicks={50}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            backgroundColor="#faf9f4"
            width={
              typeof window !== "undefined"
                ? window.innerWidth - (selectedNode ? 340 : 0) - 260
                : 800
            }
            height={
              typeof window !== "undefined" ? window.innerHeight - 52 : 600
            }
          />
        )}

        {graphData.nodes.length === 0 && !loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Network size={32} className="text-[#e3e0db] mx-auto mb-3" />
              <p className="text-sm text-[#a3a3a3] font-['Space_Grotesk']">
                No memories found. Save some memories to see your knowledge
                graph.
              </p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-[#e3e0db] rounded-xl px-3 py-2.5 z-10 max-w-[420px]">
          <p className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-wider mb-1.5">
            Relationships
          </p>
          <div className="flex items-center gap-3">
            {Object.entries(EDGE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-4 h-0.5 rounded-full"
                  style={{
                    backgroundColor: color,
                    opacity: type === "Derives" ? 0.6 : 1,
                  }}
                />
                <span className="text-[10px] font-['Space_Grotesk'] text-[#525252]">
                  {EDGE_LABELS[type]}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-wider mt-2 mb-1.5">
            Node Shapes = Layer Type
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <polygon
                  points="7,0 14,7 7,14 0,7"
                  fill="#10b981"
                  opacity="0.7"
                />
                <polygon
                  points="7,0 14,7 7,14 0,7"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="0.5"
                />
              </svg>
              <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                Fact
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <polygon
                  points="7,0 12,3.5 12,10.5 7,14 2,10.5 2,3.5"
                  fill="#a855f7"
                  opacity="0.75"
                />
                <polygon
                  points="7,0 12,3.5 12,10.5 7,14 2,10.5 2,3.5"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="0.5"
                />
              </svg>
              <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                TARA
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <polygon
                  points="7,0 8.5,5.5 14,7 8.5,8.5 7,14 5.5,8.5 0,7 5.5,5.5"
                  fill="#f97316"
                  opacity="0.8"
                />
                <polygon
                  points="7,0 8.5,5.5 14,7 8.5,8.5 7,14 5.5,8.5 0,7 5.5,5.5"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="0.5"
                />
              </svg>
              <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                Insight
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <rect
                x="2"
                y="2"
                width="10"
                height="10"
                rx="2"
                fill="#f59e0b"
                opacity="0.6"
              />
              <rect
                x="2"
                y="2"
                width="10"
                height="10"
                rx="2"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="0.5"
              />
              <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                Observation
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <circle cx="7" cy="7" r="5" fill="#117dff" opacity="0.6" />
              <circle
                cx="7"
                cy="7"
                r="5"
                fill="none"
                stroke="#117dff"
                strokeWidth="0.5"
              />
              <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                Memory
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <circle cx="7" cy="7" r="5" fill="#ef4444" opacity="0.15" />
              <circle
                cx="7"
                cy="7"
                r="5"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1"
              />
              <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                Risk
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <circle cx="7" cy="7" r="5" fill="#22c55e" opacity="0.12" />
              <circle
                cx="7"
                cy="7"
                r="5"
                fill="none"
                stroke="#22c55e"
                strokeWidth="1"
              />
              <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                Verified
              </span>
            </div>
          </div>
          <p className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-wider mt-2 mb-1.5">
            Node Glow = Recency
          </p>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#117dff]" />
            <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
              Recent
            </span>
            <div className="w-6 h-0.5 bg-gradient-to-r from-[#117dff] to-[#117dff]/10 rounded mx-1" />
            <div className="w-3 h-3 rounded-full bg-[#117dff]/15" />
            <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
              Old
            </span>
          </div>
          {(scope === "team" || scope === "all") &&
            Object.keys(userColorMap).length > 0 && (
              <>
                <p className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-wider mt-2 mb-1.5">
                  Node Color = Member
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(userColorMap).map(([memberId, color]) => (
                    <div key={memberId} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                        {memberId.slice(0, 8)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
          {[
            {
              icon: ZoomIn,
              action: () =>
                graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 200),
            },
            {
              icon: ZoomOut,
              action: () =>
                graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 200),
            },
            {
              icon: Crosshair,
              action: () => graphRef.current?.zoomToFit(400, 40),
            },
          ].map(({ icon: Icon, action }, i) => (
            <button
              key={i}
              onClick={action}
              className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur border border-[#e3e0db] flex items-center justify-center text-[#a3a3a3] hover:text-[#525252] transition-colors"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Node detail sidecar */}
        <AnimatePresence>
          {selectedNode && (
            <NodeDetail
              node={selectedNode}
              edges={rawEdges}
              nodes={graphData.nodes}
              onClose={() => setSelectedNode(null)}
              onNavigate={handleNavigate}
            />
          )}
        </AnimatePresence>

        {/* Node hover tooltip */}
        {hoveredNode && !selectedNode && (
          <div
            className="absolute z-30 bg-white/95 backdrop-blur border border-[#e3e0db] rounded-lg shadow-lg px-3 py-2 pointer-events-none"
            style={{
              left: Math.min(tooltipPosition.x + 12, window.innerWidth - 220),
              top: Math.min(tooltipPosition.y + 12, window.innerHeight - 150),
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-3 h-3 flex items-center justify-center">
                {hoveredNode.nodeLayer === 'tara-insight' && <Star size={10} className="text-[#f97316]" />}
                {hoveredNode.nodeLayer === 'tara' && <Hexagon size={10} className="text-[#a855f7]" />}
                {hoveredNode.nodeLayer === 'fact' && <div className="w-2 h-2 rotate-45 bg-[#10b981]" />}
                {hoveredNode.nodeLayer === 'observation' && <Square size={10} className="text-[#f59e0b]" />}
                {!hoveredNode.nodeLayer || hoveredNode.nodeLayer === 'memory' && <Circle size={10} className="text-[#117dff]" />}
              </span>
              <p className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a] truncate max-w-[180px]">
                {hoveredNode.title || 'Untitled'}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-[#a3a3a3] font-mono uppercase tracking-wider">
                {hoveredNode.nodeLayer || hoveredNode.memoryType || 'memory'}
              </p>
              {hoveredNode.daysSinceUpdate != null && (
                <p className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                  {hoveredNode.daysSinceUpdate.toFixed(0)} days ago
                </p>
              )}
              {hoveredNode.importanceScore != null && (
                <p className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                  Importance: {hoveredNode.importanceScore.toFixed(2)}
                </p>
              )}
              {hoveredNode.strength != null && (
                <p className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                  Strength: {hoveredNode.strength.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
