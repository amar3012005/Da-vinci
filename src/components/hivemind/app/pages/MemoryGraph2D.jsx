// Memory Graph 2D — high-fps canvas port of MemoryGraph 3D.
//
// Same data source, same monochromatic palette, same physics philosophy
// (real edges only — no synthetic connections). Built on ForceGraph2D so
// it stays smooth past 500 nodes where the 3D path stutters.
//
// Performance moves:
//   • Custom nodeCanvasObject — single arc per node, label LOD by zoom
//   • Custom linkCanvasObject for sub-pixel edges + perspective labels
//   • Cooldown ticks tuned so layout settles fast then sleeps
//
// Spatial spread (vs 3D):
//   • Strong charge repulsion + collision radius so nodes don't clump
//   • Link distance scaled by cluster relationship → unrelated nodes drift
//   • Centering force is WEAK so layout spreads across the canvas
//
// Theme:
//   • Day = ink on warm paper, Night = cosmic mono (deep black, light dust)
//   • Toggle is graph-only. Persisted to localStorage.

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { motion } from "framer-motion";
import { Network, RefreshCw, ZoomIn, ZoomOut, Crosshair, Sun, Moon, Filter, Check } from "lucide-react";
import apiClient from "../shared/api-client";
import { useAuth } from "../auth/AuthProvider";

// ─── Monochrome theme palettes (mirrors MemoryGraph3D) ────────────────────
const THEMES = {
  day: {
    name: "day",
    bgPage:
      "radial-gradient(circle at 18% 22%, rgba(10,10,10,0.04) 0%, rgba(255,255,255,0) 32%)," +
      "radial-gradient(circle at 80% 24%, rgba(10,10,10,0.03) 0%, rgba(255,255,255,0) 30%)," +
      "radial-gradient(circle at 56% 78%, rgba(10,10,10,0.05) 0%, rgba(255,255,255,0) 38%)," +
      "linear-gradient(180deg, rgba(252,251,247,1) 0%, rgba(244,241,234,1) 100%)",
    canvasBg: "rgba(0,0,0,0)",
    nodeAccent: "#0a0a0a",
    nodeBase: "#3a3a3a",
    linkBase: "#2a2a2a",
    label: "#0a0a0a",
    labelDim: "#525252",
    edgeLabelBg: "rgba(255,255,255,0.92)",
    edgeLabelBorder: "rgba(0,0,0,0.10)",
    panelBg: "bg-white/88",
    panelBorder: "border-[#e3e0db]",
    panelText: "text-[#525252]",
    panelMuted: "text-[#8b857d]",
  },
  night: {
    name: "night",
    bgPage:
      "radial-gradient(circle at 22% 26%, rgba(255,255,255,0.045) 0%, rgba(0,0,0,0) 36%)," +
      "radial-gradient(circle at 78% 70%, rgba(255,255,255,0.035) 0%, rgba(0,0,0,0) 38%)," +
      "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 100%)," +
      "linear-gradient(180deg, #07080b 0%, #04050a 100%)",
    canvasBg: "rgba(0,0,0,0)",
    nodeAccent: "#ffffff",
    nodeBase: "#c8c4bc",
    linkBase: "#9a958d",
    label: "#f4f1ea",
    labelDim: "#9a958d",
    edgeLabelBg: "rgba(8,9,12,0.86)",
    edgeLabelBorder: "rgba(255,255,255,0.14)",
    panelBg: "bg-white/[0.04]",
    panelBorder: "border-white/10",
    panelText: "text-[#c8c4bc]",
    panelMuted: "text-[#a3a3a3]",
  },
};

// ─── Per-relation visual weight (matches 3D) ─────────────────────────────
const RELATION_WEIGHTS = {
  Updates:     { weight: 0.30, width: 1.4, opacity: 0.80 },
  Extends:     { weight: 0.45, width: 1.2, opacity: 0.72 },
  Derives:     { weight: 0.40, width: 1.3, opacity: 0.75 },
  Contradicts: { weight: 0.20, width: 1.4, opacity: 0.80 },
  Supports:    { weight: 0.55, width: 1.1, opacity: 0.65 },
  References:  { weight: 0.70, width: 1.0, opacity: 0.55 },
  default:     { weight: 0.70, width: 1.0, opacity: 0.55 },
};

