import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import ForceGraph3D from "3d-force-graph";
import * as THREE from "three";

const DEFAULT_BG = "rgba(0,0,0,0)";

// ─── Memory atlas theme system ─────────────────────────────────────────────
// One visual language in both modes: coral edges/nodes, cream secondary
// particles, black relationship tags, and amber "board" labels for documents.
// Day keeps the same network language on warm paper instead of switching blue.
const THEMES = {
  atlas: {
    name: "atlas",
    bg: "#15120f",
    sceneClear: "#15120f",
    label: "#f6eee5",
    labelDim: "#9f978f",
    edgeLabelBg: "rgba(4,4,4,0.94)",
    edgeLabelBorder: "rgba(255,118,104,0.32)",
    nodeAccent: "#ff514c",
    nodeBase: "#ead8ca",
    nodeMuted: "#403b36",
    nodeShell: "#332a27",
    linkBase: "#e9b1a4",
    linkDim: "#4a4741",
    particle: "#ff675f",
    boardBg: "#d99a1a",
    boardFg: "#17100a",
    tagBg: "rgba(4,4,4,0.94)",
    tagFg: "#fff0e4",
    tagBorder: "rgba(255,239,224,0.16)",
    haloOpacity: 0.11,
  },
  day: {
    name: "day",
    bg: "#e8dece",
    sceneClear: "#e8dece",
    label: "#fff3e7",
    labelDim: "#b9aa9b",
    edgeLabelBg: "rgba(5,5,5,0.9)",
    edgeLabelBorder: "rgba(204,75,68,0.28)",
    nodeAccent: "#e94f48",
    nodeBase: "#3f352f",
    nodeMuted: "#a69a8d",
    nodeShell: "#f5d5c8",
    linkBase: "#c83f3a",
    linkDim: "#b8aa9c",
    particle: "#ef574e",
    boardBg: "#d99a1a",
    boardFg: "#17100a",
    tagBg: "rgba(8,7,6,0.9)",
    tagFg: "#fff2e4",
    tagBorder: "rgba(210,82,75,0.24)",
    haloOpacity: 0.075,
  },
  night: {
    name: "night",
    bg: "#15120f",
    sceneClear: "#15120f",
    label: "#f4f1ea",
    labelDim: "#9a958d",
    edgeLabelBg: "rgba(4,4,4,0.94)",
    edgeLabelBorder: "rgba(255,118,104,0.32)",
    nodeAccent: "#ff514c",
    nodeBase: "#ead8ca",
    nodeMuted: "#4a4640",
    nodeShell: "#1a1c20",
    linkBase: "#e9b1a4",
    linkDim: "#3a3a3a",
    particle: "#ff675f",
    boardBg: "#d99a1a",
    boardFg: "#17100a",
    tagBg: "rgba(4,4,4,0.94)",
    tagFg: "#fff0e4",
    tagBorder: "rgba(255,239,224,0.16)",
    haloOpacity: 0.10,
  },
};

// Type-driven node luminance — applied as a SHADE of theme.nodeBase. We pick
// `relativeWeight` per type (0 = darkest/light side, 1 = lightest/dark side)
// and let buildNodeColor() blend toward theme.nodeAccent.
const TYPE_WEIGHTS = {
  fact: 0.55,
  fact_raw: 0.65,
  fact_extracted: 0.30,
  decision: 0.10,        // important = closer to accent
  preference: 0.70,
  goal: 0.40,
  lesson: 0.55,
  event: 0.75,
  relationship: 0.35,
  default: 0.55,
};

// Relation styling — width/particles unchanged; color resolved from theme.
const RELATION_WEIGHTS = {
  Updates:     { weight: 0.30, width: 0.18, particles: 5, opacity: 0.16, dashScale: 1.35 },
  Extends:     { weight: 0.45, width: 0.17, particles: 5, opacity: 0.14, dashScale: 1.25 },
  Derives:     { weight: 0.40, width: 0.17, particles: 6, opacity: 0.15, dashScale: 1.45 },
  Contradicts: { weight: 0.20, width: 0.16, particles: 4, opacity: 0.13, dashScale: 1.25 },
  Supports:    { weight: 0.55, width: 0.16, particles: 4, opacity: 0.12, dashScale: 1.2  },
  References:  { weight: 0.70, width: 0.15, particles: 4, opacity: 0.10, dashScale: 1.15 },
  default:     { weight: 0.70, width: 0.15, particles: 4, opacity: 0.10, dashScale: 1.15 },
};

