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

// ─── Monochromatic theme system ────────────────────────────────────────────
// Two palettes — strict greyscale, no chroma. Day = ink-on-paper. Night =
// cosmic monochrome (deep black scene, near-white nodes, soft grey edges).
// Switching themes only restyles the graph canvas, not the surrounding UI.
const THEMES = {
  day: {
    name: "day",
    bg: "rgba(0,0,0,0)",                // page bg shows through (warm paper)
    sceneClear: null,                    // null = use prop-supplied bg
    label: "#0a0a0a",                    // labels: ink
    labelDim: "#525252",
    edgeLabelBg: "rgba(255,255,255,0.92)",
    edgeLabelBorder: "rgba(0,0,0,0.10)",
    nodeAccent: "#0a0a0a",               // hub / selected
    nodeBase: "#3a3a3a",                 // most nodes
    nodeMuted: "#9a958d",                // unfocused / filtered out
    nodeShell: "#f8f5ee",                // orphan halo
    linkBase: "#2a2a2a",                 // dark gray edges on light bg
    linkDim: "#bcb6ac",
    particle: "#4a4a4a",
    haloOpacity: 0.06,
  },
  night: {
    name: "night",
    bg: "#06070a",                       // deep cosmic
    sceneClear: "#06070a",
    label: "#f4f1ea",
    labelDim: "#9a958d",
    edgeLabelBg: "rgba(8,9,12,0.86)",
    edgeLabelBorder: "rgba(255,255,255,0.14)",
    nodeAccent: "#ffffff",
    nodeBase: "#c8c4bc",
    nodeMuted: "#4a4640",
    nodeShell: "#1a1c20",
    linkBase: "#9a958d",                 // near-white edges on black
    linkDim: "#3a3a3a",
    particle: "#e8e2d4",
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
  const text = confidence ? `${type}  ${confidence}` : type;
  const dpr = 2;
  const fontSize = 22 * dpr;
  const padX = 14 * dpr;
  const padY = 8 * dpr;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `600 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  const textW = ctx.measureText(text).width;
  canvas.width = Math.ceil(textW + padX * 2);
  canvas.height = Math.ceil(fontSize + padY * 2);
  const r = canvas.height / 2;
  ctx.fillStyle = t.edgeLabelBg;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(canvas.width, 0, canvas.width, canvas.height, r);
  ctx.arcTo(canvas.width, canvas.height, 0, canvas.height, r);
  ctx.arcTo(0, canvas.height, 0, 0, r);
  ctx.arcTo(0, 0, canvas.width, 0, r);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = dpr;
  ctx.strokeStyle = t.edgeLabelBorder;
  ctx.stroke();
  ctx.font = `600 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillStyle = t.label;
  ctx.textBaseline = "middle";
  ctx.fillText(text, padX, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const entry = { texture: tex, w: canvas.width / dpr, h: canvas.height / dpr };
  labelTextureCache.set(key, entry);
  return entry;
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
  focus: 18,
  all: 42,
};

const RELATION_LABEL_DISTANCE = 260;

function getNodeRadius(node) {
  let radius = Math.min(5.8, Math.sqrt(node.val || 4) * 0.98);

  if (node.clusterId === "_orphan") radius = Math.max(radius * 0.48, 1);
  else if (node.clusterRole === "hub") radius = Math.min(7.2, radius * 1.18);
  else if (node.clusterRole === "bridge") radius = Math.max(radius * 0.82, 1.6);

  if (node.nodeLayer === "fact") radius = Math.max(radius * 0.85, 2.1);
  if (node.nodeLayer === "promoted") radius = Math.min(6.1, radius * 1.02);
  if (node.nodeLayer === "tara") radius = Math.min(6.1, radius * 1.02);
  if (node.nodeLayer === "tara-insight") radius *= 1.04;

  return radius;
}

function getNodeType(node) {
  // Intelligent-graph node.kind takes precedence
  if (node?.kind === 'document') return 'document';
  if (node?.kind === 'entity') return 'entity';
  return (node.memoryType || node.memory_type || node.type || "").toLowerCase() || "default";
}

// Color overrides for non-memory node kinds
function getKindColor(node) {
  if (node?.kind === 'document') return '#f59e0b';  // amber — like the image
  if (node?.kind === 'entity') return '#10b981';     // emerald
  return null;
}

// Edge color by type (matches the image: purple=derived_from, red=contradicts, green=supports)
function getEdgeColorByType(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'contradicts') return '#ef4444';        // red
  if (t === 'derived_from' || t === 'derives') return '#a78bfa'; // purple
  if (t === 'supports' || t === 'mentions') return '#10b981';     // green
  if (t === 'updates') return '#3b82f6';            // blue
  if (t === 'extends') return '#8b5cf6';            // violet
  if (t === 'needs_revision') return '#f59e0b';     // amber
  if (t === 'peer_review') return '#64748b';        // slate
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

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return { r: 143, g: 138, b: 130 };
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function makeMaterial(color, opacity = 0.96) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    roughness: 0.42,
    metalness: 0.03,
  });
}

