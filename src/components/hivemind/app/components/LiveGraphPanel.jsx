import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGraphState } from '../hooks/useGraphState';
import GraphVisualization from './GraphVisualization';

/**
 * Edge color mapping based on edge type
 * @param {string} edgeType - Type of edge (derived_from, sequence, related, etc.)
 * @returns {string} Hex color with optional alpha
 */
function getEdgeColor(edgeType) {
  const colorMap = {
    derived_from: '#16a34a40',
    sequence: '#9333ea40',
    related: '#11775060',
    supports: '#059669',
    contradicts: '#dc262640',
    clarifies: '#d9770640',
  };
  return colorMap[edgeType] || '#a3a3a380';
}

/**
 * LiveGraphPanel - Real-time graph visualization that grows as SSE events stream in
 *
 * Connects DeepResearch's SSE stream to the graph state. Nodes and edges are
 * inserted immediately as events arrive without blocking agent work.
 *
 * Features:
 * - Non-blocking mutations via useGraphState hook
 * - Layer filtering (sources, claims, trails, blueprints)
 * - Real-time accumulation of nodes/edges
 * - ForceGraph2D visualization with responsive sizing
 * - Orphan edge handling (edges before target node exists)
 * - Deduplication of nodes (overwrites quietly)
 *
 * @component
 * @param {Object} props
 * @param {string} props.sessionId - Research session ID for this graph
 * @param {number} [props.width] - Graph canvas width (default: auto-fill container)
 * @param {number} [props.height] - Graph canvas height (default: auto-fill container)
 * @param {Function} [props.onNodeClick] - Callback when node is clicked
 * @param {Function} [props.onNodeHover] - Callback when node is hovered
 * @param {Object} [props.sse] - Optional pre-established EventSource for testing
 * @returns {JSX.Element} Graph visualization component
 */
function LiveGraphPanel({
  sessionId,
  width = 800,
  height = 600,
  onNodeClick = () => {},
  onNodeHover = () => {},
  sse = null,
}) {
  const { nodes, edges, layerIndex, handleGraphEvent, clearGraph } = useGraphState(sessionId);

  // Layer visibility toggles
  const [visibleLayers, setVisibleLayers] = useState({
    sources: true,
    claims: true,
    trails: true,
    blueprints: true,
    observations: true,
    'csi-nodes': true,
    'csi-verdicts': true,
    'execution-events': true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const sseRef = useRef(null);

  /**
   * Filter nodes by visible layers and return ForceGraph format
   * @returns {Array} Array of nodes in ForceGraph format
   */
  const getVisibleNodes = useCallback(() => {
    const visibleNodeIds = new Set();

    // Collect all node IDs from visible layers
    Object.entries(visibleLayers).forEach(([layer, isVisible]) => {
      if (isVisible && layerIndex[layer]) {
        layerIndex[layer].forEach(nodeId => {
          visibleNodeIds.add(nodeId);
        });
      }
    });

    // Map to ForceGraph format
    return Array.from(visibleNodeIds)
      .map(nodeId => nodes[nodeId])
      .filter(Boolean)
      .map(node => ({
        id: node.id,
        title: node.title,
        type: node.type,
        val: node.val || 6,
        color: node.color,
        ...node.metadata,
      }));
  }, [nodes, layerIndex, visibleLayers]);

  /**
   * Filter edges by visible nodes and return ForceGraph format
   * Orphan edges (missing target node) are stored but not rendered
   * @returns {Array} Array of edges in ForceGraph format
   */
  const getVisibleEdges = useCallback(() => {
    const visibleNodeIds = new Set();

    // Collect visible node IDs
    Object.entries(visibleLayers).forEach(([layer, isVisible]) => {
      if (isVisible && layerIndex[layer]) {
        layerIndex[layer].forEach(nodeId => {
          visibleNodeIds.add(nodeId);
        });
      }
    });

    // Map edges to ForceGraph format, filtering by visible endpoints
    return Object.values(edges)
      .filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map(edge => ({
        source: edge.source,
        target: edge.target,
        color: edge.color || getEdgeColor(edge.type),
        type: edge.type,
        ...edge,
      }));
  }, [edges, layerIndex, visibleLayers]);

  /**
   * Connect to SSE stream and wire up event handlers
   * Sets up EventSource listener that dispatches graph events to handleGraphEvent
   */
  useEffect(() => {
    // Use provided SSE or create new one
    if (sse) {
      sseRef.current = sse;
    } else if (sessionId) {
      // SSE will be set up in DeepResearch component
      // This hook just prepares to receive events
    }

    return () => {
      // Don't close SSE here - it's managed by DeepResearch
      // Just clear the ref
      sseRef.current = null;
    };
  }, [sessionId, sse]);

  /**
   * Handle layer visibility toggle
   */
  const handleLayerChange = useCallback((newLayers) => {
    setVisibleLayers(newLayers);
  }, []);

  /**
   * Handle node click (forward to parent callback)
   */
  const handleNodeClick = useCallback((node) => {
    onNodeClick?.(node);
  }, [onNodeClick]);

  /**
   * Handle node hover (forward to parent callback)
   */
  const handleNodeHover = useCallback((node) => {
    onNodeHover?.(node);
  }, [onNodeHover]);

  /**
   * Expose handleGraphEvent method to parent for direct event dispatch
   * This allows DeepResearch.jsx to call: liveGraphPanelRef.current.handleGraphEvent(event)
   */
  const exposedMethods = useCallback(() => {
    return {
      handleGraphEvent,
      clearGraph,
    };
  }, [handleGraphEvent, clearGraph]);

  // Store exposed methods on component for parent access
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId) {
      window.__liveGraphPanel = {
        [sessionId]: {
          handleGraphEvent,
          clearGraph,
        },
      };
    }

    return () => {
      if (typeof window !== 'undefined' && sessionId) {
        delete window.__liveGraphPanel?.[sessionId];
      }
    };
  }, [sessionId, handleGraphEvent, clearGraph]);

  // Build ForceGraph format data
  const graphData = {
    nodes: getVisibleNodes(),
    links: getVisibleEdges(),
  };

  return (
    <GraphVisualization
      data={graphData}
      layers={visibleLayers}
      use3D={false}
      isLoading={isLoading}
      onNodeClick={handleNodeClick}
      onNodeHover={handleNodeHover}
      onLayerChange={handleLayerChange}
      onNodeContextMenu={() => {}}
      onExport={() => {}}
      onShare={() => {}}
      width={width}
      height={height}
    />
  );
}

export default LiveGraphPanel;
