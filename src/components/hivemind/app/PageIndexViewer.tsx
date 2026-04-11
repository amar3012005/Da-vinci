// @ts-nocheck
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { List, Map as MapIcon } from 'lucide-react';
import { PageIndexTree } from './PageIndexTree';
import { PageIndexMindMap } from './PageIndexMindMap';

/**
 * PageIndexViewer — Unified PageIndex viewer with Tree/Map toggle
 *
 * Switch between hierarchical tree view and visual mind map.
 */
export function PageIndexViewer({
  userId,
  onSelectNode,
  selectedNodeId,
  initialPath = '/hivemind',
}: {
  userId: string;
  onSelectNode?: (node: any) => void;
  selectedNodeId?: string | null;
  initialPath?: string;
}) {
  const [viewMode, setViewMode] = useState<'tree' | 'map'>('map');

  return (
    <div className="flex flex-col h-full">
      {/* View toggle */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-[#0a0a0a]">Memory Map</h2>

        <div className="flex items-center gap-1 bg-[#f3f1ec] rounded-lg p-1">
          <button
            onClick={() => setViewMode('tree')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'tree'
                ? 'bg-white text-[#0a0a0a] shadow-sm'
                : 'text-[#666] hover:text-[#0a0a0a]'
            }`}
            title="Tree view"
          >
            <List size={14} />
            Tree
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'map'
                ? 'bg-white text-[#0a0a0a] shadow-sm'
                : 'text-[#666] hover:text-[#0a0a0a]'
            }`}
            title="Mind map view"
          >
            <MapIcon size={14} />
            Map
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'tree' ? (
          <motion.div
            key="tree"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-y-auto"
          >
            <PageIndexTree
              userId={userId}
              onSelectNode={onSelectNode}
              selectedNodeId={selectedNodeId || null}
              initialPath={initialPath}
            />
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <PageIndexMindMap
              userId={userId}
              onSelectNode={onSelectNode}
              selectedNodeId={selectedNodeId || null}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