// ─── Operator-keyed edge styling (overrides mono palette) ────────────────
// Per user spec:
//   Updates    = dashed blue  (evolution / mutation)
//   Extends    = solid green  (deepening)
//   Derives    = solid purple (inference / synthesis)
//   Contradicts= solid red    (conflict)
//   Supports   = solid emerald (corroboration)
//   References = thin gray    (mention only)
// Color overrides are theme-aware via mixHex against the active accent so
// they still read well on the black night canvas.
const EDGE_OPERATOR_STYLE = {
  Updates:     { color: "#117dff", dash: [6, 4], width: 1.6 },
  Extends:     { color: "#16a34a", dash: null,    width: 1.4 },
  Derives:     { color: "#8b5cf6", dash: null,    width: 1.4 },
  Contradicts: { color: "#dc2626", dash: [3, 3],  width: 1.6 },
  Supports:    { color: "#059669", dash: null,    width: 1.2 },
  References:  { color: "#9ca3af", dash: [1, 3],  width: 0.9 },
  default:     { color: null,      dash: null,    width: 1.0 },
};

// ─── Per-node fact-type styling (overrides mono palette) ────────────────
// Per user spec:
//   extracted-fact → green square w/ glow field
//   fact           → blue circle w/ glow field
// Detection priority: tags array first, then memory_type, then nodeLayer.
function getFactKind(node) {
  const tags = node?.tags || [];
  const tagSet = new Set(tags.map((t) => String(t).toLowerCase()));
  if (tagSet.has("extracted-fact") || tagSet.has("fact-extracted")) return "extracted-fact";
  const mt = String(node?.memory_type || node?.nodeLayer || "").toLowerCase();
  if (mt === "fact_extracted") return "extracted-fact";
  if (mt === "fact" || mt === "fact_raw" || tagSet.has("fact")) return "fact";
  return null;
}

const FACT_STYLE = {
  "extracted-fact": {
    shape: "square",
    fill:   "#16a34a", // green-600
    glow:   "rgba(22,163,74,0.30)",
    border: "#15803d",
  },
  fact: {
    shape: "circle",
    fill:   "#117dff", // hive blue
    glow:   "rgba(17,125,255,0.30)",
    border: "#0066e0",
  },
};

function mixHex(a, b, t) {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ar = parseInt(pa.slice(0, 2), 16);
  const ag = parseInt(pa.slice(2, 4), 16);
  const ab = parseInt(pa.slice(4, 6), 16);
  const br = parseInt(pb.slice(0, 2), 16);
  const bg = parseInt(pb.slice(2, 4), 16);
  const bb = parseInt(pb.slice(4, 6), 16);
  return `#${Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0")}${
    Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0")}${
    Math.round(ab + (bb - ab) * t).toString(16).padStart(2, "0")}`;
}

// ─── Per-node luminance weight by type ───────────────────────────────────
const TYPE_WEIGHTS = {
  fact: 0.55,
  decision: 0.10,
  preference: 0.70,
  goal: 0.40,
  lesson: 0.55,
  event: 0.75,
  relationship: 0.35,
  default: 0.55,
};

function getNodeType(node) {
  const raw = (node?.memory_type || node?.type || node?.nodeLayer || "default").toString().toLowerCase();
  if (raw.includes("fact")) return "fact";
  if (raw.includes("decision")) return "decision";
  if (raw.includes("preference")) return "preference";
  if (raw.includes("goal")) return "goal";
  if (raw.includes("lesson")) return "lesson";
  if (raw.includes("event")) return "event";
  if (raw.includes("relationship")) return "relationship";
  return "default";
}

function getNodeRadius(node) {
  const importance = Number.isFinite(node?.importanceScore) ? node.importanceScore : 0.4;
  const recall = Number.isFinite(node?.recallCount) ? Math.min(node.recallCount / 12, 1) : 0;
  const base = 3.4 + importance * 4 + recall * 2.4;
  if (node?.clusterRole === "hub") return base * 1.18;
  if (node?.clusterRole === "bridge") return base * 0.92;
  return Math.max(2.4, base);
}