function makeNodeShape(node, color, clusterTint) {
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

  switch (type) {
    case "document":
      // Diamond/octahedron — matches reference image style
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 1.25, 0), primaryMaterial);
      break;
    case "entity":
      // Hexagonal disc — entity nodes
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, radius * 0.4, 6), primaryMaterial);
      break;
    case "decision":
      mesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.98, 16, 16), primaryMaterial);
      break;
    case "preference":
      mesh = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.7, radius * 1.28, radius * 1.05), primaryMaterial);
      break;
    case "goal":
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.98, radius * 0.98, radius * 1.45, 6), primaryMaterial);
      mesh.rotation.z = Math.PI / 2;
      break;
    case "lesson":
      mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(radius * 1.18, 0), primaryMaterial);
      break;
    case "event":
      mesh = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.55, radius * 1.1, radius * 1.1), primaryMaterial);
      break;
    case "relationship": {
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.88, Math.max(radius * 0.16, 0.24), 12, 28),
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
      mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 14), primaryMaterial);
      break;
  }

  const field = new THREE.Mesh(
    new THREE.SphereGeometry(radius * (clusterTint ? 2.35 : 2.08), 14, 14),
    fieldMaterial,
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * (clusterTint ? 1.72 : 1.48), 12, 12),
    haloMaterial,
  );
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
    theme: themeProp = "day",
  },
  ref,
) {
  // Resolve active palette. theme prop accepts 'day' | 'night'.
  const theme = THEMES[themeProp] || THEMES.day;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  // When theme prop flips, re-apply backgroundColor + force a recolor pass
  // so existing materials swap immediately without remount.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.backgroundColor(theme.name === "night" ? theme.bg : backgroundColor);
    if (refreshHighlightRef.current) refreshHighlightRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeProp]);
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const highlightedNodesRef = useRef(new Set());
  const highlightedLinksRef = useRef(new Set());
  const animationFrameRef = useRef(null);
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
  const viewStateRef = useRef({
    distance: 1100,
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
      return `
        <div style="
          max-width:240px;
          padding:${selected ? "7px 9px" : "5px 7px"};
          border:${selected ? "1px solid rgba(17,17,17,0.72)" : "1px solid rgba(84,80,72,0.18)"};
          border-radius:8px;
          background:${selected ? "rgba(17,17,17,0.9)" : "rgba(255,252,245,0.88)"};
          color:${selected ? "#fffaf2" : "#25231f"};
          box-shadow:${selected ? "0 12px 28px rgba(0,0,0,0.16)" : "0 8px 22px rgba(38,35,30,0.08)"};
          font-family:'Space Grotesk',sans-serif;
          font-size:${selected ? "12px" : "11px"};
          font-weight:${selected ? "650" : "560"};
          line-height:1.25;
          white-space:normal;
        ">${node.title || "Untitled"}</div>
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

  // Theme-aware node color. getNodeColorBase produces a greyscale ramp
  // tuned for light backgrounds. For night, invert each channel so dark
  // particles become bright stars instead of vanishing on the black sky.
  const getNodeColor = useCallback((node) => {
      const t = themeRef.current;
      const highlightedNodes = highlightedNodesRef.current;
      let baseColor = getNodeColorBase(node);
      if (t.name === "night") {
        const rgb = hexToRgb(baseColor);
        baseColor = `rgb(${255 - rgb.r},${255 - rgb.g},${255 - rgb.b})`;
      }
      if (highlightedNodes.has(node.id)) {
        return selectedNodeRef.current?.id === node.id
          ? t.nodeAccent
          : (t.name === "night" ? "#dcd6c9" : "#36332d");
      }
      if (highlightNodesRef.current.size > 0 && !highlightNodesRef.current.has(node.id)) {
        const fallback = baseColor.startsWith("#") ? hexToRgb(baseColor) : { r: 136, g: 136, b: 136 };
        return `rgba(${fallback.r},${fallback.g},${fallback.b},0.14)`;
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
    if (highlightNodesRef.current.has(node.id)) return t.name === "night" ? "#dcd6c9" : "#5a554c";
    return null;
  }, []);

  // Theme-aware link color: mix theme.linkBase → theme.nodeAccent by the
  // relation's weight so each type keeps its contrast hierarchy in both
  // themes (Updates darkest, References lightest).
  const getLinkColor = useCallback((link) => {
    const t = themeRef.current;
    if (highlightedLinksRef.current.has(link)) return t.nodeAccent;
    // Type-specific colors take priority (Contradicts=red, derived_from=purple, etc.)
    const typeColor = getEdgeColorByType(link?.type);
    if (typeColor) return typeColor;
    const style = RELATION_WEIGHTS[link?.type] || RELATION_WEIGHTS.default;
    return mixHex(t.linkBase, t.nodeAccent, 1 - style.weight);
  }, []);

  const getLinkWidth = useCallback((link) => {
    const style = getRelationStyle(link);
    return highlightedLinksRef.current.has(link) ? 1.22 : style.width;
  }, []);

  const getLinkParticles = useCallback((link) => {
    const style = getRelationStyle(link);
    return highlightedLinksRef.current.has(link) ? 0 : style.particles;
  }, []);

  const getLinkParticleSpeed = useCallback((link) => {
    if (link.type === "Derives") return 0.0042;
    if (link.type === "Updates") return 0.0038;
    if (link.type === "Extends") return 0.0034;
    return 0.0028;
  }, []);

  const getLinkOpacity = useCallback((link) => {
    const style = getRelationStyle(link);
    return highlightedLinksRef.current.has(link) ? 0.82 : style.opacity;
  }, []);

  const updateNodeObjectAppearance = useCallback((node, object3d) => {
    if (!object3d?.userData?.primaryMaterial) return;
    const color = getNodeColorRef.current(node);
    const haloColor = getClusterHaloColor(node);
    object3d.userData.primaryMaterial.color.set(color);
    object3d.userData.haloMaterial.color.set(haloColor || GRAPH_THEME.halo);
    object3d.userData.haloMaterial.opacity = haloColor ? 0.24 : 0.08;
  }, [getClusterHaloColor]);

  useEffect(() => {
    graphDataRef.current = graphData;
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

  const fitView = useCallback((duration = 500) => {
    fgRef.current?.zoomToFit?.(duration, 50);
  }, []);

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
      .backgroundColor(themeRef.current.name === "night" ? themeRef.current.bg : backgroundColorRef.current)
      .showNavInfo(false)
      .nodeResolution(12)
      .nodeRelSize(1.65)
      .nodeOpacity(0.9)
      .nodeColor((node) => getNodeColorRef.current(node))
      .nodeVal((node) => getNodeRadius(node))
      .nodeThreeObject((node) => {
        const clusterTint = getClusterHaloColor(node);
        return makeNodeShape(node, getNodeColorRef.current(node), clusterTint);
      })
      .nodeThreeObjectExtend(false)
      .nodeVisibility((node) => isNodeVisibleRef.current(node))
      .linkOpacity((link) => getLinkOpacity(link))
      .linkDirectionalParticleWidth(1.1)
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
      .linkThreeObject((link) => makeLinkLabelSprite(link, themeRef.current.name))
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

    const scene = fg.scene?.();
    if (scene) {
      scene.background = null;
      scene.fog = null;
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

          const inFrameNodeIds = new Set();
          (graphDataRef.current.nodes || []).forEach((node) => {
            if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) return;
            const radius = getNodeRadius(node) * 1.8;
            const sphere = new THREE.Sphere(new THREE.Vector3(node.x, node.y, node.z), radius);
            if (frustum.intersectsSphere(sphere)) inFrameNodeIds.add(node.id);
          });

          const distance = cameraNow.position.distanceTo(targetNow);
          const labelMode = distance > 520 ? "hidden" : distance > 240 ? "focus" : "all";
          const linkMode = distance > 900 ? "sparse" : distance > 420 ? "focus" : "all";
          const relationLabelMode = distance > RELATION_LABEL_DISTANCE ? "hidden" : distance > 180 ? "focus" : "all";
          const labelBudget = LABEL_LIMITS[labelMode] ?? 0;
          const rankedVisibleNodes = [...inFrameNodeIds]
            .map((id) => nodeMapRef.current.get(id))
            .filter(Boolean)
            .sort((a, b) => {
              const score = (node) => {
                let value = (node.importanceScore || 0) * 10 + (node.val || 0) + (node.hubScore || 0) * 4;
                if (selectedNodeRef.current?.id === node.id) value += 1000;
                if (highlightNodesRef.current.has(node.id)) value += 500;
                if (highlightedNodesRef.current.has(node.id)) value += 250;
                if (node.clusterRole === "hub") value += 30;
                return value;
              };
              return score(b) - score(a);
            });
          const labelNodeIds = new Set(
            labelBudget > 0 ? rankedVisibleNodes.slice(0, labelBudget).map((node) => node.id) : [],
          );
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

    const ambientLight = new THREE.AmbientLight("#ffffff", 1.2);
    const keyLight = new THREE.DirectionalLight("#ffffff", 0.55);
    keyLight.position.set(0, 120, 180);
    scene?.add?.(ambientLight);
    scene?.add?.(keyLight);

    resizeObserverRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      fg.width(entry.contentRect.width);
      fg.height(entry.contentRect.height);
    });
    resizeObserverRef.current.observe(containerRef.current);

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
      resizeObserverRef.current?.disconnect?.();
      resizeObserverRef.current = null;
      try {
        fg.pauseAnimation?.();
      } catch (_error) {
        // noop
      }
      fg._destructor?.();
      fgRef.current = null;
    };
  // The graph instance must be created once; live React values are read from refs above.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg
      .backgroundColor(themeRef.current.name === "night" ? themeRef.current.bg : backgroundColor)
      .nodeColor((node) => getNodeColor(node))
      .nodeThreeObject((node) => {
        const clusterTint = getClusterHaloColor(node);
        const object3d = makeNodeShape(node, getNodeColor(node), clusterTint);
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
    withPausedAnimation((fg) => {
      fg.graphData(graphData);
      refreshHighlight();
    });
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
