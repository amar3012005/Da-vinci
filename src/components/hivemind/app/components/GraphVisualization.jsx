import React, { useState, useRef, useCallback, Suspense } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { motion } from 'framer-motion';
import { Box, Grid3x3, RotateCcw, Download, Share2 } from 'lucide-react';

// Lazy load 3D graph to avoid bundling issues
const ForceGraph3D = React.lazy(() => import('./ForceGraph3D'));

const NODE_COLORS = {
  source: '#117dff',
  claim: '#16a34a',
  'structured-claim': '#16a34a',
  'plain-claim': '#86efac',
  trail: '#9333ea',
  blueprint: '#d97706',
  observation: '#3b82f6',
  'csi-node': '#f59e0b',
  'csi-verdict': '#8b5cf6',
};

const VERDICT_COLORS = {
  verified: '#059669',
  disputed: '#dc2626',
  uncertain: '#f59e0b',
  neutral: '#6b7280',
};

/**
 * GraphVisualization - 2D force-directed graph with CSI verdict visualization
 * Supports real-time node/edge updates, CSI analysis visualization, and exports
 */
function GraphVisualization({
  data = { nodes: [], links: [] },
  layers = {},
  use3D = true,
  isLoading = false,
  selectedNode = null,
  hoveredNode = null,
  onNodeClick = () => {},
  onNodeHover = () => {},
  onLayerChange = () => {},
  onNodeContextMenu = () => {},
  onExport = () => {},
  onShare = () => {},
  width = 800,
  height = 600,
}) {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const [mode3D, setMode3D] = useState(use3D);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const [exportMenu, setExportMenu] = useState(false);

  // Node rendering - sources, claims, trails, blueprints
  const getNodeColor = useCallback((node) => {
    return NODE_COLORS[node.type] || '#a3a3a3';
  }, []);

  const getNodeSize = useCallback((node) => {
    return node.val || 8;
  }, []);

  // 2D canvas rendering for research nodes
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const label = node.title || '';
    const fontSize = 10 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, getNodeSize(node), 0, 2 * Math.PI);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();

    // Label
    ctx.fillStyle = '#0a0a0a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, node.x, node.y - getNodeSize(node) - 2);
  }, [getNodeColor, getNodeSize]);

  const handleNodeContextMenu = useCallback((node, event) => {
    event.preventDefault();
    setContextPos({ x: event.clientX, y: event.clientY });
    onNodeContextMenu(node);
    setShowContextMenu(true);
  }, [onNodeContextMenu]);

  const handleExport = useCallback((format) => {
    if (format === 'json') {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deep-research-graph-${Date.now()}.json`;
      a.click();
    } else if (format === 'png') {
      const canvas = graphRef.current?.canvas;
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `deep-research-graph-${Date.now()}.png`;
        link.click();
      }
    }
    onExport(format);
    setExportMenu(false);
  }, [data, onExport]);

  return (
    <div ref={containerRef} className="relative h-full bg-gradient-to-b from-[#faf9f4] to-white rounded-xl overflow-hidden flex flex-col">
      {/* Header with controls */}
      <div className="px-3 py-2 border-b border-[#e3e0db] bg-[#faf9f4] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Layer toggles */}
          {[
            { name: 'sources', label: 'Sources', color: '#117dff' },
            { name: 'claims', label: 'Claims', color: '#16a34a' },
            { name: 'trails', label: 'Trails', color: '#9333ea' },
            { name: 'blueprints', label: 'Blueprints', color: '#d97706' },
          ].map(({ name, label, color }) => (
            <button
              key={name}
              onClick={() => onLayerChange({ ...layers, [name]: !layers[name] })}
              className="px-2 py-1 text-[10px] rounded transition-all flex-shrink-0"
              style={{
                backgroundColor: layers[name] ? `${color}20` : '#e3e0db',
                color: layers[name] ? color : '#a3a3a3',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* 3D/2D Toggle */}
          <button
            onClick={() => setMode3D(!mode3D)}
            className="p-1.5 rounded hover:bg-[#e3e0db] text-[#525252] transition-colors"
            title={mode3D ? 'Switch to 2D' : 'Switch to 3D'}
            style={{ color: mode3D ? '#117dff' : '#525252' }}
          >
            {mode3D ? <Box size={12} /> : <Grid3x3 size={12} />}
          </button>

          {/* Refresh */}
          <button
            onClick={() => {
              if (graphRef.current?.resetCamera) graphRef.current.resetCamera(300);
            }}
            className="p-1.5 rounded hover:bg-[#e3e0db] text-[#525252]"
            title="Reset view"
          >
            <RotateCcw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setExportMenu(!exportMenu)}
              className="p-1.5 rounded hover:bg-[#e3e0db] text-[#525252]"
              title="Export"
            >
              <Download size={12} />
            </button>
            {exportMenu && (
              <div className="absolute right-0 mt-1 bg-white border border-[#e3e0db] rounded shadow-lg z-50">
                <button onClick={() => handleExport('json')} className="block w-full text-left px-3 py-2 text-sm hover:bg-[#faf9f4]">
                  JSON
                </button>
                <button onClick={() => handleExport('png')} className="block w-full text-left px-3 py-2 text-sm hover:bg-[#faf9f4]">
                  PNG
                </button>
              </div>
            )}
          </div>

          {/* Share */}
          <button
            onClick={onShare}
            className="p-1.5 rounded hover:bg-[#e3e0db] text-[#525252]"
            title="Share"
          >
            <Share2 size={12} />
          </button>
        </div>
      </div>

      {/* Graph canvas - 2D/3D Force Directed */}
      <div className="flex-1 relative">
        {data.nodes.length > 0 ? (
          mode3D ? (
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin">⚙️</div></div>}>
              <ForceGraph3D
                ref={graphRef}
                graphData={data}
                getCsiNodeColor={getNodeColor}
                getCsiNodeSize={getNodeSize}
                onNodeClick={onNodeClick}
                onNodeHover={onNodeHover}
                onNodeContextMenu={handleNodeContextMenu}
                width={containerRef.current?.clientWidth || width}
                height={containerRef.current?.clientHeight || height}
              />
            </Suspense>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={data}
              nodeLabel="title"
              nodeColor={getNodeColor}
              nodeVal={getNodeSize}
              linkColor={(link) => link.color || '#aaa'}
              nodeRelSize={3}
              enableNodeDrag={false}
              enableZoomPan={true}
              minZoom={0.5}
              maxZoom={3}
              onNodeClick={onNodeClick}
              onNodeHover={onNodeHover}
              onNodeRightClick={handleNodeContextMenu}
              nodeCanvasObject={nodeCanvasObject}
              nodeCanvasObjectMode="after"
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={1.5}
              linkDirectionalParticleSpeed={0.003}
              width={containerRef.current?.clientWidth || width}
              height={containerRef.current?.clientHeight || height}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#a3a3a3]">
            {isLoading ? (
              <>
                <div className="animate-spin">⚙️</div>
                <p className="text-sm mt-2">Loading graph...</p>
              </>
            ) : (
              <p className="text-sm">No data to visualize</p>
            )}
          </div>
        )}
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bg-white border border-[#e3e0db] rounded shadow-lg z-50"
          style={{ top: contextPos.y, left: contextPos.x }}
          onMouseLeave={() => setShowContextMenu(false)}
        >
          <button
            onClick={() => {
              onNodeContextMenu(selectedNode, { action: 'save' });
              setShowContextMenu(false);
            }}
            className="block w-full text-left px-3 py-2 text-sm hover:bg-[#faf9f4]"
          >
            Save to Memory
          </button>
          <button
            onClick={() => {
              onNodeContextMenu(selectedNode, { action: 'expand' });
              setShowContextMenu(false);
            }}
            className="block w-full text-left px-3 py-2 text-sm hover:bg-[#faf9f4]"
          >
            Explore Related
          </button>
          {selectedNode?.type === 'csi-verdict' && (
            <button
              onClick={() => {
                onNodeContextMenu(selectedNode, { action: 'challenge' });
                setShowContextMenu(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-[#faf9f4] border-t"
            >
              Challenge Verdict
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default GraphVisualization;