// ─── Source classification ───────────────────────────────────────────────
// Bucket every node into a human-readable source category. Used by the
// Sources dropdown filter so users can hide/show Gmail / Drive / Calendar
// / Knowledge Base etc. independently.
const SOURCE_LABELS = {
  gmail: "Gmail",
  google_drive: "Drive",
  google_calendar: "Calendar",
  google_docs: "Docs",
  google_sheets: "Sheets",
  google_slides: "Slides",
  google_contacts: "Contacts",
  google_chat: "Google Chat",
  google_tasks: "Tasks",
  google_forms: "Forms",
  slack: "Slack",
  notion: "Notion",
  github: "GitHub",
  knowledge: "Company Information",
  knowledge_base: "Company Information",
  document: "Company Information",
  chat: "Talk to HIVE",
  "talk-to-hive": "Talk to HIVE",
  hivemind: "Manual notes",
  other: "Other",
};

function getNodeSource(node) {
  const sp = node?.source_metadata?.source_platform || node?.source_platform || node?.metadata?.source_platform;
  if (sp) {
    const k = String(sp).toLowerCase();
    if (SOURCE_LABELS[k]) return k;
  }
  const tags = node?.tags || [];
  const tagSet = new Set(tags.map((t) => String(t).toLowerCase()));
  if (tagSet.has("gmail") || tagSet.has("gmail_thread") || tagSet.has("gmail-thread")) return "gmail";
  if (tagSet.has("google_drive") || tagSet.has("drive")) return "google_drive";
  if (tagSet.has("google_calendar") || tagSet.has("calendar")) return "google_calendar";
  if (tagSet.has("google_docs") || tagSet.has("docs")) return "google_docs";
  if (tagSet.has("slack")) return "slack";
  if (tagSet.has("notion")) return "notion";
  if (tagSet.has("github")) return "github";
  if (tagSet.has("knowledge-base") || tagSet.has("document-summary") || tagSet.has("schema-record")) return "knowledge";
  if (tagSet.has("talk-to-hive") || tagSet.has("chat")) return "chat";
  if (tagSet.has("hivemind") || tagSet.has("manual")) return "hivemind";
  return "other";
}

// ─── Normalize backend payload → ForceGraph2D format ─────────────────────
function normalizeGraphPayload(nodes = [], edges = []) {
  const nodeMap = new Map();
  const out = nodes.map((n) => {
    const node = {
      ...n,
      id: n.id,
      val: Math.max(2, (n.importanceScore || 0.5) * 8 + (n.recallCount || 0) * 0.5),
    };
    nodeMap.set(node.id, node);
    return node;
  });
  // Only forward edges where BOTH endpoints exist as nodes.
  // No synthetic edges anywhere.
  const links = edges
    .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type || "References",
      confidence: Number.isFinite(e.confidence) ? e.confidence : 1,
    }));
  return { nodes: out, links };
}