// ─── Persistent on-edge label sprites ──────────────────────────────────────
// Cached CanvasTexture per (type|confidence|theme) — re-used across all
// links sharing the same label. Opacity is driven by camera distance via
// updateLinkLabelOpacity (called from linkPositionUpdate) so labels only
// surface when the user zooms in close. No labels at far zoom = no noise.
const labelTextureCache = new Map();
function getLabelTexture(type, confidence, themeName) {
  const key = `${type}|${confidence ?? "-"}|${themeName}`;
  if (labelTextureCache.has(key)) return labelTextureCache.get(key);
  const t = THEMES[themeName] || THEMES.day;
  const dpr = 2;
  const fontSize = 22 * dpr;
  const confFontSize = 18 * dpr;
  const padX = 14 * dpr;
  const padY = 8 * dpr;
  const gap = 6 * dpr;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `600 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  const typeW = ctx.measureText(type).width;
  ctx.font = `500 ${confFontSize}px "JetBrains Mono", monospace`;
  const confW = confidence ? ctx.measureText(confidence).width : 0;
  const totalW = typeW + (confidence ? gap + confW : 0);
  canvas.width = Math.ceil(totalW + padX * 2);
  canvas.height = Math.ceil(fontSize + padY * 2);
  const r = 2 * dpr;
  const typeColor = (() => {
    const lc = String(type).toLowerCase();
    if (lc === 'contradicts') return '#ff514c';
    if (lc === 'updates') return '#ff675f';
    if (lc === 'derived_from' || lc === 'derives') return '#f0d6c8';
    if (lc === 'extends') return '#f5c6ad';
    if (lc === 'supports') return '#f3dfcf';
    if (lc === 'mentions') return '#c6bbb0';
    if (lc === 'needs_revision') return t.boardBg;
    if (lc === 'peer_review') return '#9d9288';
    return '#e6d3c4';
  })();
  ctx.shadowColor = themeName === "day" ? "rgba(78,50,34,0.18)" : "rgba(0,0,0,0.44)";
  ctx.shadowBlur = 14 * dpr;
  ctx.shadowOffsetY = 4 * dpr;
  ctx.fillStyle = t.edgeLabelBg;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(canvas.width, 0, canvas.width, canvas.height, r);
  ctx.arcTo(canvas.width, canvas.height, 0, canvas.height, r);
  ctx.arcTo(0, canvas.height, 0, 0, r);
  ctx.arcTo(0, 0, canvas.width, 0, r);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = dpr;
  ctx.strokeStyle = t.edgeLabelBorder;
  ctx.stroke();
  ctx.fillStyle = typeColor;
  ctx.fillRect(0, 0, Math.max(3 * dpr, Math.min(5 * dpr, canvas.width * 0.08)), canvas.height);
  ctx.font = `600 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillStyle = t.label;
  ctx.textBaseline = "middle";
  ctx.fillText(type, padX, canvas.height / 2);
  if (confidence) {
    ctx.font = `500 ${confFontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = typeColor;
    ctx.fillText(confidence, padX + typeW + gap, canvas.height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const entry = { texture: tex, w: canvas.width / dpr, h: canvas.height / dpr };
  labelTextureCache.set(key, entry);
  return entry;
}

// ─── Persistent on-node labels ───────────────────────────────────────
// Full memory-title labels rendered as THREE sprites above nodes. They are
// camera-frustum ranked and screen-cell capped in the render loop so labels
// only appear inside the visible viewport and do not pile up when zoomed out.

const nodeTagTextureCache = new Map();

function truncateLabel(text, max = 74) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function splitLabelLines(text, maxChars = 32, maxLines = 2) {
  const words = truncateLabel(text).split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length > 0) {
    visible[visible.length - 1] = truncateLabel(visible[visible.length - 1], Math.max(10, maxChars - 1));
  }
  return visible.length ? visible : ["Untitled memory"];
}

function getNodeDisplayLabel(node) {
  const meta = node?.metadata || node?.source_metadata || {};
  return (
    node?.title ||
    node?.name ||
    node?.summary ||
    meta.title ||
    meta.name ||
    (typeof node?.content === "string" ? node.content : "") ||
    "Untitled memory"
  );
}

function isBoardNode(node) {
  if (!node) return false;
  const type = getNodeType(node);
  const meta = node.metadata || node.source_metadata || {};
  const source = String(node.sourcePlatform || node.source_platform || meta.platform || meta.source || "").toLowerCase();
  return (
    node.kind === "document" ||
    type === "document" ||
    type === "summary" ||
    source.includes("knowledge") ||
    source.includes("document")
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getNodeTagTexture(text, themeName, variant = "normal") {
  const key = `${themeName}:${variant}:${text}`;
  if (nodeTagTextureCache.has(key)) return nodeTagTextureCache.get(key);
  const t = (() => {
    if (variant.startsWith("board")) {
      if (variant === "boardSelected") return { bg: "#ffc44d", border: "rgba(255,236,172,0.78)", fg: "#160f07", shadow: "rgba(217,154,26,0.36)" };
      if (variant === "boardFocus") return { bg: "rgba(230,163,24,0.98)", border: "rgba(255,226,139,0.62)", fg: "#160f07", shadow: "rgba(217,154,26,0.3)" };
      return { bg: "rgba(219,151,19,0.98)", border: "rgba(255,220,120,0.52)", fg: "#160f07", shadow: "rgba(156,94,8,0.28)" };
    }
    if (themeName === "atlas") {
      if (variant === "selected") return { bg: "rgba(255,84,80,0.96)", border: "rgba(255,211,202,0.38)", fg: "#120c0b", shadow: "rgba(255,84,80,0.26)" };
      if (variant === "focus") return { bg: "rgba(4,4,4,0.94)", border: "rgba(255,115,105,0.34)", fg: "#fff2e8", shadow: "rgba(255,84,80,0.18)" };
      return { bg: "rgba(3,3,3,0.9)", border: "rgba(255,238,222,0.14)", fg: "#eee4d8", shadow: "rgba(0,0,0,0.38)" };
    }
    if (themeName === "night") {
      if (variant === "selected") return { bg: "rgba(255,84,80,0.96)", border: "rgba(255,211,202,0.38)", fg: "#120c0b", shadow: "rgba(255,84,80,0.26)" };
      if (variant === "focus") return { bg: "rgba(4,4,4,0.94)", border: "rgba(255,115,105,0.34)", fg: "#fff2e8", shadow: "rgba(255,84,80,0.18)" };
      return { bg: "rgba(3,3,3,0.9)", border: "rgba(255,238,222,0.14)", fg: "#eee4d8", shadow: "rgba(0,0,0,0.38)" };
    }
    if (variant === "selected") return { bg: "rgba(232,79,72,0.96)", border: "rgba(68,42,34,0.36)", fg: "#140c09", shadow: "rgba(156,59,48,0.24)" };
    if (variant === "focus") return { bg: "rgba(7,6,5,0.92)", border: "rgba(232,79,72,0.32)", fg: "#fff2e4", shadow: "rgba(68,42,34,0.16)" };
    return { bg: "rgba(8,7,6,0.86)", border: "rgba(232,79,72,0.18)", fg: "#fff2e4", shadow: "rgba(68,42,34,0.12)" };
  })();
  const dpr = typeof window !== "undefined" ? Math.max(1, Math.min(2.5, window.devicePixelRatio || 1)) : 1;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const isBoard = variant.startsWith("board");
  const fontSize = (variant === "selected" || variant === "boardSelected" ? 17 : isBoard ? 16 : 15) * dpr;
  const lineHeight = fontSize * 1.18;
  const padX = (isBoard ? 13 : 11) * dpr;
  const padY = (isBoard ? 8 : 7) * dpr;
  const lines = splitLabelLines(text, isBoard ? 30 : 32, isBoard ? 2 : 2);
  ctx.font = `${variant === "selected" || variant === "boardSelected" ? "700" : "620"} ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  const textW = Math.max(...lines.map((line) => ctx.measureText(line).width));
  canvas.width = Math.ceil(Math.min(Math.max(textW + padX * 2, (isBoard ? 132 : 96) * dpr), (isBoard ? 300 : 270) * dpr));
  canvas.height = Math.ceil(lines.length * lineHeight + padY * 2);
  const r = (isBoard ? 2 : 3) * dpr;
  ctx.shadowColor = t.shadow;
  ctx.shadowBlur = 18 * dpr;
  ctx.shadowOffsetY = 6 * dpr;
  ctx.fillStyle = t.bg;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(canvas.width, 0, canvas.width, canvas.height, r);
  ctx.arcTo(canvas.width, canvas.height, 0, canvas.height, r);
  ctx.arcTo(0, canvas.height, 0, 0, r);
  ctx.arcTo(0, 0, canvas.width, 0, r);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = dpr;
  ctx.strokeStyle = t.border;
  ctx.stroke();
  if (isBoard) {
    ctx.fillStyle = "rgba(20,13,7,0.3)";
    ctx.fillRect(0, 0, 5 * dpr, canvas.height);
  }
  ctx.font = `${variant === "selected" || variant === "boardSelected" ? "700" : "620"} ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillStyle = t.fg;
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    ctx.fillText(line, padX, padY + lineHeight * index + lineHeight / 2);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const entry = { texture: tex, w: canvas.width / dpr, h: canvas.height / dpr };
  nodeTagTextureCache.set(key, entry);
  return entry;
}

function makeNodeTagSprite(text, themeName, variant = "normal") {
  const { texture, w, h } = getNodeTagTexture(text, themeName, variant);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,            // updated each frame in render loop
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const scale = variant.startsWith("board") ? 0.2 : 0.14;
  sprite.scale.set(w * scale, h * scale, 1);
  sprite.renderOrder = 998;
  sprite.userData.nodeTag = text;
  sprite.userData.labelVariant = variant;
  return sprite;
}

function setNodeLabelSpriteVariant(sprite, variant, themeName) {
  if (!sprite?.material || sprite.userData.labelVariant === variant) return;
  const { texture, w, h } = getNodeTagTexture(sprite.userData.nodeTag, themeName, variant);
  sprite.material.map = texture;
  sprite.material.needsUpdate = true;
  const scale = variant === "selected" || variant === "boardSelected"
    ? 0.158
    : variant === "focus" || variant === "boardFocus"
      ? 0.148
      : variant === "board"
        ? 0.2
        : 0.14;
  sprite.scale.set(w * scale, h * scale, 1);
  sprite.userData.labelVariant = variant;
}

function makeLinkLabelSprite(link, themeName) {
  const type = link?.type || "Relates";
  const confidence = Number.isFinite(link?.confidence)
    ? `${Math.round(link.confidence * 100)}%`
    : null;
  const { texture, w, h } = getLabelTexture(type, confidence, themeName);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(w * 0.18, h * 0.18, 1);
  sprite.renderOrder = 999;
  sprite.userData.linkLabelMeta = { themeName, type, confidence };
  return sprite;
}

function mixHex(a, b, t) {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ar = parseInt(pa.slice(0, 2), 16);
  const ag = parseInt(pa.slice(2, 4), 16);
  const ab = parseInt(pa.slice(4, 6), 16);
  const br = parseInt(pb.slice(0, 2), 16);
  const bg = parseInt(pb.slice(2, 4), 16);
  const bb = parseInt(pb.slice(4, 6), 16);
  const mr = Math.round(ar + (br - ar) * t);
  const mg = Math.round(ag + (bg - ag) * t);
  const mb = Math.round(ab + (bb - ab) * t);
  return `#${mr.toString(16).padStart(2, "0")}${mg.toString(16).padStart(2, "0")}${mb.toString(16).padStart(2, "0")}`;
}

// Back-compat shims so the rest of the file that still references the old
// constants keeps building. Resolved at render time via theme-aware helpers.
const GRAPH_THEME = {
  mutedNode: THEMES.day.nodeMuted,
  mutedLink: THEMES.day.linkDim,
  accent: THEMES.day.nodeAccent,
  accentHover: "#36332d",
  shell: THEMES.day.nodeShell,
  halo: "#e9e2d6",
};
const TYPE_COLORS = Object.fromEntries(
  Object.entries(TYPE_WEIGHTS).map(([k, w]) => [k, mixHex(THEMES.day.nodeBase, THEMES.day.nodeAccent, 1 - w)]),
);
const RELATION_STYLES = Object.fromEntries(
  Object.entries(RELATION_WEIGHTS).map(([k, v]) => [
    k,
    { ...v, color: mixHex(THEMES.day.linkBase, THEMES.day.nodeAccent, 1 - v.weight) },
  ]),
);

const LABEL_LIMITS = {
  hidden: 0,
  focus: 82,
  all: 220,
};

const LABEL_VIEWPORT_MARGIN = 0.9;
const LABEL_CELL_WIDTH = 164;
const LABEL_CELL_HEIGHT = 48;

function getGraphSizeTier(count = 0) {
  if (count > 1200) return "massive";
  if (count > 650) return "large";
  if (count > 260) return "medium";
  return "small";
}

function getAdaptiveLabelLimit(mode, nodeCount) {
  const base = LABEL_LIMITS[mode] ?? 0;
  const tier = getGraphSizeTier(nodeCount);
  if (tier === "massive") return Math.min(base, mode === "all" ? 64 : 28);
  if (tier === "large") return Math.min(base, mode === "all" ? 90 : 40);
  if (tier === "medium") return Math.min(base, mode === "all" ? 110 : 48);
  return base;
}

function getAtlasNodeColor(node) {
  const type = getNodeType(node);
  const weight = getNodeWeight(node);
  const factVariant = getFactVariant(node);

  if (node?.kind === "document") return "#d99a1a";
  if (node?.kind === "entity") return mixHex("#f2dfd3", "#f35a52", Math.min(0.68, 0.12 + weight * 0.5));
  if (type === "decision") return mixHex("#8f2927", "#ff5b54", Math.min(1, 0.28 + weight * 0.68));
  if (type === "event") return mixHex("#b4473e", "#f4d8c8", Math.min(1, 0.22 + weight * 0.48));
  if (type === "fact") {
    return factVariant === "extracted"
      ? mixHex("#b73431", "#ff6a61", Math.min(1, 0.3 + weight * 0.55))
      : mixHex("#d34f47", "#f1d5c7", Math.min(1, 0.12 + weight * 0.42));
  }
  if (type === "relationship") return "#ead9cf";
  if (type === "goal") return mixHex("#9f312d", "#f0645d", Math.min(1, 0.22 + weight * 0.58));
  if (type === "preference") return mixHex("#d1b4a4", "#f2ded0", Math.min(1, 0.18 + weight * 0.46));
  if (type === "lesson") return mixHex("#d9c9bd", "#fff0e5", Math.min(1, 0.14 + weight * 0.42));
  return mixHex("#c83f3a", "#f0d5c7", Math.min(1, 0.14 + weight * 0.54));
}

function getNodeRadius(node) {
  let radius = Math.min(5.8, Math.sqrt(node.val || 4) * 0.98);
  const weight = getNodeWeight(node);
  const importance = Number.isFinite(node?.importanceScore) ? Math.max(0, Math.min(1, node.importanceScore)) : 0;
  const recall = Number.isFinite(node?.recallCount) ? Math.min(node.recallCount / 18, 1) : 0;

  if (node.clusterId === "_orphan") radius = Math.max(radius * 0.48, 1);
  else if (node.clusterRole === "hub") radius = Math.min(7.2, radius * 1.18);
  else if (node.clusterRole === "bridge") radius = Math.max(radius * 0.82, 1.6);

  if (node.nodeLayer === "fact") radius = Math.max(radius * 0.85, 2.1);
  if (node.nodeLayer === "promoted") radius = Math.min(6.1, radius * 1.02);
  if (node.nodeLayer === "tara") radius = Math.min(6.1, radius * 1.02);
  if (node.nodeLayer === "tara-insight") radius *= 1.04;
  if (isBoardNode(node)) radius = Math.max(radius, 3.8 + importance * 2.4 + recall * 1.2);

  return Math.min(10.6, Math.max(2.6, radius * (0.92 + weight * 0.54 + recall * 0.2)));
}

function getNodeType(node) {
  // Intelligent-graph node.kind takes precedence
  if (node?.kind === 'document') return 'document';
  if (node?.kind === 'entity') return 'entity';
  return (node.memoryType || node.memory_type || node.type || "").toLowerCase() || "default";
}

// Color overrides for non-memory node kinds
function getKindColor(node) {
  // Atlas mode resolves kind colors in getAtlasNodeColor().
  if (node?.kind === 'document') return '#d99a1a';
  if (node?.kind === 'entity') return '#ead8ca';
  return null;
}

// Edge color by type (matches the image: purple=derived_from, red=contradicts, green=supports)
// Edge palette parity with MemoryGraph.jsx EDGE_COLORS so the same edge
// type reads the same color across 2D / 3D / detail views.
function getEdgeColorByType(type, themeName = "day") {
  const t = String(type || '').toLowerCase();
  if (themeName === "atlas" || themeName === "night" || themeName === "day") {
    if (t === 'updates') return '#ff6560';
    if (t === 'extends') return '#c4bdb4';
    if (t === 'derives' || t === 'derived_from') return '#f1dfd1';
    if (t === 'contradicts') return '#e3423f';
    if (t === 'supports') return '#bfb8af';
    if (t === 'mentions') return '#706d68';
    if (t === 'needs_revision') return '#d08a2e';
    if (t === 'peer_review') return '#8f8a82';
    return null;
  }
  if (t === 'updates')      return '#f59e0b'; // amber — supersession
  if (t === 'extends')      return '#22c55e'; // green — additive
  if (t === 'derives' || t === 'derived_from') return '#8b5cf6'; // violet — synthesis link
  if (t === 'contradicts')  return '#ef4444'; // red — conflict
  if (t === 'supports')     return '#3b82f6'; // blue — evidence
  if (t === 'mentions')     return '#94a3b8'; // slate — light reference
  if (t === 'needs_revision') return '#f97316'; // orange
  if (t === 'peer_review')  return '#64748b'; // slate
  return null;
}

function getFactVariant(node) {
  if (!node) return "raw";
  const flags = [
    node.factVariant,
    node.factSource,
    node.extractionSource,
    node.memoryVariant,
    node.sourceKind,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (node.isExtracted || node.extracted || flags.some((value) => value.includes("extract"))) {
    return "extracted";
  }

  if (node.isRaw || flags.some((value) => value.includes("raw") || value.includes("manual"))) {
    return "raw";
  }

  if (node.sourcePlatform && String(node.sourcePlatform).toLowerCase().includes("knowledge")) {
    return "extracted";
  }

  return "raw";
}

function getRelationStyle(link) {
  return RELATION_STYLES[link?.type] || RELATION_STYLES.default;
}

function getNodeWeight(node) {
  const importance = Number.isFinite(node?.importanceScore) ? node.importanceScore : 0;
  const hub = Number.isFinite(node?.hubScore) ? node.hubScore : 0;
  const recall = Number.isFinite(node?.recallCount) ? Math.min(node.recallCount / 12, 1) : 0;
  const val = Number.isFinite(node?.val) ? Math.min(node.val / 14, 1) : 0;
  const roleBoost = node?.clusterRole === "hub" ? 0.28 : node?.clusterRole === "bridge" ? 0.14 : 0;
  return Math.max(0, Math.min(1, importance * 0.42 + hub * 0.28 + recall * 0.16 + val * 0.18 + roleBoost));
}

function getBoardLabelPriority(node, degree = 0) {
  if (!isBoardNode(node)) return 0;
  const importance = Number.isFinite(node?.importanceScore) ? Math.max(0, Math.min(1, node.importanceScore)) : 0;
  const recall = Number.isFinite(node?.recallCount) ? Math.min(node.recallCount / 18, 1) : 0;
  const hub = Number.isFinite(node?.hubScore) ? Math.max(0, Math.min(1, node.hubScore)) : 0;
  const roleBoost = node?.clusterRole === "hub" ? 55 : node?.clusterRole === "bridge" ? 26 : 0;
  return 90 + degree * 2.3 + importance * 70 + recall * 48 + hub * 42 + roleBoost;
}

function greyFromWeight(weight, min = 38, max = 132) {
  const channel = Math.round(max - weight * (max - min));
  const hex = channel.toString(16).padStart(2, "0");
  return `#${hex}${hex}${hex}`;
}

function getNodeColorBase(node) {
  // Non-memory kinds (document/entity) get fixed brand colors
  const kindColor = getKindColor(node);
  if (kindColor) return kindColor;

  const type = getNodeType(node);
  const weight = getNodeWeight(node);
  const base = greyFromWeight(weight);

  if (type === "fact") {
    return getFactVariant(node) === "extracted"
      ? greyFromWeight(Math.min(1, weight + 0.12), 28, 112)
      : greyFromWeight(weight, 58, 142);
  }

  if (type === "decision") return greyFromWeight(Math.min(1, weight + 0.18), 20, 96);
  return TYPE_COLORS[type] ? base : TYPE_COLORS.default;
}

function getThemeBackground(theme, fallback) {
  return theme.bg || fallback;
}

function getThemeFog(theme) {
  if (theme.name === "day") return new THREE.FogExp2("#e8dece", 0.00018);
  if (theme.name === "atlas" || theme.name === "night") return new THREE.FogExp2("#15120f", 0.00078);
  return null;
}

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return { r: 143, g: 138, b: 130 };
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

// Perf: share node GEOMETRIES across all nodes. Geometry is the heavy GPU
// buffer and is never mutated per-node (only material colors are, during
// recolor — so materials stay per-node, geometries are pooled). Keyed by
// shape + a quantized radius bucket so continuous radii still reuse a handful
// of buffers. Visual: radius snaps to the nearest 0.25 — imperceptible.
// Above this link count, skip per-link on-edge label sprites (hidden clutter
// on dense graphs; hover tooltip still shows the relation). Small graphs keep
// the exact same persistent labels.
const LINK_LABEL_SPRITE_CAP = 2400;
const _geoCache = new Map();
const _rb = (r) => Math.round(r * 4) / 4;
function cachedGeo(key, make) {
  let g = _geoCache.get(key);
  if (!g) { g = make(); _geoCache.set(key, g); }
  return g;
}

function makeMaterial(color, opacity = 0.96) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    roughness: 0.78,
    metalness: 0.015,
    emissive: color,
    emissiveIntensity: 0.018,
  });
}

