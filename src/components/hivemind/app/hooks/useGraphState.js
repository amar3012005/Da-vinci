import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Node shape for internal state
 * @typedef {Object} GraphNode
 * @property {string} id - Unique node identifier
 * @property {string} type - Node type: source, claim, structured-claim, plain-claim, trail, blueprint, observation, csi-node, csi-verdict, execution-event
 * @property {string} title - Display title
 * @property {number} [val] - Visual size value (default 6)
 * @property {string} [color] - Hex color code
 * @property {Object} [metadata] - Additional metadata (runtime, confidence, agent, action, etc.)
 */

/**
 * Edge shape for internal state
 * @typedef {Object} GraphEdge
 * @property {string} id - Unique edge identifier
 * @property {string} source - Source node ID
 * @property {string} target - Target node ID
 * @property {string} type - Edge type: derived_from, sequence, related, etc.
 * @property {string} [color] - Hex color code with optional alpha
 * @property {number} [confidence] - Edge confidence score (0-1)
 */

/**
 * Graph state change event from backend SSE
 * @typedef {Object} GraphEvent
 * @property {string} type - Event type: graph.node.created, graph.edge.created, graph.node.layer_updated
 * @property {string} [nodeId] - Node ID for node events
 * @property {string} [edgeId] - Edge ID for edge events
 * @property {Object} [payload] - Event payload
 */

/**
 * useGraphState - Manages real-time node/edge state with non-blocking mutations
 *
 * Provides O(1) lookups for nodes/edges and layer filtering. All mutations are
 * queued via queueMicrotask to avoid blocking agent work. Nodes/edges accumulate
 * in memory as SSE events arrive.
 *
 * @param {string} sessionId - Session identifier for the research session
 * @returns {Object} Graph state and handlers
 * @returns {Object} .nodes - Record<nodeId, node> - All nodes keyed by ID
 * @returns {Object} .edges - Record<edgeId, edge> - All edges keyed by ID
 * @returns {Object} .layerIndex - Object with layer -> Set<nodeId> mapping for O(1) filtering
 * @returns {Function} .handleGraphEvent - Handler for graph.*.* events from SSE stream
 * @returns {Function} .clearGraph - Clear all nodes and edges
 */
