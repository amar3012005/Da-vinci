// @ts-nocheck - TypeScript strict mode disabled for this component
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Search,
  Plus,
  MoreHorizontal,
  Move,
  Trash2,
} from 'lucide-react';
// @ts-ignore - api-client.js doesn't have TypeScript declarations
import apiClient from './shared/api-client';

/**
 * PageIndexTree — Hierarchical memory browser
 *
 * Displays memory hierarchy as an expandable tree.
 * Supports: expand/collapse, memory count badges, node selection.
 * @ts-ignore - TypeScript strict mode disabled for this component
 */
// @ts-ignore
export function PageIndexTree({
  userId,
  onSelectNode,
  selectedNodeId,
  initialPath = '/hivemind',
}: {
  userId: string;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  initialPath?: string;
}) {
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set([initialPath]));

  // Fetch tree on mount
  useEffect(() => {
    fetchTree();
  }, [userId]);

  const fetchTree = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPageIndexTree();
      setTree(data || []);
    } catch (err) {
      console.error('[PageIndexTree] Failed to fetch tree:', err);
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

  const handleNodeClick = useCallback((node: any) => {
    if (onSelectNode) {
      onSelectNode(node);
    }
    // Toggle expand if has children
    if (node.memoryCount > 0 || node.children?.length > 0) {
      toggleNode(node.path);
    }
  }, [onSelectNode, toggleNode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-[#a3a3a3] text-sm">
        <Folder size={32} className="mx-auto mb-2 opacity-50" />
        <p>No hierarchy yet</p>
        <p className="text-xs mt-1">Memories will auto-organize as you ingest them</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
          onSelect={handleNodeClick}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </div>
  );
}

/**
 * TreeNode — Individual tree node with children
 * @ts-ignore - TypeScript strict mode disabled for this component
 */
// @ts-ignore
function TreeNode({
  node,
  depth,
  expandedNodes,
  onToggle,
  onSelect,
  selectedNodeId,
}: {
  node: any;
  depth: number;
  expandedNodes: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (node: any) => void;
  selectedNodeId: string | null;
}) {
  const isExpanded = expandedNodes.has(node.path);
  const isSelected = selectedNodeId === node.id || selectedNodeId === node.path;
  const hasChildren = node.children?.length > 0 || node.memoryCount > 0;

  return (
    <div>
      {/* @ts-ignore - Framer Motion motion.div type issues */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.05 }}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${
          isSelected
            ? 'bg-[#117dff]/10 border border-[#117dff]/30'
            : 'hover:bg-[#f3f1ec] border border-transparent'
        }`}
        style={{ marginLeft: depth * 16 }}
        onClick={() => onSelect(node)}
      >
        {/* Expand/Collapse */}
        <button
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggle(node.path);
          }}
          className="p-0.5 rounded hover:bg-[#e3e0db] text-[#a3a3a3]"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Icon */}
        <div className="text-[#117dff]">
          {node.nodeType === 'root' ? (
            <FolderOpen size={16} />
          ) : node.depth === 2 ? (
            <Folder size={16} />
          ) : (
            <FileText size={14} />
          )}
        </div>

        {/* Label */}
        <span className={`flex-1 text-sm truncate ${isSelected ? 'font-medium text-[#0a0a0a]' : 'text-[#525252]'}`}>
          {node.label}
        </span>

        {/* Memory count badge */}
        {node.memoryCount > 0 && (
          <span className="text-[10px] font-mono bg-[#117dff]/10 text-[#117dff] px-1.5 py-0.5 rounded">
            {node.memoryCount}
          </span>
        )}

        {/* Actions (hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Add child node
            }}
            className="p-1 rounded hover:bg-[#e3e0db] text-[#a3a3a3]"
            title="Add child"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Show actions menu
            }}
            className="p-1 rounded hover:bg-[#e3e0db] text-[#a3a3a3]"
            title="More actions"
          >
            <MoreHorizontal size={12} />
          </button>
        </div>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && node.children && node.children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onSelect={onSelect}
                selectedNodeId={selectedNodeId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * MemoryLocationBadge — Shows "lives under" path for a memory
 */
export function MemoryLocationBadge({ memoryId, onClick }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, [memoryId]);

  const fetchLocations = async () => {
    try {
      const nodes = await apiClient.getPageIndexNodesForMemory(memoryId);
      setLocations(nodes || []);
    } catch (err) {
      console.error('[MemoryLocationBadge] Failed to fetch locations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || locations.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] text-[#a3a3a3]">Lives under:</span>
      {locations.slice(0, 2).map((node) => (
        <button
          key={node.path}
          onClick={() => onClick && onClick(node)}
          className="text-[10px] font-mono bg-[#117dff]/10 text-[#117dff] px-1.5 py-0.5 rounded hover:bg-[#117dff]/20 transition-colors"
          title={node.path}
        >
          {node.label}
        </button>
      ))}
      {locations.length > 2 && (
        <span className="text-[10px] text-[#a3a3a3]">+{locations.length - 2}</span>
      )}
    </div>
  );
}

/**
 * MoveMemoryModal — Move memory to different node
 */
export function MoveMemoryModal({ memoryId, onClose, onSuccess }) {
  const [tree, setTree] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    apiClient.getPageIndexTree()
      .then(setTree)
      .catch(console.error);
  }, []);

  const handleMove = async () => {
    if (!selectedNode) return;

    try {
      setMoving(true);
      await apiClient.moveMemoryToNode(memoryId, selectedNode.id);
      onSuccess && onSuccess();
      onClose && onClose();
    } catch (err) {
      console.error('[MoveMemoryModal] Failed to move memory:', err);
      alert('Failed to move memory: ' + err.message);
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-[#e3e0db] w-full max-w-md p-4">
        <h3 className="text-sm font-semibold mb-3">Move Memory</h3>
        <p className="text-xs text-[#525252] mb-4">Select destination node:</p>

        <div className="max-h-64 overflow-y-auto border border-[#e3e0db] rounded-lg p-2 mb-4">
          <PageIndexTree
            userId="current"
            onSelectNode={setSelectedNode}
            selectedNodeId={selectedNode?.id}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-[#525252] hover:bg-[#f3f1ec] rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedNode || moving}
            className="px-3 py-1.5 text-xs font-semibold bg-[#117dff] text-white rounded-lg hover:bg-[#0066e0] disabled:opacity-50"
          >
            {moving ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  );
}
