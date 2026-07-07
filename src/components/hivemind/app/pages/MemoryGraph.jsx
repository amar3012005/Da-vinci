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
  ArrowLeft,
  X,
  Search,
  // eslint-disable-next-line no-unused-vars
  Filter,
  RefreshCw,
  Maximize2,
  Clock,
  Monitor,
  // eslint-disable-next-line no-unused-vars
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
  Moon,
  Sun,
  Play,
  Pause,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import apiClient from "../shared/api-client";
import { useAuth } from "../auth/AuthProvider";
import { useTeamContext } from "../shared/team-context";
import LangSwitcher from "../layout/LangSwitcher";
import { PageIndexViewer } from "../PageIndexViewer";
import MemoryGraph3D from "./MemoryGraph3D";
import MemoryGraph2DCanvas from "./MemoryGraph2DCanvas";
import MemoryMoss from "./MemoryMoss";
import { PageWalkthrough, GRAPH_STEPS } from "../shared/Walkthrough";

/* ─── Constants ──────────────────────────────────────────────────── */
// Edge palette — semantically distinct hues so self-evolution chains are
// visible at a glance. Tuned for white background; opacity tweaked per type
// in the render path (Derives is the softest since most numerous).
const EDGE_COLORS = {
  Updates:     "#f59e0b", // amber — supersession
  Extends:     "#22c55e", // green — additive nuance
  Derives:     "#8b5cf6", // violet — synthesis source link
  Contradicts: "#ef4444", // red — conflict
  supports:    "#3b82f6", // blue — evidence
  mentions:    "#94a3b8", // slate — light reference
};
const EDGE_LABELS = {
  Updates: "Updates",
  Extends: "Extends",
  Derives: "Derives",
  Contradicts: "Contradicts",
  supports: "Supports",
  mentions: "Mentions",
};
const TYPE_COLORS = {
  fact: "#5f5b53",
  preference: "#7a746b",
  decision: "#24221f",
  lesson: "#676158",
  goal: "#545048",
  event: "#817b72",
  relationship: "#4a4640",
  synthesis: "#8b5cf6",
  summary: "#06b6d4",
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

// True when the 3D WebGL force graph is a bad default for this device: phones
// (narrow viewport / coarse pointer / mobile UA) or no WebGL context at all.
// Used only to pick the INITIAL view when the user has no stored preference —
// they can still switch to 3D, and that choice persists.
function preferLightGraphForDevice() {
  try {
    const narrow = typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;
    const uaMobile = typeof navigator !== "undefined"
      && (/(android|iphone|ipad|ipod|mobile)/i.test(navigator.userAgent || "")
          || !!(navigator.userAgentData && navigator.userAgentData.mobile));
    if (narrow || uaMobile) return true;
    // No-WebGL fallback (rare desktops / locked-down browsers).
    const c = typeof document !== "undefined" ? document.createElement("canvas") : null;
    const gl = c && (c.getContext("webgl") || c.getContext("experimental-webgl"));
    if (!gl) return true;
  } catch { /* be permissive — default to 3D on detection failure */ }
  return false;
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
function NodeDetail({ node, edges, nodes, onClose, onNavigate, onDelete, theme = "day" }) {
  const deletable = node && node.id && node.kind !== 'document' && node.kind !== 'entity';
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
  const niceTags = (node.tags || []).filter(Boolean).slice(0, 18);
  const groupedRelations = [
    { key: "out", label: "Outgoing", rows: outbound },
    { key: "in", label: "Incoming", rows: inbound },
  ].filter((group) => group.rows.length > 0);
  const createdLabel = node.createdAt ? new Date(node.createdAt).toLocaleString() : null;
  const updatedLabel = node.updatedAt ? new Date(node.updatedAt).toLocaleString() : null;
  const dark = theme === "night";
  const ui = {
    shell: dark
      ? "bg-[#0d0b09] border-[#2f2925] text-[#fff0e5]"
      : "bg-[#faf9f4] border-[#e3e0db] text-[#0a0a0a]",
    header: dark ? "border-[#2f2925]" : "border-[#e3e0db]",
    icon: dark
      ? "text-[#ff746d]"
      : "text-[#117dff]",
    title: dark ? "text-[#fff0e5]" : "text-[#0a0a0a]",
    text: dark ? "text-[#cfc2b7]" : "text-[#525252]",
    muted: dark ? "text-[#8f8378]" : "text-[#a3a3a3]",
    faint: dark ? "text-[#695f56]" : "text-[#d4d0ca]",
    card: dark
      ? "bg-[#151312] border-[#2f2925]"
      : "bg-[#faf9f4] border-[#e3e0db]",
    cardRaised: dark
      ? "bg-[#151312] border-[#2f2925] shadow-[0_18px_52px_rgba(0,0,0,0.25)]"
      : "bg-[#faf9f4] border-[#e3e0db]",
    tag: dark
      ? "bg-[#1d1916] text-[#cfc2b7] border-[#332c27]"
      : "bg-white text-[#525252] border-[#e3e0db]",
    relation: dark
      ? "bg-[#151312] border-[#2f2925] hover:border-[#ff746d]/35 hover:bg-[#1b1512]"
      : "bg-[#faf9f4] border-[#e3e0db] hover:border-[#cfe2ff] hover:bg-white",
    close: dark
      ? "hover:bg-[#151312] text-[#9d9288] hover:text-[#fff0e5]"
      : "hover:bg-[#f3f1ec] text-[#525252] hover:text-[#525252]",
    footer: dark ? "border-[#2f2925]" : "border-[#e3e0db]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed inset-y-0 right-0 w-full max-w-lg z-50 flex flex-col"
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm -z-10 lg:hidden" onClick={onClose} />

      <div className={`h-full border-l flex flex-col overflow-hidden shadow-2xl ${ui.shell}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${ui.header}`}>
          <div className="flex items-center gap-2">
            <Network size={16} className={ui.icon} />
            <span className={`text-sm font-bold font-['Space_Grotesk'] ${ui.title}`}>Memory Detail</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${ui.close}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <h2 className={`text-lg font-bold font-['Space_Grotesk'] leading-snug ${ui.title}`}>
            {node.title || node.label || "Untitled Memory"}
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-[#eaf9ea] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#44a44a]">
              {node.memoryType || "memory"}
            </span>
            {node.sourcePlatform && (
              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] ${
                dark
                  ? "border-[#3a2e28] bg-[#1b1512] text-[#ffb1a8]"
                  : "border-[#cfe2ff] bg-[#edf5ff] text-[#4d59dd]"
              }`}>
                <Monitor size={11} /> {node.sourcePlatform}
              </span>
            )}
            {(node.daysSinceUpdate != null || createdLabel) && (
              <span className={`inline-flex items-center gap-1 text-xs font-mono ${ui.faint}`}>
                <Clock size={11} />
                {node.daysSinceUpdate != null ? `${Math.round(node.daysSinceUpdate)}d ago` : createdLabel}
              </span>
            )}
          </div>

          <div>
            <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1.5 ${ui.muted}`}>
            Content
            </label>
            <div className={`border rounded-xl p-4 text-sm font-['Space_Grotesk'] leading-relaxed whitespace-pre-wrap ${ui.card} ${ui.text}`}>
              {node.content || "No content"}
            </div>
          </div>

          {niceTags.length > 0 && (
            <div>
              <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1.5 ${ui.muted}`}>
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {niceTags.map((t) => (
                  <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border ${ui.tag}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Importance", value: node.importanceScore?.toFixed(2) },
              { label: "Strength", value: node.strength?.toFixed(2) },
              { label: "Recalls", value: node.recallCount },
            ].map((s) => (
              <div key={s.label} className={`border rounded-xl p-3 text-center ${ui.card}`}>
                <p className={`text-[10px] font-mono ${ui.muted}`}>{s.label}</p>
                <p className={`text-sm font-semibold font-['Space_Grotesk'] ${ui.title}`}>
                  {s.value ?? "—"}
                </p>
              </div>
            ))}
          </div>

          <div className={`flex items-center gap-2 text-[11px] font-['Space_Grotesk'] ${ui.muted}`}>
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

          {groupedRelations.length > 0 && (
            <div>
              <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1.5 ${ui.muted}`}>
                Relations · {inbound.length + outbound.length}
              </label>
              <div className="space-y-3">
                {groupedRelations.map((group) => (
                  <div key={group.key}>
                    <div className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] ${
                      dark
                        ? "border-[#3b302b] bg-[#1b1512] text-[#ffb1a8]"
                        : "border-[#ddd5ff] bg-[#f5f1ff] text-[#6d58db]"
                    }`}>
                      {group.label} · {group.rows.length}
                    </div>
                    <div className="mt-2 space-y-2">
                      {group.rows.map((e, i) => {
                        const targetId = typeof e.target === "object" ? e.target.id : e.target;
                        const sourceId = typeof e.source === "object" ? e.source.id : e.source;
                        const peerId = group.key === "out" ? targetId : sourceId;
                        const peerNode = nodeMap[peerId];
                        const peerTitle = peerNode?.title || peerNode?.label || truncate(peerId, 34);
                        const confidenceLabel = `${((e.confidence || 0) * 100).toFixed(0)}%`;
                        const edgeLabel = String(e.type || "related").replace(/[_-]+/g, " ");
                        return (
                          <button
                            key={`${group.key}-${i}`}
                            onClick={() => onNavigate(peerId)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors group ${ui.relation}`}
                          >
                            <span className={dark ? "text-[#ff746d]" : "text-[#6d58db]"}>→</span>
                            <span className="min-w-0 flex-1">
                              <span className={`block text-[13px] font-semibold font-['Space_Grotesk'] truncate ${ui.title}`}>
                                {peerTitle}
                              </span>
                              <span className={`mt-1 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.12em] ${ui.muted}`}>
                                <span className={dark ? "text-[#ffb1a8]" : "text-[#6d58db]"}>{edgeLabel}</span>
                                <span>{confidenceLabel}</span>
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={`block text-[10px] font-mono uppercase tracking-wider mb-1.5 ${ui.muted}`}>
              Metadata
            </label>
            <div className={`border rounded-xl p-3 space-y-1.5 text-[11px] font-mono ${ui.card}`}>
              <div className="flex justify-between gap-4">
                <span className={ui.faint}>ID</span>
                <span className={`text-right truncate ml-4 max-w-[260px] ${ui.text}`}>{node.id}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className={ui.faint}>Scope</span>
                <span className={`text-right uppercase ${ui.text}`}>{node.scope || "organization"}</span>
              </div>
              {createdLabel && (
                <div className="flex items-start justify-between gap-4">
                  <span className={ui.faint}>Created</span>
                  <span className={`text-right ${ui.text}`}>{createdLabel}</span>
                </div>
              )}
              {updatedLabel && (
                <div className="flex items-start justify-between gap-4">
                  <span className={ui.faint}>Updated</span>
                  <span className={`text-right ${ui.text}`}>{updatedLabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {deletable && onDelete && (
          <div className={`px-6 py-4 border-t ${ui.footer}`}>
            <button
              onClick={() => onDelete(node)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] transition-all ${
                dark
                  ? "bg-[#151312] text-[#cfc2b7] border border-[#2f2925] hover:text-[#ff746d] hover:border-[#ff746d]/25 hover:bg-[#1b1512]"
                  : "bg-[#f3f1ec] text-[#525252] border border-[#e3e0db] hover:text-[#dc2626] hover:border-red-500/20 hover:bg-red-50"
              }`}
              title="Permanently delete this memory"
            >
              <Trash2 size={14} />
              Delete Memory
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
/**
 * GraphTqdmBar — tqdm-style determinate progress bar for the graph loader.
 * Animates an eased fill toward ~94% while the fetch is in flight (the real
 * completion unmounts the loader). Renders a monospace block-char bar like
 * `memory-graph ████████░░░░ 62%` to match the tqdm aesthetic.
 */
function GraphTqdmBar({ dark, done }) {
  const [pct, setPct] = useState(6);

  useEffect(() => {
    if (done) {
      setPct(100);
      return undefined;
    }
    let raf;
    let start = null;
    const dur = 4200;
    const tick = (t) => {
      if (start === null) start = t;
      const e = Math.min((t - start) / dur, 1);
      // ease-out, asymptote ~94% so it never "finishes" before data lands
      setPct(6 + (94 - 6) * (1 - Math.pow(1 - e, 2.4)));
      if (e < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [done]);

  const WIDTH = 24;
  const filled = Math.max(0, Math.min(WIDTH, Math.round((pct / 100) * WIDTH)));
  const barFull = "█".repeat(filled);
  const barRest = "░".repeat(WIDTH - filled);
  const rounded = Math.floor(pct);

  return (
    <div className="w-[320px] max-w-[78vw] font-mono select-none">
      <div
        className={`flex items-center justify-between text-[11px] mb-1.5 ${
          dark ? "text-[#b8aea4]" : "text-[#8b857d]"
        }`}
      >
        <span>memory-graph</span>
        <span className="tabular-nums">{rounded}%</span>
      </div>
      <div
        className="text-[13px] leading-none tracking-tight whitespace-nowrap overflow-hidden"
        style={{ animation: "hm-tqdm-shimmer 1.6s ease-in-out infinite" }}
      >
        <span className={dark ? "text-[#ff8f86]" : "text-[#0a0a0a]"}>{barFull}</span>
        <span className={dark ? "text-[#3a322e]" : "text-[#d8d3cb]"}>{barRest}</span>
      </div>
      <div
        className={`flex items-center justify-between text-[10px] mt-1.5 ${
          dark ? "text-[#7c736a]" : "text-[#a39d94]"
        }`}
      >
        <span>resolving nodes · relations</span>
        <span className="tabular-nums">{rounded}/100</span>
      </div>
    </div>
  );
}

export default function MemoryGraph({ dimension = '3d' } = {}) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  // dimension: '3d' (default) | '2d' — initial mode, then user toggles via
  // the inline pill in the toolbar. Persisted to localStorage so the choice
  // sticks across reloads.
  const [graphDim, setGraphDim] = useState(() => {
    try {
      const stored = localStorage.getItem('hivemind:graphDim');
      if (stored === '2d' || stored === '3d' || stored === 'moss') return stored;
    } catch {}
    // No stored choice → default phones / WebGL-less devices to the 2D canvas
    // (the 3D force graph janks or blanks there). Desktop keeps the 3D default.
    // The user can still switch to 3D manually; that choice then persists.
    return preferLightGraphForDevice() ? '2d' : dimension;
  });
  const is2D = graphDim === '2d';
  const isMoss = graphDim === 'moss';
  useEffect(() => {
    try { localStorage.setItem('hivemind:graphDim', graphDim); } catch {}
  }, [graphDim]);
  const [graphTheme, setGraphTheme] = useState(() => {
    const stored = safeStorageGet("hm-graph-theme-v2");
    return stored === "night" ? "night" : "day";
  });
  useEffect(() => {
    safeStorageSet("hm-graph-theme-v2", graphTheme);
  }, [graphTheme]);
  const { org } = useAuth();
  // Real org project names (user-scoped by the backend) for the Projects hub.
  const [projectNames, setProjectNames] = useState([]);
  const [userInvolvedProjects, setUserInvolvedProjects] = useState([]);
  // Real named leaves for the Meetings / Connectors / Employees hubs.
  const [mossHubItems, setMossHubItems] = useState({ meetings: [], connectors: [], employees: [], knowledge: [] });
  useEffect(() => {
    if (!org?.id) return undefined;
    let cancelled = false;
    apiClient.listProjects(org.id)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.projects || []);
        if (!cancelled) setProjectNames(list.map((p) => p.name || p.title).filter(Boolean));
      })
      .catch(() => { /* non-fatal */ });

    apiClient.listAccessibleProjects?.()
      .then((data) => {
        const list = data?.projects || data || [];
        if (!cancelled) setUserInvolvedProjects(Array.isArray(list) ? list : []);
      })
      .catch(() => { /* non-fatal */ });

    Promise.allSettled([
      apiClient.core.get('/api/meetings?limit=40').then((r) => r.data?.meetings || r.data || []),
      apiClient.listOAuthConnectors().then((d) => d?.connectors || d || []),
      apiClient.listMembers(org.id).then((d) => d?.members || d || []),
      apiClient.listDocuments({ limit: 8 }).then((d) => d?.documents || d || []),
    ]).then(([mtg, conn, mem, docs]) => {
      if (cancelled) return;
      const meetings = (mtg.value || []).map((m) => ({ id: m.id, name: m.title || m.name || 'Meeting' }));
      const connectors = (conn.value || []).map((c) => ({ id: c.id || c.provider, name: c.displayName || c.name || c.label || c.provider }));
      const employees = (mem.value || []).map((u) => ({ id: u.userId || u.id, name: u.name || u.displayName || u.email || 'Member' }));
      const knowledge = (docs.value || []).map((d) => ({ id: d.id, name: d.title || d.name || 'Document' }));
      setMossHubItems({ meetings, connectors, employees, knowledge });
    });

    return () => { cancelled = true; };
  }, [org?.id]);
  const graphRef = useRef();
  const graphShellRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [rawEdges, setRawEdges] = useState([]);
  // Guards: prevent the mount fetch + the deferred warm fetch from both
  // hitting the network (double round-trip on every refresh). hasPaintedRef
  // lets the warm skip entirely once data is on screen.
  const fetchInFlightRef = useRef(false);
  const hasPaintedRef = useRef(false);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphVisible, setGraphVisible] = useState(false);
  const [graphViewState, setGraphViewState] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const autoSelectedLatestRef = useRef(null);
  const [searchInput, setSearchInput] = useState(""); // Immediate
  const [searchQuery, setSearchQuery] = useState(""); // Debounced
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  // eslint-disable-next-line no-unused-vars
  const [projectFilter, setProjectFilter] = useState("");
  // Default 'visible' = membership-based access_context — the same set the
  // Memories/Overview pages count (listMemories), so the graph node count
  // matches the headline elsewhere. 'personal'/'team'/'all' stay as explicit
  // user-selectable scopes.
  const [scope, setScope] = useState("visible");
  // Project-level tier: which single project to scope to. '' = all the
  // user's accessible projects. Only applied while scope === 'tier:project'.
  const [tierProject, setTierProject] = useState("");
  // Sync graph project filter with TeamSwitcher's active project so the
  // 3D atlas reflects the same scope as Chat / Memories / Overview.
  // `projects` is the role-scoped list (admins all, members invited-only).
  const { activeProject, projects: accessibleProjects } = useTeamContext() || {};
  useEffect(() => {
    if (activeProject) setProjectFilter(activeProject.slug || activeProject.name || "");
    else setProjectFilter("");
  }, [activeProject]);
  // eslint-disable-next-line no-unused-vars
  const [showFilters, setShowFilters] = useState(false);
  const [layerFilter] = useState("all");
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
  const [intelligentMode] = useState(() => safeStorageGet("hm-graph-intelligent") === "true");
  useEffect(() => { safeStorageSet("hm-graph-intelligent", String(intelligentMode)); }, [intelligentMode]);
  // Canonical-only toggle — hides superseded nodes (is_latest=false) so the
  // graph reflects the current state of knowledge after drift-compaction.
  // Default OFF: show full timeline (superseded nodes dimmed + Updates edges
  // visible). Was previously ON by default which hid every memory the user
  // had revised, surprising users who saved multiple drafts.
  const [canonicalOnly] = useState(() => safeStorageGet("hm-graph-canonical") === "true");
  useEffect(() => { safeStorageSet("hm-graph-canonical", String(canonicalOnly)); }, [canonicalOnly]);
  // Relationship type filter chips (Updates, Extends, Derives, Contradicts, supports, mentions)
  const [edgeTypeFilter] = useState(new Set()); // empty = all
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
  // v2 cache key — bumped after backend started excluding 'extracted-fact'
  // children so stale localStorage doesn't keep showing the inflated counts.
  const cacheKey = useMemo(
    () => `hm:graph:v2:${scope}:${projectFilter || ""}:${tierProject || ""}:${nodeLimit}`,
    [scope, projectFilter, tierProject, nodeLimit]
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
      const nodeIdSet = new Set(nodes.map((node) => node.id));
      setGraphData({ nodes, links });
      setRawEdges(cached.edges.filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)));
      setMeta(cached.meta || null);
      if (nodes.length) hasPaintedRef.current = true;
      return true;
    } catch (_e) {
      return false;
    }
  }, [cacheKey]);

  // Fetch graph data — uses cached snapshot for instant render, then revalidates.
  const fetchGraph = useCallback(async () => {
    // De-dupe concurrent calls (mount effect + deferred warm) — one network
    // round-trip per refresh, not two.
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    const hadCache = hydrateFromCache();
    // Only show spinner if no cache to display
    setLoading(!hadCache);
    setError(null);
    try {
      const data = intelligentMode
        ? await apiClient.getIntelligentGraph({
            limit: Math.max(nodeLimit || 0, 500) || 500,
            project: projectFilter || undefined,
          })
        : await apiClient.getGraph({
            // Project-level tier with a picked project narrows to it; the
            // server resolves uuid/slug/name → projectId FK + memory_projects.
            project: (scope === 'tier:project' && tierProject) ? tierProject : (projectFilter || undefined),
            project_id: activeProject?.id || undefined,
            limit: nodeLimit,
            scope,
          });
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
      const nodeIdSet = new Set(nodes.map((node) => node.id));
      setRawEdges((data.edges || []).filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)));
      setMeta(data.meta || null);
      if (nodes.length) hasPaintedRef.current = true;
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
      fetchInFlightRef.current = false;
    }
  }, [projectFilter, scope, tierProject, nodeLimit, hydrateFromCache, cacheKey, intelligentMode, edgeTypeFilter, activeProject?.id]);

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
    if (graphTheme === "night") {
      return {
        background:
          `radial-gradient(circle at 22% 18%, rgba(255,91,82,0.10) 0%, rgba(21,18,15,0) 34%),` +
          `radial-gradient(circle at 78% 30%, rgba(245,216,195,0.06) 0%, rgba(21,18,15,0) 30%),` +
          `radial-gradient(circle at 58% 84%, rgba(255,82,76,0.08) 0%, rgba(21,18,15,0) 38%),` +
          `linear-gradient(180deg, #15120f 0%, #0c0a08 100%)`,
      };
    }
    return {
      background:
        `radial-gradient(circle at 20% 20%, rgba(232,79,72,0.08) 0%, rgba(239,231,218,0) 32%),` +
        `radial-gradient(circle at 80% 24%, rgba(217,154,26,0.08) 0%, rgba(239,231,218,0) 28%),` +
        `radial-gradient(circle at 56% 78%, rgba(80,55,38,0.08) 0%, rgba(239,231,218,0) 38%),` +
        `linear-gradient(180deg, #f2eadf 0%, #e9dfd0 100%)`,
    };
  }, [graphTheme]);

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
    const el = graphShellRef.current;
    if (typeof window === "undefined" || !el || !("IntersectionObserver" in window)) {
      setGraphVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setGraphVisible(entry.isIntersecting),
      { threshold: 0.04 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!graphVisible) return;
    fetchGraph();
  }, [fetchGraph, graphVisible]);

  // Warm on entry. The 3D canvas can mount before the layout settles, which
  // historically left the graph blank until the user hit refresh manually.
  // Fire one deferred re-fetch shortly after mount so the graph reliably
  // paints (and the WebGL viewport re-measures) on first visit.
  useEffect(() => {
    // Only fire the warm re-fetch if the first paint never happened (the
    // blank-canvas race this guards). If data already painted from cache or
    // the mount fetch, skip — no redundant second network round-trip.
    if (!graphVisible) return undefined;
    const t = window.setTimeout(() => {
      if (!hasPaintedRef.current) fetchGraph();
    }, 650);
    return () => window.clearTimeout(t);
    // mount-only warm — fetchGraph identity is stable enough for this nudge
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphVisible]);

  // Render once, then DON'T re-poll or refetch while the user stays on the
  // page — no periodic interval, no refetch on tab-refocus. Rebuild+relayout on
  // every visibility change was jarring (graph reset under the user). The graph
  // stays intact for the whole visit; a manual Refresh button is the only reload.

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

  // Hard-delete a memory node from the graph (confirm → delete → drop from
  // graphData). Guarded against document/entity nodes (not memory ids).
  const handleDeleteMemory = useCallback(async (node) => {
    if (!node?.id || node.kind === 'document' || node.kind === 'entity') return;
    if (!window.confirm(`Permanently delete memory "${node.title || node.label || node.id}"? This cannot be undone.`)) return;
    try {
      await apiClient.deleteMemory(node.id, { hard: true });
      setGraphData((g) => ({
        nodes: (g.nodes || []).filter((n) => n.id !== node.id),
        links: (g.links || []).filter((l) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return s !== node.id && t !== node.id;
        }),
      }));
      setSelectedNode(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
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

  const hubCounts = useMemo(() => {
    const counts = { projects: 0, meetings: 0, connectors: 0, employees: 0, personal: 0, knowledge: 0 };
    graphData.nodes.forEach((n) => {
      const cat = (n.category || n.type || '').toLowerCase();
      if (cat === 'project' || cat === 'projects') counts.projects++;
      else if (cat === 'meeting' || cat === 'meetings') counts.meetings++;
      else if (cat === 'connector' || cat === 'connectors') counts.connectors++;
      else if (cat === 'employee' || cat === 'employees') counts.employees++;
      else if (cat === 'personal') counts.personal++;
      else if (cat === 'knowledge' || cat === 'fact' || cat === 'decision') counts.knowledge++;
    });
    // Fallback: distribute evenly if no categories found
    if (counts.projects + counts.meetings + counts.connectors + counts.employees + counts.personal + counts.knowledge === 0) {
      const perHub = Math.floor(graphData.nodes.length / 6);
      const remainder = graphData.nodes.length % 6;
      counts.projects = perHub + (remainder > 0 ? 1 : 0);
      counts.meetings = perHub + (remainder > 1 ? 1 : 0);
      counts.connectors = perHub + (remainder > 2 ? 1 : 0);
      counts.employees = perHub + (remainder > 3 ? 1 : 0);
      counts.personal = perHub + (remainder > 4 ? 1 : 0);
      counts.knowledge = perHub + (remainder > 5 ? 1 : 0);
    }
    return counts;
  }, [graphData.nodes]);

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

  useEffect(() => {
    const candidate = graphData.nodes
      .filter((node) => node && node.kind !== "document" && node.kind !== "entity")
      .map((node) => ({ node, ts: getNodeTimestamp(node) || 0 }))
      .sort((a, b) => b.ts - a.ts)[0]?.node || null;

    if (!candidate) return;

    const selectedStillExists = selectedNode && graphData.nodes.some((node) => node.id === selectedNode.id);
    const shouldReplace =
      !selectedNode ||
      !selectedStillExists ||
      autoSelectedLatestRef.current === selectedNode.id;

    if (shouldReplace && selectedNode?.id !== candidate.id) {
      autoSelectedLatestRef.current = candidate.id;
      setSelectedNode(candidate);
    }
  }, [graphData.nodes, selectedNode]);

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
      // Canonical-only: drop nodes flagged is_latest=false (post drift-compaction)
      const matchesCanon = !canonicalOnly || n.is_latest !== false;
      if (matchesLayer && matchesTime && matchesCanon) matches.add(n.id);
    });
    return matches;
  }, [graphData.nodes, layerFilter, temporalFilteredNodes, canonicalOnly]);

  const toolbarControlClass = graphTheme === "night"
    ? "border-[#382f2a] bg-[#0b0a09]/72 text-[#d5c8bc] shadow-[inset_0_1px_0_rgba(255,240,229,0.06)]"
    : "border-[#e6e3dc] bg-white/88 text-[#5f5f5f] shadow-[0_10px_30px_rgba(21,20,18,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]";
  const toolbarActiveClass = graphTheme === "night"
    ? "bg-[#fff0e5] text-[#080808]"
    : "border-[#e4a099] bg-[#ffe7df] text-[#d54d45]";
  const toolbarMutedClass = graphTheme === "night"
    ? "text-[#8f8378] hover:text-[#fff0e5]"
    : "text-[#8f8378] hover:text-[#d54d45]";
  const panelClass = graphTheme === "night"
    ? "border-[#2f2925] bg-[#080808]/82 text-[#e8dbcf] shadow-[0_24px_80px_rgba(0,0,0,0.38)]"
    : "border-[#e6e3dc] bg-white/90 text-[#1e1e1e] shadow-[0_18px_58px_rgba(21,20,18,0.08)]";
  const panelMutedText = graphTheme === "night" ? "text-[#9d9288]" : "text-[#8b857d]";
  const panelSoftButton = graphTheme === "night"
    ? "border-[#2f2925] bg-[#151312]/90 text-[#cfc2b7] hover:text-[#fff0e5]"
    : "border-[#e3e0db] bg-[#faf9f4] text-[#525252] hover:text-[#0a0a0a]";
  const detailPanelWidth = selectedNode ? 420 : 0;

  // Floating back button — themed pill that floats just below the toolbar
  // at the top-left of the canvas area. Matches graphTheme (night = warm
  // black with coral accent; day = cream/charcoal).
  const floatingButtonClass = graphTheme === "night"
    ? "border-[#3a2e28] bg-[#0a0807]/85 text-[#fff0e5] hover:border-[#ff746d]/45 hover:bg-[#171110]/92 hover:text-[#ff8f7a] shadow-[0_18px_44px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,240,229,0.05)]"
    : "border-[#e8b9a9] bg-[#fff7ee]/90 text-[#d54d45] hover:border-[#d54d45]/45 hover:bg-[#ffe7df] shadow-[0_18px_44px_rgba(121,73,45,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]";
  const graphButtonClass = graphTheme === "night"
    ? "border-[#2f2925] bg-[#0b0a09]/84 text-[#b9ada2] hover:text-[#fff0e5] hover:border-[#fff0e5]/20"
    : "border-[#e6dfd3] bg-[#fff7ee]/92 text-[#9a8b7a] hover:text-[#d54d45] hover:border-[#e8b9a9] hover:bg-[#fff0e8]";

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={atmosphereStyle}>
      <PageWalkthrough pageKey="memory-graph-3d" steps={GRAPH_STEPS} />
      {/* ── Compact unified toolbar ── single row, theme-consistent ── */}
      <div
        className={`shrink-0 border-b px-3 sm:px-5 py-3 flex items-center gap-2.5 z-20 overflow-x-auto ${
          graphTheme === "night"
            ? "border-[#2f2925] bg-[linear-gradient(90deg,rgba(8,8,8,0.96),rgba(24,18,16,0.92)_48%,rgba(8,8,8,0.96))]"
            : "border-[#e7e4dd] bg-[#fbfaf7]/95"
        }`}
        style={{
          backdropFilter: "blur(18px) saturate(150%)",
          boxShadow: graphTheme === "night"
            ? "0 14px 52px rgba(0,0,0,0.32), inset 0 -1px 0 rgba(255,240,229,0.03)"
            : "0 14px 44px rgba(21,20,18,0.06), inset 0 -1px 0 rgba(255,255,255,0.8)",
        }}
      >
        {/* Brand */}
        <div className={`flex items-center gap-3 shrink-0 rounded-2xl border px-3 py-2 ${toolbarControlClass}`}>
          <span
            className="grid h-8 w-8 place-items-center rounded-xl border"
            style={{
              background: graphTheme === "night"
                ? "radial-gradient(circle at 35% 30%, rgba(255,240,229,0.22), rgba(255,105,97,0.18) 48%, rgba(255,105,97,0.04))"
                : "linear-gradient(180deg, #fff0e8 0%, #ffe2d8 100%)",
              borderColor: graphTheme === "night" ? "rgba(255,240,229,0.08)" : "#e8b9a9",
            }}
          >
            <Network size={16} className={graphTheme === "night" ? "text-[#ff746d]" : "text-[#d54d45]"} />
          </span>
          <span className="flex flex-col leading-none">
            <span className={`text-[14px] font-bold font-['Space_Grotesk'] whitespace-nowrap ${graphTheme === "night" ? "text-[#fff0e5]" : "text-[#111111]"}`}>
              {t('memoryGraph.title', 'Memory Graph')}
            </span>
            <span className={`mt-1 text-[10px] font-mono uppercase tracking-[0.18em] whitespace-nowrap ${graphTheme === "night" ? "text-[#8f8378]" : "text-[#8f8f8f]"}`}>
              3D memory atlas
            </span>
          </span>
        </div>

        <div className={`h-5 w-px mx-1 shrink-0 ${graphTheme === "night" ? "bg-[#2f2925]" : "bg-[#e3e0db]"}`} />

        {/* Search */}
        <div className="relative shrink-0 hidden sm:block" style={{ minWidth: 210, maxWidth: 300 }}>
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={matchCount > 0 ? t('memoryGraph.matches', '{{count}} matches', { count: matchCount }) : t('memoryGraph.search', 'Search memories')}
            className={`w-full pl-7 pr-2 py-1.5 border rounded-lg text-[11px] font-['Space_Grotesk'] focus:outline-none ${
              graphTheme === "night"
                ? "border-[#2f2925] bg-[#080808] text-[#fff0e5] placeholder:text-[#746b63] focus:border-[#ff746d]/50"
                : "border-[#e6dfd3] bg-[#fffaf4] text-[#111111] placeholder:text-[#a99b8d] focus:border-[#d54d45]/55 focus:ring-2 focus:ring-[#d54d45]/10"
            }`}
          />
        </div>

        {/* Node budget */}
        <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 shrink-0 ${toolbarControlClass}`}>
          {[
            { key: 300, label: '300' },
            { key: 1000, label: '1K' },
            { key: 5000, label: '5K' },
            { key: 0, label: 'All' },
          ].map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setNodeLimit(o.key)}
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono ${
                nodeLimit === o.key ? toolbarActiveClass : toolbarMutedClass
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className={`shrink-0 inline-flex items-center rounded-lg border p-0.5 ${toolbarControlClass}`}>
          {[
            { key: 'visible', label: 'All' },
            { key: 'tier:organization', label: 'Org' },
            { key: 'tier:project', label: 'Project' },
            { key: 'tier:personal', label: 'Personal' },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setScope(option.key)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wide transition-colors ${
                scope === option.key ? toolbarActiveClass : toolbarMutedClass
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {scope === 'tier:project' && (
          <select
            value={tierProject}
            onChange={(e) => setTierProject(e.target.value)}
            className={`hidden md:block shrink-0 rounded-lg border px-2 py-1.5 text-[10px] font-mono max-w-[170px] focus:outline-none ${toolbarControlClass}`}
          >
            <option value="">All my projects</option>
            {(accessibleProjects || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {/* Action buttons */}

        {/* 3D / 2D toggle — segmented pill */}
        <div className={`shrink-0 inline-flex items-center rounded-lg border p-0.5 ${toolbarControlClass}`}>
          {['3d', '2d', 'moss'].map((dim) => (
            <button
              key={dim}
              onClick={() => setGraphDim(dim)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wide transition-colors ${
                graphDim === dim
                  ? toolbarActiveClass
                  : toolbarMutedClass
              }`}
              title={dim === '3d' ? '3D force graph' : dim === '2d' ? '2D force graph' : 'Organic moss view (curated)'}
            >
              {dim.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Day / Night graph theme */}
        <div className={`shrink-0 inline-flex items-center rounded-lg border p-0.5 ${toolbarControlClass}`}>
          {[
            { key: "night", label: "Night", icon: Moon },
            { key: "day", label: "Day", icon: Sun },
          ].map((option) => {
            const Icon = option.icon;
            const active = graphTheme === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setGraphTheme(option.key)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wide transition-colors ${
                  active
                    ? option.key === "night"
                      ? "bg-[#0a0a0a] text-[#fff7ed]"
                      : toolbarActiveClass
                    : toolbarMutedClass
                }`}
                title={`${option.label} graph mode`}
              >
                <Icon size={10} />
                {option.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowLegend((v) => !v)}
          className={`shrink-0 p-1.5 rounded-lg border ${
            showLegend ? toolbarActiveClass : toolbarControlClass
          }`}
          title="Toggle legend"
        >
          <BookOpen size={12} />
        </button>
        <button
          onClick={() => setIsLiveMode((v) => !v)}
          className={`shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-mono border ${
            isLiveMode
              ? toolbarActiveClass
              : toolbarControlClass
          }`}
          title={isLiveMode ? "Live updates on" : "Paused"}
        >
          <Radio size={10} />
          {isLiveMode ? "Live" : "Paused"}
        </button>
        <button
          onClick={fetchGraph}
          disabled={loading}
          className={`shrink-0 p-1.5 rounded-lg border disabled:opacity-40 ${toolbarControlClass}`}
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => graphRef.current?.fitView?.(400)}
          className={`shrink-0 p-1.5 rounded-lg border ${toolbarControlClass}`}
          title="Fit to view"
        >
          <Maximize2 size={12} />
        </button>
        <button
          onClick={() => { setPageIndexRefreshKey(k => k + 1); setPageIndexModalOpen(true); }}
          className={`shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-mono font-semibold ${toolbarActiveClass}`}
          title="Memory Map"
        >
          <MapIcon size={10} />
          Map
        </button>

        {/* Stats */}
        <div className="ml-auto shrink-0">
          <LangSwitcher compact theme={graphTheme} />
        </div>

        {stats && (
          <div className={`shrink-0 flex items-center gap-2 text-[10px] font-mono pl-2 border-l ${panelMutedText} ${graphTheme === "night" ? "border-[#2f2925]" : "border-[#e3e0db]"}`}>
            <span>{filteredNodes.size}/{stats.nodes} nodes</span>
            <span>· {stats.edges} edges</span>
          </div>
        )}
        {graphDim === "3d" && graphViewState && (
          <div className={`hidden lg:flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-mono ${toolbarControlClass}`}>
            <span className={panelMutedText}>Labels</span>
            <span className={graphTheme === "night" ? "text-[#fff0e5]" : "text-[#d54d45]"}>
              {graphViewState.labelMode}
            </span>
          </div>
        )}
      </div>

      {/* Graph canvas */}
      <div ref={graphShellRef} className="flex-1 relative">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/hivemind/app/overview");
            }
          }}
          className={`absolute left-4 top-4 z-30 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em] backdrop-blur-xl transition-all ${floatingButtonClass}`}
          title={t('memoryGraph.back', 'Back')}
          aria-label={t('memoryGraph.back', 'Back')}
        >
          <ArrowLeft size={13} />
          {t('memoryGraph.back', 'Back')}
        </button>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: graphTheme === "night"
              ? "radial-gradient(circle at 44% 32%, rgba(255,91,88,0.09) 0%, rgba(24,23,21,0) 26%), radial-gradient(circle at 74% 70%, rgba(255,238,222,0.05) 0%, rgba(24,23,21,0) 34%), radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.24) 100%)"
              : "radial-gradient(circle at center, rgba(255,252,245,0) 0%, rgba(255,252,245,0.16) 70%, rgba(235,229,218,0.26) 100%)",
            mixBlendMode: graphTheme === "night" ? "screen" : "normal",
          }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div
              className={`flex flex-col items-center gap-5 px-7 py-6 rounded-[22px] border ${
                graphTheme === "night"
                  ? "bg-[#080808]/86 border-[#2f2925]"
                  : "bg-white/88 border-[#e3e0db]"
              }`}
              style={{
                backdropFilter: "blur(14px)",
                boxShadow: graphTheme === "night"
                  ? "0 28px 72px rgba(0,0,0,0.42)"
                  : "0 24px 60px rgba(37,32,27,0.12)",
              }}
            >
              <div
                className={`text-[13px] font-bold font-['Space_Grotesk'] tracking-tight ${
                  graphTheme === "night" ? "text-[#fff1e6]" : "text-[#0a0a0a]"
                }`}
              >
                {graphData.nodes.length === 0 ? "Loading memory graph" : "Refreshing graph"}
              </div>
              <GraphTqdmBar
                dark={graphTheme === "night"}
                done={graphData.nodes.length > 0}
              />
              <style>{`
                @keyframes hm-tqdm-shimmer {
                  0% { opacity: 0.55; }
                  50% { opacity: 1; }
                  100% { opacity: 0.55; }
                }
              `}</style>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#fff8f3] border border-[#d8c7bb] rounded-xl px-4 py-2 text-xs text-[#4a3328] font-['Space_Grotesk']">
            {error}
          </div>
        )}

        {graphVisible && graphData.nodes.length > 0 && graphDim === '3d' && (
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
            onViewStateChange={setGraphViewState}
            backgroundColor="rgba(0,0,0,0)"
            theme={graphTheme === "night" ? "atlas" : "day"}
            width={
              typeof window !== "undefined"
                ? window.innerWidth - detailPanelWidth
                : 800
            }
            height={
              typeof window !== "undefined" ? window.innerHeight - 66 : 600
            }
          />
        )}

        {graphVisible && graphData.nodes.length > 0 && is2D && (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: '#faf9f4',
              backgroundImage: 'radial-gradient(circle, rgba(10,10,10,0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <MemoryGraph2DCanvas
              ref={graphRef}
              graphData={graphData}
              selectedNode={selectedNode}
              highlightNodes={highlightNodes}
              filteredNodes={filteredNodes}
              onNodeClick={handleNodeClick}
              onNodeHover={(node) => {
                setHoveredNode(node);
              }}
              onBackgroundClick={() => {
                setSelectedNode(null);
                setHoveredNode(null);
              }}
              backgroundColor="rgba(0,0,0,0)"
              width={
                typeof window !== "undefined"
                  ? window.innerWidth - detailPanelWidth
                  : 800
              }
              height={
                typeof window !== "undefined" ? window.innerHeight - 66 : 600
              }
            />
          </div>
        )}

        {/* Organic constellation view — explicit viewport sizing (mirrors the
            2D/3D canvases) so it centers correctly instead of inheriting an
            over-tall container. */}
        {graphVisible && graphData.nodes.length > 0 && isMoss && (
          <div
            className="absolute top-0 left-0 overflow-hidden"
            style={{
              width: typeof window !== 'undefined' ? window.innerWidth - detailPanelWidth : 800,
              height: typeof window !== 'undefined' ? window.innerHeight - 66 : 600,
            }}
          >
            <MemoryMoss
              memories={graphData.nodes}
              orgName={org?.name || 'Your memory'}
              theme={graphTheme === 'night' ? 'night' : 'day'}
              onAddMemory={() => navigate('/hivemind/app/memories')}
              hubCounts={{
                ...hubCounts,
                projects: userInvolvedProjects.length || hubCounts.projects,
                meetings: mossHubItems.meetings.length || hubCounts.meetings,
                connectors: mossHubItems.connectors.length || hubCounts.connectors,
                employees: mossHubItems.employees.length || hubCounts.employees,
              }}
              hubLeaves={{ projects: projectNames }}
              hubItems={{
                ...mossHubItems,
                personal: (graphData.nodes || [])
                  .filter((n) => (n.scope === 'personal') || (n.tags || []).includes('personal'))
                  .slice(0, 6)
                  .map((n) => ({ id: n.id, name: n.title || n.label || 'Memory' })),
              }}
              projects={userInvolvedProjects}
              onSelectProject={(proj) => {
                if (proj?.slug || proj?.name) {
                  const target = proj.slug || proj.name;
                  navigate(`/hivemind/app/memories?project=${target}`);
                }
              }}
            />
          </div>
        )}

        {/* (Floating Graph Controls + Intelligent panel removed — controls now consolidated in top toolbar) */}

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
            <div className={`${panelClass} backdrop-blur-xl rounded-[20px] border px-3.5 py-3`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className={`text-[10px] font-mono uppercase tracking-[0.16em] ${panelMutedText}`}>
                  {t('memoryGraph.legend', 'Legend')}
                </p>
                <button
                  onClick={() => setShowLegend(false)}
                  className={graphTheme === "night" ? "text-[#756a61] hover:text-[#fff0e5]" : "text-[#a3a3a3] hover:text-[#525252]"}
                >
                  <X size={12} />
                </button>
              </div>
              <p className={`text-[9px] font-mono uppercase tracking-wider mb-1.5 ${panelMutedText}`}>
                {t('memoryGraph.relationships', 'Relationships')}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {Object.entries(EDGE_COLORS).slice(0, 5).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-0 border-t"
                      style={{
                        borderColor: graphTheme === "night" ? "#c9b8ab" : color,
                        borderTopStyle: type === "Updates" ? "solid" : "dashed",
                        opacity: type === "Derives" ? 0.52 : 0.72,
                      }}
                    />
                    <span className={`text-[10px] font-['Space_Grotesk'] ${graphTheme === "night" ? "text-[#cabdb1]" : "text-[#525252]"}`}>
                      {EDGE_LABELS[type]}
                    </span>
                  </div>
                ))}
              </div>
              <p className={`text-[9px] font-mono uppercase tracking-wider mt-2.5 mb-1.5 ${panelMutedText}`}>
                {t('memoryGraph.nodeTypes', 'Node Types')}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {TYPE_LEGEND.slice(0, 7).map((item) => (
                  <div key={item.key} className="flex items-center gap-1.5">
                    <LegendShape
                      shape={item.shape}
                      color={graphTheme === "night" ? (item.key === "decision" ? "#d2514d" : "#d6cabf") : TYPE_COLORS[item.key]}
                    />
                    <span className={`text-[10px] font-['Space_Grotesk'] ${graphTheme === "night" ? "text-[#cabdb1]" : "text-[#525252]"}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Zoom + cluster panel controls */}
        <div className="absolute bottom-4 right-4 flex items-end gap-3 z-10">
          {false && (
            <div className={`${panelClass} rounded-[22px] border backdrop-blur-xl px-3 py-3 w-[268px]`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className={`text-[10px] font-mono uppercase tracking-[0.16em] ${panelMutedText}`}>
                    {t('memoryGraph.time', 'Time')}
                  </p>
                  <p className={`text-[11px] font-['Space_Grotesk'] ${graphTheme === "night" ? "text-[#eaded2]" : "text-[#24221f]"}`}>
                    {temporalCutoff ? new Date(temporalCutoff).toLocaleDateString() : t('memoryGraph.allTime', 'All time')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTemporalProgress(1);
                    setIsLiveMode(true);
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-[10px] font-mono ${panelSoftButton}`}
                >
                  {t('memoryGraph.now', 'Now')}
                </button>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <button
                  onClick={() => setTemporalMode('travel')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em] border transition-colors ${
                    temporalMode === 'travel'
                      ? toolbarActiveClass
                      : panelSoftButton
                  }`}
                >
                  {t('memoryGraph.travel', 'Travel')}
                </button>
                <button
                  onClick={() => setTemporalMode('diff')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em] border transition-colors ${
                    temporalMode === 'diff'
                      ? toolbarActiveClass
                      : panelSoftButton
                  }`}
                >
                  Diff
                </button>
                <button
                  onClick={() => {
                    if (temporalProgress >= 0.999) setTemporalProgress(0);
                    setTemporalPlaying((p) => !p);
                  }}
                  className={`ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.12em] border ${toolbarActiveClass}`}
                  aria-label={temporalPlaying ? 'Pause' : 'Play'}
                >
                  {temporalPlaying ? <Pause size={10} /> : <Play size={10} />}
                  {temporalPlaying ? t('memoryGraph.pause', 'Pause') : t('memoryGraph.play', 'Play')}
                </button>
                <button
                  onClick={() => setTemporalSpeed((s) => (s >= 4 ? 1 : s * 2))}
                  className={`px-1.5 py-1 rounded-lg text-[10px] font-mono border ${panelSoftButton}`}
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
                  className={`w-full h-2 appearance-none rounded-full cursor-pointer temporal-slider-horizontal ${graphTheme === "night" ? "bg-[#1d1a18]" : "bg-[#f2eee7]"}`}
                  aria-label="Temporal memory formation scrubber"
                />
                {/* Progress bar underlay — animated fill mirrors temporalProgress */}
                <div
                  className="pointer-events-none absolute left-0 top-0 h-2 rounded-full opacity-65 transition-[width] duration-100"
                  style={{
                    width: `${Math.round(temporalProgress * 100)}%`,
                    background: graphTheme === "night"
                      ? "linear-gradient(90deg, #ff6961, #f2d8c2)"
                      : "linear-gradient(90deg, #0a0a0a, #777168)",
                  }}
                />
              </div>
              <div className={`mt-2 flex items-center justify-between text-[10px] font-mono ${panelMutedText}`}>
                <span>{new Date(temporalBounds.min).toLocaleDateString()}</span>
                <span>{new Date(temporalBounds.max).toLocaleDateString()}</span>
              </div>
              <div className={`mt-2 flex items-center justify-between border-t pt-2 ${graphTheme === "night" ? "border-[#2f2925]" : "border-[#eee9e1]"}`}>
                <div>
                  <p className={`text-[10px] font-mono uppercase tracking-[0.14em] ${panelMutedText}`}>
                    {temporalMode === 'diff' ? t('memoryGraph.cutoff', 'Cutoff') : t('memoryGraph.window', 'Window')}
                  </p>
                  <p className={`mt-1 text-xs font-['Space_Grotesk'] ${graphTheme === "night" ? "text-[#fff0e5]" : "text-[#0a0a0a]"}`}>
                    {temporalCutoff ? new Date(temporalCutoff).toLocaleString() : 'All time'}
                  </p>
                </div>
                <div className="text-right">
                  {temporalMode === 'diff' ? (
                    <>
                      <p className={`text-[10px] font-mono uppercase tracking-[0.14em] ${panelMutedText}`}>
                        Δ Added
                      </p>
                      <p className={`text-xs font-['Space_Grotesk'] font-semibold ${graphTheme === "night" ? "text-[#fff0e5]" : "text-[#0a0a0a]"}`}>
                        {temporalDiffNodes ? temporalDiffNodes.size : 0}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className={`text-[10px] font-mono uppercase tracking-[0.14em] ${panelMutedText}`}>
                        Live
                      </p>
                      <p className={`text-xs font-['Space_Grotesk'] ${graphTheme === "night" ? "text-[#f2d8c2]" : "text-[#36332d]"}`}>
                        {isLiveMode ? t('memoryGraph.on', 'On') : t('memoryGraph.paused', 'Paused')}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {temporalMode === 'diff' && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono uppercase tracking-[0.12em] ${panelMutedText}`}>Δ window</span>
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
                          ? toolbarActiveClass
                          : panelSoftButton
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
          {/* Cluster sidebar toggle */}
          {clusters.length > 1 && (
            <button
              onClick={() => setShowClusterPanel((v) => !v)}
              className={`w-9 h-9 rounded-xl backdrop-blur border flex items-center justify-center transition-colors mb-1 shadow-[0_12px_32px_rgba(21,20,18,0.07)] ${
                showClusterPanel
                  ? toolbarActiveClass
                  : graphButtonClass
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
              className={`w-9 h-9 rounded-xl backdrop-blur border flex items-center justify-center transition-colors shadow-[0_12px_32px_rgba(21,20,18,0.07)] ${graphButtonClass}`}
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
              onDelete={handleDeleteMemory}
              theme={graphTheme}
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
              className={`absolute left-3 top-16 bottom-3 w-[min(280px,calc(100vw-24px))] z-40 backdrop-blur-xl border rounded-2xl overflow-hidden flex flex-col ${panelClass}`}
            >
              <div className={`flex items-center justify-between px-3.5 py-3 border-b ${graphTheme === "night" ? "border-[#2f2925]" : "border-[#e7e4dd]"}`}>
                <div className="flex items-center gap-2">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg border ${
                    graphTheme === "night"
                      ? "border-[#3a2e28] bg-[#171110] text-[#ff746d]"
                      : "border-[#e8b9a9] bg-[#fff0e8] text-[#d54d45]"
                  }`}>
                    <Layers size={14} />
                  </span>
                  <div>
                    <span className={`block text-xs font-semibold font-['Space_Grotesk'] tracking-wide ${graphTheme === "night" ? "text-[#fff0e5]" : "text-[#111111]"}`}>
                      Mind Groups
                    </span>
                    <span className={`block text-[10px] font-mono ${panelMutedText}`}>
                      {clusters.filter((c) => c.id !== "_orphan").length} clusters
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowClusterPanel(false)} className={`${toolbarMutedClass} transition-colors`}>
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
                            ? graphTheme === "night"
                              ? "border-[#ff746d]/35 bg-[#1b1110]"
                              : "border-[#e8b9a9] bg-[#fff0e8]"
                            : graphTheme === "night"
                              ? "border-transparent hover:bg-[#151312]"
                              : "border-transparent hover:bg-[#fff7ee]"
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
                            style={{ backgroundColor: isActive ? "#d54d45" : color }}
                          />
                          <span className={`text-[11px] font-semibold font-['Space_Grotesk'] truncate flex-1 ${graphTheme === "night" ? "text-[#eaded2]" : "text-[#242424]"}`}>
                            {label}
                          </span>
                          <span className={`text-[10px] font-mono ${panelMutedText}`}>{c.size}</span>
                        </div>
                        {isActive && topNodes.length > 0 && (
                          <div className="ml-4 mt-1 space-y-0.5">
                            {topNodes.map((n) => (
                              <div
                                key={n.id}
                                className={`text-[10px] truncate cursor-pointer transition-colors ${graphTheme === "night" ? "text-[#9d9288] hover:text-[#fff0e5]" : "text-[#686868] hover:text-[#d54d45]"}`}
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
                  <div className={`rounded-lg px-2.5 py-1.5 text-[10px] italic ${panelMutedText}`}>
                    + {clusters.find((c) => c.id === "_orphan")?.size || 0} unlinked nodes
                  </div>
                )}
              </div>
              <div className={`px-3 py-2 border-t text-[10px] font-mono ${panelMutedText} ${graphTheme === "night" ? "border-[#2f2925]" : "border-[#e7e4dd]"}`}>
                {clusters.filter((c) => c.id !== "_orphan").length} clusters · {graphData.nodes.length} nodes
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Node hover tooltip */}
        {hoveredNode && !selectedNode && (
          <div
            className={`absolute z-30 backdrop-blur-xl border rounded-2xl px-3 py-2 pointer-events-none ${panelClass}`}
            style={{
              right: 16,
              top: 84,
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-lg border border-[#cfe2ff] bg-[#e8f1ff] text-[#2f83ff] flex items-center justify-center">
                {hoveredNode.nodeLayer === 'tara-insight' && <Star size={10} />}
                {hoveredNode.nodeLayer === 'tara' && <Hexagon size={10} />}
                {hoveredNode.nodeLayer === 'fact' && <div className="w-2 h-2 rotate-45 bg-current" />}
                {hoveredNode.nodeLayer === 'observation' && <Square size={10} />}
                {(!hoveredNode.nodeLayer || hoveredNode.nodeLayer === 'memory') && <Circle size={10} />}
              </span>
              <p className={`text-xs font-semibold font-['Space_Grotesk'] truncate max-w-[180px] ${graphTheme === "night" ? "text-[#fff0e5]" : "text-[#111111]"}`}>
                {hoveredNode.title || 'Untitled'}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className={`text-[10px] font-mono uppercase tracking-wider ${panelMutedText}`}>
                {hoveredNode.nodeLayer || hoveredNode.memoryType || 'memory'}
              </p>
              {hoveredNode.daysSinceUpdate != null && (
                <p className={`text-[10px] font-['Space_Grotesk'] ${graphTheme === "night" ? "text-[#cabdb1]" : "text-[#686868]"}`}>
                  {hoveredNode.daysSinceUpdate.toFixed(0)} days ago
                </p>
              )}
              {hoveredNode.importanceScore != null && (
                <p className={`text-[10px] font-['Space_Grotesk'] ${graphTheme === "night" ? "text-[#cabdb1]" : "text-[#686868]"}`}>
                  Importance: {hoveredNode.importanceScore.toFixed(2)}
                </p>
              )}
              {hoveredNode.strength != null && (
                <p className={`text-[10px] font-['Space_Grotesk'] ${graphTheme === "night" ? "text-[#cabdb1]" : "text-[#686868]"}`}>
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
                  onSelectNode={() => { /* node-select side panel not yet wired */ }}
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