// ─── Component ────────────────────────────────────────────────────────────
export default function MemoryGraph2D() {
  // eslint-disable-next-line no-unused-vars
  const { user: _user } = useAuth();
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [scope] = useState("personal");
  const [nodeLimit, setNodeLimit] = useState(() => {
    try {
      const v = localStorage.getItem("hm-graph2d-limit");
      return v === null ? 1000 : Number(v);
    } catch {
      return 1000;
    }
  });
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("hm-graph2d-theme") || "day"; } catch { return "day"; }
  });
  const palette = THEMES[theme];
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  // Sources filter: set of source keys to HIDE. Persisted to localStorage.
  const [hiddenSources, setHiddenSources] = useState(() => {
    try {
      const raw = localStorage.getItem("hm-graph2d-hidden-sources");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });
  const [sourcesOpen, setSourcesOpen] = useState(false);
  useEffect(() => {
    try { localStorage.setItem("hm-graph2d-hidden-sources", JSON.stringify([...hiddenSources])); } catch { /* */ }
  }, [hiddenSources]);

  // Persist user prefs
  useEffect(() => {
    try { localStorage.setItem("hm-graph2d-theme", theme); } catch { /* */ }
  }, [theme]);
  useEffect(() => {
    try { localStorage.setItem("hm-graph2d-limit", String(nodeLimit)); } catch { /* */ }
  }, [nodeLimit]);

  // Responsive sizing
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Fetch graph
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getGraph({
        limit: nodeLimit || 0,
        scope,
      });
      const { nodes, links } = normalizeGraphPayload(data.nodes || [], data.edges || []);
      setGraphData({ nodes, links });
    } catch (e) {
      setError(e?.message || "Failed to load graph");
    } finally {
      setLoading(false);
    }
  }, [nodeLimit, scope]);

  useEffect(() => { refetch(); }, [refetch]);

  // Source counts (for dropdown badges) + filtered view.
  const sourceCounts = useMemo(() => {
    const counts = new Map();
    for (const n of graphData.nodes) {
      const k = getNodeSource(n);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return counts;
  }, [graphData.nodes]);

  const visibleGraph = useMemo(() => {
    if (hiddenSources.size === 0) return graphData;
    const visibleIds = new Set();
    const nodes = graphData.nodes.filter((n) => {
      const k = getNodeSource(n);
      const ok = !hiddenSources.has(k);
      if (ok) visibleIds.add(n.id);
      return ok;
    });
    // Keep edges where both endpoints visible
    const links = graphData.links.filter((l) => {
      const sId = typeof l.source === "object" ? l.source?.id : l.source;
      const tId = typeof l.target === "object" ? l.target?.id : l.target;
      return visibleIds.has(sId) && visibleIds.has(tId);
    });
    return { nodes, links };
  }, [graphData, hiddenSources]);

  // ─── Physics tuning ──────────────────────────────────────────────────
  // Spread nodes spatially: strong repulsion, weak center, collision so
  // labels don't overlap. Only REAL edges contribute attraction.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !graphData.nodes.length) return;
    const charge = fg.d3Force("charge");
    if (charge) {
      charge.strength((node) => {
        const v = Number.isFinite(node?.val) ? node.val : 4;
        return -120 - v * 9;
      });
      charge.distanceMax?.(800);
      charge.theta?.(0.85);
    }
    const link = fg.d3Force("link");
    if (link) {
      link.distance((edge) => {
        const sameCluster = edge.source?.clusterId && edge.source.clusterId === edge.target?.clusterId;
        return sameCluster ? 38 : 110;
      });
      link.strength((edge) => {
        const conf = Number.isFinite(edge.confidence) ? edge.confidence : 0.6;
        const sameCluster = edge.source?.clusterId && edge.source.clusterId === edge.target?.clusterId;
        return (sameCluster ? 0.55 : 0.10) * conf;
      });
    }
    const center = fg.d3Force("center");
    if (center && typeof center.strength === "function") {
      try { center.strength(0.04); } catch { /* ignore */ }
    }
    fg.d3ReheatSimulation?.();
  }, [graphData]);

  // ─── Render helpers ──────────────────────────────────────────────────
  const getNodeColor = useCallback((node) => {
    const type = getNodeType(node);
    const w = TYPE_WEIGHTS[type] ?? TYPE_WEIGHTS.default;
    const base = mixHex(palette.nodeBase, palette.nodeAccent, 1 - w);
    if (selectedNode?.id === node.id) return palette.nodeAccent;
    if (hoveredNode?.id === node.id) return palette.nodeAccent;
    return base;
  }, [palette, selectedNode, hoveredNode]);

  const getLinkColor = useCallback((link) => {
    const style = RELATION_WEIGHTS[link?.type] || RELATION_WEIGHTS.default;
    const sId = typeof link.source === "object" ? link.source?.id : link.source;
    const tId = typeof link.target === "object" ? link.target?.id : link.target;
    const focused = selectedNode && (sId === selectedNode.id || tId === selectedNode.id);
    if (focused) return palette.nodeAccent;
    return mixHex(palette.linkBase, palette.nodeAccent, 1 - style.weight);
  }, [palette, selectedNode]);

  // Custom node paint
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    const r = getNodeRadius(node);
    const factKind = getFactKind(node);

    if (factKind) {
      // ── Fact-type node: shape + colored glow field ──
      const style = FACT_STYLE[factKind];
      // Glow halo (radial gradient via stacked translucent fills)
      const glowR = r * 2.6;
      ctx.save();
      const grad = ctx.createRadialGradient(node.x, node.y, r * 0.6, node.x, node.y, glowR);
      grad.addColorStop(0, style.glow);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(node.x - glowR, node.y - glowR, glowR * 2, glowR * 2);
      ctx.restore();

      // Body
      if (style.shape === "square") {
        const s = r * 1.8;
        ctx.fillStyle = style.fill;
        ctx.strokeStyle = style.border;
        ctx.lineWidth = 1.2 / globalScale;
        ctx.beginPath();
        ctx.rect(node.x - s / 2, node.y - s / 2, s, s);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = style.fill;
        ctx.strokeStyle = style.border;
        ctx.lineWidth = 1.2 / globalScale;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      // ── Mono node (existing palette) ──
      const color = getNodeColor(node);
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (node.clusterRole === "hub") {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 0.9 / globalScale;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    if (selectedNode?.id === node.id) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 4 / globalScale, 0, Math.PI * 2);
      ctx.strokeStyle = palette.nodeAccent;
      ctx.lineWidth = 1.4 / globalScale;
      ctx.stroke();
    }
    // Label LOD
    const showLabel =
      globalScale > 1.6 ||
      selectedNode?.id === node.id ||
      hoveredNode?.id === node.id ||
      node.clusterRole === "hub";
    if (!showLabel) return;
    const text = (node.title || node.label || "").slice(0, 36);
    if (!text) return;
    const fontSize = Math.max(9, 12 / globalScale);
    ctx.font = `600 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = palette.label;
    ctx.fillText(text, node.x, node.y + r + 2);
  }, [getNodeColor, palette, selectedNode, hoveredNode]);

  // Custom link paint
  const linkCanvasObject = useCallback((link, ctx, globalScale) => {
    const s = link.source;
    const t = link.target;
    if (!s || !t || !Number.isFinite(s.x) || !Number.isFinite(t.x) ||
        !Number.isFinite(s.y) || !Number.isFinite(t.y)) return;
    const style = RELATION_WEIGHTS[link?.type] || RELATION_WEIGHTS.default;
    const op = EDGE_OPERATOR_STYLE[link?.type] || EDGE_OPERATOR_STYLE.default;
    const focused = selectedNode && (s.id === selectedNode.id || t.id === selectedNode.id);

    ctx.save();
    if (op.dash) {
      // Dash scaled by zoom so pattern stays visually consistent.
      const k = Math.max(0.5, 1 / Math.max(0.5, globalScale * 0.7));
      ctx.setLineDash(op.dash.map((d) => d * k));
    }
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    // Operator color overrides mono palette when defined; falls back to
    // theme-aware mixHex for unknown types (or 'default' bucket).
    ctx.strokeStyle = op.color || getLinkColor(link);
    ctx.globalAlpha = focused ? 1 : style.opacity;
    ctx.lineWidth = ((focused ? op.width * 1.3 : op.width) || style.width) / Math.max(1, globalScale * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();
    // Perspective label
    if (globalScale < 2.0 && !focused) return;
    const type = link.type || "Relates";
    const conf = Number.isFinite(link.confidence) ? `${Math.round(link.confidence * 100)}%` : "";
    const text = conf ? `${type} ${conf}` : type;
    const fontSize = Math.max(8, 10 / globalScale);
    ctx.font = `600 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
    const mx = (s.x + t.x) / 2;
    const my = (s.y + t.y) / 2;
    const w = ctx.measureText(text).width;
    const padX = 5 / globalScale;
    const padY = 3 / globalScale;
    const rectH = fontSize + padY * 2;
    ctx.fillStyle = palette.edgeLabelBg;
    ctx.strokeStyle = palette.edgeLabelBorder;
    ctx.lineWidth = 0.6 / globalScale;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(mx - w / 2 - padX, my - rectH / 2, w + padX * 2, rectH, rectH / 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(mx - w / 2 - padX, my - rectH / 2, w + padX * 2, rectH);
      ctx.strokeRect(mx - w / 2 - padX, my - rectH / 2, w + padX * 2, rectH);
    }
    ctx.fillStyle = palette.label;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, mx, my);
  }, [getLinkColor, palette, selectedNode]);

  const handleZoom = useCallback((delta) => {
    const fg = fgRef.current;
    if (!fg) return;
    const next = Math.max(0.2, Math.min(8, zoomLevel * (delta > 0 ? 1.4 : 1 / 1.4)));
    fg.zoom(next, 400);
    setZoomLevel(next);
  }, [zoomLevel]);

  const handleCenter = useCallback(() => {
    fgRef.current?.zoomToFit?.(600, 80);
  }, []);

  const tooltipForNode = useMemo(() => (node) =>
    `<div style="padding:6px 9px;border-radius:8px;background:${palette.edgeLabelBg};border:1px solid ${palette.edgeLabelBorder};color:${palette.label};font-family:'Space Grotesk',sans-serif;font-size:11px;max-width:280px;backdrop-filter:blur(8px);">
      <div style="font-weight:600;margin-bottom:2px;">${String(node.title || node.label || "Untitled").replace(/</g, "&lt;")}</div>
      ${node.memory_type ? `<div style="font-size:9px;font-family:monospace;text-transform:uppercase;letter-spacing:0.1em;color:${palette.labelDim};">${node.memory_type}</div>` : ""}
    </div>`,
  [palette]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: palette.bgPage }}>
      {/* Top bar */}
      <div className={`shrink-0 mx-3 mt-3 rounded-2xl border ${palette.panelBorder} ${palette.panelBg} backdrop-blur-xl px-4 py-3 flex items-center gap-3 z-10 shadow-[0_10px_30px_rgba(0,0,0,0.06)]`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === "night" ? "bg-white/10" : "bg-[#117dff]/10"}`}>
          <Network size={16} className={theme === "night" ? "text-white" : "text-[#117dff]"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-semibold font-['Space_Grotesk'] ${theme === "night" ? "text-white" : "text-[#0a0a0a]"}`}>
            Memory Graph · 2D
          </p>
          <p className={`text-[10px] font-mono uppercase tracking-[0.12em] ${palette.panelMuted}`}>
            {graphData.nodes.length} nodes · {graphData.links.length} edges
          </p>
        </div>
        {/* Node limit pills */}
        <div className={`flex items-center gap-1 rounded-xl border ${palette.panelBorder} ${theme === "night" ? "bg-white/[0.04]" : "bg-[#faf9f4]"} p-1`}>
          {[
            { k: 500, label: "500" },
            { k: 1000, label: "1K" },
            { k: 5000, label: "5K" },
            { k: 0, label: "All" },
          ].map((o) => (
            <button
              key={o.k}
              onClick={() => setNodeLimit(o.k)}
              className={`rounded-lg px-2 py-1 text-[10px] font-mono uppercase tracking-[0.08em] transition-colors ${
                nodeLimit === o.k
                  ? (theme === "night" ? "bg-white/15 text-white" : "bg-[#117dff]/10 text-[#117dff]")
                  : (theme === "night" ? "text-[#9a958d] hover:text-white" : "text-[#737373] hover:text-[#525252]")
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {/* Sources dropdown filter */}
        <div className="relative">
          <button
            onClick={() => setSourcesOpen((o) => !o)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.08em] transition-colors ${
              theme === "night"
                ? "border-white/15 bg-white/[0.06] text-[#f4f1ea] hover:bg-white/[0.10]"
                : "border-[#e3e0db] bg-[#faf9f4] text-[#525252] hover:bg-[#f3f1ec]"
            }`}
            title="Filter by source"
            aria-label="Sources filter"
          >
            <Filter size={11} />
            Sources
            {hiddenSources.size > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${theme === "night" ? "bg-white/15 text-white" : "bg-[#117dff]/10 text-[#117dff]"}`}>
                −{hiddenSources.size}
              </span>
            )}
          </button>
          {sourcesOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setSourcesOpen(false)} />
              <div className={`absolute right-0 top-full mt-1.5 z-30 w-[240px] rounded-xl border ${palette.panelBorder} ${theme === "night" ? "bg-[#0a0c10]/95" : "bg-white"} backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] p-1.5 max-h-[60vh] overflow-y-auto`}>
                <div className={`px-2 py-1 text-[9px] font-mono uppercase tracking-[0.12em] ${palette.panelMuted} flex items-center justify-between`}>
                  <span>Toggle sources</span>
                  {hiddenSources.size > 0 && (
                    <button
                      onClick={() => setHiddenSources(new Set())}
                      className={`text-[9px] font-mono uppercase ${theme === "night" ? "text-[#9a958d] hover:text-white" : "text-[#737373] hover:text-[#117dff]"}`}
                    >
                      Show all
                    </button>
                  )}
                </div>
                {[...sourceCounts.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, count]) => {
                    const hidden = hiddenSources.has(key);
                    const label = SOURCE_LABELS[key] || key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setHiddenSources((prev) => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          });
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-['Space_Grotesk'] transition-colors ${
                          theme === "night"
                            ? "text-[#c8c4bc] hover:bg-white/10"
                            : "text-[#0a0a0a] hover:bg-[#f3f1ec]"
                        } ${hidden ? "opacity-50" : ""}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          hidden
                            ? (theme === "night" ? "border-white/20" : "border-[#e3e0db]")
                            : (theme === "night" ? "border-white bg-white" : "border-[#117dff] bg-[#117dff]")
                        }`}>
                          {!hidden && <Check size={9} className={theme === "night" ? "text-[#0a0c10]" : "text-white"} strokeWidth={3} />}
                        </span>
                        <span className="flex-1 text-left truncate">{label}</span>
                        <span className={`text-[10px] font-mono ${palette.panelMuted}`}>{count}</span>
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </div>
        {/* Day/Night toggle */}
        <button
          onClick={() => setTheme((t) => (t === "day" ? "night" : "day"))}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.08em] transition-colors ${
            theme === "night"
              ? "border-white/15 bg-white/[0.06] text-[#f4f1ea] hover:bg-white/[0.10]"
              : "border-[#e3e0db] bg-[#faf9f4] text-[#525252] hover:bg-[#f3f1ec]"
          }`}
          aria-label="Toggle graph theme"
          title={theme === "night" ? "Switch to Day" : "Switch to Night (cosmic)"}
        >
          {theme === "night" ? <Moon size={11} /> : <Sun size={11} />}
          {theme === "night" ? "Night" : "Day"}
        </button>
        <button
          onClick={refetch}
          className={`p-2 rounded-lg border ${palette.panelBorder} ${theme === "night" ? "bg-white/[0.04] text-[#c8c4bc] hover:bg-white/[0.08]" : "bg-[#faf9f4] text-[#525252] hover:bg-[#f3f1ec]"} transition-colors`}
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative">
        {loading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${theme === "night" ? "border-white" : "border-[#117dff]"}`} />
              <span className={`text-xs font-['Space_Grotesk'] ${palette.panelMuted}`}>
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
        {!loading && graphData.nodes.length === 0 && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Network size={32} className={`mx-auto mb-3 ${theme === "night" ? "text-white/20" : "text-[#e3e0db]"}`} />
              <p className={`text-sm font-['Space_Grotesk'] ${palette.panelMuted}`}>
                No memories yet — save some to see the graph.
              </p>
            </div>
          </div>
        )}
        {graphData.nodes.length > 0 && (
          <ForceGraph2D
            ref={fgRef}
            graphData={visibleGraph}
            width={dims.w}
            height={dims.h}
            backgroundColor={palette.canvasBg}
            // Performance
            cooldownTicks={120}
            cooldownTime={4500}
            warmupTicks={20}
            d3AlphaDecay={0.025}
            d3VelocityDecay={0.32}
            // Render
            nodeCanvasObject={nodeCanvasObject}
            nodeCanvasObjectMode={() => "replace"}
            linkCanvasObject={linkCanvasObject}
            linkCanvasObjectMode={() => "replace"}
            nodePointerAreaPaint={(node, color, ctx) => {
              const r = getNodeRadius(node) + 4;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
              ctx.fill();
            }}
            // Interactions
            onNodeClick={(node) => setSelectedNode(node)}
            onNodeHover={(node) => setHoveredNode(node)}
            onBackgroundClick={() => setSelectedNode(null)}
            onZoom={({ k }) => setZoomLevel(k)}
            enableNodeDrag
            enableZoomInteraction
            enablePanInteraction
            nodeLabel={tooltipForNode}
          />
        )}

        {/* Zoom controls */}
        <div className={`absolute bottom-4 right-4 flex flex-col gap-1.5 rounded-xl border ${palette.panelBorder} ${palette.panelBg} p-1 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)]`}>
          <button onClick={() => handleZoom(1)} className={`p-2 rounded-lg ${theme === "night" ? "text-[#c8c4bc] hover:bg-white/10" : "text-[#525252] hover:bg-[#f3f1ec]"}`} title="Zoom in">
            <ZoomIn size={13} />
          </button>
          <button onClick={() => handleZoom(-1)} className={`p-2 rounded-lg ${theme === "night" ? "text-[#c8c4bc] hover:bg-white/10" : "text-[#525252] hover:bg-[#f3f1ec]"}`} title="Zoom out">
            <ZoomOut size={13} />
          </button>
          <button onClick={handleCenter} className={`p-2 rounded-lg ${theme === "night" ? "text-[#c8c4bc] hover:bg-white/10" : "text-[#525252] hover:bg-[#f3f1ec]"}`} title="Fit to screen">
            <Crosshair size={13} />
          </button>
        </div>

        {/* Selected node card */}
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`absolute top-4 left-4 z-10 w-[300px] rounded-2xl border ${palette.panelBorder} ${palette.panelBg} backdrop-blur-xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.10)]`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className={`text-[10px] font-mono uppercase tracking-[0.12em] ${palette.panelMuted}`}>
                  {selectedNode.memory_type || "memory"}
                </p>
                <p className={`text-[13px] font-semibold font-['Space_Grotesk'] mt-0.5 ${theme === "night" ? "text-white" : "text-[#0a0a0a]"}`}>
                  {selectedNode.title || selectedNode.label || "Untitled"}
                </p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className={`p-1 rounded ${theme === "night" ? "text-[#9a958d] hover:bg-white/10" : "text-[#a3a3a3] hover:bg-[#f3f1ec]"}`}
              >
                ✕
              </button>
            </div>
            {selectedNode.content && (
              <p className={`text-[11.5px] leading-relaxed font-['Space_Grotesk'] ${palette.panelText} line-clamp-6`}>
                {String(selectedNode.content).slice(0, 400)}
              </p>
            )}
            <div className={`mt-3 flex flex-wrap gap-1.5 text-[9px] font-mono uppercase tracking-[0.08em] ${palette.panelMuted}`}>
              {Number.isFinite(selectedNode.importanceScore) && (
                <span className={`px-1.5 py-0.5 rounded ${theme === "night" ? "bg-white/10" : "bg-[#faf9f4]"}`}>
                  importance {(selectedNode.importanceScore * 100).toFixed(0)}%
                </span>
              )}
              {Number.isFinite(selectedNode.recallCount) && (
                <span className={`px-1.5 py-0.5 rounded ${theme === "night" ? "bg-white/10" : "bg-[#faf9f4]"}`}>
                  recall {selectedNode.recallCount}
                </span>
              )}
              {selectedNode.clusterRole && (
                <span className={`px-1.5 py-0.5 rounded ${theme === "night" ? "bg-white/10" : "bg-[#faf9f4]"}`}>
                  {selectedNode.clusterRole}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
