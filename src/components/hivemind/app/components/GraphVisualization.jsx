import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Activity,
  Award,
  BrainCircuit,
  CheckCircle2,
  CircleHelp,
  Download,
  ExternalLink,
  Eye,
  Filter,
  FlaskConical,
  Globe,
  Layers,
  Loader2,
  Orbit,
  RotateCcw,
  Save,
  Scroll,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import GraphContextMenu from './research-graph/GraphContextMenu';
import {
  buildGraphPresentation,
  countActiveGraphFilters,
  createDownload,
  createGraphExportPayload,
  DEFAULT_GRAPH_LAYERS,
  mergeGraphLayers,
} from './research-graph/graph-contract';
import { useOptional3DRenderer } from './research-graph/runtime-loader';

const DEFAULT_DETACHED_BOUNDS = {
  x: 100,
  y: 100,
  width: 600,
  height: 500,
};

const RUNTIME_BADGES = {
  tavily: { label: 'Tavily', color: '#0ea5e9', icon: Server },
  lightpanda: { label: 'LightPanda', color: '#8b5cf6', icon: Zap },
  fetch: { label: 'Fetch', color: '#64748b', icon: Globe },
};

const NODE_ICONS = {
  source: Globe,
  claim: CheckCircle2,
  'structured-claim': CheckCircle2,
  'plain-claim': CheckCircle2,
  trail: Scroll,
  blueprint: Award,
  observation: Eye,
  'execution-event': Activity,
  'csi-observation': FlaskConical,
  'csi-hypothesis': BrainCircuit,
  'csi-verdict': ShieldCheck,
};

const VERDICT_META = {
  verified: { label: 'Verified', color: '#16a34a', icon: ShieldCheck },
  disputed: { label: 'Disputed', color: '#dc2626', icon: ShieldAlert },
  uncertain: { label: 'Uncertain', color: '#d97706', icon: CircleHelp },
};

const LAYER_BUTTONS = [
  { name: 'sources', label: 'Sources', icon: Globe, compactClass: 'bg-[#117dff]/10 text-[#117dff]' },
  { name: 'claims', label: 'Claims', icon: CheckCircle2, compactClass: 'bg-[#16a34a]/10 text-[#16a34a]' },
  { name: 'trails', label: 'Trails', icon: Scroll, compactClass: 'bg-[#9333ea]/10 text-[#9333ea]' },
  { name: 'blueprints', label: 'Blueprints', icon: Award, compactClass: 'bg-[#d97706]/10 text-[#d97706]' },
  { name: 'observations', label: 'Observations', icon: Eye, compactClass: 'bg-[#3b82f6]/10 text-[#3b82f6]' },
  { name: 'executionEvents', label: 'Events', icon: Activity, compactClass: 'bg-[#059669]/10 text-[#059669]' },
  { name: 'csi', label: 'CSI', icon: BrainCircuit, compactClass: 'bg-[#8b5cf6]/10 text-[#8b5cf6]' },
];

function quotaTextColor(used, limit) {
  if (!limit) return 'text-[#117dff]';
  const pct = (used / limit) * 100;
  if (pct >= 80) return 'text-red-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-emerald-600';
}

function resolveNextState(nextState, currentState) {
  return typeof nextState === 'function' ? nextState(currentState) : nextState;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(17,125,255,${alpha})`;
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(17,125,255,${alpha})`;
  const int = Number.parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function resolveNodeColor(node) {
  if (node.verdict && VERDICT_META[node.verdict]) return VERDICT_META[node.verdict].color;
  return node.color || '#117dff';
}

function resolveNodeVisualState(node) {
  const graphState = node.__graphState || {};
  const baseColor = resolveNodeColor(node);
  return {
    baseColor,
    fillColor: graphState.isDimmed ? hexToRgba(baseColor, 0.28) : baseColor,
    strokeColor: graphState.isSelected
      ? '#0a0a0a'
      : graphState.isHovered
        ? '#117dff'
        : graphState.isHighlighted
          ? '#9333ea'
          : graphState.isConnected
            ? '#0f766e'
            : hexToRgba(baseColor, 0.28),
    ringColor: graphState.isSelected
      ? hexToRgba('#0a0a0a', 0.18)
      : graphState.isHovered || graphState.isHighlighted
        ? hexToRgba(baseColor, 0.18)
        : null,
    opacity: graphState.isDimmed ? 0.36 : 1,
    lineWidth: graphState.isSelected || graphState.isHovered || graphState.isHighlighted ? 2 : 1,
  };
}

function defaultNodeCanvasObject(node, ctx, globalScale) {
  const label = node.title || '';
  const fontSize = 10 / globalScale;
  const nodeRadius = (node.val || 4) * (node.__graphState?.isHovered ? 1.12 : 1);
  const { fillColor, strokeColor, ringColor, opacity, lineWidth } = resolveNodeVisualState(node);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `${fontSize}px Sans-Serif`;

  if (node.isLive) {
    const pulseSize = nodeRadius * 1.9;
    const pulseOpacity = 0.24 + Math.sin(Date.now() / 200) * 0.16;
    ctx.beginPath();
    ctx.arc(node.x, node.y, pulseSize, 0, 2 * Math.PI);
    ctx.fillStyle = hexToRgba(resolveNodeColor(node), clamp(pulseOpacity, 0.12, 0.44));
    ctx.fill();
  }

  if (ringColor) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius * 1.55, 0, 2 * Math.PI);
    ctx.fillStyle = ringColor;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();

  if (node.type === 'source' && node.runtime) {
    const runtimeBadge = RUNTIME_BADGES[node.runtime] || RUNTIME_BADGES.fetch;
    ctx.fillStyle = runtimeBadge.color;
    ctx.beginPath();
    ctx.arc(node.x + nodeRadius - 2, node.y - nodeRadius + 2, 4, 0, 2 * Math.PI);
    ctx.fill();
  }

  if (node.verdict && VERDICT_META[node.verdict]) {
    ctx.beginPath();
    ctx.arc(node.x - nodeRadius + 2, node.y - nodeRadius + 2, 4, 0, 2 * Math.PI);
    ctx.fillStyle = VERDICT_META[node.verdict].color;
    ctx.fill();
  }

  if (label && (!node.__graphState?.isDimmed || node.__graphState?.isSelected || node.__graphState?.isHovered)) {
    ctx.fillStyle = '#0a0a0a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, node.x, node.y - nodeRadius - 2);
  }

  ctx.restore();
}

