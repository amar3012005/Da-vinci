import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  BookOpen,
  Radio,
} from "lucide-react";
import apiClient from "../shared/api-client";
import { useAuth } from "../auth/AuthProvider";
import { PageIndexViewer } from "../PageIndexViewer";
import MemoryGraph3D from "./MemoryGraph3D";

/* ─── Constants ──────────────────────────────────────────────────── */
const EDGE_COLORS = {
  Updates: "#4c4943",
  Extends: "#706a61",
  Derives: "#5c5851",
};
const EDGE_LABELS = {
  Updates: "Updates",
  Extends: "Extends",
  Derives: "Derives",
};
const TYPE_COLORS = {
  fact: "#5f5b53",
  preference: "#7a746b",
  decision: "#24221f",
  lesson: "#676158",
  goal: "#545048",
  event: "#817b72",
  relationship: "#4a4640",
  default: "#525252",
};
const TYPE_LEGEND = [
  { key: "fact", label: "Fact", shape: "circle" },
  { key: "decision", label: "Decision", shape: "diamond" },
  { key: "preference", label: "Preference", shape: "square" },
  { key: "goal", label: "Goal", shape: "hex" },
  { key: "lesson", label: "Lesson", shape: "triangle" },
  { key: "event", label: "Event", shape: "capsule" },
  { key: "relationship", label: "Relationship", shape: "ring" },
];

// Layer filter definitions for UI
const LAYER_FILTERS = [
  { key: "all", label: "All", icon: null },
  { key: "fact", label: "Facts", icon: "◆", color: "#5f5b53" },
  { key: "tara", label: "TARA", icon: "⬡", color: "#4a4640" },
  { key: "tara-insight", label: "Insights", icon: "★", color: "#24221f" },
  { key: "promoted", label: "Risks", icon: "△", color: "#36332d" },
  { key: "verified", label: "Verified", icon: "✓", color: "#5c5851" },
  { key: "observation", label: "Obs", icon: "▢", color: "#7a746b" },
];
const USER_COLORS = [
  "#1f1f1f",
  "#36332d",
  "#4c4943",
  "#5c5851",
  "#706a61",
  "#817b72",
  "#928c82",
  "#525252",
];

// Cluster palette stays monochrome; density and selection carry the hierarchy.
const CLUSTER_COLORS = [
  "#2a2926",
  "#3a3731",
  "#4a4640",
  "#5a554c",
  "#6b655b",
  "#7c7569",
  "#8b8478",
  "#9b9386",
  "#aaa296",
  "#b8afa3",
  "#c6beb3",
  "#d2cbc0",
];

const ORPHAN_COLOR = "#a3a3a3"; // for `_orphan` bucket (no edges)

/* ─── Helpers ────────────────────────────────────────────────────── */
function truncate(str, len = 80) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "..." : str;
}

function safeStorageGet(key) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function safeStorageSet(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (_error) {
    return false;
  }
}

// hexToRgb removed — old atmosphereStyle used it for cluster-colored
// gradients; mono atmosphereStyle uses fixed greyscale rgba values now.

function getNodeTimestamp(node) {
  const candidates = [
    node.updatedAt,
    node.createdAt,
    node.timestamp,
    node.lastAccessedAt,
  ];
  for (const value of candidates) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (Number.isFinite(node.daysSinceUpdate)) {
    return Date.now() - node.daysSinceUpdate * 24 * 60 * 60 * 1000;
  }
  return null;
}

function normalizeGraphPayload(nodesInput = [], edgesInput = []) {
  const nodes = nodesInput.map((n) => ({
    ...n,
    val: Math.max(2, (n.importanceScore || 0.5) * 8 + (n.recallCount || 0) * 0.5),
  }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const links = edgesInput
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      confidence: edge.confidence || 1,
    }));

  return { nodes, links };
}