function makeNodeShape(node, color, clusterTint, lite = false) {
  const radius = getNodeRadius(node);
  const type = getNodeType(node);
  const group = new THREE.Group();
  const primaryMaterial = makeMaterial(color, 0.95);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: clusterTint || GRAPH_THEME.halo,
    transparent: true,
    opacity: clusterTint ? 0.2 : 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const fieldMaterial = new THREE.MeshBasicMaterial({
    color: clusterTint || color,
    transparent: true,
    opacity: clusterTint ? 0.1 : 0.07,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  let mesh;

  const rb = _rb(radius);
  switch (type) {
    case "document":
      // Diamond/octahedron — matches reference image style
      mesh = new THREE.Mesh(cachedGeo(`oct:${rb}`, () => new THREE.OctahedronGeometry(rb * 1.25, 0)), primaryMaterial);
      break;
    case "entity":
      // Hexagonal disc — entity nodes
      mesh = new THREE.Mesh(cachedGeo(`cyl-disc:${rb}`, () => new THREE.CylinderGeometry(rb * 1.1, rb * 1.1, rb * 0.4, 6)), primaryMaterial);
      break;
    case "decision":
      mesh = new THREE.Mesh(cachedGeo(`sph16:${rb}`, () => new THREE.SphereGeometry(rb * 0.98, 16, 16)), primaryMaterial);
      break;
    case "preference":
      mesh = new THREE.Mesh(cachedGeo(`box-pref:${rb}`, () => new THREE.BoxGeometry(rb * 1.7, rb * 1.28, rb * 1.05)), primaryMaterial);
      break;
    case "goal":
      mesh = new THREE.Mesh(cachedGeo(`cyl-goal:${rb}`, () => new THREE.CylinderGeometry(rb * 0.98, rb * 0.98, rb * 1.45, 6)), primaryMaterial);
      mesh.rotation.z = Math.PI / 2;
      break;
    case "lesson":
      mesh = new THREE.Mesh(cachedGeo(`tetra:${rb}`, () => new THREE.TetrahedronGeometry(rb * 1.18, 0)), primaryMaterial);
      break;
    case "event":
      mesh = new THREE.Mesh(cachedGeo(`box-evt:${rb}`, () => new THREE.BoxGeometry(rb * 1.55, rb * 1.1, rb * 1.1)), primaryMaterial);
      break;
    case "relationship": {
      const torus = new THREE.Mesh(
        cachedGeo(`torus:${rb}`, () => new THREE.TorusGeometry(rb * 0.88, Math.max(rb * 0.16, 0.24), 12, 28)),
        primaryMaterial,
      );
      torus.rotation.x = Math.PI / 2;
      mesh = torus;
      break;
    }
    case "fact":
    case "fact_raw":
    case "fact_extracted":
    default:
      mesh = new THREE.Mesh(cachedGeo(`sph14:${rb}`, () => new THREE.SphereGeometry(rb, 14, 14)), primaryMaterial);
      break;
  }

  const ct = clusterTint ? 1 : 0;
  const field = new THREE.Mesh(
    cachedGeo(`field:${ct}:${rb}`, () => new THREE.SphereGeometry(rb * (ct ? 2.35 : 2.08), 14, 14)),
    fieldMaterial,
  );
  const halo = new THREE.Mesh(
    cachedGeo(`halo:${ct}:${rb}`, () => new THREE.SphereGeometry(rb * (ct ? 1.72 : 1.48), 12, 12)),
    haloMaterial,
  );
  // Lite mode (massive graphs): skip the halo + field glow meshes — they're
  // purely cosmetic and double/triple the draw-call count (3855 nodes × 3 meshes).
  // Primary mesh only → ~2/3 fewer node draw calls at scale.
  if (lite) {
    group.add(mesh);
    group.userData = { primaryMaterial, haloMaterial: null, fieldMaterial: null };
    return group;
  }
  halo.renderOrder = 2;
  field.renderOrder = 1;
  group.add(halo);
  group.add(field);
  group.add(mesh);
  group.userData = { primaryMaterial, haloMaterial, fieldMaterial };
  return group;
}

const MemoryGraph3D = forwardRef(function MemoryGraph3D(
  {
    graphData,
    selectedNode,
    highlightNodes,
    filteredNodes,
    layerFilter,
    clusterFilter,
    scope,
    userColorMap,
    clusterCentroids,
    clusters,
    onNodeClick,
    onNodeHover,
    onBackgroundClick,
    onViewStateChange,
    width,
    height,
    backgroundColor = DEFAULT_BG,
    theme: themeProp = "atlas",
  },
  ref,
) {
  // Resolve active palette. theme prop accepts 'atlas' | 'day' | 'night'.
  const theme = THEMES[themeProp] || THEMES.day;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  // Upstream three.js OrbitControls race: a pointerup can reference a pointer
  // whose position record was already removed (multi-touch / pointercancel /
  // canvas re-mount mid-gesture) → uncaught "Cannot read properties of
  // undefined (reading 'x')" from deep inside the controls' event listener.
  // The listeners are instance-bound closures (registered refs can't be
  // wrapped post-hoc), so suppress exactly this signature while the 3D graph
  // is mounted — the gesture aborts harmlessly and controls recover on the
  // next pointerdown.
  useEffect(() => {
    const swallow = (e) => {
      const msg = e?.error?.message || e?.message || "";
      if (/Cannot read properties of undefined \(reading '(x|y)'\)/.test(msg)) {
        e.preventDefault();
        // eslint-disable-next-line no-console
        console.warn("[graph3d] suppressed OrbitControls pointer-race:", msg);
      }
    };
    window.addEventListener("error", swallow);
    return () => window.removeEventListener("error", swallow);
  }, []);
  // When theme prop flips, re-apply backgroundColor + force a recolor pass
  // so existing materials swap immediately without remount.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.backgroundColor(getThemeBackground(theme, backgroundColor));
    const scene = fg.scene?.();
    if (scene) {
      scene.fog = getThemeFog(theme);
    }
    if (refreshHighlightRef.current) refreshHighlightRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeProp]);
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const highlightedNodesRef = useRef(new Set());
  const highlightedLinksRef = useRef(new Set());
  const animationFrameRef = useRef(null);
  const warmFrameRef = useRef(null);
  const graphDataRef = useRef(graphData);
  const nodeMapRef = useRef(new Map());
  const neighborMapRef = useRef(new Map());
  const clusterCentroidsRef = useRef(clusterCentroids);
  const clustersRef = useRef(clusters);
  const selectedNodeRef = useRef(selectedNode);
  const highlightNodesRef = useRef(highlightNodes);
  const filteredNodesRef = useRef(filteredNodes);
  const layerFilterRef = useRef(layerFilter);
  const clusterFilterRef = useRef(clusterFilter);
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeHoverRef = useRef(onNodeHover);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  const onViewStateChangeRef = useRef(onViewStateChange);
  const emitViewStateRef = useRef(null);
  const resumeFrameRef = useRef(null);
  const backgroundColorRef = useRef(backgroundColor);
  const isNodeVisibleRef = useRef(null);
  const isLinkVisibleRef = useRef(null);
  const getNodeColorRef = useRef(null);
  const getNodeLabelRef = useRef(null);
  const refreshHighlightRef = useRef(null);
  // One-time "frame the whole graph" guard (reset when a new dataset loads).
  const didInitialFitRef = useRef(false);
  // nodeId -> Sprite for persistent short tags (doc, gmail, @person ...)
  const nodeTagSpritesRef = useRef(new Map());
  // Label LOD: at massive/large scale, the set of node ids allowed a persistent
  // text-sprite label (top-degree nodes). null = label all (small graphs). A text
  // sprite per node is a canvas texture — 3855 of them is the dominant per-frame
  // cost; capping to the top connected nodes is the biggest single FPS win.
  const labelAllowRef = useRef(null);
  const viewStateRef = useRef({
    distance: 720,
    inFrameNodeIds: new Set(),
    labelNodeIds: new Set(),
    labelMode: "hidden",
    linkMode: "sparse",
    relationLabelMode: "hidden",
  });

  const neighborMap = useMemo(() => {
    const neighbors = new Map();
    (graphData.links || []).forEach((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;

      if (!neighbors.has(sourceId)) neighbors.set(sourceId, new Set());
      if (!neighbors.has(targetId)) neighbors.set(targetId, new Set());
      neighbors.get(sourceId).add(targetId);
      neighbors.get(targetId).add(sourceId);
    });
    return neighbors;
  }, [graphData.links]);

  const nodeMap = useMemo(
    () => new Map((graphData.nodes || []).map((node) => [node.id, node])),
    [graphData.nodes],
  );

  useEffect(() => {
    graphDataRef.current = graphData;
    nodeMapRef.current = nodeMap;
    neighborMapRef.current = neighborMap;
    clusterCentroidsRef.current = clusterCentroids;
    clustersRef.current = clusters;
    selectedNodeRef.current = selectedNode;
    highlightNodesRef.current = highlightNodes;
    filteredNodesRef.current = filteredNodes;
    layerFilterRef.current = layerFilter;
    clusterFilterRef.current = clusterFilter;
    onNodeClickRef.current = onNodeClick;
    onNodeHoverRef.current = onNodeHover;
    onBackgroundClickRef.current = onBackgroundClick;
    onViewStateChangeRef.current = onViewStateChange;
  }, [
    clusterCentroids,
    clusterFilter,
    clusters,
    filteredNodes,
    graphData,
    highlightNodes,
    layerFilter,
    neighborMap,
    nodeMap,
    onBackgroundClick,
    onNodeClick,
    onNodeHover,
    onViewStateChange,
    selectedNode,
  ]);

  const isNodeVisible = useCallback((node) => {
      if (layerFilterRef.current !== "all" && !filteredNodesRef.current.has(node.id)) return false;
      if (clusterFilterRef.current && node.clusterId !== clusterFilterRef.current && node.clusterRole !== "bridge") return false;
      const inFrameNodeIds = viewStateRef.current.inFrameNodeIds;
      if (inFrameNodeIds.size > 0 && Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z)) {
        if (!inFrameNodeIds.has(node.id) && !highlightNodesRef.current.has(node.id) && selectedNodeRef.current?.id !== node.id) {
          return false;
        }
      }
      return true;
    },
    [],
  );

  const isLinkVisible = useCallback((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;
      const sourceNode = nodeMapRef.current.get(sourceId);
      const targetNode = nodeMapRef.current.get(targetId);
      if (!sourceNode || !targetNode) return false;
      if (!isNodeVisible(sourceNode) || !isNodeVisible(targetNode)) return false;

      const highlightedLinks = highlightedLinksRef.current;
      if (highlightedLinks.has(link)) return true;

      const linkMode = viewStateRef.current.linkMode;
      const sourceImportant = selectedNodeRef.current?.id === sourceId || highlightNodesRef.current.has(sourceId);
      const targetImportant = selectedNodeRef.current?.id === targetId || highlightNodesRef.current.has(targetId);

      if (linkMode === "sparse") {
        return sourceImportant || targetImportant || sourceNode.clusterRole === "hub" || targetNode.clusterRole === "hub";
      }

      if (linkMode === "focus") {
        return sourceImportant || targetImportant || sourceNode.clusterId === targetNode.clusterId;
      }

      return true;
    },
    [isNodeVisible],
  );

  const getNodeLabel = useCallback((node) => {
      const labelMode = viewStateRef.current.labelMode;
      const isImportant = selectedNodeRef.current?.id === node.id || highlightNodesRef.current.has(node.id) || highlightedNodesRef.current.has(node.id);
      if (labelMode === "hidden" && !isImportant) return "";
      if (labelMode === "focus" && !isImportant && node.clusterRole !== "hub") return "";
      if (!viewStateRef.current.labelNodeIds.has(node.id) && !isImportant) return "";
      const selected = selectedNodeRef.current?.id === node.id;
      const board = isBoardNode(node);
      return `
        <div style="
          max-width:${board ? "230px" : "260px"};
          padding:${selected ? "7px 10px" : "5px 8px"};
          border:${board ? "1px solid rgba(255,224,130,0.55)" : "1px solid rgba(255,235,220,0.14)"};
          border-radius:${board ? "2px" : "3px"};
          background:${board ? "rgba(217,154,26,0.94)" : (selected ? "rgba(255,84,80,0.92)" : "rgba(3,3,3,0.9)")};
          color:${board || selected ? "#140b0a" : "#fff0e5"};
          box-shadow:${board ? "0 12px 28px rgba(116,69,9,0.26)" : "0 10px 26px rgba(0,0,0,0.42)"};
          font-family:'Space Grotesk',sans-serif;
          font-size:${selected ? "12px" : "10.5px"};
          font-weight:${selected ? "720" : "620"};
          line-height:1.25;
          white-space:normal;
          letter-spacing:0.03em;
          text-transform:uppercase;
        ">${escapeHtml(getNodeDisplayLabel(node))}</div>
      `;
    },
    [],
  );

  const getLinkLabel = useCallback((link) => {
    const { relationLabelMode } = viewStateRef.current;
    if (relationLabelMode === "hidden") return "";

    const sourceId = typeof link.source === "object" ? link.source.id : link.source;
    const targetId = typeof link.target === "object" ? link.target.id : link.target;
    const sourceImportant = selectedNodeRef.current?.id === sourceId || highlightNodesRef.current.has(sourceId);
    const targetImportant = selectedNodeRef.current?.id === targetId || highlightNodesRef.current.has(targetId);
    const showByFocus = sourceImportant || targetImportant || highlightedLinksRef.current.has(link);
    if (relationLabelMode === "focus" && !showByFocus) return "";

    const confidence = Number.isFinite(link.confidence)
      ? `${Math.round(link.confidence * 100)}%`
      : null;
    // Hover tooltip (ForceGraph HTML label). Persistent on-edge labels are
    // additionally rendered as THREE sprites with distance-based opacity.
    const t = themeRef.current;
    return `
      <div style="display:flex;align-items:center;gap:6px;padding:3px 7px;border:1px solid ${t.edgeLabelBorder};border-radius:999px;background:${t.edgeLabelBg};box-shadow:0 8px 18px rgba(0,0,0,0.18);font-family:'Space Grotesk',sans-serif;font-size:10px;line-height:1;color:${t.label};white-space:nowrap;backdrop-filter:blur(8px);">
        <span style="font-weight:600;">${link.type || "Relates"}</span>
        ${confidence ? `<span style="font-family:monospace;font-size:9px;color:${t.labelDim};">${confidence}</span>` : ""}
      </div>
    `;
  }, []);

  const refreshHighlight = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg
      .nodeColor(fg.nodeColor())
      .nodeThreeObject(fg.nodeThreeObject())
      .linkColor(fg.linkColor())
      .linkLabel(fg.linkLabel())
      .linkOpacity(fg.linkOpacity())
      .linkDirectionalParticles(fg.linkDirectionalParticles())
      .linkWidth(fg.linkWidth());
  }, []);

  const withPausedAnimation = useCallback((mutate) => {
    const fg = fgRef.current;
    if (!fg) return;

    try {
      fg.pauseAnimation?.();
    } catch (_error) {
      // noop
    }

    try {
      mutate(fg);
    } finally {
      if (resumeFrameRef.current != null) {
        window.cancelAnimationFrame(resumeFrameRef.current);
      }
      resumeFrameRef.current = window.requestAnimationFrame(() => {
        resumeFrameRef.current = null;
        if (fgRef.current !== fg) return;
        try {
          fg.resumeAnimation?.();
        } catch (_error) {
          // noop
        }
      });
    }
  }, []);

  useEffect(() => {
    const syncAnimation = (isVisible) => {
      const fg = fgRef.current;
      if (!fg) return;
      try {
        if (isVisible && !document.hidden) fg.resumeAnimation?.();
        else fg.pauseAnimation?.();
      } catch (_error) {
        // 3d-force-graph versions differ; visibility is an optimization only.
      }
    };

    const handleDocumentVisibility = () => syncAnimation(true);
    document.addEventListener("visibilitychange", handleDocumentVisibility);

    let observer = null;
    const el = containerRef.current;
    if (el && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => syncAnimation(entry.isIntersecting),
        { threshold: 0.02 },
      );
      observer.observe(el);
    }

    syncAnimation(true);
    return () => {
      document.removeEventListener("visibilitychange", handleDocumentVisibility);
      observer?.disconnect?.();
    };
  }, []);

  // Theme-aware node color. getNodeColorBase produces a greyscale ramp
  // tuned for light backgrounds. For night, invert each channel so dark
  // particles become bright stars instead of vanishing on the black sky.
  const getNodeColor = useCallback((node) => {
      const t = themeRef.current;
      const highlightedNodes = highlightedNodesRef.current;
      let baseColor = (t.name === "atlas" || t.name === "day" || t.name === "night")
        ? getAtlasNodeColor(node)
        : getNodeColorBase(node);
      if (t.name === "night") {
        baseColor = getAtlasNodeColor(node);
      }
      if (highlightedNodes.has(node.id)) {
        if (selectedNodeRef.current?.id === node.id) return t.nodeAccent;
        if (t.name === "atlas") return "#fff0e5";
        return t.name === "night" ? "#dcd6c9" : "#36332d";
      }
      if (highlightNodesRef.current.size > 0 && !highlightNodesRef.current.has(node.id)) {
        const fallback = baseColor.startsWith("#") ? hexToRgb(baseColor) : { r: 136, g: 136, b: 136 };
        return `rgba(${fallback.r},${fallback.g},${fallback.b},${t.name === "atlas" ? 0.18 : 0.14})`;
      }
      return baseColor;
    },
    [],
  );

  const getClusterHaloColor = useCallback((node) => {
    const t = themeRef.current;
    const activeCluster = clusterFilterRef.current;
    if (activeCluster && node.clusterId === activeCluster) return t.nodeAccent;
    if (selectedNodeRef.current?.clusterId && node.clusterId === selectedNodeRef.current.clusterId) return t.nodeAccent;
    if (highlightNodesRef.current.has(node.id)) return t.name === "atlas" ? "#ff786f" : (t.name === "night" ? "#dcd6c9" : "#5a554c");
    return null;
  }, []);

  // Theme-aware link color: mix theme.linkBase → theme.nodeAccent by the
  // relation's weight so each type keeps its contrast hierarchy in both
  // themes (Updates darkest, References lightest).
  const getLinkColor = useCallback((link) => {
    const t = themeRef.current;
    if (highlightedLinksRef.current.has(link)) return t.nodeAccent;
    // Type-specific colors take priority (Contradicts=red, derived_from=purple, etc.)
    const typeColor = getEdgeColorByType(link?.type, t.name);
    if (typeColor) return typeColor;
    const style = RELATION_WEIGHTS[link?.type] || RELATION_WEIGHTS.default;
    return mixHex(t.linkBase, t.nodeAccent, 1 - style.weight);
  }, []);

  const getLinkWidth = useCallback((link) => {
    const nodeCount = graphDataRef.current?.nodes?.length || 0;
    const tier = getGraphSizeTier(nodeCount);
    const style = getRelationStyle(link);
    if (highlightedLinksRef.current.has(link)) return 1.12;
    if (themeRef.current.name === "atlas" || themeRef.current.name === "night" || themeRef.current.name === "day") {
      if (themeRef.current.name === "day") {
        if (tier === "massive") return 0.14;
        if (tier === "large") return 0.18;
        return Math.max(0.2, style.width * 1.2);
      }
      if (tier === "massive") return 0.08;
      if (tier === "large") return 0.12;
      return Math.max(0.13, style.width * 0.86);
    }
    return Math.max(style.width, themeRef.current.name === "night" ? 0.2 : 0.28);
  }, []);

  const getLinkParticles = useCallback((link) => {
    // Ambient directional particles animate the render loop EVERY frame forever
    // — the engine never idles while any link carries particles. On small/large
    // graphs that meant hundreds–thousands of particle meshes re-rendered
    // continuously, which is the dominant cause of load + interaction jank.
    // Show particles ONLY on the actively-highlighted path (a handful of links
    // on hover/focus); at rest the loop goes fully idle = smooth. refreshHighlight
    // re-evaluates this per link on every hover, so highlighted links still flow.
    return highlightedLinksRef.current.has(link) ? 2 : 0;
  }, []);

  const getLinkParticleSpeed = useCallback((link) => {
    if (link.type === "Derives") return 0.0042;
    if (link.type === "Updates") return 0.0038;
    if (link.type === "Extends") return 0.0034;
    return 0.0028;
  }, []);

  const getLinkOpacity = useCallback((link) => {
    const t = themeRef.current;
    const style = getRelationStyle(link);
    if (highlightedLinksRef.current.has(link)) return 0.82;
    if (t.name === "atlas" || t.name === "night") return Math.max(0.1, style.opacity * 0.88);
    if (t.name === "day") return Math.max(0.28, style.opacity * 2.1);
    return Math.max(0.14, style.opacity * 1.45);
  }, []);

  const updateNodeObjectAppearance = useCallback((node, object3d) => {
    if (!object3d?.userData?.primaryMaterial) return;
    const color = getNodeColorRef.current(node);
    const haloColor = getClusterHaloColor(node);
    const t = themeRef.current;
    object3d.userData.primaryMaterial.color.set(color);
    object3d.userData.primaryMaterial.emissive?.set?.(color);
    object3d.userData.primaryMaterial.emissiveIntensity = t.name === "atlas" ? 0.045 : 0.025;
    // halo/field absent in lite (massive-graph) nodes — guard.
    if (object3d.userData.haloMaterial) {
      object3d.userData.haloMaterial.color.set(haloColor || GRAPH_THEME.halo);
      object3d.userData.haloMaterial.opacity = haloColor ? (t.name === "atlas" ? 0.28 : 0.24) : (t.name === "atlas" ? 0.055 : 0.08);
    }
    if (object3d.userData.fieldMaterial) {
      object3d.userData.fieldMaterial.color.set(haloColor || color);
      object3d.userData.fieldMaterial.opacity = haloColor ? (t.name === "atlas" ? 0.16 : 0.1) : (t.name === "atlas" ? 0.045 : 0.07);
    }
  }, [getClusterHaloColor]);

  useEffect(() => {
    graphDataRef.current = graphData;
    // Label LOD — only the top-degree nodes keep a persistent label sprite at
    // massive/large scale (else 3855 canvas-texture sprites tank the frame rate).
    // Others still label on hover/select. Computed here so it's ready before the
    // node objects are (re)built by .graphData().
    {
      const nodes = graphData?.nodes || [];
      const links = graphData?.links || graphData?.edges || [];
      const tier = getGraphSizeTier(nodes.length);
      if (tier === "massive" || tier === "large") {
        const deg = new Map();
        for (const l of links) {
          const s = typeof l.source === "object" ? l.source?.id : l.source;
          const tg = typeof l.target === "object" ? l.target?.id : l.target;
          if (s != null) deg.set(s, (deg.get(s) || 0) + 1);
          if (tg != null) deg.set(tg, (deg.get(tg) || 0) + 1);
        }
        const K = tier === "massive" ? 120 : 250;
        const top = [...deg.entries()].sort((a, b) => b[1] - a[1]).slice(0, K).map((e) => e[0]);
        const boardAnchors = nodes
          .filter((node) => isBoardNode(node))
          .map((node) => ({ id: node.id, score: getBoardLabelPriority(node, deg.get(node.id) || 0) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, tier === "massive" ? 72 : 120)
          .map((entry) => entry.id);
        boardAnchors.forEach((id) => top.push(id));
        labelAllowRef.current = new Set(top);
      } else {
        labelAllowRef.current = null; // small/medium → label everything
      }
    }
    neighborMapRef.current = neighborMap;
    onNodeClickRef.current = onNodeClick;
    onNodeHoverRef.current = onNodeHover;
    onBackgroundClickRef.current = onBackgroundClick;
    onViewStateChangeRef.current = onViewStateChange;
    backgroundColorRef.current = backgroundColor;
    isNodeVisibleRef.current = isNodeVisible;
    isLinkVisibleRef.current = isLinkVisible;
    getNodeColorRef.current = getNodeColor;
    getNodeLabelRef.current = getNodeLabel;
    refreshHighlightRef.current = refreshHighlight;
  }, [
    backgroundColor,
    getNodeColor,
    getNodeLabel,
    graphData,
    isLinkVisible,
    isNodeVisible,
    neighborMap,
    onBackgroundClick,
    onNodeClick,
    onNodeHover,
    onViewStateChange,
    refreshHighlight,
  ]);

  const focusNode = useCallback((node, duration = 900, distanceMultiplier = 4.5) => {
    const fg = fgRef.current;
    if (!fg || !node) return;

    const distance = Math.max(110, getNodeRadius(node) * 24 * distanceMultiplier);
    const position = new THREE.Vector3(node.x || 0, node.y || 0, node.z || 0);
    const direction = position.clone().normalize();
    if (direction.lengthSq() === 0) direction.set(0, 0, 1);
    const cameraPosition = position.clone().add(direction.multiplyScalar(distance));
    fg.cameraPosition(cameraPosition, position, duration);
  }, []);

  const focusPoint = useCallback((point, duration = 900) => {
    const fg = fgRef.current;
    if (!fg || !point) return;
    const target = new THREE.Vector3(point.x || 0, point.y || 0, point.z || 0);
    const camera = fg.camera();
    const current = camera.position.clone();
    const controls = fg.controls?.();
    const lookAt = controls?.target?.clone?.() || new THREE.Vector3();
    const offset = current.sub(lookAt);
    const next = target.clone().add(offset.lengthSq() === 0 ? new THREE.Vector3(0, 0, 180) : offset);
    fg.cameraPosition(next, target, duration);
  }, []);

  const zoomBy = useCallback((factor, duration = 300) => {
    const fg = fgRef.current;
    if (!fg) return;
    const camera = fg.camera();
    const controls = fg.controls?.();
    const target = controls?.target?.clone?.() || new THREE.Vector3();
    const offset = camera.position.clone().sub(target);
    const next = target.clone().add(offset.multiplyScalar(1 / factor));
    fg.cameraPosition(next, target, duration);
  }, []);

  // Guarded wide-shot. Two failure modes this fixes:
  //  • "not loading" — zoomToFit on a 0-sized canvas (SPA mount) or a
  //    pre-layout degenerate bbox positions the camera at Infinity/NaN, so the
  //    canvas goes black and never recovers (didInitialFit already latched).
  //  • "zooming out too much" — zoomToFit frames ALL nodes incl. far orphans,
  //    so a spread force-layout pushes the camera absurdly far.
  // Returns false when it could not fit yet (no fg / no nodes / no dims) so the
  // caller can retry on the next frame without latching the one-time guard.
  const safeFit = useCallback((duration = 600, padding = 50) => {
    const fg = fgRef.current;
    const el = containerRef.current;
    if (!fg || !el) return false;
    const nodeCount = graphDataRef.current?.nodes?.length || 0;
    if (nodeCount === 0) return false;
    if (el.clientWidth <= 0 || el.clientHeight <= 0) return false;

    fg.zoomToFit(duration, padding);

    // After the fit animation, sanitize + clamp the resulting camera distance.
    const tier = getGraphSizeTier(nodeCount);
    const MAX_FIT = tier === "massive" ? 1450 : tier === "large" ? 1050 : 850;
    const MIN_FIT = 150;
    window.setTimeout(() => {
      const inst = fgRef.current;
      if (!inst) return;
      const camera = inst.camera?.();
      const controls = inst.controls?.();
      if (!camera) return;
      const target = controls?.target?.clone?.() || new THREE.Vector3();
      const dist = camera.position.distanceTo(target);
      if (!Number.isFinite(dist) || dist <= 0) {
        // Degenerate fit → restore a sane default so the canvas isn't black.
        camera.position.set(0, 40, 300);
        camera.updateProjectionMatrix?.();
        return;
      }
      if (dist > MAX_FIT || dist < MIN_FIT) {
        const clamped = Math.min(MAX_FIT, Math.max(MIN_FIT, dist));
        const dir = camera.position.clone().sub(target).normalize();
        const next = target.clone().add(dir.multiplyScalar(clamped));
        inst.cameraPosition(next, target, 300);
      }
    }, duration + 80);
    return true;
  }, []);

  const fitView = useCallback((duration = 500) => {
    safeFit(duration, 50);
  }, [safeFit]);

  useImperativeHandle(ref, () => ({
    d3Force: (...args) => fgRef.current?.d3Force?.(...args),
    d3ReheatSimulation: () => fgRef.current?.d3ReheatSimulation?.(),
    focusNode,
    focusPoint,
    zoomBy,
    fitView,
  }), [fitView, focusNode, focusPoint, zoomBy]);

  useEffect(() => {
    if (!containerRef.current || fgRef.current) return;

    const fg = ForceGraph3D({ controlType: "orbit" })(containerRef.current)
      .graphData(graphDataRef.current)
      .backgroundColor(getThemeBackground(themeRef.current, backgroundColorRef.current))
      .showNavInfo(false)
      // Perf: bound the physics sim so it settles fast then STOPS (idle = 0
      // CPU/GPU). Without this the layout engine ran indefinitely + re-rendered
      // every frame. Reheat on interaction is still bounded by these ticks.
      // Adaptive cooldown: at massive scale the layout is the heaviest part of
      // the warmup, so settle faster then STOP (idle = no per-frame sim). Paired
      // with particles=0 (massive) the render loop goes fully idle when not
      // interacting — interaction is then pure camera (smooth).
      .cooldownTicks(getGraphSizeTier(graphDataRef.current?.nodes?.length || 0) === "massive" ? 45 : 80)
      .cooldownTime(getGraphSizeTier(graphDataRef.current?.nodes?.length || 0) === "massive" ? 5000 : 8000)
      // Wide-shot on load: once the layout settles, frame the WHOLE network so
      // the user lands on the full graph (not the default zoomed-in camera).
      // Guarded so it fires only on first settle per dataset, never fighting
      // the user's manual zoom afterwards.
      .onEngineStop(() => {
        if (didInitialFitRef.current) return;
        // Retry across a few frames: on SPA mount the canvas can still be
        // 0-sized when the sim settles. Only latch the one-time guard once the
        // fit actually succeeds — otherwise the page can stay blank.
        let tries = 0;
        const tryFit = () => {
          if (didInitialFitRef.current) return;
          if (safeFit(700, 50)) {
            didInitialFitRef.current = true;
          } else if (tries++ < 30) {
            window.requestAnimationFrame(tryFit);
          }
        };
        tryFit();
      })
      .nodeResolution(themeRef.current.name === "atlas" ? 10 : 12)
      .nodeRelSize(1.65)
      .nodeOpacity(themeRef.current.name === "atlas" ? 0.96 : 0.9)
      .nodeColor((node) => getNodeColorRef.current(node))
      .nodeVal((node) => getNodeRadius(node))
      .nodeThreeObject((node) => {
        const clusterTint = getClusterHaloColor(node);
        // Drop the additive halo+field glow meshes (3 meshes/node → 1) on any
        // non-small graph. Additive blending is fill-rate heavy and the extra
        // draw calls stack up fast; only small graphs keep the glow.
        const liteNode = getGraphSizeTier(graphDataRef.current?.nodes?.length || 0) !== "small";
        const shape = makeNodeShape(node, getNodeColorRef.current(node), clusterTint, liteNode);
        // Append the memory-title label as a child of the node group so it
        // tracks the node automatically. Sprite opacity is camera-ranked.
        // Label LOD: at scale, only top-degree nodes get a persistent sprite.
        const tag = (labelAllowRef.current && !labelAllowRef.current.has(node.id))
          ? null
          : getNodeDisplayLabel(node);
        if (tag) {
          const sprite = makeNodeTagSprite(tag, themeRef.current.name, isBoardNode(node) ? "board" : "normal");
          const radius = getNodeRadius(node);
          // Offset above the node so it doesn't overlap the shape.
          sprite.position.set(0, radius * 2.05 + 1.6, 0);
          shape.add(sprite);
          nodeTagSpritesRef.current.set(node.id, sprite);
        } else {
          // Ensure stale entry from previous graph swap is dropped.
          nodeTagSpritesRef.current.delete(node.id);
        }
        return shape;
      })
      .nodeThreeObjectExtend(false)
      .nodeVisibility((node) => isNodeVisibleRef.current(node))
      .linkOpacity((link) => getLinkOpacity(link))
      .linkDirectionalParticleWidth(themeRef.current.name === "atlas" ? 0.7 : 1.1)
      .linkDirectionalParticles((link) => getLinkParticles(link))
      .linkDirectionalParticleSpeed((link) => getLinkParticleSpeed(link))
      .linkWidth((link) => getLinkWidth(link))
      .linkVisibility((link) => isLinkVisibleRef.current(link))
      .linkColor((link) => getLinkColor(link))
      .linkLabel((link) => getLinkLabel(link))
      // ─── Persistent on-edge labels (THREE sprites) ─────────────────
      // Attach a sprite to every link. Visibility + opacity is driven by
      // viewStateRef.relationLabelMode in linkPositionUpdate, so labels
      // only appear when zoomed in (mode='all') or on focused nodes
      // (mode='focus'). Far zoom = mode='hidden' = opacity 0 = no noise.
      .linkThreeObjectExtend(true)
      .linkThreeObject((link) => {
        // Perf: a persistent on-edge label sprite per link costs a draw call +
        // a per-frame linkPositionUpdate. On dense graphs those labels are
        // hidden clutter at any zoom-out anyway, so skip creating them above a
        // threshold — the hover tooltip (.linkLabel) still shows the relation.
        const linkCount = graphDataRef.current?.links?.length || 0;
        if (linkCount > LINK_LABEL_SPRITE_CAP) return null;
        return makeLinkLabelSprite(link, themeRef.current.name);
      })
      .linkPositionUpdate((sprite, coords, link) => {
        // Defensive: ForceGraph occasionally calls this with partially
        // initialized endpoints during the first frame after a graph swap
        // (start or end can be undefined / NaN). Guard every read.
        if (!sprite || !sprite.material || !coords) return;
        const start = coords.start;
        const end = coords.end;
        if (!start || !end) { sprite.material.opacity = 0; return; }
        const sx = start.x, sy = start.y, sz = start.z;
        const ex = end.x,   ey = end.y,   ez = end.z;
        if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(sz) ||
            !Number.isFinite(ex) || !Number.isFinite(ey) || !Number.isFinite(ez)) {
          sprite.material.opacity = 0;
          return;
        }
        sprite.position.set((sx + ex) / 2, (sy + ey) / 2, (sz + ez) / 2);
        // Distance-gated opacity
        const view = viewStateRef.current;
        const mode = view.relationLabelMode;
        if (mode === "hidden") {
          sprite.material.opacity = 0;
          return;
        }
        const sourceId = typeof link.source === "object" ? link.source.id : link.source;
        const targetId = typeof link.target === "object" ? link.target.id : link.target;
        const selectedId = selectedNodeRef.current?.id;
        const inFocus =
          selectedId === sourceId ||
          selectedId === targetId ||
          highlightNodesRef.current.has(sourceId) ||
          highlightNodesRef.current.has(targetId) ||
          highlightedLinksRef.current.has(link);
        if (mode === "focus" && !inFocus) {
          sprite.material.opacity = 0;
          return;
        }
        sprite.material.opacity = inFocus ? 1 : (themeRef.current.name === "night" ? 0.86 : 0.78);
      })
      .nodeLabel((node) => getNodeLabelRef.current(node))
      .onNodeClick((node) => onNodeClickRef.current?.(node))
      .onNodeHover((node) => {
        const highlightedNodes = highlightedNodesRef.current;
        const highlightedLinks = highlightedLinksRef.current;

        if ((!node && highlightedNodes.size === 0) || (node && highlightedNodes.has(node.id) && highlightedNodes.size > 1)) {
          onNodeHoverRef.current?.(node);
          return;
        }

        highlightedNodes.clear();
        highlightedLinks.clear();

        if (node) {
          highlightedNodes.add(node.id);
          (neighborMapRef.current.get(node.id) || new Set()).forEach((neighborId) => highlightedNodes.add(neighborId));

          (graphDataRef.current.links || []).forEach((link) => {
            const sourceId = typeof link.source === "object" ? link.source.id : link.source;
            const targetId = typeof link.target === "object" ? link.target.id : link.target;
            if (sourceId === node.id || targetId === node.id) {
              highlightedLinks.add(link);
            }
          });
        }

        onNodeHoverRef.current?.(node);
        refreshHighlightRef.current();
      })
      .onLinkHover((link) => {
        const highlightedNodes = highlightedNodesRef.current;
        const highlightedLinks = highlightedLinksRef.current;
        highlightedNodes.clear();
        highlightedLinks.clear();

        if (link) {
          const sourceId = typeof link.source === "object" ? link.source.id : link.source;
          const targetId = typeof link.target === "object" ? link.target.id : link.target;
          highlightedLinks.add(link);
          highlightedNodes.add(sourceId);
          highlightedNodes.add(targetId);
        }

        refreshHighlightRef.current();
      })
      .onBackgroundClick(() => onBackgroundClickRef.current?.())
      .nodeThreeObjectExtend(false);

    fgRef.current = fg;

    // Perf: cap the renderer pixel ratio. On retina/4K displays the default
    // (2–3×) shades 4–9× the pixels — and the additive-blend glow spheres are
    // fill-rate heavy, so this is the single biggest smoothness win. 1.5 keeps
    // edges crisp while roughly halving fragment work on hi-DPI screens.
    try {
      const renderer = fg.renderer?.();
      if (renderer?.setPixelRatio) {
        const nodeCount = graphDataRef.current?.nodes?.length || 0;
        const maxRatio = nodeCount > 1200 ? 1.05 : nodeCount > 650 ? 1.15 : 1.4;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
      }
    } catch { /* renderer not ready — non-fatal */ }
    // Faster settle so the bounded sim reaches rest sooner (less churn).
    try {
      fg.d3VelocityDecay?.(0.32);
      fg.d3AlphaDecay?.(0.035);
    } catch { /* noop */ }

    const scene = fg.scene?.();
    if (scene) {
      scene.background = null;
      scene.fog = getThemeFog(themeRef.current);
    }

    const camera = fg.camera?.();
    if (camera) {
      camera.far = 6000;
      camera.updateProjectionMatrix?.();
      camera.position.set(0, 40, 300);
    }

    const controls = fg.controls?.();
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.025;
      controls.rotateSpeed = 1.18;
      controls.zoomSpeed = 1.22;
      controls.panSpeed = 1.12;
      controls.minDistance = 24;
      controls.maxDistance = 3000;

      const emitViewState = () => {
        if (animationFrameRef.current != null) return;
        animationFrameRef.current = window.requestAnimationFrame(() => {
          animationFrameRef.current = null;
          const cameraNow = fg.camera?.();
          const targetNow = controls.target?.clone?.() || new THREE.Vector3();
          if (!cameraNow) return;

          cameraNow.updateMatrix?.();
          cameraNow.updateMatrixWorld?.();
          cameraNow.updateProjectionMatrix?.();

          const frustum = new THREE.Frustum();
          const projectionMatrix = new THREE.Matrix4().multiplyMatrices(
            cameraNow.projectionMatrix,
            cameraNow.matrixWorldInverse,
          );
          frustum.setFromProjectionMatrix(projectionMatrix);

          const viewport = containerRef.current?.getBoundingClientRect?.() || { width: 1, height: 1 };
          const inFrameNodeIds = new Set();
          const projectedLabelNodes = [];
          (graphDataRef.current.nodes || []).forEach((node) => {
            if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) return;
            const radius = getNodeRadius(node) * 1.8;
            const position = new THREE.Vector3(node.x, node.y, node.z);
            const sphere = new THREE.Sphere(position, radius);
            if (!frustum.intersectsSphere(sphere)) return;

            inFrameNodeIds.add(node.id);

            const projected = position.clone().project(cameraNow);
            if (
              projected.z >= -1 &&
              projected.z <= 1 &&
              Math.abs(projected.x) <= LABEL_VIEWPORT_MARGIN &&
              Math.abs(projected.y) <= LABEL_VIEWPORT_MARGIN
            ) {
              projectedLabelNodes.push({
                node,
                screenX: (projected.x * 0.5 + 0.5) * viewport.width,
                screenY: (-projected.y * 0.5 + 0.5) * viewport.height,
              });
            }
          });

          const distance = cameraNow.position.distanceTo(targetNow);
          const labelMode = distance > 1450 ? "hidden" : distance > 760 ? "focus" : "all";
          const linkMode = distance > 1180 ? "sparse" : distance > 560 ? "focus" : "all";
          const relationLabelMode = distance > 920 ? "hidden" : distance > 420 ? "focus" : "all";
          const nodeCount = graphDataRef.current.nodes?.length || 0;
          const labelBudget = getAdaptiveLabelLimit(labelMode, nodeCount);
          const scoreLabelNode = (node) => {
            let value = (node.importanceScore || 0) * 10 + (node.val || 0) + (node.hubScore || 0) * 4;
            if (isBoardNode(node)) {
              value += getBoardLabelPriority(node, neighborMapRef.current.get(node.id)?.size || 0);
            }
            if (selectedNodeRef.current?.id === node.id) value += 1000;
            if (highlightNodesRef.current.has(node.id)) value += 500;
            if (highlightedNodesRef.current.has(node.id)) value += 250;
            if (node.clusterRole === "hub") value += 30;
            return value;
          };
          const rankedVisibleNodes = projectedLabelNodes
            .filter(({ node }) => nodeMapRef.current.has(node.id))
            .sort((a, b) => scoreLabelNode(b.node) - scoreLabelNode(a.node));
          const occupiedLabelCells = new Set();
          const readableVisibleLabels = [];
          rankedVisibleNodes.forEach((candidate) => {
            const { node, screenX, screenY } = candidate;
            const important =
              selectedNodeRef.current?.id === node.id ||
              highlightNodesRef.current.has(node.id) ||
              highlightedNodesRef.current.has(node.id);
            const cell = `${Math.round(screenX / LABEL_CELL_WIDTH)}:${Math.round(screenY / LABEL_CELL_HEIGHT)}`;
            if (!important && occupiedLabelCells.has(cell)) return;
            occupiedLabelCells.add(cell);
            readableVisibleLabels.push(candidate);
          });
          const labelNodeIds = new Set(
            labelBudget > 0 ? readableVisibleLabels.slice(0, labelBudget).map(({ node }) => node.id) : [],
          );
          const boardLabelBudget = labelMode === "hidden" ? 28 : labelMode === "focus" ? 44 : 72;
          rankedVisibleNodes
            .filter(({ node }) => isBoardNode(node))
            .slice(0, boardLabelBudget)
            .forEach(({ node }) => labelNodeIds.add(node.id));
          if (selectedNodeRef.current?.id) labelNodeIds.add(selectedNodeRef.current.id);
          highlightNodesRef.current.forEach((id) => labelNodeIds.add(id));

          viewStateRef.current = {
            distance,
            inFrameNodeIds,
            labelNodeIds,
            labelMode,
            linkMode,
            relationLabelMode,
          };

          // Drive opacity of persistent node-tag sprites. Rules:
          //   • selected/highlighted node + every neighbor → always visible
          //   • zoom='all' → only the ranked top N (labelNodeIds) surface
          //   • zoom='focus' → only selected/highlighted (no noise at mid-zoom)
          //   • zoom='hidden' → all sprites hidden except selected/highlighted
          const selectedId = selectedNodeRef.current?.id || null;
          const neighborIds = selectedId ? (neighborMapRef.current.get(selectedId) || new Set()) : new Set();
          const themeName = themeRef.current.name;
          nodeTagSpritesRef.current.forEach((sprite, nid) => {
            if (!sprite?.material) return;
            const isSelected = selectedId === nid;
            const isNeighbor = selectedId ? neighborIds.has(nid) : false;
            const isHighlighted = highlightNodesRef.current.has(nid) || highlightedNodesRef.current.has(nid);
            const isLabeled = labelNodeIds.has(nid);
            let opacity = 0;
            const node = nodeMapRef.current.get(nid);
            const board = isBoardNode(node);
            let variant = board ? "board" : "normal";
            if (isSelected) opacity = 1;
            else if (isNeighbor) opacity = 0.95;
            else if (isHighlighted) opacity = 0.92;
            else if (labelMode === 'hidden') opacity = board && isLabeled && inFrameNodeIds.has(nid) ? 0.92 : 0;
            else if (labelMode === 'focus') opacity = isLabeled && inFrameNodeIds.has(nid) ? (board ? 0.98 : themeName === 'atlas' ? 0.8 : 0.68) : 0;
            else opacity = isLabeled && inFrameNodeIds.has(nid) ? (board ? 0.98 : themeName === 'atlas' ? 0.94 : themeName === 'night' ? 0.92 : 0.9) : 0;
            if (isSelected) variant = board ? "boardSelected" : "selected";
            else if (isNeighbor || isHighlighted) variant = board ? "boardFocus" : "focus";
            setNodeLabelSpriteVariant(sprite, variant, themeName);
            sprite.material.opacity = opacity;
            sprite.visible = opacity > 0.01;
          });

          refreshHighlightRef.current();
          onViewStateChangeRef.current?.({
            distance,
            target: { x: targetNow.x, y: targetNow.y, z: targetNow.z },
            camera: {
              x: cameraNow.position.x,
              y: cameraNow.position.y,
              z: cameraNow.position.z,
            },
            inFrameNodeIds: [...inFrameNodeIds],
            labelNodeIds: [...labelNodeIds],
            labelMode,
            linkMode,
            relationLabelMode,
          });
        });
      };

      emitViewStateRef.current = emitViewState;
      controls.addEventListener?.("change", emitViewState);
      emitViewState();
    }

    const ambientLight = new THREE.AmbientLight("#fff2e7", themeRef.current.name === "day" ? 1.18 : 1.34);
    const keyLight = new THREE.DirectionalLight("#ffd6cc", themeRef.current.name === "day" ? 0.62 : 0.78);
    keyLight.position.set(0, 120, 180);
    const rimLight = new THREE.DirectionalLight("#ff615a", themeRef.current.name === "day" ? 0.18 : 0.38);
    rimLight.position.set(-180, 70, -120);
    scene?.add?.(ambientLight);
    scene?.add?.(keyLight);
    scene?.add?.(rimLight);

    resizeObserverRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: cw, height: ch } = entry.contentRect;
      // Ignore 0-sized callbacks (container not laid out yet on SPA mount).
      // Setting a 0x0 WebGL viewport blanks the canvas until a manual refresh.
      if (cw <= 0 || ch <= 0) return;
      fg.width(cw);
      fg.height(ch);
    });
    resizeObserverRef.current.observe(containerRef.current);

    // Warm the canvas across the next few frames. On SPA navigation the
    // container can report 0x0 for a frame or two before layout settles —
    // re-measure until it has real dimensions so the graph paints on first
    // entry without needing a manual page refresh.
    let warmFrames = 0;
    const warm = () => {
      const el = containerRef.current;
      const inst = fgRef.current;
      if (!el || !inst) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        inst.width(w);
        inst.height(h);
      }
      warmFrames += 1;
      if (warmFrames < 8) {
        warmFrameRef.current = window.requestAnimationFrame(warm);
      } else {
        try {
          inst.d3ReheatSimulation?.();
        } catch (_e) {
          // noop
        }
      }
    };
    warmFrameRef.current = window.requestAnimationFrame(warm);

    return () => {
      const activeControls = fg.controls?.();
      if (activeControls && emitViewStateRef.current) {
        activeControls.removeEventListener?.("change", emitViewStateRef.current);
      }
      emitViewStateRef.current = null;
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (resumeFrameRef.current != null) {
        window.cancelAnimationFrame(resumeFrameRef.current);
        resumeFrameRef.current = null;
      }
      if (warmFrameRef.current != null) {
        window.cancelAnimationFrame(warmFrameRef.current);
        warmFrameRef.current = null;
      }
      resizeObserverRef.current?.disconnect?.();
      resizeObserverRef.current = null;
      try {
        fg.pauseAnimation?.();
      } catch (_error) {
        // noop
      }
      fg._destructor?.();
      fgRef.current = null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nodeTagSpritesRef.current?.clear?.();
    };
  // The graph instance must be created once; live React values are read from refs above.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg
      .backgroundColor(getThemeBackground(themeRef.current, backgroundColor))
      .nodeColor((node) => getNodeColor(node))
      .nodeThreeObject((node) => {
        const clusterTint = getClusterHaloColor(node);
        // Drop the additive halo+field glow meshes (3 meshes/node → 1) on any
        // non-small graph. Additive blending is fill-rate heavy and the extra
        // draw calls stack up fast; only small graphs keep the glow.
        const liteNode = getGraphSizeTier(graphDataRef.current?.nodes?.length || 0) !== "small";
        const object3d = makeNodeShape(node, getNodeColor(node), clusterTint, liteNode);
        const tag = (labelAllowRef.current && !labelAllowRef.current.has(node.id))
          ? null
          : getNodeDisplayLabel(node);
        if (tag) {
          const sprite = makeNodeTagSprite(tag, themeRef.current.name, isBoardNode(node) ? "board" : "normal");
          const radius = getNodeRadius(node);
          sprite.position.set(0, radius * 2.05 + 1.6, 0);
          object3d.add(sprite);
          nodeTagSpritesRef.current.set(node.id, sprite);
        } else {
          nodeTagSpritesRef.current.delete(node.id);
        }
        updateNodeObjectAppearance(node, object3d);
        return object3d;
      })
      .nodeVisibility((node) => isNodeVisible(node))
      .linkVisibility((link) => isLinkVisible(link))
      .linkColor((link) => getLinkColor(link))
      .linkLabel((link) => getLinkLabel(link))
      .linkWidth((link) => getLinkWidth(link))
      .linkDirectionalParticles((link) => getLinkParticles(link))
      .linkDirectionalParticleSpeed((link) => getLinkParticleSpeed(link))
      .linkOpacity((link) => getLinkOpacity(link))
      .nodeLabel((node) => getNodeLabel(node));
    refreshHighlight();
  }, [
    backgroundColor,
    getClusterHaloColor,
    getLinkColor,
    getLinkLabel,
    getLinkOpacity,
    getLinkParticles,
    getLinkParticleSpeed,
    getLinkWidth,
    getNodeColor,
    getNodeLabel,
    isLinkVisible,
    isNodeVisible,
    refreshHighlight,
    updateNodeObjectAppearance,
  ]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.width(width);
    fg.height(height);
  }, [height, width]);

  useEffect(() => {
    const fg = fgRef.current;
    const el = containerRef.current;
    if (!fg || !el) return undefined;

    let frame = 0;
    let cancelled = false;
    const repair = () => {
      if (cancelled || !fgRef.current || !containerRef.current) return;
      const current = fgRef.current;
      const box = containerRef.current.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(box.width || width || window.innerWidth || 1));
      const nextH = Math.max(1, Math.round(box.height || height || window.innerHeight || 1));
      current.width(nextW);
      current.height(nextH);
      try {
        current.resumeAnimation?.();
        if (frame === 1 || frame === 4) current.d3ReheatSimulation?.();
      } catch (_error) {
        // Repaint repair is best-effort; the graph remains usable if unsupported.
      }
      frame += 1;
      if (frame < 7) window.requestAnimationFrame(repair);
    };

    window.requestAnimationFrame(repair);
    return () => {
      cancelled = true;
    };
  }, [graphData, height, width]);

  useEffect(() => {
    withPausedAnimation((fg) => {
      // graphData swap rebuilds node Three objects; drop any stale sprite
      // references so the per-frame opacity loop doesn't touch orphans.
      nodeTagSpritesRef.current.clear();
      fg.graphData(graphData);
      refreshHighlight();
    });
    // New dataset → allow one fresh wide-shot fit when it next settles.
    didInitialFitRef.current = false;
  }, [graphData, refreshHighlight, withPausedAnimation]);

  useEffect(() => {
    withPausedAnimation((fg) => {
      const charge = fg.d3Force("charge");
      if (charge?.strength) {
        charge.strength((node) => {
          if (node.clusterId === "_orphan") return -28;
          return -78 - (node.val || 1) * 11;
        });
        charge.theta?.(0.9);
        charge.distanceMax?.(650);
      }

      const link = fg.d3Force("link");
      if (link?.distance) {
        link.distance((edge) => {
          const src = edge.source;
          const tgt = edge.target;
          if (!src || !tgt) return 120;
          const sameCluster = src?.clusterId && src.clusterId === tgt?.clusterId;
          return sameCluster ? 48 : 138;
        });
        link.strength((edge) => {
          const src = edge.source;
          const tgt = edge.target;
          if (!src || !tgt) return 0.02;
          const sameCluster = src?.clusterId && src.clusterId === tgt?.clusterId;
          return sameCluster ? 0.46 : 0.075;
        });
      }

      // Cluster centroid pull DISABLED — user wants zero implied
      // connections. Only real DB relationships should pull nodes
      // together (via the standard d3 link force). Centroid bias was
      // making unrelated nodes drift into the same visual cluster,
      // reading as a "connection" that doesn't exist.
      try {
        fg.d3Force("clusterBias", null);
      } catch (_error) {
        // noop
      }

      fg.d3ReheatSimulation();
    });
  }, [clusterCentroids, clusters.length, graphData.nodes, withPausedAnimation]);

  useEffect(() => {
    refreshHighlight();
  }, [highlightNodes, selectedNode, refreshHighlight]);

  useEffect(() => {
    if (selectedNode) focusNode(selectedNode, 700, 4.2);
  }, [focusNode, selectedNode]);

  const empty = useMemo(() => !graphData?.nodes?.length, [graphData]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ opacity: empty ? 0 : 1 }}
    />
  );
});

export default MemoryGraph3D;