export function useGraphState(sessionId) {
  const [nodes, setNodes] = useState({});
  const [edges, setEdges] = useState({});

  // Layer index: { layerName: Set<nodeId> } for O(1) layer filtering
  // Updated via queueMicrotask to avoid blocking
  const [layerIndex, setLayerIndex] = useState({
    sources: new Set(),
    claims: new Set(),
    'structured-claims': new Set(),
    'plain-claims': new Set(),
    trails: new Set(),
    blueprints: new Set(),
    observations: new Set(),
    'csi-nodes': new Set(),
    'csi-verdicts': new Set(),
    'execution-events': new Set(),
  });

  // Track mutation queue to batch updates
  const mutationQueueRef = useRef([]);
  const processingRef = useRef(false);

  /**
   * Process queued mutations with non-blocking batching
   * Uses queueMicrotask to defer actual state updates
   */
  const processMutationQueue = useCallback(() => {
    if (processingRef.current || mutationQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;

    queueMicrotask(() => {
      const queue = mutationQueueRef.current;
      mutationQueueRef.current = [];

      if (queue.length === 0) {
        processingRef.current = false;
        return;
      }

      let nodeMutations = {};
      let edgeMutations = {};
      let layerMutationsPending = {};

      // Batch all mutations
      queue.forEach(({ type, payload }) => {
        if (type === 'node.created' || type === 'node.updated') {
          const { id, layer, ...nodeData } = payload;
          nodeMutations[id] = {
            id,
            ...nodeData,
          };
          // Track layer membership
          if (layer) {
            if (!layerMutationsPending[layer]) {
              layerMutationsPending[layer] = new Set();
            }
            layerMutationsPending[layer].add(id);
          }
        } else if (type === 'edge.created') {
          const { id, ...edgeData } = payload;
          edgeMutations[id] = {
            id,
            ...edgeData,
          };
        }
      });

      // Apply node mutations atomically
      if (Object.keys(nodeMutations).length > 0) {
        setNodes(prev => ({ ...prev, ...nodeMutations }));
      }

      // Apply edge mutations atomically
      if (Object.keys(edgeMutations).length > 0) {
        setEdges(prev => ({ ...prev, ...edgeMutations }));
      }

      // Apply layer mutations atomically
      if (Object.keys(layerMutationsPending).length > 0) {
        setLayerIndex(prev => {
          const next = { ...prev };
          Object.entries(layerMutationsPending).forEach(([layer, nodeIds]) => {
            if (!next[layer]) {
              next[layer] = new Set();
            }
            // Add new node IDs to layer
            nodeIds.forEach(id => next[layer].add(id));
          });
          return next;
        });
      }

      processingRef.current = false;

      // Process any mutations queued during this batch
      if (mutationQueueRef.current.length > 0) {
        processMutationQueue();
      }
    });
  }, []);

  /**
   * Handle SSE graph events and queue mutations
   * Routes graph.*.* events to appropriate handlers
   *
   * Supported events:
   * - graph.node.created: { nodeId, type, title, val, color, metadata, layer }
   * - graph.edge.created: { edgeId, source, target, type, color, confidence }
   * - graph.node.layer_updated: { nodeId, layer }
   *
   * @param {GraphEvent} event - Event from SSE stream
   */
  const handleGraphEvent = useCallback((event) => {
    if (!event || !event.type) {
      return;
    }

    switch (event.type) {
      case 'graph.node.created': {
        const {
          nodeId,
          type,
          title,
          val = 6,
          color,
          layer,
          ...metadata
        } = event.payload || {};

        if (!nodeId || !type) {
          console.warn('[useGraphState] Invalid node.created event', event);
          return;
        }

        mutationQueueRef.current.push({
          type: 'node.created',
          payload: {
            id: nodeId,
            type,
            title: title || 'Untitled',
            val,
            color,
            layer,
            metadata,
          },
        });

        processMutationQueue();
        break;
      }

      case 'graph.edge.created': {
        const {
          edgeId,
          source,
          target,
          type,
          color,
          confidence,
          ...metadata
        } = event.payload || {};

        if (!edgeId || !source || !target) {
          console.warn('[useGraphState] Invalid edge.created event', event);
          return;
        }

        // Store edge even if target node doesn't exist yet (orphan edge)
        // Will be rendered once target node is created
        mutationQueueRef.current.push({
          type: 'edge.created',
          payload: {
            id: edgeId,
            source,
            target,
            type,
            color,
            confidence,
            ...metadata,
          },
        });

        processMutationQueue();
        break;
      }

      case 'graph.node.layer_updated': {
        const { nodeId, layer } = event.payload || {};

        if (!nodeId || !layer) {
          console.warn('[useGraphState] Invalid node.layer_updated event', event);
          return;
        }

        // Move node from one layer to another
        setLayerIndex(prev => {
          const next = { ...prev };

          // Remove from all existing layers
          Object.keys(next).forEach(l => {
            next[l].delete(nodeId);
          });

          // Add to new layer
          if (!next[layer]) {
            next[layer] = new Set();
          }
          next[layer].add(nodeId);

          return next;
        });

        // Update node metadata
        setNodes(prev => {
          const node = prev[nodeId];
          if (!node) return prev;

          return {
            ...prev,
            [nodeId]: {
              ...node,
              layer,
            },
          };
        });

        break;
      }

      default:
        // Silently ignore unknown event types
        break;
    }
  }, [processMutationQueue]);

  /**
   * Clear all nodes and edges from state
   * Useful when starting a new research session
   */
  const clearGraph = useCallback(() => {
    setNodes({});
    setEdges({});
    setLayerIndex({
      sources: new Set(),
      claims: new Set(),
      'structured-claims': new Set(),
      'plain-claims': new Set(),
      trails: new Set(),
      blueprints: new Set(),
      observations: new Set(),
      'csi-nodes': new Set(),
      'csi-verdicts': new Set(),
      'execution-events': new Set(),
    });
    mutationQueueRef.current = [];
    processingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mutationQueueRef.current = [];
      processingRef.current = false;
    };
  }, []);

  return {
    nodes,
    edges,
    layerIndex,
    handleGraphEvent,
    clearGraph,
  };
}

export default useGraphState;