function LegendShape({ shape, color }) {
  const common = { fill: color, fillOpacity: 0.72, stroke: color, strokeWidth: 0.7 };

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      {shape === "diamond" && <polygon points="7,1 13,7 7,13 1,7" {...common} />}
      {shape === "square" && <rect x="2" y="2.2" width="10" height="9.6" rx="2" {...common} />}
      {shape === "hex" && <polygon points="7,1 11.7,3.5 11.7,10.5 7,13 2.3,10.5 2.3,3.5" {...common} />}
      {shape === "triangle" && <polygon points="7,1.4 12.2,11.8 1.8,11.8" {...common} />}
      {shape === "capsule" && <rect x="1.6" y="4" width="10.8" height="6" rx="3" {...common} />}
      {shape === "ring" && (
        <>
          <circle cx="7" cy="7" r="4.6" fill="none" stroke={color} strokeWidth="1.5" />
          <circle cx="7" cy="7" r="2.4" fill="#ffffff" />
        </>
      )}
      {shape === "circle" && <circle cx="7" cy="7" r="4.6" {...common} />}
    </svg>
  );
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
                className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-[#0a0a0a]/8 text-[#0a0a0a] border border-[#0a0a0a]/15"
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
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#faf9f4] border border-[#e3e0db] hover:border-[#0a0a0a]/20 text-left transition-colors group"
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
                    <span className="text-[11px] text-[#525252] font-['Space_Grotesk'] truncate flex-1 group-hover:text-[#0a0a0a]">
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
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#faf9f4] border border-[#e3e0db] hover:border-[#0a0a0a]/20 text-left transition-colors group"
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
                    <span className="text-[11px] text-[#525252] font-['Space_Grotesk'] truncate flex-1 group-hover:text-[#0a0a0a]">
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
  const [clusterFilter, setClusterFilter] = useState(null); // null = all; else clusterId
  const [showClusterPanel, setShowClusterPanel] = useState(false); // Phase 8 sidebar
  const [showLegend, setShowLegend] = useState(true);
  const [pageIndexModalOpen, setPageIndexModalOpen] = useState(false);
  const [pageIndexRefreshKey, setPageIndexRefreshKey] = useState(0);
  const [temporalProgress, setTemporalProgress] = useState(1);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [temporalMode, setTemporalMode] = useState('travel'); // 'travel' | 'diff'
  const [temporalPlaying, setTemporalPlaying] = useState(false);
  const [temporalSpeed, setTemporalSpeed] = useState(1); // 1x / 2x / 4x
  // Diff window — when in diff mode, highlight nodes added in the LAST
  // `diffWindowMs` ms of the visible cutoff vs prior state.
  const [diffWindowMs, setDiffWindowMs] = useState(24 * 60 * 60 * 1000); // 1d
  // Node budget. 0 = unbounded (server clamps to 50000). Persisted to localStorage so
  // returning users keep their preferred density without re-selecting.
  const [nodeLimit, setNodeLimit] = useState(() => {
    const stored = safeStorageGet("hm-graph-limit");
    if (stored === null) return 0; // default: show everything
    const parsed = parseInt(stored, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
  // Intelligent graph (docs + entities + typed edges) toggle
  const [intelligentMode, setIntelligentMode] = useState(() => safeStorageGet("hm-graph-intelligent") === "true");
  useEffect(() => { safeStorageSet("hm-graph-intelligent", String(intelligentMode)); }, [intelligentMode]);
  // Relationship type filter chips (Updates, Extends, Derives, Contradicts, supports, mentions)
  const [edgeTypeFilter, setEdgeTypeFilter] = useState(new Set()); // empty = all
  useEffect(() => {
    safeStorageSet("hm-graph-limit", String(nodeLimit));
  }, [nodeLimit]);

  const pageIndexRootPath = useMemo(() => {
    if (!projectFilter) return "/hivemind";
    const slug = projectFilter
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug ? `/hivemind/projects/${slug}` : "/hivemind";
  }, [projectFilter]);

  // LocalStorage key for graph snapshot — keyed by query params so different
  // scope/project/limit combos cache independently.
  const cacheKey = useMemo(
    () => `hm:graph:${scope}:${projectFilter || ""}:${nodeLimit}`,
    [scope, projectFilter, nodeLimit]
  );

  // Hydrate from localStorage on mount — show cached graph INSTANTLY
  // while real fetch happens in background (stale-while-revalidate FE).
  const hydrateFromCache = useCallback(() => {
    try {
      const raw = safeStorageGet(cacheKey);
      if (!raw) return false;
      const cached = JSON.parse(raw);
      if (!cached || !cached.nodes || !cached.edges) return false;
      // Cap stale display at 24h — older than that, don't bother
      if (Date.now() - (cached.savedAt || 0) > 24 * 60 * 60 * 1000) return false;
      const { nodes, links } = normalizeGraphPayload(cached.nodes, cached.edges);
      setGraphData({ nodes, links });
      setRawEdges(cached.edges.filter((edge) => nodes.some((node) => node.id === edge.source) && nodes.some((node) => node.id === edge.target)));
      setMeta(cached.meta || null);
      return true;
    } catch (_e) {
      return false;
    }
  }, [cacheKey]);

  // Fetch graph data — uses cached snapshot for instant render, then revalidates.
  const fetchGraph = useCallback(async () => {
    const hadCache = hydrateFromCache();
    // Only show spinner if no cache to display
    setLoading(!hadCache);
    setError(null);
    try {
      const data = intelligentMode
        ? await apiClient.getIntelligentGraph({ limit: Math.max(nodeLimit || 0, 500) || 500 })
        : await apiClient.getGraph({ project: projectFilter || undefined, limit: nodeLimit, scope });
      let nodes, links;
      if (intelligentMode) {
        // edges have `source/target/type/confidence`; normalize to links
        nodes = (data.nodes || []).map(n => ({ ...n, val: n.size || 1 }));
        links = (data.edges || []).map(e => ({ source: e.source, target: e.target, type: e.type, confidence: e.confidence, kind: e.kind }));
        // Apply edge type filter
        if (edgeTypeFilter.size > 0) {
          links = links.filter(l => edgeTypeFilter.has(String(l.type || '').toLowerCase()));
        }
      } else {
        const norm = normalizeGraphPayload(data.nodes || [], data.edges || []);
        nodes = norm.nodes; links = norm.links;
      }
      setGraphData({ nodes, links });
      setRawEdges((data.edges || []).filter((edge) => nodes.some((node) => node.id === edge.source) && nodes.some((node) => node.id === edge.target)));
      setMeta(data.meta || null);
      // Persist for next mount — show instantly on refresh
      try {
        const snapshot = {
          nodes: data.nodes || [],
          edges: data.edges || [],
          meta: data.meta || null,
          savedAt: Date.now(),
        };
        const serialized = JSON.stringify(snapshot);
        // Cap at 4MB to fit comfortably in localStorage (typical 5-10MB quota)
        if (serialized.length < 4 * 1024 * 1024) safeStorageSet(cacheKey, serialized);
      } catch (_e) {
        // localStorage quota exceeded or disabled — non-fatal
      }
    } catch (err) {
      // Keep cached graph visible on fetch error if we have one
      if (!hadCache) {
        setError(err.response?.data?.error || err.message);
        setGraphData({ nodes: [], links: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [projectFilter, scope, nodeLimit, hydrateFromCache, cacheKey, intelligentMode, edgeTypeFilter]);

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

  const atmosphereStyle = useMemo(() => {
    return {
      background:
        `radial-gradient(circle at 18% 22%, rgba(10,10,10,0.04) 0%, rgba(255,255,255,0) 32%),` +
        `radial-gradient(circle at 80% 24%, rgba(10,10,10,0.03) 0%, rgba(255,255,255,0) 30%),` +
        `radial-gradient(circle at 56% 78%, rgba(10,10,10,0.05) 0%, rgba(255,255,255,0) 38%),` +
        `linear-gradient(180deg, rgba(252,251,247,1) 0%, rgba(244,241,234,1) 100%)`,
    };
  }, []);

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

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (isLiveMode && document.visibilityState === "visible") fetchGraph();
    };
    const interval = window.setInterval(refreshIfVisible, 30000);
    return () => window.clearInterval(interval);
  }, [fetchGraph, isLiveMode]);

  useEffect(() => {
    if (isLiveMode) setTemporalProgress(1);
  }, [isLiveMode]);

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
      // Intelligent-graph nodes include kind=entity/document with .label, .aliases
      if (
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.label?.toLowerCase().includes(q) ||
        n.aliases?.some?.((a) => String(a).toLowerCase().includes(q)) ||
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
        graphRef.current.focusNode?.(node, 700, 3.6);
      }
    }
  }, [searchQuery, graphData.nodes]);

  // Node click
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  // Navigate to node from sidecar
  const handleNavigate = useCallback(
    (nodeId) => {
      const node = graphData.nodes.find((n) => n.id === nodeId);
      if (node) handleNodeClick(node);
    },
    [graphData.nodes, handleNodeClick],
  );

  // Stats
  const stats = useMemo(() => {
    if (!meta) return null;
    return {
      nodes: meta.nodeCount || graphData.nodes.length,
      edges: meta.edgeCount || graphData.links?.length || 0,
      projects: meta.projects?.length || 0,
    };
  }, [meta, graphData]);

  const matchCount = highlightNodes.size;

  const temporalNodes = useMemo(() => {
    return graphData.nodes
      .map((node) => ({ node, timestamp: getNodeTimestamp(node) }))
      .filter((entry) => Number.isFinite(entry.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [graphData.nodes]);

  const temporalBounds = useMemo(() => {
    if (temporalNodes.length === 0) return null;
    return {
      min: temporalNodes[0].timestamp,
      max: temporalNodes[temporalNodes.length - 1].timestamp,
    };
  }, [temporalNodes]);

  const temporalCutoff = useMemo(() => {
    if (!temporalBounds) return null;
    return temporalBounds.min + (temporalBounds.max - temporalBounds.min) * temporalProgress;
  }, [temporalBounds, temporalProgress]);

  const temporalFilteredNodes = useMemo(() => {
    if (!temporalCutoff || temporalProgress >= 0.999) return new Set(graphData.nodes.map((n) => n.id));
    const visibleIds = new Set();
    graphData.nodes.forEach((node) => {
      const timestamp = getNodeTimestamp(node);
      if (!timestamp || timestamp <= temporalCutoff) visibleIds.add(node.id);
    });
    return visibleIds;
  }, [graphData.nodes, temporalCutoff, temporalProgress]);

  // Diff mode: nodes added inside the last `diffWindowMs` of the cutoff.
  // Surfaces "what's NEW at this point in time" rather than "what existed".
  const temporalDiffNodes = useMemo(() => {
    if (temporalMode !== 'diff' || !temporalCutoff) return null;
    const windowStart = temporalCutoff - diffWindowMs;
    const newIds = new Set();
    graphData.nodes.forEach((node) => {
      const ts = getNodeTimestamp(node);
      if (ts && ts > windowStart && ts <= temporalCutoff) newIds.add(node.id);
    });
    return newIds;
  }, [temporalMode, temporalCutoff, diffWindowMs, graphData.nodes]);

  // Auto-play: advance temporalProgress on a rAF loop while playing.
  // Total animation duration scales w/ speed: base 12s, /speed.
  useEffect(() => {
    if (!temporalPlaying || !temporalBounds) return;
    const durationMs = 12000 / temporalSpeed;
    const startProgress = temporalProgress >= 0.999 ? 0 : temporalProgress;
    const startWall = performance.now();
    let raf = 0;
    const tick = (now) => {
      const elapsed = now - startWall;
      const t = startProgress + elapsed / durationMs;
      if (t >= 1) {
        setTemporalProgress(1);
        setTemporalPlaying(false);
        setIsLiveMode(true);
        return;
      }
      setTemporalProgress(t);
      setIsLiveMode(false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temporalPlaying, temporalSpeed, temporalBounds]);

  const filteredNodes = useMemo(() => {
    const matches = new Set();
    graphData.nodes.forEach((n) => {
      const matchesLayer = layerFilter === "all" || n.nodeLayer === layerFilter;
      const matchesTime = temporalFilteredNodes.has(n.id);
      if (matchesLayer && matchesTime) matches.add(n.id);
    });
    return matches;
  }, [graphData.nodes, layerFilter, temporalFilteredNodes]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={atmosphereStyle}>
      {/* Top bar */}
      <div className="shrink-0 mx-3 mt-3 rounded-2xl border border-[#e3e0db]/80 bg-white/84 backdrop-blur-xl px-4 py-3 flex flex-wrap items-center gap-2 z-10 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 pr-2">
          <div className="w-8 h-8 rounded-lg bg-[#0a0a0a]/8 flex items-center justify-center">
            <Network size={16} className="text-[#0a0a0a]" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-['Space_Grotesk'] text-[#0a0a0a] leading-none">
              Memory Graph
            </h1>
            <p className="text-[10px] font-mono text-[#8b857d] mt-1">
              live graph, time scrub, explicit legend
            </p>
          </div>
        </div>

        <div className="relative flex-1 min-w-[220px] max-w-[320px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={matchCount > 0 ? `Search memories (${matchCount})` : "Search memories"}
            className="w-full pl-8 pr-3 py-2 border border-[#e3e0db] rounded-xl text-xs font-['Space_Grotesk'] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#0a0a0a]/35 bg-[#faf9f4]"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-['Space_Grotesk'] border border-[#e3e0db] text-[#525252] hover:border-[#0a0a0a]/20 transition-colors bg-[#faf9f4]"
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
                className="absolute top-full mt-1 left-0 bg-white border border-[#e3e0db] rounded-xl shadow-lg z-30 py-1 min-w-[180px]"
              >
                <button
                  onClick={() => {
                    setProjectFilter("");
                    setShowFilters(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-['Space_Grotesk'] text-[#525252] hover:bg-[#faf9f4]"
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
                    className={`w-full text-left px-3 py-2 text-xs font-['Space_Grotesk'] hover:bg-[#faf9f4] ${projectFilter === p ? "text-[#0a0a0a] font-semibold" : "text-[#525252]"}`}
                  >
                    {p}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {clusters.length > 1 && (
          <div className="relative group">
            <select
              value={clusterFilter || ""}
              onChange={(e) => setClusterFilter(e.target.value || null)}
              className="appearance-none rounded-xl border border-[#e3e0db] bg-[#faf9f4] pl-7 pr-7 py-2 text-xs font-['Space_Grotesk'] text-[#525252] hover:border-[#0a0a0a]/20 transition-colors focus:outline-none cursor-pointer"
            >
              <option value="">All Clusters</option>
              {clusters.filter((c) => c.id !== "_orphan").map((c) => {
                const lbl = c.label || (c.topTags?.length ? c.topTags.slice(0, 2).join(", ") : c.id);
                return <option key={c.id} value={c.id}>{lbl} ({c.size})</option>;
              })}
            </select>
            <span
              className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
              style={{ backgroundColor: clusterFilter ? (clusterColorMap[clusterFilter] || "#0a0a0a") : "#a3a3a3" }}
            />
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#a3a3a3] pointer-events-none" />
          </div>
        )}

        <div className="flex items-center gap-1 rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-1">
          {[
            { key: "personal", label: "My" },
            { key: "team", label: "Team", disabled: org?.plan !== "enterprise" },
            { key: "all", label: "All", disabled: org?.plan !== "enterprise" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              disabled={option.disabled}
              onClick={() => !option.disabled && setScope(option.key)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.08em] ${
                scope === option.key ? "bg-[#0a0a0a]/8 text-[#0a0a0a]" : "text-[#737373]"
              } ${option.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowLegend((value) => !value)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-colors ${
            showLegend
              ? "border-[#0a0a0a]/20 bg-[#0a0a0a]/8 text-[#0a0a0a]"
              : "border-[#e3e0db] bg-[#faf9f4] text-[#525252]"
          }`}
        >
          <BookOpen size={12} />
          Legend
        </button>

        <button
          onClick={() => setIsLiveMode((value) => !value)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-colors ${
            isLiveMode
              ? "border-[#0a0a0a]/18 bg-[#0a0a0a]/7 text-[#0a0a0a]"
              : "border-[#e3e0db] bg-[#faf9f4] text-[#737373]"
          }`}
        >
          <Radio size={12} />
          {isLiveMode ? "Live" : "Paused"}
        </button>

        <button
          onClick={() => {
            setPageIndexRefreshKey((k) => k + 1);
            setPageIndexModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0a0a0a] text-white text-xs font-semibold font-['Space_Grotesk'] hover:bg-[#262626] transition-colors"
        >
          <MapIcon size={12} />
          Memory Map
        </button>

        <button
          onClick={fetchGraph}
          disabled={loading}
          className="p-2 rounded-xl border border-[#e3e0db] bg-[#faf9f4] text-[#a3a3a3] hover:text-[#525252] hover:border-[#0a0a0a]/20 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => graphRef.current?.fitView?.(400)}
          className="p-2 rounded-xl border border-[#e3e0db] bg-[#faf9f4] text-[#a3a3a3] hover:text-[#525252] hover:border-[#0a0a0a]/20 transition-colors"
          title="Fit to view"
        >
          <Maximize2 size={13} />
        </button>

        {stats && (
          <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-[#8b857d]">
            <span>{filteredNodes.size}/{stats.nodes} nodes</span>
            <span>{stats.edges} edges</span>
          </div>
        )}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,252,245,0) 0%, rgba(255,252,245,0.16) 70%, rgba(235,229,218,0.26) 100%)",
            mixBlendMode: "normal",
          }}
        />
        {loading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#a3a3a3] font-['Space_Grotesk']">
                Loading memory graph...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#fff8f3] border border-[#d8c7bb] rounded-xl px-4 py-2 text-xs text-[#4a3328] font-['Space_Grotesk']">
            {error}
          </div>
        )}

        {graphData.nodes.length > 0 && (
          <MemoryGraph3D
            ref={graphRef}
            graphData={graphData}
            selectedNode={selectedNode}
            highlightNodes={highlightNodes}
            filteredNodes={filteredNodes}
            layerFilter={layerFilter}
            clusterFilter={clusterFilter}
            scope={scope}
            userColorMap={userColorMap}
            clusterCentroids={clusterCentroids}
            clusters={clusters}
            onNodeClick={handleNodeClick}
            onNodeHover={(node) => {
              setHoveredNode(node);
            }}
            onBackgroundClick={() => {
              setSelectedNode(null);
              setHoveredNode(null);
            }}
            onViewStateChange={undefined}
            backgroundColor="rgba(0,0,0,0)"
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

        {graphData.nodes.length > 0 && (
          <div className="absolute top-4 left-4 z-10 w-[260px] rounded-2xl border border-[#ded8ce] bg-white/86 backdrop-blur-xl px-3 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#8b857d]">
                  Graph Controls
                </p>
                <p className="text-[11px] font-['Space_Grotesk'] mt-1 text-[#525252]">
                  monochrome network view
                </p>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex flex-wrap gap-1">
                {LAYER_FILTERS.slice(0, 4).map((layer) => (
                  <button
                    key={layer.key}
                    onClick={() => setLayerFilter(layer.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-['Space_Grotesk'] border ${
                      layerFilter === layer.key
                        ? "bg-[#0a0a0a]/8 text-[#0a0a0a] border-[#0a0a0a]/15"
                        : "text-[#525252] border-[#ece8e0] bg-[#faf9f4]"
                    }`}
                  >
                    {layer.icon && <span style={{ color: layer.color }}>{layer.icon} </span>}
                    {layer.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 rounded-xl border border-[#ece8e0] bg-[#faf9f4] p-1">
                {[
                  { key: 300, label: "300" },
                  { key: 1000, label: "1K" },
                  { key: 5000, label: "5K" },
                  { key: 0, label: "All" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setNodeLimit(option.key)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-mono uppercase tracking-[0.08em] ${
                      nodeLimit === option.key
                        ? "bg-[#0a0a0a]/8 text-[#0a0a0a]"
                        : "text-[#737373] hover:text-[#525252]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Intelligent mode + relationship type filters */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 flex-wrap max-w-[60%] justify-end">
          <button
            type="button"
            onClick={() => setIntelligentMode(v => !v)}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.08em] border ${
              intelligentMode
                ? "bg-[#117dff]/10 border-[#117dff]/40 text-[#117dff]"
                : "border-[#e3e0db] bg-white/80 text-[#737373] hover:text-[#525252]"
            }`}
            title="Show documents + entities + typed relationships"
          >
            ◆ Intelligent
          </button>
          {intelligentMode && [
            { key: 'updates', label: 'Updates', color: '#3b82f6' },
            { key: 'extends', label: 'Extends', color: '#8b5cf6' },
            { key: 'derives', label: 'Derives', color: '#a78bfa' },
            { key: 'derived_from', label: 'Evidence', color: '#a78bfa' },
            { key: 'contradicts', label: 'Contradicts', color: '#ef4444' },
            { key: 'mentions', label: 'Entities', color: '#10b981' },
          ].map((opt) => {
            const active = edgeTypeFilter.has(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setEdgeTypeFilter(prev => {
                    const next = new Set(prev);
                    if (next.has(opt.key)) next.delete(opt.key); else next.add(opt.key);
                    return next;
                  });
                }}
                style={active ? { borderColor: opt.color, color: opt.color, background: opt.color + '14' } : undefined}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.08em] border bg-white/80 ${
                  active ? "" : "border-[#e3e0db] text-[#737373]"
                }`}
              >
                <span style={{ color: opt.color }}>●</span> {opt.label}
              </button>
            );
          })}
          {intelligentMode && edgeTypeFilter.size > 0 && (
            <button
              type="button"
              onClick={() => setEdgeTypeFilter(new Set())}
              className="rounded-lg px-2 py-1 text-[10px] font-mono text-[#737373] hover:text-[#525252]"
            >
              Clear
            </button>
          )}
        </div>

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
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 max-w-[420px]">
          {showLegend && (
            <div className="bg-white/82 backdrop-blur-xl border border-[#e3e0db] rounded-2xl px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-mono text-[#8b857d] uppercase tracking-[0.14em]">
                  Legend
                </p>
                <button
                  onClick={() => setShowLegend(false)}
                  className="text-[#a3a3a3] hover:text-[#525252]"
                >
                  <X size={12} />
                </button>
              </div>
              <p className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-wider mb-1.5">
                Relationships
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {Object.entries(EDGE_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-0.5 rounded-full"
                      style={{
                        backgroundColor: color,
                        opacity: type === "Derives" ? 0.7 : 1,
                      }}
                    />
                    <span className="text-[10px] font-['Space_Grotesk'] text-[#525252]">
                      {EDGE_LABELS[type]}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-wider mt-2 mb-1.5">
                Node Type
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {TYPE_LEGEND.map((item) => (
                  <div key={item.key} className="flex items-center gap-1.5">
                    <LegendShape shape={item.shape} color={TYPE_COLORS[item.key]} />
                    <span className="text-[10px] text-[#525252] font-['Space_Grotesk']">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-wider mt-2 mb-1.5">
                Reading The Graph
              </p>
              <div className="space-y-1 text-[10px] text-[#525252] font-['Space_Grotesk']">
                <p>Size = importance and recall weight.</p>
                <p>Color + shape = memory type.</p>
                <p>Cluster glow appears only when that group is focused.</p>
                <p>Labels appear only when you zoom in and only for the visible top-ranked nodes.</p>
                <p>Time rail reveals memories from earliest to latest.</p>
              </div>
            </div>
          )}
        </div>

        {/* Zoom + cluster panel controls */}
        <div className="absolute bottom-4 right-4 flex items-end gap-3 z-10">
          {temporalBounds && (
            <div className="rounded-2xl border border-[#e3e0db] bg-white/88 backdrop-blur-xl px-3 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] w-[290px]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#8b857d]">
                    Temporal Explorer
                  </p>
                  <p className="text-[11px] text-[#525252] font-['Space_Grotesk']">
                    Bi-temporal time travel and diff
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTemporalProgress(1);
                    setIsLiveMode(true);
                  }}
                  className="rounded-lg border border-[#e3e0db] bg-[#faf9f4] px-2.5 py-1 text-[10px] font-mono text-[#525252]"
                >
                  Now
                </button>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <button
                  onClick={() => setTemporalMode('travel')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em] border transition-colors ${
                    temporalMode === 'travel'
                      ? 'bg-[#0a0a0a]/8 text-[#0a0a0a] border-[#0a0a0a]/15'
                      : 'bg-[#faf9f4] text-[#737373] border-[#e3e0db] hover:bg-[#f3f1ec]'
                  }`}
                >
                  Time Travel
                </button>
                <button
                  onClick={() => setTemporalMode('diff')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em] border transition-colors ${
                    temporalMode === 'diff'
                      ? 'bg-[#0a0a0a]/8 text-[#0a0a0a] border-[#0a0a0a]/15'
                      : 'bg-[#faf9f4] text-[#737373] border-[#e3e0db] hover:bg-[#f3f1ec]'
                  }`}
                >
                  Diff
                </button>
                <button
                  onClick={() => {
                    if (temporalProgress >= 0.999) setTemporalProgress(0);
                    setTemporalPlaying((p) => !p);
                  }}
                  className="ml-auto px-2 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em] bg-[#0a0a0a] text-white border border-[#0a0a0a] hover:bg-[#262626]"
                  aria-label={temporalPlaying ? 'Pause' : 'Play'}
                >
                  {temporalPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button
                  onClick={() => setTemporalSpeed((s) => (s >= 4 ? 1 : s * 2))}
                  className="px-1.5 py-1 rounded-lg text-[10px] font-mono bg-[#faf9f4] text-[#525252] border border-[#e3e0db]"
                  title="Playback speed"
                >
                  {temporalSpeed}×
                </button>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={1}
                  value={Math.round(temporalProgress * 1000)}
                  onChange={(e) => {
                    const next = Number(e.target.value) / 1000;
                    setTemporalProgress(next);
                    setIsLiveMode(next >= 0.999);
                    if (temporalPlaying) setTemporalPlaying(false);
                  }}
                  className="w-full h-2 appearance-none bg-[#f2eee7] rounded-full cursor-pointer temporal-slider-horizontal"
                  aria-label="Temporal memory formation scrubber"
                />
                {/* Progress bar underlay — animated fill mirrors temporalProgress */}
                <div
                  className="pointer-events-none absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r from-[#0a0a0a] to-[#777168] opacity-55 transition-[width] duration-100"
                  style={{ width: `${Math.round(temporalProgress * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[#8b857d]">
                <span>{new Date(temporalBounds.min).toLocaleDateString()}</span>
                <span>{new Date(temporalBounds.max).toLocaleDateString()}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[#eee9e1] pt-2">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#8b857d]">
                    {temporalMode === 'diff' ? 'Cutoff' : 'Visible Window'}
                  </p>
                  <p className="mt-1 text-xs text-[#0a0a0a] font-['Space_Grotesk']">
                    {temporalCutoff ? new Date(temporalCutoff).toLocaleString() : 'All time'}
                  </p>
                </div>
                <div className="text-right">
                  {temporalMode === 'diff' ? (
                    <>
                      <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#8b857d]">
                        Δ Added
                      </p>
                      <p className="text-xs text-[#0a0a0a] font-['Space_Grotesk'] font-semibold">
                        {temporalDiffNodes ? temporalDiffNodes.size : 0}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#8b857d]">
                        Live
                      </p>
                      <p className="text-xs text-[#36332d] font-['Space_Grotesk']">
                        {isLiveMode ? 'On' : 'Paused'}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {temporalMode === 'diff' && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#8b857d]">Δ window</span>
                  {[
                    { label: '1h', ms: 60 * 60 * 1000 },
                    { label: '1d', ms: 24 * 60 * 60 * 1000 },
                    { label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
                    { label: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setDiffWindowMs(opt.ms)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                        diffWindowMs === opt.ms
                          ? 'bg-[#0a0a0a]/8 text-[#0a0a0a] border-[#0a0a0a]/15'
                          : 'bg-[#faf9f4] text-[#737373] border-[#e3e0db]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
          {/* Cluster sidebar toggle */}
          {clusters.length > 1 && (
            <button
              onClick={() => setShowClusterPanel((v) => !v)}
              className={`w-8 h-8 rounded-lg backdrop-blur border flex items-center justify-center transition-colors mb-1 ${
                showClusterPanel
                  ? "bg-[#0a0a0a]/8 border-[#0a0a0a]/20 text-[#0a0a0a]"
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
              action: () => graphRef.current?.zoomBy?.(1.35, 220),
            },
            {
              icon: ZoomOut,
              action: () => graphRef.current?.zoomBy?.(1 / 1.35, 220),
            },
            {
              icon: Crosshair,
              action: () => graphRef.current?.fitView?.(400),
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
                            ? "border-[#0a0a0a]/20 bg-[#0a0a0a]/6"
                            : "border-transparent hover:bg-[#f5f4f0]"
                        }`}
                        onClick={() => {
                          setClusterFilter(isActive ? null : c.id);
                          // Fly camera to cluster centroid
                          const centroid = clusterCentroids[c.id];
                          if (centroid && graphRef.current) {
                            graphRef.current.focusPoint?.(centroid, 800);
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
                                className="text-[10px] text-[#525252] truncate cursor-pointer hover:text-[#0a0a0a] transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNode(n);
                                  graphRef.current?.focusNode?.(n, 700, 3.8);
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
              right: 16,
              top: 84,
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-3 h-3 flex items-center justify-center">
                {hoveredNode.nodeLayer === 'tara-insight' && <Star size={10} className="text-[#24221f]" />}
                {hoveredNode.nodeLayer === 'tara' && <Hexagon size={10} className="text-[#4a4640]" />}
                {hoveredNode.nodeLayer === 'fact' && <div className="w-2 h-2 rotate-45 bg-[#5f5b53]" />}
                {hoveredNode.nodeLayer === 'observation' && <Square size={10} className="text-[#7a746b]" />}
                {(!hoveredNode.nodeLayer || hoveredNode.nodeLayer === 'memory') && <Circle size={10} className="text-[#36332d]" />}
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
                  <MapIcon size={18} className="text-[#0a0a0a]" />
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
