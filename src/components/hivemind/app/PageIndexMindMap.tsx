// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Folder,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize,
  Info,
  ChevronRight,
} from 'lucide-react';
// @ts-ignore
import apiClient from './shared/api-client';

/**
 * PageIndexMindMap — Visual mind map of memory hierarchy
 *
 * Displays PageIndex nodes as interactive bubbles with connections.
 * Features: pan/zoom, node expansion, memory count, summary tooltips.
 */
export function PageIndexMindMap({
  userId,
  onSelectNode,
  selectedNodeId,
}: {
  userId: string;
  onSelectNode?: (node: any) => void;
  selectedNodeId?: string | null;
}) {
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Fetch tree on mount
  useEffect(() => {
    fetchTree();
  }, [userId]);

  const fetchTree = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPageIndexTree({ depth: 4 });
      setTree(data || []);
      // Auto-expand root
      if (data?.[0]?.path) {
        setExpandedNodes(new Set([data[0].path]));
      }
    } catch (err) {
      console.error('[PageIndexMindMap] Failed to fetch tree:', err);
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = useCallback((path: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Convert tree to mind map layout
  const computeLayout = useCallback(() => {
    if (tree.length === 0) return { nodes: [], links: [] };

    const nodes: any[] = [];
    const links: any[] = [];
    const centerX = 400;
    const centerY = 300;

    // Recursive layout function
    const layoutNode = (node: any, x: number, y: number, level: number, angle: number, maxDepth: number) => {
      const isExpanded = expandedNodes.has(node.path);
      const nodeSize = Math.max(40, 80 - level * 15);

      nodes.push({
        ...node,
        x,
        y,
        size: nodeSize,
        level,
        isExpanded,
        hasChildren: node.children?.length > 0 || node.memoryCount > 0,
      });

      if (isExpanded && node.children?.length > 0) {
        const childCount = node.children.length;
        const angleStep = (Math.PI * 1.5) / childCount;
        const startAngle = angle - (Math.PI * 0.75);
        const radius = 120 + level * 40;

        node.children.forEach((child: any, i: number) => {
          const childAngle = startAngle + angleStep * i;
          const childX = x + Math.cos(childAngle) * radius;
          const childY = y + Math.sin(childAngle) * radius * 0.6;

          links.push({
            source: { x, y, id: node.id },
            target: { x: childX, y: childY, id: child.id },
          });

          layoutNode(child, childX, childY, level + 1, childAngle, maxDepth);
        });
      }
    };

    // Layout each root node
    tree.forEach((rootNode, i) => {
      const angle = -Math.PI / 2 + (Math.PI / tree.length) * i;
      layoutNode(rootNode, centerX, centerY, 0, angle, 4);
    });

    return { nodes, links };
  }, [tree, expandedNodes]);

  const { nodes, links } = computeLayout();

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - lastPos.current.x,
      y: e.clientY - lastPos.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#117dff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#666]">Loading mind map...</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-[#a3a3a3]">
          <Folder size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No memories organized yet</p>
          <p className="text-xs mt-1">Memories will auto-organize as you ingest them</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#fafafa] rounded-xl overflow-hidden border border-[#e3e0db]">
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={() => setZoom(prev => Math.min(2, prev + 0.2))}
          className="p-2 bg-white rounded-lg shadow hover:bg-[#f3f1ec] transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={16} className="text-[#525252]" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
          className="p-2 bg-white rounded-lg shadow hover:bg-[#f3f1ec] transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={16} className="text-[#525252]" />
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="p-2 bg-white rounded-lg shadow hover:bg-[#f3f1ec] transition-colors"
          title="Reset view"
        >
          <Maximize size={16} className="text-[#525252]" />
        </button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute bottom-3 right-3 z-10 text-xs text-[#a3a3a3] bg-white/80 px-2 py-1 rounded">
        {Math.round(zoom * 100)}%
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 800 600"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Links first (behind nodes) */}
          {links.map((link, i) => (
            <motion.path
              key={`link-${i}`}
              d={`M ${link.source.x} ${link.source.y} Q ${(link.source.x + link.target.x) / 2} ${(link.source.y + link.target.y) / 2} ${link.target.x} ${link.target.y}`}
              fill="none"
              stroke="#d4d4d4"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            />
          ))}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const isSelected = selectedNodeId === node.id || selectedNodeId === node.path;
            const isRoot = node.depth === 1 || node.nodeType === 'root';

            return (
              <g key={node.id || node.path}>
                {/* Node circle */}
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (node.hasChildren) {
                      toggleNode(node.path);
                    }
                    if (onSelectNode) {
                      onSelectNode(node);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {/* Glow effect for selected */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.size + 4}
                      fill="none"
                      stroke="#117dff"
                      strokeWidth="3"
                      strokeOpacity="0.3"
                    />
                  )}

                  {/* Main circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size}
                    fill={isRoot ? '#117dff' : isSelected ? '#117dff' : 'white'}
                    stroke={isRoot ? '#0d5fcc' : isSelected ? '#117dff' : '#d4d4d4'}
                    strokeWidth="2"
                    className="transition-colors duration-200"
                  />

                  {/* Icon */}
                  <g transform={`translate(${node.x - 8}, ${node.y - 8})`}>
                    {isRoot ? (
                      <FolderOpen size={16} className="text-white" fill="white" />
                    ) : node.memoryCount > 0 ? (
                      <FileText size={14} className={isRoot || isSelected ? 'text-white' : 'text-[#117dff]'} />
                    ) : (
                      <Folder size={14} className={isRoot || isSelected ? 'text-white' : 'text-[#666]'} />
                    )}
                  </g>

                  {/* Memory count */}
                  {node.memoryCount > 0 && (
                    <text
                      x={node.x}
                      y={node.y + node.size + 16}
                      textAnchor="middle"
                      className="text-[10px] fill-[#666] font-mono"
                    >
                      {node.memoryCount}
                    </text>
                  )}
                </motion.g>

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + node.size + 28}
                  textAnchor="middle"
                  className={`text-[11px] ${isSelected ? 'font-semibold fill-[#0a0a0a]' : 'fill-[#525252]'}`}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.label.length > 20 ? node.label.slice(0, 20) + '...' : node.label}
                </text>

                {/* Expand indicator */}
                {node.hasChildren && (
                  <g transform={`translate(${node.x + node.size - 12}, ${node.y - node.size + 12})`}>
                    <circle r="10" fill={isSelected ? '#117dff' : 'white'} stroke="#d4d4d4" strokeWidth="1.5" />
                    <ChevronRight
                      size={12}
                      className={isSelected ? 'text-white' : 'text-[#666]'}
                      style={{
                        transform: node.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transformOrigin: 'center',
                      }}
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip / Summary panel */}
      {hoveredNode && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-3 left-3 max-w-xs bg-white rounded-lg shadow-lg border border-[#e3e0db] p-3 z-20"
        >
          <div className="flex items-center gap-2 mb-2">
            {hoveredNode.nodeType === 'root' ? (
              <FolderOpen size={16} className="text-[#117dff]" />
            ) : (
              <Folder size={16} className="text-[#117dff]" />
            )}
            <h3 className="font-medium text-sm text-[#0a0a0a]">{hoveredNode.label}</h3>
          </div>

          <div className="space-y-1 text-xs text-[#666]">
            <div className="flex justify-between">
              <span>Path:</span>
              <span className="font-mono text-[#117dff]">{hoveredNode.path}</span>
            </div>
            <div className="flex justify-between">
              <span>Memories:</span>
              <span className="font-mono">{hoveredNode.memoryCount}</span>
            </div>
            {hoveredNode.summary && (
              <div className="mt-2 pt-2 border-t border-[#e3e0db]">
                <p className="text-[#525252] italic">{hoveredNode.summary}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Help overlay */}
      <div className="absolute bottom-3 left-3 z-10 flex gap-4 text-[10px] text-[#a3a3a3]">
        <span className="flex items-center gap-1">
          <Info size={12} />
          Drag to pan
        </span>
        <span className="flex items-center gap-1">
          <ZoomIn size={12} />
          Scroll to zoom
        </span>
        <span className="flex items-center gap-1">
          <ChevronRight size={12} />
          Click to expand
        </span>
      </div>
    </div>
  );
}
