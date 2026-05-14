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
  Map as MapIcon,
  Layers,
} from "lucide-react";
import apiClient from "../shared/api-client";
import { useAuth } from "../auth/AuthProvider";
import { PageIndexViewer } from "../PageIndexViewer";

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

// Cluster palette — distinct enough to read at thumbnail scale.
// Keeps the existing light-theme aesthetic; no neon, no dark mode.
const CLUSTER_COLORS = [
  "#117dff", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#8b5cf6", // violet
  "#dc2626", // red
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
  "#7c3aed", // purple
  "#ea580c", // orange
  "#0d9488", // teal
  "#9333ea", // magenta
];

const ORPHAN_COLOR = "#a3a3a3"; // for `_orphan` bucket (no edges)

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
  const [clusterFilter, setClusterFilter] = useState(null); // null = all; else clusterId
  const [showClusterPanel, setShowClusterPanel] = useState(false); // Phase 8 sidebar
  const [pageIndexModalOpen, setPageIndexModalOpen] = useState(false);
  const [pageIndexRefreshKey, setPageIndexRefreshKey] = useState(0);
  // Node budget. 0 = unbounded (server clamps to 50000). Persisted to localStorage so
  // returning users keep their preferred density without re-selecting.
  const [nodeLimit, setNodeLimit] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = window.localStorage.getItem('hm-graph-limit');
    if (stored === null) return 0; // default: show everything
    const parsed = parseInt(stored, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('hm-graph-limit', String(nodeLimit));
  }, [nodeLimit]);

  const pageIndexRootPath = useMemo(() => {
    if (!projectFilter) return "/hivemind";
    const slug = projectFilter
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug ? `/hivemind/projects/${slug}` : "/hivemind";
  }, [projectFilter]);

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getGraph({
        project: projectFilter || undefined,
        // 0 → unbounded (server caps at 50k). >0 → exact node budget.
        limit: nodeLimit,
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
  }, [projectFilter, scope, nodeLimit]);

  const userColorMap = useMemo(() => {
    const ids = [
      ...new Set(graphData.nodes.map((node) => node.userId).filter(Boolean)),
    ];
    return ids.reduce((acc, id, index) => {
      acc[id] = USER_COLORS[index % USER_COLORS.length];
      return acc;
    }, {});
  }, [graphData.nodes]);

  // ── Cluster bookkeeping (Phase 2 of GRAPH_MEMORY_UPGRADE) ──
  // The backend now stamps each node with clusterId/clusterRole/hubScore.
  // We need: (a) stable color per cluster (b) per-cluster centroid coords
  // for the forceCluster pull (c) a sorted cluster list for the sidebar/filter.
  const clusters = useMemo(() => {
    const fromMeta = meta?.clusters;
    if (Array.isArray(fromMeta) && fromMeta.length > 0) return fromMeta;
    // Fallback: derive from nodes if /api/graph didn't supply meta yet.
    const sizes = new Map();
    for (const n of graphData.nodes) {
      if (!n.clusterId) continue;
      sizes.set(n.clusterId, (sizes.get(n.clusterId) || 0) + 1);
    }
    return [...sizes.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, size]) => ({ id, size, label: null, topTags: [], hubNodeId: null }));
  }, [meta, graphData.nodes]);

  const clusterColorMap = useMemo(() => {
    const out = {};
    clusters.forEach((c, i) => {
      out[c.id] = c.id === "_orphan"
        ? ORPHAN_COLOR
        : CLUSTER_COLORS[i % CLUSTER_COLORS.length];
    });
    return out;
  }, [clusters]);

  // Per-cluster centroid layout — arrange cluster anchors on a circle so
  // forceCluster pulls each node toward its group. Radius scales with the
  // total node count so dense graphs don't overlap.
  // BA / Cytoscape style: no rigid placement. Centroids only used as a
  // *weak bias* during physics — emergence does the rest. Random initial
  // angle per cluster avoids deterministic patterns.
  const clusterCentroids = useMemo(() => {
    const out = {};
    const realClusters = clusters.filter((c) => c.id !== "_orphan");
    const K = realClusters.length || 1;
    if (K <= 1) return out;
    // Loose ring of centroids — random jitter so it doesn't look like spokes
    const R = 80 + 30 * Math.sqrt(graphData.nodes.length);
    realClusters.forEach((c, i) => {
      // Hash cluster id to stable angle (so re-render doesn't shuffle)
      let h = 0;
      for (let k = 0; k < c.id.length; k++) h = (h * 31 + c.id.charCodeAt(k)) | 0;
      const angle = (Math.abs(h) % 360) * (Math.PI / 180);
      const jitter = 0.85 + ((Math.abs(h >> 8) % 100) / 100) * 0.3; // 0.85-1.15
      out[c.id] = { x: Math.cos(angle) * R * jitter, y: Math.sin(angle) * R * jitter };
    });
    return out;
  }, [clusters, graphData.nodes.length]);

  // Filtered nodes based on layer filter
  const filteredNodes = useMemo(() => {
    if (layerFilter === "all") return new Set(graphData.nodes.map((n) => n.id));
    const matches = new Set();
    graphData.nodes.forEach((n) => {
      if (n.nodeLayer === layerFilter) matches.add(n.id);
    });
    return matches;
  }, [graphData.nodes, layerFilter]);

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

  // ── Brain-like force physics v3 ──
  useEffect(() => {
    if (!graphRef.current) return;
    const n = graphData.nodes.length;
    if (n === 0) return;
    try {
      const fg = graphRef.current;

      // BA / Cytoscape style: strip all custom forces, trust physics.
      try { fg.d3Force('center', null); } catch (_e) { /* noop */ }
      try { fg.d3Force('radialSpread', null); } catch (_e) { /* noop */ }
      try { fg.d3Force('clusterPull', null); } catch (_e) { /* noop */ }
      try { fg.d3Force('clusterRepel', null); } catch (_e) { /* noop */ }
      try { fg.d3Force('clusterX', null); } catch (_e) { /* noop */ }
      try { fg.d3Force('clusterY', null); } catch (_e) { /* noop */ }

      // Degree-proportional repulsion (BA: hub repulsion ∝ degree)
      const charge = fg.d3Force?.('charge');
      if (charge?.strength) {
        charge.strength((node) => {
          if (node.clusterId === '_orphan') return -20;
          const degree = (node.val || 1);
          // Repulsion scales with degree — preferential attachment shows
          const base = -40 - degree * 6;
          return node.clusterRole === 'hub' ? base * 1.4 : base;
        });
        if (charge.theta) charge.theta(0.9);
        if (charge.distanceMax) charge.distanceMax(450);
      }

      // Links: dense local, sparse global. Strong intra → BA-style tight
      // neighborhoods. Weak inter → bridges stretch organically.
      const link = fg.d3Force?.('link');
      if (link?.distance) {
        link.distance((edge) => {
          const src = edge.source;
          const tgt = edge.target;
          const sameCluster = src?.clusterId && src.clusterId === tgt?.clusterId;
          return sameCluster ? 30 : 90;
        });
        link.strength((edge) => {
          const src = edge.source;
          const tgt = edge.target;
          const sameCluster = src?.clusterId && src.clusterId === tgt?.clusterId;
          return sameCluster ? 0.7 : 0.1;
        });
      }

      // Single soft cluster bias — no rigid placement, just preference.
      if (clusters.length > 1 && fg.d3Force) {
        fg.d3Force('clusterBias', (alpha) => {
          const pull = 0.03; // very weak — physics dominates
          for (const node of graphData.nodes) {
            if (node.clusterId === '_orphan') continue;
            const centroid = clusterCentroids[node.clusterId];
            if (!centroid) continue;
            node.vx = (node.vx || 0) + (centroid.x - (node.x || 0)) * pull * alpha;
            node.vy = (node.vy || 0) + (centroid.y - (node.y || 0)) * pull * alpha;
          }
        });
      } else {
        if (fg.d3Force) {
          try { fg.d3Force('clusterBias', null); } catch (_e) { /* noop */ }
        }
      }
      fg.d3ReheatSimulation?.();
    } catch (_e) {
      // d3Force may not exist yet on first render — re-run when nodes arrive.
    }
  }, [graphData.nodes, clusters.length, clusterCentroids]);

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
      const isOrphan = node.clusterId === "_orphan";
      const isDimmed =
        (highlightNodes.size > 0 && !highlightNodes.has(node.id)) ||
        (layerFilter !== "all" && !filteredNodes.has(node.id)) ||
        (clusterFilter && node.clusterId !== clusterFilter && node.clusterRole !== "bridge") ||
        isOrphan; // Orphans always dimmed so clusters dominate visually
      const isSelected = selectedNode?.id === node.id;

      // Color: type/layer-first (preserves semantic meaning of colors).
      // Cluster identity shown through position + hub ring color, NOT node fill.
      // This way: blue = fact, red = decision, violet = goal, etc. — always.
      const layerColor = LAYER_COLORS[node.nodeLayer];
      const clusterColor = clusterColorMap[node.clusterId]; // used for hub rings only
      const baseColor =
        layerColor ||
        (scope === "team" || scope === "all"
          ? userColorMap[node.userId] || TYPE_COLORS.default
          : null) ||
        TYPE_COLORS[node.memoryType] ||
        TYPE_COLORS.default;

      const glow = node.temporalWeight || 0.3;
      // BA-style: hub size proportional to degree (val). Spokes uniform small.
      let radius = Math.min(10, Math.sqrt(node.val || 4) * 2.0);

      if (isOrphan) radius = Math.max(radius * 0.45, 1.5);
      else if (node.clusterRole === "hub") radius = Math.min(11, radius * 1.4);
      else if (node.clusterRole === "bridge") radius = Math.max(radius * 0.85, 2.2);

      // Size adjustments per layer — modest bumps so no layer dominates.
      if (node.nodeLayer === "fact") radius = Math.max(radius * 0.7, 3);
      if (node.nodeLayer === "promoted") radius = Math.min(8, radius * 1.05);
      if (node.nodeLayer === "tara") radius = Math.min(8, radius * 1.05);
      if (node.nodeLayer === "tara-insight") radius = radius * 1.1;

      // Outer glow (temporal decay) — subtle, matches green fact halo
      if (glow > 0.3 && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 2 + glow * 3, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba(baseColor, glow * 0.06);
        ctx.fill();
      }

      // All special-layer halos — uniform size + low opacity so red/blue
      // don't dominate. Matches the gentle green fact halo aesthetic.
      const haloAlpha = 0.06;
      const haloPad = 2.5;
      if (node.nodeLayer === "promoted" && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + haloPad, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba("#ef4444", haloAlpha);
        ctx.fill();
      }
      if (node.nodeLayer === "verified" && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + haloPad, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba("#22c55e", haloAlpha);
        ctx.fill();
      }
      if (node.nodeLayer === "tara" && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + haloPad, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba("#a855f7", haloAlpha);
        ctx.fill();
      }
      if (node.nodeLayer === "tara-insight" && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + haloPad, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba("#f97316", haloAlpha);
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

      // Hub-role ring — uses CLUSTER color so you can see which lobe it anchors
      // while the node fill stays type-colored for semantic meaning.
      if (node.clusterRole === "hub" && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 2.5, 0, 2 * Math.PI);
        ctx.strokeStyle = hexToRgba(clusterColor || baseColor, 0.8);
        ctx.lineWidth = 2.5 / globalScale;
        ctx.stroke();
      }
      // Bridge nodes — dashed cluster-colored outline.
      if (node.clusterRole === "bridge" && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 1.5, 0, 2 * Math.PI);
        ctx.strokeStyle = hexToRgba(clusterColor || baseColor, 0.6);
        ctx.lineWidth = 1.2 / globalScale;
        ctx.setLineDash([3, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
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
    [highlightNodes, selectedNode, scope, userColorMap, layerFilter, filteredNodes, clusterColorMap, clusterFilter],
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

        {/* Cluster filter — surfaces the mind-groups derived server-side. */}
        {clusters.length > 1 && (
          <div className="relative group">
            <select
              value={clusterFilter || ""}
              onChange={(e) => setClusterFilter(e.target.value || null)}
              className="appearance-none rounded-lg border border-[#e3e0db] bg-white pl-7 pr-7 py-1.5 text-xs font-['Space_Grotesk'] text-[#525252] hover:border-[#117dff]/20 transition-colors focus:outline-none cursor-pointer"
              title="Filter to a single mind-group"
            >
              <option value="">All Clusters</option>
              {clusters
                .filter((c) => c.id !== "_orphan")
                .map((c) => {
                  // Build a label from top tags or fall back to id.
                  const lbl = c.label
                    || (c.topTags?.length ? c.topTags.slice(0, 2).join(", ") : c.id);
                  return (
                    <option key={c.id} value={c.id}>
                      ● {lbl} ({c.size})
                    </option>
                  );
                })}
            </select>
            {clusterFilter && (
              <span
                className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                style={{ backgroundColor: clusterColorMap[clusterFilter] || "#117dff" }}
              />
            )}
            {!clusterFilter && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#a3a3a3]">●</span>
            )}
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#a3a3a3] pointer-events-none" />
          </div>
        )}

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

        {/* Node density selector — controls how many memories the server returns */}
        <div className="flex items-center gap-1 rounded-lg border border-[#e3e0db] bg-white p-1" title="How many memory nodes to load">
          {[
            { key: 300, label: '300' },
            { key: 1000, label: '1K' },
            { key: 5000, label: '5K' },
            { key: 0, label: 'All' },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setNodeLimit(option.key)}
              className={`rounded-md px-2 py-1 text-[10px] font-mono uppercase tracking-[0.08em] ${
                nodeLimit === option.key
                  ? 'bg-[#117dff]/10 text-[#117dff]'
                  : 'text-[#737373] hover:text-[#525252]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Memory Map button */}
        <button
          onClick={() => {
            setPageIndexRefreshKey((k) => k + 1);
            setPageIndexModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#117dff] text-white text-xs font-semibold font-['Space_Grotesk'] hover:bg-[#0d5fcc] transition-colors"
          title="View memory hierarchy map"
        >
          <MapIcon size={12} />
          <span className="hidden lg:inline">Memory Map</span>
        </button>

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
            {clusters.length > 0 && (
              <span title="Mind-groups derived from edge structure (Louvain)">
                <span className="text-[#117dff]">●</span> {clusters.length} clusters
              </span>
            )}
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
            cooldownTicks={Math.min(400, Math.max(100, Math.round(Math.sqrt(graphData.nodes.length) * 20)))}
            warmupTicks={Math.min(150, 50 + Math.round(Math.sqrt(graphData.nodes.length) * 3))}
            d3AlphaDecay={graphData.nodes.length > 1000 ? 0.012 : 0.02}
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

        {/* Zoom + cluster panel controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
          {/* Cluster sidebar toggle */}
          {clusters.length > 1 && (
            <button
              onClick={() => setShowClusterPanel((v) => !v)}
              className={`w-8 h-8 rounded-lg backdrop-blur border flex items-center justify-center transition-colors mb-1 ${
                showClusterPanel
                  ? "bg-[#117dff]/10 border-[#117dff]/30 text-[#117dff]"
                  : "bg-white/90 border-[#e3e0db] text-[#a3a3a3] hover:text-[#525252]"
              }`}
              title="Toggle mind groups panel"
            >
              <Layers size={14} />
            </button>
          )}
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

        {/* Phase 8: Cluster sidebar — list + fly-to + top memories */}
        <AnimatePresence>
          {showClusterPanel && clusters.length > 1 && (
            <motion.div
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute left-3 top-14 bottom-3 w-[240px] z-40 bg-white/95 backdrop-blur border border-[#e3e0db] rounded-xl shadow-lg overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#e3e0db]">
                <span className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a] tracking-wide uppercase">
                  Mind Groups
                </span>
                <button onClick={() => setShowClusterPanel(false)} className="text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
                {clusters
                  .filter((c) => c.id !== "_orphan")
                  .sort((a, b) => (b.size || 0) - (a.size || 0))
                  .map((c) => {
                    const color = clusterColorMap[c.id] || "#a3a3a3";
                    const label = c.label || (c.topTags?.length ? c.topTags.slice(0, 2).join(", ") : c.id);
                    const isActive = clusterFilter === c.id;
                    const topNodes = graphData.nodes
                      .filter((n) => n.clusterId === c.id)
                      .sort((a, b) => (b.hubScore || 0) - (a.hubScore || 0))
                      .slice(0, 3);
                    return (
                      <div
                        key={c.id}
                        className={`rounded-lg px-2.5 py-2 cursor-pointer transition-all border ${
                          isActive
                            ? "border-[#117dff]/30 bg-[#117dff]/5"
                            : "border-transparent hover:bg-[#f5f4f0]"
                        }`}
                        onClick={() => {
                          setClusterFilter(isActive ? null : c.id);
                          // Fly camera to cluster centroid
                          const centroid = clusterCentroids[c.id];
                          if (centroid && graphRef.current) {
                            graphRef.current.centerAt(centroid.x, centroid.y, 800);
                            graphRef.current.zoom(2.5, 800);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-[11px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a] truncate flex-1">
                            {label}
                          </span>
                          <span className="text-[10px] font-mono text-[#a3a3a3]">{c.size}</span>
                        </div>
                        {isActive && topNodes.length > 0 && (
                          <div className="ml-4 mt-1 space-y-0.5">
                            {topNodes.map((n) => (
                              <div
                                key={n.id}
                                className="text-[10px] text-[#525252] truncate cursor-pointer hover:text-[#117dff] transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNode(n);
                                  if (graphRef.current && n.x != null) {
                                    graphRef.current.centerAt(n.x, n.y, 600);
                                    graphRef.current.zoom(4, 600);
                                  }
                                }}
                              >
                                {n.clusterRole === "hub" ? "★ " : n.clusterRole === "bridge" ? "◇ " : ""}
                                {n.title || n.content?.slice(0, 40) || "Untitled"}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                {/* Orphan bucket */}
                {clusters.find((c) => c.id === "_orphan") && (
                  <div className="rounded-lg px-2.5 py-1.5 text-[10px] text-[#a3a3a3] italic">
                    + {clusters.find((c) => c.id === "_orphan")?.size || 0} unlinked nodes
                  </div>
                )}
              </div>
              <div className="px-3 py-2 border-t border-[#e3e0db] text-[10px] text-[#a3a3a3] font-mono">
                {clusters.filter((c) => c.id !== "_orphan").length} clusters · {graphData.nodes.length} nodes
              </div>
            </motion.div>
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
                {(!hoveredNode.nodeLayer || hoveredNode.nodeLayer === 'memory') && <Circle size={10} className="text-[#117dff]" />}
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

      {/* PageIndex Mind Map Modal */}
      <AnimatePresence>
        {pageIndexModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setPageIndexModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-5xl h-[80vh] bg-white rounded-2xl border border-[#e3e0db] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3e0db] bg-[#faf9f4]">
                <div className="flex items-center gap-3">
                  <MapIcon size={18} className="text-[#117dff]" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Memory Map</h3>
                    <p className="text-xs text-[#666]">Hierarchical organization of your memories</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPageIndexRefreshKey((k) => k + 1)}
                    className="p-2 rounded-lg hover:bg-[#e3e0db] transition-colors"
                    title="Refresh map"
                  >
                    <RefreshCw size={18} className="text-[#525252]" />
                  </button>
                  <button
                    onClick={() => setPageIndexModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-[#e3e0db] transition-colors"
                    title="Close"
                  >
                    <X size={18} className="text-[#525252]" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="h-[calc(100%-60px)] p-4">
                <PageIndexViewer
                  userId={org?.userId || 'current'}
                  onSelectNode={(node) => {
                    console.log('Selected node:', node);
                  }}
                  selectedNodeId={null}
                  initialPath={pageIndexRootPath}
                  refreshKey={pageIndexRefreshKey}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