function defaultLinkColor(link) {
  const graphState = link.__graphState || {};
  const baseColor = link.color || '#d4d1ca';
  if (graphState.isHighlighted) return '#9333ea';
  if (graphState.isFocused) return '#117dff';
  if (graphState.isDimmed) return hexToRgba(baseColor, 0.16);
  return baseColor;
}

function readViewportSnapshot(graphRef, rendererMode, size) {
  const graph = graphRef?.current;
  const snapshot = {
    rendererMode,
    width: size.width,
    height: size.height,
    capturedAt: new Date().toISOString(),
  };

  if (!graph) return snapshot;

  if (rendererMode === '3d') {
    try {
      const camera = graph.camera?.();
      if (camera?.position) {
        snapshot.camera = {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
          zoom: camera.zoom,
          fov: camera.fov,
        };
      }
    } catch (error) {
      snapshot.cameraError = error instanceof Error ? error.message : String(error);
    }

    try {
      const controls = graph.controls?.();
      if (controls?.target) {
        snapshot.target = {
          x: controls.target.x,
          y: controls.target.y,
          z: controls.target.z,
        };
      }
    } catch (error) {
      snapshot.controlsError = error instanceof Error ? error.message : String(error);
    }

    return snapshot;
  }

  try {
    if (typeof graph.zoom === 'function') snapshot.zoom = graph.zoom();
  } catch (error) {
    snapshot.zoomError = error instanceof Error ? error.message : String(error);
  }

  return snapshot;
}

function LayerToggleRow({ layers, onToggle, compact = false }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-0.5' : 'gap-1 overflow-x-auto scrollbar-hide pr-1'}`}>
      {LAYER_BUTTONS.map(({ name, label, icon: Icon, compactClass }) => (
        <button
          key={name}
          onClick={() => onToggle(name)}
          className={
            compact
              ? `p-1 rounded ${layers[name] ? compactClass : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'}`
              : `flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all flex-shrink-0 ${
                  layers[name] ? compactClass : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                }`
          }
          title={`Toggle ${label}`}
          type="button"
        >
          <Icon size={compact ? 12 : 10} />
          {!compact && <span className="hidden sm:inline">{label}</span>}
        </button>
      ))}
    </div>
  );
}

function EmptyGraphState({ loading, showWindowState, rendererMode, rendererStatus }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[#525252]">
      {loading || rendererStatus === 'loading' ? (
        <>
          <Loader2 size={32} className="animate-spin text-[#117dff] mb-3" />
          <p className="text-sm">{rendererStatus === 'loading' ? 'Loading 3D graph engine...' : 'Loading graph...'}</p>
        </>
      ) : (
        <>
          <Layers size={48} className="text-[#e3e0db] mb-3" />
          <p className="text-sm">{showWindowState ? 'No graph data available' : 'No graph data yet — starting research...'}</p>
          <p className="text-[11px] text-[#737373] mt-2">Renderer: {rendererMode === '3d' ? '3D' : '2D fallback'}</p>
        </>
      )}
    </div>
  );
}

