import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Activity,
  Award,
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe,
  Layers,
  Loader2,
  RotateCcw,
  Save,
  Scroll,
  Search,
  Server,
  X,
  Zap,
} from 'lucide-react';

const DEFAULT_LAYERS = {
  sources: true,
  claims: true,
  trails: true,
  observations: true,
  executionEvents: true,
  blueprints: true,
};

const DEFAULT_DETACHED_BOUNDS = {
  x: 100,
  y: 100,
  width: 600,
  height: 500,
};

const RUNTIME_BADGES = {
  tavily: { label: 'Tavily', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', icon: Server },
  lightpanda: { label: 'LightPanda', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: Zap },
  fetch: { label: 'Fetch', color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: Globe },
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
};

const LAYER_BUTTONS = [
  {
    name: 'sources',
    label: 'Sources',
    icon: Globe,
    compactClass: 'bg-[#117dff]/10 text-[#117dff]',
  },
  {
    name: 'claims',
    label: 'Claims',
    icon: CheckCircle2,
    compactClass: 'bg-[#16a34a]/10 text-[#16a34a]',
  },
  {
    name: 'trails',
    label: 'Trails',
    icon: Scroll,
    compactClass: 'bg-[#9333ea]/10 text-[#9333ea]',
  },
  {
    name: 'blueprints',
    label: 'Blueprints',
    icon: Award,
    compactClass: 'bg-[#d97706]/10 text-[#d97706]',
  },
  {
    name: 'observations',
    label: 'Observations',
    icon: Eye,
    compactClass: 'bg-[#3b82f6]/10 text-[#3b82f6]',
  },
  {
    name: 'executionEvents',
    label: 'Events',
    icon: Activity,
    compactClass: 'bg-[#059669]/10 text-[#059669]',
  },
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

function defaultNodeCanvasObject(node, ctx, globalScale) {
  const label = node.title || '';
  const fontSize = 10 / globalScale;
  ctx.font = `${fontSize}px Sans-Serif`;

  if (node.isLive) {
    const pulseSize = node.val * 1.8;
    const pulseOpacity = 0.3 + Math.sin(Date.now() / 200) * 0.2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, pulseSize, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(59, 130, 246, ${pulseOpacity})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(59, 130, 246, ${pulseOpacity + 0.2})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
  ctx.fillStyle = node.color;
  ctx.fill();

  if (node.type === 'source' && node.runtime) {
    const runtimeBadge = RUNTIME_BADGES[node.runtime] || RUNTIME_BADGES.fetch;
    ctx.fillStyle = runtimeBadge.color;
    ctx.beginPath();
    ctx.arc(node.x + node.val - 2, node.y - node.val + 2, 4, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.fillStyle = '#0a0a0a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, node.x, node.y - node.val - 2);
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

function EmptyGraphState({ loading, showWindowState }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[#525252]">
      {loading ? (
        <>
          <Loader2 size={32} className="animate-spin text-[#117dff] mb-3" />
          <p className="text-sm">Loading graph...</p>
        </>
      ) : (
        <>
          <Layers size={48} className="text-[#e3e0db] mb-3" />
          <p className="text-sm">
            {showWindowState ? 'No graph data available' : 'No graph data yet — starting research...'}
          </p>
        </>
      )}
    </div>
  );
}

function NodeDetailCard({
  node,
  onClose,
  onSaveToMemory,
  savingMemories,
}) {
  if (!node) return null;

  const RuntimeIcon = RUNTIME_BADGES[node.runtime]?.icon || Globe;
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
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${node.color}20` }}
          >
            <Icon size={16} style={{ color: node.color }} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0a0a0a] capitalize">
              {String(node.type || 'node').replace('-', ' ')}
            </p>
            {node.runtime && (
              <div className="flex items-center gap-1">
                <RuntimeIcon size={8} className="text-[#a3a3a3]" />
                <span className="text-[9px] text-[#525252] capitalize">
                  {RUNTIME_BADGES[node.runtime]?.label || node.runtime}
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#e3e0db]/40 text-[#525252]"
          type="button"
        >
          <X size={12} />
        </button>
      </div>

      <p className="text-xs text-[#525252]/80 leading-relaxed mb-3 line-clamp-2">{node.title}</p>

      {node.url && (
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-[#117dff] hover:underline mb-3"
        >
          <Globe size={10} />
          <span className="truncate">{node.url}</span>
        </a>
      )}

      {node.confidence != null && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-[#525252]">Confidence:</span>
          <span
            className={`text-[10px] font-semibold ${
              (node.confidence * 100) >= 70
                ? 'text-emerald-600'
                : (node.confidence * 100) >= 40
                  ? 'text-amber-600'
                  : 'text-red-600'
            }`}
          >
            {(node.confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}

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
                  <span
                    key={`${entity?.name || entity}-${index}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded border border-[#e3e0db] text-[9px] text-[#525252]"
                  >
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
                        "
                        {node.structured.evidenceSnippets[index].slice(0, 100)}
                        {node.structured.evidenceSnippets[index].length > 100 ? '...' : ''}
                        "
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
  nodeCanvasObject,
  showWindowState = false,
  graphRef,
}) {
  return (
    <div className="flex-1 relative bg-gradient-to-b from-[#faf9f4] to-white overflow-hidden">
      {data.nodes.length > 0 ? (
        <ForceGraph2D
          key={refreshKey}
          ref={graphRef}
          graphData={data}
          width={Math.max(0, width || 0)}
          height={Math.max(0, height || 0)}
          nodeLabel="title"
          nodeColor={(node) => node.color}
          nodeVal={(node) => node.val}
          linkColor={(link) => link.color}
          nodeRelSize={3}
          enableNodeDrag={false}
          enableZoomPan
          minZoom={0.5}
          maxZoom={3}
          onNodeClick={onNodeClick}
          onNodeHover={onNodeHover}
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode="after"
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.005}
        />
      ) : (
        <EmptyGraphState loading={loading} showWindowState={showWindowState} />
      )}
    </div>
  );
}

function GraphVisualization({
  data = { nodes: [], links: [] },
  layers = DEFAULT_LAYERS,
  setLayers,
  onLayerChange,
  loading = false,
  isLoading = loading,
  webUsage = null,
  selectedNode = null,
  setSelectedNode,
  onNodeClick,
  onNodeHover,
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
  renderInline = true,
}) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);

  const currentLayers = layers || DEFAULT_LAYERS;
  const currentBounds = detachedBounds || DEFAULT_DETACHED_BOUNDS;
  const activeLoading = isLoading ?? loading;

  const updateLayers = (nextLayers) => {
    setLayers?.(nextLayers);
    onLayerChange?.(nextLayers);
  };

  const toggleLayer = (layerName) => {
    updateLayers({
      ...currentLayers,
      [layerName]: !currentLayers[layerName],
    });
  };

  const updateDetachedBounds = (nextBounds) => {
    const resolved = resolveNextState(nextBounds, currentBounds);
    setDetachedBounds?.(resolved);
    onDetachedBoundsChange?.(resolved);
  };

  const updateSelectedNode = (node) => {
    setSelectedNode?.(node);
  };

  const handleNodeSelection = (node) => {
    updateSelectedNode(node);
    onNodeClick?.(node);
  };

  const handleCloseSelectedNode = () => updateSelectedNode(null);

  const handleToggleDetachedWindow = () => {
    if (onToggleDetachedWindow) {
      onToggleDetachedWindow();
      return;
    }

    if (showDetachedWindow && onCloseDetachedWindow) {
      onCloseDetachedWindow();
      return;
    }

    onDetach?.();
  };

  const handleCloseWindow = () => {
    onCloseDetachedWindow?.();
  };

  const handleGraphDragStart = (event) => {
    if (event.target.closest('[data-no-drag]')) return;
    setIsDragging(true);
    setDragOffset({
      x: event.clientX - currentBounds.x,
      y: event.clientY - currentBounds.y,
    });
  };

  const handleGraphDrag = (event) => {
    if (!isDragging) return;

    updateDetachedBounds((prevBounds) => {
      const nextX = event.clientX - dragOffset.x;
      const nextY = event.clientY - dragOffset.y;
      const maxX = Math.max(0, window.innerWidth - prevBounds.width);
      const maxY = Math.max(0, window.innerHeight - prevBounds.height);

      return {
        ...prevBounds,
        x: Math.min(Math.max(0, nextX), maxX),
        y: Math.min(Math.max(0, nextY), maxY),
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

      if (resizeHandle.includes('right')) {
        nextBounds.width = Math.max(400, event.clientX - prevBounds.x);
      }

      if (resizeHandle.includes('bottom')) {
        nextBounds.height = Math.max(300, event.clientY - prevBounds.y);
      }

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
    };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);

    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
    };
  }, [dragOffset, isDragging, isResizing, resizeHandle]);

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
            style={{
              left: currentBounds.x,
              top: currentBounds.y,
              width: currentBounds.width,
              height: currentBounds.height,
            }}
          >
            <div className="w-full h-full bg-white rounded-xl shadow-2xl border border-[#e3e0db] overflow-hidden flex flex-col relative">
              <div
                onMouseDown={handleGraphDragStart}
                className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-[#faf9f4] to-white border-b border-[#e3e0db] cursor-move select-none"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dba520]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
                  </div>
                  <span className="text-xs font-medium text-[#525252] ml-2">Research Graph — Live</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="mr-2" data-no-drag>
                    <LayerToggleRow layers={currentLayers} onToggle={toggleLayer} compact />
                  </div>
                  <button
                    onClick={handleCloseWindow}
                    className="p-1.5 rounded hover:bg-[#e3e0db]/40 text-[#525252] hover:text-[#117dff]"
                    title="Close graph window"
                    type="button"
                    data-no-drag
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <GraphCanvas
                data={data}
                width={currentBounds.width}
                height={currentBounds.height - 50}
                loading={activeLoading}
                refreshKey={refreshKey}
                onNodeClick={handleNodeSelection}
                onNodeHover={onNodeHover}
                nodeCanvasObject={nodeCanvasObject}
                showWindowState
                graphRef={detachedGraphRef}
              />

              <div
                onMouseDown={(event) => handleResizeStart(event, 'left')}
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-w-resize hover:bg-[#117dff]/20"
              />
              <div
                onMouseDown={(event) => handleResizeStart(event, 'top')}
                className="absolute left-0 right-0 top-0 h-1.5 cursor-n-resize hover:bg-[#117dff]/20"
              />
              <div
                onMouseDown={(event) => handleResizeStart(event, 'right')}
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-e-resize hover:bg-[#117dff]/20"
              />
              <div
                onMouseDown={(event) => handleResizeStart(event, 'bottom')}
                className="absolute left-0 right-0 bottom-0 h-1.5 cursor-s-resize hover:bg-[#117dff]/20"
              />
              <div
                onMouseDown={(event) => handleResizeStart(event, 'bottom-right')}
                className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize hover:bg-[#117dff]/20"
              />
              <div
                onMouseDown={(event) => handleResizeStart(event, 'top-left')}
                className="absolute left-0 top-0 w-4 h-4 cursor-nw-resize hover:bg-[#117dff]/20"
              />
              <div
                onMouseDown={(event) => handleResizeStart(event, 'top-right')}
                className="absolute right-0 top-0 w-4 h-4 cursor-ne-resize hover:bg-[#117dff]/20"
              />
              <div
                onMouseDown={(event) => handleResizeStart(event, 'bottom-left')}
                className="absolute left-0 bottom-0 w-4 h-4 cursor-sw-resize hover:bg-[#117dff]/20"
              />
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
                {webUsage && (
                  <div className="flex items-center gap-2 px-2 py-1 rounded bg-[#faf9f4] border border-[#e3e0db]">
                    <span className="text-[9px] text-[#525252]">
                      <Search size={8} className="inline mr-0.5" />
                      <span className={quotaTextColor(inlineQuotaUsed, inlineQuotaLimit)}>{inlineQuotaUsed}</span>
                      /{inlineQuotaLimit}
                    </span>
                  </div>
                )}

                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="p-1.5 rounded hover:bg-[#e3e0db]/40 text-[#525252]"
                    title="Refresh graph"
                    type="button"
                  >
                    <RotateCcw size={12} className={activeLoading ? 'animate-spin' : ''} />
                  </button>
                )}

                {(onToggleDetachedWindow || onDetach || onCloseDetachedWindow) && (
                  <button
                    onClick={handleToggleDetachedWindow}
                    className={`p-1.5 rounded border transition-colors ${
                      showDetachedWindow
                        ? 'border-[#117dff]/40 bg-[#117dff]/20 text-[#117dff]'
                        : 'border-transparent text-[#525252] hover:bg-[#117dff]/10 hover:text-[#117dff]'
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
                      isDetached
                        ? 'border-[#117dff]/50 bg-[#117dff]/20 text-[#117dff]'
                        : 'border-[#d4d1ca] bg-white text-[#525252] hover:bg-[#117dff]/10 hover:border-[#117dff]/30 hover:text-[#117dff]'
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
              data={data}
              width={width}
              height={height}
              loading={activeLoading}
              refreshKey={refreshKey}
              onNodeClick={handleNodeSelection}
              onNodeHover={onNodeHover}
              nodeCanvasObject={nodeCanvasObject}
              graphRef={inlineGraphRef}
            />

            <AnimatePresence>
              <NodeDetailCard
                node={selectedNode}
                onClose={handleCloseSelectedNode}
                onSaveToMemory={onSaveToMemory}
                savingMemories={savingMemories}
              />
            </AnimatePresence>
          </div>
        </div>
      )}

      {overlay}
    </>
  );
}

export default GraphVisualization;