function RendererBadge({ mode, status }) {
  const tone = mode === '3d'
    ? 'bg-[#117dff]/10 text-[#117dff] border-[#117dff]/20'
    : status === 'unavailable'
      ? 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
      : 'bg-[#faf9f4] text-[#525252] border-[#e3e0db]';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-medium ${tone}`}>
      <Orbit size={11} />
      {mode === '3d' ? '3D Graph' : status === 'unavailable' ? '2D Fallback' : '2D Graph'}
    </span>
  );
}

function NodeDetailCard({ node, onClose, onSaveToMemory, savingMemories }) {
  if (!node) return null;

  const RuntimeIcon = RUNTIME_BADGES[node.runtime]?.icon || Globe;
  const verdictMeta = node.verdict ? VERDICT_META[node.verdict] : null;
  const VerdictIcon = verdictMeta?.icon || null;
  const Icon = NODE_ICONS[node.type] || NODE_ICONS.claim || Globe;
  const isSaving = savingMemories?.has?.(node.id) || false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-4 right-4 w-80 sm:w-96 max-w-[90vw] bg-white/98 backdrop-blur border border-[#e3e0db] rounded-xl shadow-xl p-4 z-20 max-h-[80vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${resolveNodeColor(node)}20` }}>
            <Icon size={16} style={{ color: resolveNodeColor(node) }} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0a0a0a] capitalize">{String(node.type || 'node').replaceAll('-', ' ')}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {node.runtime && (
                <div className="flex items-center gap-1">
                  <RuntimeIcon size={8} className="text-[#a3a3a3]" />
                  <span className="text-[9px] text-[#525252] capitalize">{RUNTIME_BADGES[node.runtime]?.label || node.runtime}</span>
                </div>
              )}
              {node.stage && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#faf9f4] border border-[#e3e0db] text-[#525252] uppercase">
                  {node.stage}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#e3e0db]/40 text-[#525252]" type="button">
          <X size={12} />
        </button>
      </div>

      <p className="text-xs text-[#525252]/80 leading-relaxed mb-3">{node.title}</p>

      {node.summary && (
        <div className="mb-3 rounded-lg border border-[#e3e0db] bg-[#faf9f4] p-2.5">
          <p className="text-[9px] uppercase tracking-wide text-[#737373] font-semibold mb-1.5">Summary</p>
          <p className="text-[10px] text-[#0a0a0a] leading-relaxed">{node.summary}</p>
        </div>
      )}

      {node.url && (
        <a href={node.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-[#117dff] hover:underline mb-3">
          <Globe size={10} />
          <span className="truncate">{node.url}</span>
        </a>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-3">
        {node.confidence != null && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#525252]">Confidence:</span>
            <span className={`text-[10px] font-semibold ${node.confidence >= 0.7 ? 'text-emerald-600' : node.confidence >= 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
              {(node.confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {verdictMeta && VerdictIcon && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium" style={{ color: verdictMeta.color, backgroundColor: `${verdictMeta.color}15` }}>
            <VerdictIcon size={11} />
            {verdictMeta.label}
          </span>
        )}
      </div>

      {node.structured && (
        <div className="space-y-3 mb-3">
          <div className="bg-[#faf9f4] rounded-lg p-2.5 border border-[#e3e0db]">
            <p className="text-[9px] font-semibold text-[#525252] mb-1.5 uppercase tracking-wide">Structure</p>
            <div className="space-y-1.5">
              {node.structured.subject && (
                <div className="flex items-start gap-1.5">
                  <span className="text-[9px] font-medium text-[#525252] mt-0.5">Subject:</span>
                  <span className="text-[10px] text-[#0a0a0a] font-medium">{node.structured.subject}</span>
                </div>
              )}
              {node.structured.predicate && (
                <div className="flex items-start gap-1.5">
                  <span className="text-[9px] font-medium text-[#525252] mt-0.5">Predicate:</span>
                  <span className="text-[10px] text-[#0a0a0a]">{node.structured.predicate}</span>
                </div>
              )}
              {node.structured.object && (
                <div className="flex items-start gap-1.5">
                  <span className="text-[9px] font-medium text-[#525252] mt-0.5">Object:</span>
                  <span className="text-[10px] text-[#0a0a0a]">{node.structured.object}</span>
                </div>
              )}
            </div>
          </div>

          {node.structured.entities && node.structured.entities.length > 0 && (
            <div className="bg-[#faf9f4] rounded-lg p-2.5 border border-[#e3e0db]">
              <p className="text-[9px] font-semibold text-[#525252] mb-1.5 uppercase tracking-wide">Entities</p>
              <div className="flex flex-wrap gap-1">
                {node.structured.entities.map((entity, index) => (
                  <span key={`${entity?.name || entity}-${index}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded border border-[#e3e0db] text-[9px] text-[#525252]">
                    <span className="font-medium text-[#0a0a0a]">{entity.name || entity}</span>
                    {entity.type && <span className="text-[8px] text-[#a3a3a3] uppercase">({entity.type})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {node.structured.sourceIds && node.structured.sourceIds.length > 0 && (
            <div className="bg-[#faf9f4] rounded-lg p-2.5 border border-[#e3e0db]">
              <p className="text-[9px] font-semibold text-[#525252] mb-1.5 uppercase tracking-wide">Sources</p>
              <div className="space-y-2">
                {node.structured.sourceIds.map((sourceId, index) => (
                  <div key={`${sourceId}-${index}`} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Globe size={10} className="text-[#117dff]" />
                      <span className="text-[10px] text-[#117dff] truncate">Source {index + 1}</span>
                    </div>
                    {node.structured.evidenceSnippets?.[index] && (
                      <p className="text-[9px] text-[#525252] italic pl-4 border-l-2 border-[#117dff]">
                        "{node.structured.evidenceSnippets[index].slice(0, 100)}
                        {node.structured.evidenceSnippets[index].length > 100 ? '...' : ''}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {node.type === 'source' && onSaveToMemory && (
        <button
          onClick={() => onSaveToMemory(node, node.id)}
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-all"
          type="button"
        >
          {isSaving ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={12} />
              Save to Memory
            </>
          )}
        </button>
      )}
    </motion.div>
  );
}

function GraphCanvas({
  data,
  width,
  height,
  loading,
  refreshKey,
  onNodeClick,
  onNodeHover,
  onNodeContextMenuOpen,
  onViewportInteraction,
  nodeCanvasObject,
  nodeThreeObject,
  nodeThreeObjectExtend,
  showWindowState = false,
  graphRef,
  containerRef,
  rendererMode,
  rendererStatus,
  ForceGraph3DComponent,
}) {
  const handleContextMenu = (event) => {
    event.preventDefault();
    onNodeContextMenuOpen?.(null, event);
  };

  if (data.nodes.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 relative bg-gradient-to-b from-[#faf9f4] to-white overflow-hidden" onContextMenu={handleContextMenu}>
        <EmptyGraphState loading={loading} showWindowState={showWindowState} rendererMode={rendererMode} rendererStatus={rendererStatus} />
      </div>
    );
  }

  const sharedProps = {
    key: refreshKey,
    ref: graphRef,
    graphData: data,
    width: Math.max(0, width || 0),
    height: Math.max(0, height || 0),
    nodeLabel: 'title',
    enableNodeDrag: false,
    onNodeClick,
    onNodeHover,
    onNodeRightClick: onNodeContextMenuOpen,
    onEngineStop: () => onViewportInteraction?.('engine-stop'),
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 relative bg-gradient-to-b from-[#faf9f4] to-white overflow-hidden"
      onContextMenu={handleContextMenu}
      onMouseUp={() => onViewportInteraction?.('pointer-up')}
      onTouchEnd={() => onViewportInteraction?.('touch-end')}
      onWheel={() => onViewportInteraction?.('wheel')}
    >
      {rendererMode === '3d' && ForceGraph3DComponent ? (
        <ForceGraph3DComponent
          {...sharedProps}
          backgroundColor="#faf9f4"
          showNavInfo={false}
          controlType="orbit"
          nodeAutoColorBy={null}
          nodeColor={(node) => resolveNodeVisualState(node).fillColor}
          nodeVal={(node) => node.val}
          linkColor={(link) => defaultLinkColor(link)}
          linkOpacity={0.4}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleSpeed={0.004}
          nodeResolution={10}
          onBackgroundClick={() => onNodeClick?.(null)}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={nodeThreeObjectExtend}
        />
      ) : (
        <ForceGraph2D
          {...sharedProps}
          nodeColor={(node) => resolveNodeVisualState(node).fillColor}
          nodeVal={(node) => node.val}
          linkColor={(link) => defaultLinkColor(link)}
          nodeRelSize={3}
          enableZoomPan
          minZoom={0.5}
          maxZoom={3}
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode="after"
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.005}
          onZoomEnd={() => onViewportInteraction?.('zoom-end')}
        />
      )}
    </div>
  );
}

function GraphVisualization({
  data = { nodes: [], links: [] },
  layers = DEFAULT_GRAPH_LAYERS,
  setLayers,
  onLayerChange,
  loading = false,
  isLoading = loading,
  webUsage = null,
  selectedNode = null,
  setSelectedNode,
  onNodeClick,
  onNodeHover,
  onNodeContextMenu,
  onViewportChange,
  onExportPng,
  onExportJson,
  refresh,
  onRefresh = refresh,
  refreshKey = 0,
  width = 500,
  height = 400,
  isDetached = false,
  showDetachedWindow = false,
  onDetach,
  onToggleDetachedWindow,
  onCloseDetachedWindow,
  detachedBounds = DEFAULT_DETACHED_BOUNDS,
  setDetachedBounds,
  onDetachedBoundsChange,
  graphWindowRef,
  inlineGraphRef,
  detachedGraphRef,
  onSaveToMemory,
  savingMemories,
  nodeCanvasObject = defaultNodeCanvasObject,
  nodeThreeObject,
  nodeThreeObjectExtend = false,
  hoveredNodeId,
  highlightedNodeIds,
  highlightedLinkIds,
  searchQuery = '',
  filters = null,
  renderer = 'auto',
  renderInline = true,
}) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [internalHoveredNodeId, setInternalHoveredNodeId] = useState(null);
  const [contextMenuState, setContextMenuState] = useState(null);
  const viewportTimerRef = useRef(null);
  const inlineContainerRef = useRef(null);
  const detachedContainerRef = useRef(null);

  const currentLayers = useMemo(() => mergeGraphLayers(layers), [layers]);
  const currentBounds = detachedBounds || DEFAULT_DETACHED_BOUNDS;
  const activeLoading = isLoading ?? loading;
  const effectiveHoveredNodeId = hoveredNodeId ?? internalHoveredNodeId;
  const requestedRenderer3D = renderer === '3d' || renderer === 'auto';
  const { component: ForceGraph3DComponent, status: rendererStatus } = useOptional3DRenderer(requestedRenderer3D);
  const activeRendererMode = renderer === '2d' ? '2d' : ForceGraph3DComponent ? '3d' : '2d';

  const presentedGraph = useMemo(
    () =>
      buildGraphPresentation({
        data,
        searchQuery,
        filters,
        hoveredNodeId: effectiveHoveredNodeId,
        selectedNodeId: selectedNode?.id || null,
        highlightedNodeIds,
        highlightedLinkIds,
      }),
    [data, searchQuery, filters, effectiveHoveredNodeId, selectedNode, highlightedNodeIds, highlightedLinkIds]
  );
  const activeFilterCount = countActiveGraphFilters(filters, searchQuery);

  const updateLayers = useCallback((nextLayers) => {
    setLayers?.(nextLayers);
    onLayerChange?.(nextLayers);
  }, [onLayerChange, setLayers]);

  const toggleLayer = useCallback((layerName) => {
    updateLayers({
      ...currentLayers,
      [layerName]: !currentLayers[layerName],
    });
  }, [currentLayers, updateLayers]);

  const updateDetachedBounds = useCallback((nextBounds) => {
    const resolved = resolveNextState(nextBounds, currentBounds);
    setDetachedBounds?.(resolved);
    onDetachedBoundsChange?.(resolved);
  }, [currentBounds, onDetachedBoundsChange, setDetachedBounds]);

  const updateSelectedNode = useCallback((node) => {
    setSelectedNode?.(node);
  }, [setSelectedNode]);

  const emitViewportChange = useCallback((surface, reason) => {
    if (!onViewportChange) return;

    const graphRef = surface === 'detached' ? detachedGraphRef : inlineGraphRef;
    const size = surface === 'detached' ? { width: currentBounds.width, height: currentBounds.height - 50 } : { width, height };

    onViewportChange({
      surface,
      reason,
      ...readViewportSnapshot(graphRef, activeRendererMode, size),
    });
  }, [onViewportChange, detachedGraphRef, inlineGraphRef, currentBounds.width, currentBounds.height, width, height, activeRendererMode]);

  const scheduleViewportChange = useCallback((surface, reason) => {
    if (!onViewportChange) return;
    window.clearTimeout(viewportTimerRef.current);
    viewportTimerRef.current = window.setTimeout(() => emitViewportChange(surface, reason), 80);
  }, [emitViewportChange, onViewportChange]);

  useEffect(() => () => window.clearTimeout(viewportTimerRef.current), []);

  const handleNodeSelection = useCallback((node) => {
    updateSelectedNode(node);
    onNodeClick?.(node);
  }, [onNodeClick, updateSelectedNode]);

  const handleNodeHoverInternal = useCallback((node) => {
    setInternalHoveredNodeId(node?.id || null);
    onNodeHover?.(node);
  }, [onNodeHover]);

  const handleToggleDetachedWindow = () => {
    if (onToggleDetachedWindow) return onToggleDetachedWindow();
    if (showDetachedWindow && onCloseDetachedWindow) return onCloseDetachedWindow();
    return onDetach?.();
  };

  const handleGraphDragStart = (event) => {
    if (event.target.closest('[data-no-drag]')) return;
    setIsDragging(true);
    setDragOffset({ x: event.clientX - currentBounds.x, y: event.clientY - currentBounds.y });
  };

  const handleGraphDrag = (event) => {
    if (!isDragging) return;
    updateDetachedBounds((prevBounds) => {
      const nextX = event.clientX - dragOffset.x;
      const nextY = event.clientY - dragOffset.y;
      return {
        ...prevBounds,
        x: clamp(nextX, 0, Math.max(0, window.innerWidth - prevBounds.width)),
        y: clamp(nextY, 0, Math.max(0, window.innerHeight - prevBounds.height)),
      };
    });
  };

  const handleResizeStart = (event, handle) => {
    event.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
  };

  const handleGraphResize = (event) => {
    if (!isResizing || !resizeHandle) return;
    updateDetachedBounds((prevBounds) => {
      const nextBounds = { ...prevBounds };
      if (resizeHandle.includes('right')) nextBounds.width = Math.max(400, event.clientX - prevBounds.x);
      if (resizeHandle.includes('bottom')) nextBounds.height = Math.max(300, event.clientY - prevBounds.y);
      if (resizeHandle.includes('left')) {
        const nextLeft = event.clientX;
        if (nextLeft < prevBounds.x + prevBounds.width - 100) {
          nextBounds.width = prevBounds.width - (nextLeft - prevBounds.x);
          nextBounds.x = nextLeft;
        }
      }
      if (resizeHandle.includes('top')) {
        const nextTop = event.clientY;
        if (nextTop < prevBounds.y + prevBounds.height - 100) {
          nextBounds.height = prevBounds.height - (nextTop - prevBounds.y);
          nextBounds.y = nextTop;
        }
      }
      return nextBounds;
    });
  };

  useEffect(() => {
    if (!(isDragging || isResizing)) return undefined;
    const moveHandler = isResizing ? handleGraphResize : handleGraphDrag;
    const upHandler = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      if (isResizing) scheduleViewportChange('detached', 'resize');
    };
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
    };
  }, [dragOffset, isDragging, isResizing, resizeHandle, scheduleViewportChange, updateDetachedBounds]);

  useEffect(() => {
    if (!contextMenuState) return undefined;
    const closeMenu = () => setContextMenuState(null);
    document.addEventListener('click', closeMenu);
    document.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('scroll', closeMenu, true);
    };
  }, [contextMenuState]);

  const openContextMenu = useCallback((node, event, surface = 'inline') => {
    if (!event) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    const x = clamp(event.clientX, 12, window.innerWidth - 228);
    const y = clamp(event.clientY, 12, window.innerHeight - 220);
    setContextMenuState({ node, position: { x, y }, surface });
    onNodeContextMenu?.({ phase: 'open', node, surface, position: { x, y }, nativeEvent: event });
  }, [onNodeContextMenu]);

  const getCanvasForSurface = useCallback((surface) => {
    const container = surface === 'detached' ? detachedContainerRef.current : inlineContainerRef.current;
    return container?.querySelector?.('canvas') || null;
  }, []);

  const exportPng = useCallback(async (surface = showDetachedWindow ? 'detached' : 'inline') => {
    const canvas = getCanvasForSurface(surface);
    if (!canvas) return;

    const fileName = `research-graph-${surface}-${Date.now()}.png`;
    const payloadBase = {
      fileName,
      surface,
      rendererMode: activeRendererMode,
      viewport: readViewportSnapshot(
        surface === 'detached' ? detachedGraphRef : inlineGraphRef,
        activeRendererMode,
        surface === 'detached' ? { width: currentBounds.width, height: currentBounds.height - 50 } : { width, height }
      ),
    };

    const maybeBlob = await new Promise((resolve) => {
      if (typeof canvas.toBlob !== 'function') return resolve(null);
      return canvas.toBlob(resolve, 'image/png');
    });

    if (maybeBlob) {
      if (onExportPng) onExportPng({ ...payloadBase, blob: maybeBlob });
      else createDownload(fileName, maybeBlob, 'image/png');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    if (onExportPng) {
      onExportPng({ ...payloadBase, dataUrl });
    } else if (typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = fileName;
      anchor.click();
    }
  }, [showDetachedWindow, getCanvasForSurface, activeRendererMode, detachedGraphRef, inlineGraphRef, currentBounds.width, currentBounds.height, width, height, onExportPng]);

  const exportJson = useCallback((surface = showDetachedWindow ? 'detached' : 'inline') => {
    const payload = createGraphExportPayload({
      data: presentedGraph.data,
      rendererMode: activeRendererMode,
      layers: currentLayers,
      filters,
      searchQuery,
      selectedNode,
      viewport: readViewportSnapshot(
        surface === 'detached' ? detachedGraphRef : inlineGraphRef,
        activeRendererMode,
        surface === 'detached' ? { width: currentBounds.width, height: currentBounds.height - 50 } : { width, height }
      ),
    });

    if (onExportJson) return onExportJson(payload);
    return createDownload(`research-graph-${surface}-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  }, [showDetachedWindow, presentedGraph.data, activeRendererMode, currentLayers, filters, searchQuery, selectedNode, detachedGraphRef, inlineGraphRef, currentBounds.width, currentBounds.height, width, height, onExportJson]);

  const handleContextMenuAction = useCallback((action, node) => {
    const surface = contextMenuState?.surface || (showDetachedWindow ? 'detached' : 'inline');
    if (action === 'save' && node && onSaveToMemory) onSaveToMemory(node, node.id);
    if (action === 'export-png') exportPng(surface);
    if (action === 'export-json') exportJson(surface);
    if (action === 'inspect' && node) handleNodeSelection(node);
    onNodeContextMenu?.({ phase: 'action', action, node, surface });
  }, [contextMenuState?.surface, showDetachedWindow, onSaveToMemory, exportPng, exportJson, handleNodeSelection, onNodeContextMenu]);

  const inlineQuotaUsed = webUsage?.web_search_requests?.used || 0;
  const inlineQuotaLimit = webUsage?.web_search_requests?.limit || 50;

  const overlay = showDetachedWindow && typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          <motion.div
            ref={graphWindowRef}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed z-50"
            style={{ left: currentBounds.x, top: currentBounds.y, width: currentBounds.width, height: currentBounds.height }}
          >
            <div className="w-full h-full bg-white rounded-xl shadow-2xl border border-[#e3e0db] overflow-hidden flex flex-col relative">
              <div onMouseDown={handleGraphDragStart} className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-[#faf9f4] to-white border-b border-[#e3e0db] cursor-move select-none">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dba520]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
                  </div>
                  <span className="text-xs font-medium text-[#525252] ml-2">Research Graph — Live</span>
                  <RendererBadge mode={activeRendererMode} status={rendererStatus} />
                </div>
                <div className="flex items-center gap-1">
                  <div className="mr-2" data-no-drag>
                    <LayerToggleRow layers={currentLayers} onToggle={toggleLayer} compact />
                  </div>
                  <button onClick={() => exportPng('detached')} className="p-1.5 rounded hover:bg-[#e3e0db]/40 text-[#525252] hover:text-[#117dff]" title="Export PNG snapshot" type="button" data-no-drag>
                    <Download size={14} />
                  </button>
                  <button onClick={() => exportJson('detached')} className="p-1.5 rounded hover:bg-[#e3e0db]/40 text-[#525252] hover:text-[#117dff]" title="Export graph JSON" type="button" data-no-drag>
                    <Save size={14} />
                  </button>
                  <button onClick={onCloseDetachedWindow} className="p-1.5 rounded hover:bg-[#e3e0db]/40 text-[#525252] hover:text-[#117dff]" title="Close graph window" type="button" data-no-drag>
                    <X size={14} />
                  </button>
                </div>
              </div>

              <GraphCanvas
                data={presentedGraph.data}
                width={currentBounds.width}
                height={currentBounds.height - 50}
                loading={activeLoading}
                refreshKey={refreshKey}
                onNodeClick={handleNodeSelection}
                onNodeHover={handleNodeHoverInternal}
                onNodeContextMenuOpen={(node, event) => openContextMenu(node, event, 'detached')}
                onViewportInteraction={(reason) => scheduleViewportChange('detached', reason)}
                nodeCanvasObject={nodeCanvasObject}
                nodeThreeObject={nodeThreeObject}
                nodeThreeObjectExtend={nodeThreeObjectExtend}
                showWindowState
                graphRef={detachedGraphRef}
                containerRef={detachedContainerRef}
                rendererMode={activeRendererMode}
                rendererStatus={rendererStatus}
                ForceGraph3DComponent={ForceGraph3DComponent}
              />

              <AnimatePresence>
                <NodeDetailCard node={selectedNode} onClose={() => updateSelectedNode(null)} onSaveToMemory={onSaveToMemory} savingMemories={savingMemories} />
              </AnimatePresence>

              <div onMouseDown={(event) => handleResizeStart(event, 'left')} className="absolute left-0 top-0 bottom-0 w-1.5 cursor-w-resize hover:bg-[#117dff]/20" />
              <div onMouseDown={(event) => handleResizeStart(event, 'top')} className="absolute left-0 right-0 top-0 h-1.5 cursor-n-resize hover:bg-[#117dff]/20" />
              <div onMouseDown={(event) => handleResizeStart(event, 'right')} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-e-resize hover:bg-[#117dff]/20" />
              <div onMouseDown={(event) => handleResizeStart(event, 'bottom')} className="absolute left-0 right-0 bottom-0 h-1.5 cursor-s-resize hover:bg-[#117dff]/20" />
              <div onMouseDown={(event) => handleResizeStart(event, 'bottom-right')} className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize hover:bg-[#117dff]/20" />
              <div onMouseDown={(event) => handleResizeStart(event, 'top-left')} className="absolute left-0 top-0 w-4 h-4 cursor-nw-resize hover:bg-[#117dff]/20" />
              <div onMouseDown={(event) => handleResizeStart(event, 'top-right')} className="absolute right-0 top-0 w-4 h-4 cursor-ne-resize hover:bg-[#117dff]/20" />
              <div onMouseDown={(event) => handleResizeStart(event, 'bottom-left')} className="absolute left-0 bottom-0 w-4 h-4 cursor-sw-resize hover:bg-[#117dff]/20" />
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <>
      {renderInline && (
        <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden h-full flex flex-col">
          <div className="px-3 py-2 border-b border-[#e3e0db] bg-[#faf9f4]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <LayerToggleRow layers={currentLayers} onToggle={toggleLayer} />
              </div>

              <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                <RendererBadge mode={activeRendererMode} status={rendererStatus} />

                {activeFilterCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[#e3e0db] bg-white text-[10px] text-[#525252]">
                    <Filter size={10} className="text-[#9333ea]" />
                    <span>{activeFilterCount} active</span>
                  </div>
                )}

                {searchQuery && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[#e3e0db] bg-white text-[10px] text-[#525252] max-w-[180px]">
                    <Search size={10} className="text-[#117dff]" />
                    <span className="truncate">“{searchQuery}”</span>
                  </div>
                )}

                <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded border border-[#e3e0db] bg-white text-[10px] text-[#525252]">
                  <span>{presentedGraph.stats.visibleNodes} nodes</span>
                  <span className="text-[#d4d1ca]">•</span>
                  <span>{presentedGraph.stats.visibleLinks} links</span>
                </div>

                {webUsage && (
                  <div className="flex items-center gap-2 px-2 py-1 rounded bg-[#faf9f4] border border-[#e3e0db]">
                    <span className="text-[9px] text-[#525252]">
                      <Search size={8} className="inline mr-0.5" />
                      <span className={quotaTextColor(inlineQuotaUsed, inlineQuotaLimit)}>{inlineQuotaUsed}</span>/{inlineQuotaLimit}
                    </span>
                  </div>
                )}

                <button onClick={() => exportPng('inline')} className="p-1.5 rounded hover:bg-[#e3e0db]/40 text-[#525252]" title="Export PNG snapshot" type="button">
                  <Download size={12} />
                </button>

                <button onClick={() => exportJson('inline')} className="p-1.5 rounded hover:bg-[#e3e0db]/40 text-[#525252]" title="Export graph JSON" type="button">
                  <Save size={12} />
                </button>

                {onRefresh && (
                  <button onClick={onRefresh} className="p-1.5 rounded hover:bg-[#e3e0db]/40 text-[#525252]" title="Refresh graph" type="button">
                    <RotateCcw size={12} className={activeLoading ? 'animate-spin' : ''} />
                  </button>
                )}

                {(onToggleDetachedWindow || onDetach || onCloseDetachedWindow) && (
                  <button
                    onClick={handleToggleDetachedWindow}
                    className={`p-1.5 rounded border transition-colors ${
                      showDetachedWindow ? 'border-[#117dff]/40 bg-[#117dff]/20 text-[#117dff]' : 'border-transparent text-[#525252] hover:bg-[#117dff]/10 hover:text-[#117dff]'
                    }`}
                    title={showDetachedWindow ? 'Hide graph window' : 'Show graph window'}
                    type="button"
                  >
                    <Layers size={12} />
                  </button>
                )}

                {onDetach && (
                  <button
                    onClick={onDetach}
                    className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded border text-[10px] font-medium transition-colors ${
                      isDetached ? 'border-[#117dff]/50 bg-[#117dff]/20 text-[#117dff]' : 'border-[#d4d1ca] bg-white text-[#525252] hover:bg-[#117dff]/10 hover:border-[#117dff]/30 hover:text-[#117dff]'
                    }`}
                    title={isDetached ? 'Graph is detached' : 'Detach graph to floating window'}
                    aria-pressed={isDetached}
                    type="button"
                  >
                    <ExternalLink size={12} />
                    <span>{isDetached ? 'Detached' : 'Detach'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 relative bg-gradient-to-b from-[#faf9f4] to-white">
            <GraphCanvas
              data={presentedGraph.data}
              width={width}
              height={height}
              loading={activeLoading}
              refreshKey={refreshKey}
              onNodeClick={handleNodeSelection}
              onNodeHover={handleNodeHoverInternal}
              onNodeContextMenuOpen={(node, event) => openContextMenu(node, event, 'inline')}
              onViewportInteraction={(reason) => scheduleViewportChange('inline', reason)}
              nodeCanvasObject={nodeCanvasObject}
              nodeThreeObject={nodeThreeObject}
              nodeThreeObjectExtend={nodeThreeObjectExtend}
              graphRef={inlineGraphRef}
              containerRef={inlineContainerRef}
              rendererMode={activeRendererMode}
              rendererStatus={rendererStatus}
              ForceGraph3DComponent={ForceGraph3DComponent}
            />

            <AnimatePresence>
              <NodeDetailCard node={selectedNode} onClose={() => updateSelectedNode(null)} onSaveToMemory={onSaveToMemory} savingMemories={savingMemories} />
            </AnimatePresence>
          </div>
        </div>
      )}

      {overlay}

      <GraphContextMenu
        open={Boolean(contextMenuState)}
        position={contextMenuState?.position}
        node={contextMenuState?.node || null}
        canSave={contextMenuState?.node?.type === 'source' && Boolean(onSaveToMemory)}
        onAction={handleContextMenuAction}
        onClose={() => setContextMenuState(null)}
      />
    </>
  );
}

export default GraphVisualization;
