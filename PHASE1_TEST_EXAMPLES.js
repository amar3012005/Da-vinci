/**
 * PHASE 1 TEST EXAMPLES
 *
 * These are example code patterns for testing the useGraphState hook
 * and LiveGraphPanel component during development.
 *
 * NOT for production use - copy patterns to test files as needed.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 1: Basic useGraphState Hook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TestUseGraphState() {
  const { nodes, edges, layerIndex, handleGraphEvent, clearGraph } = useGraphState('test-session-1');

  const handleAddSourceNode = () => {
    handleGraphEvent({
      type: 'graph.node.created',
      payload: {
        nodeId: 'source-1',
        type: 'source',
        title: 'Example Source',
        val: 8,
        color: '#117dff',
        layer: 'sources',
        metadata: {
          url: 'https://example.com',
          runtime: 'tavily',
          score: 0.95,
        },
      },
    });
  };

  const handleAddClaimNode = () => {
    handleGraphEvent({
      type: 'graph.node.created',
      payload: {
        nodeId: 'claim-1',
        type: 'structured-claim',
        title: 'Climate change is real',
        val: 12,
        color: '#16a34a',
        layer: 'claims',
        metadata: {
          confidence: 0.98,
          sourceId: 'source-1',
        },
      },
    });
  };

  const handleAddEdge = () => {
    handleGraphEvent({
      type: 'graph.edge.created',
      payload: {
        edgeId: 'link-claim-1-source-1',
        source: 'claim-1',
        target: 'source-1',
        type: 'derived_from',
        color: '#16a34a40',
        confidence: 0.95,
      },
    });
  };

  const handleClearAll = () => {
    clearGraph();
  };

  return (
    <div className="p-4 space-y-2">
      <h3>useGraphState Test</h3>
      <div className="text-sm text-gray-600">
        Nodes: {Object.keys(nodes).length} | Edges: {Object.keys(edges).length}
      </div>
      <button onClick={handleAddSourceNode}>Add Source Node</button>
      <button onClick={handleAddClaimNode}>Add Claim Node</button>
      <button onClick={handleAddEdge}>Add Edge</button>
      <button onClick={handleClearAll}>Clear All</button>
      <pre className="bg-gray-100 p-2 text-xs overflow-auto">
        {JSON.stringify({ nodes, edges }, null, 2)}
      </pre>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 2: Rapid Node Insertion (100 nodes/second)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TestRapidInsertion() {
  const { nodes, edges, handleGraphEvent } = useGraphState('stress-test');
  const [insertSpeed, setInsertSpeed] = useState('normal');

  const handleStressTest = () => {
    const nodeCount = insertSpeed === 'heavy' ? 500 : 100;
    const startTime = performance.now();

    for (let i = 0; i < nodeCount; i++) {
      handleGraphEvent({
        type: 'graph.node.created',
        payload: {
          nodeId: `stress-node-${i}`,
          type: 'source',
          title: `Node ${i}`,
          val: 6,
          color: '#117dff',
          layer: 'sources',
          metadata: { index: i },
        },
      });
    }

    const elapsed = performance.now() - startTime;
    console.log(`Inserted ${nodeCount} nodes in ${elapsed.toFixed(2)}ms`);
  };

  return (
    <div className="p-4 space-y-2">
      <h3>Rapid Insertion Test</h3>
      <div className="text-sm">
        Nodes: {Object.keys(nodes).length} | Speed: {insertSpeed}
      </div>
      <select value={insertSpeed} onChange={(e) => setInsertSpeed(e.target.value)}>
        <option value="normal">100 nodes</option>
        <option value="heavy">500 nodes</option>
      </select>
      <button onClick={handleStressTest}>Run Stress Test</button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 3: Orphan Edge Handling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TestOrphanEdges() {
  const { nodes, edges, handleGraphEvent } = useGraphState('orphan-test');

  const handleAddOrphanEdge = () => {
    // Add edge BEFORE target node exists
    handleGraphEvent({
      type: 'graph.edge.created',
      payload: {
        edgeId: 'orphan-link-1',
        source: 'claim-99',
        target: 'source-99', // This node doesn't exist yet!
        type: 'derived_from',
        color: '#16a34a40',
      },
    });
    console.log('Edge added (target node missing)');
  };

  const handleAddTargetNode = () => {
    // Now add the target node
    handleGraphEvent({
      type: 'graph.node.created',
      payload: {
        nodeId: 'source-99',
        type: 'source',
        title: 'Late Arrival Source',
        val: 8,
        color: '#117dff',
        layer: 'sources',
      },
    });
    console.log('Target node added - orphan edge should render now');
  };

  return (
    <div className="p-4 space-y-2">
      <h3>Orphan Edge Test</h3>
      <div className="text-sm">
        Edges: {Object.keys(edges).length} | Nodes: {Object.keys(nodes).length}
      </div>
      <button onClick={handleAddOrphanEdge}>Add Orphan Edge (target missing)</button>
      <button onClick={handleAddTargetNode}>Add Target Node (should render edge)</button>
      <div className="text-xs text-gray-500 mt-2">
        Expected: Edge stored but not rendered until source-99 is added
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 4: Layer Filtering
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TestLayerFiltering() {
  const { nodes, layerIndex, handleGraphEvent } = useGraphState('layer-test');
  const [visibleLayers, setVisibleLayers] = useState({
    sources: true,
    claims: true,
    trails: true,
  });

  const handleAddNodesAllLayers = () => {
    handleGraphEvent({
      type: 'graph.node.created',
      payload: {
        nodeId: 'source-1',
        type: 'source',
        title: 'Source',
        layer: 'sources',
      },
    });
    handleGraphEvent({
      type: 'graph.node.created',
      payload: {
        nodeId: 'claim-1',
        type: 'claim',
        title: 'Claim',
        layer: 'claims',
      },
    });
    handleGraphEvent({
      type: 'graph.node.created',
      payload: {
        nodeId: 'trail-1',
        type: 'trail',
        title: 'Trail',
        layer: 'trails',
      },
    });
  };

  const visibleCount = Object.entries(visibleLayers).reduce((sum, [layer, visible]) => {
    return sum + (visible && layerIndex[layer] ? layerIndex[layer].size : 0);
  }, 0);

  return (
    <div className="p-4 space-y-2">
      <h3>Layer Filtering Test</h3>
      <div className="text-sm">Visible nodes: {visibleCount}</div>
      <button onClick={handleAddNodesAllLayers}>Add Nodes to All Layers</button>
      <div className="space-y-1 mt-2">
        {Object.keys(visibleLayers).map(layer => (
          <label key={layer} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={visibleLayers[layer]}
              onChange={(e) =>
                setVisibleLayers(prev => ({ ...prev, [layer]: e.target.checked }))
              }
            />
            {layer} ({(layerIndex[layer]?.size || 0)} nodes)
          </label>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 5: Duplicate Node Handling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TestDuplicateNodes() {
  const { nodes, handleGraphEvent } = useGraphState('dupe-test');

  const handleAddDuplicateNode = () => {
    handleGraphEvent({
      type: 'graph.node.created',
      payload: {
        nodeId: 'source-1',
        type: 'source',
        title: 'First Version',
        metadata: { version: 1 },
      },
    });

    // Immediately overwrite with new data
    handleGraphEvent({
      type: 'graph.node.created',
      payload: {
        nodeId: 'source-1', // Same ID!
        type: 'source',
        title: 'Updated Version',
        metadata: { version: 2 },
      },
    });
  };

  return (
    <div className="p-4 space-y-2">
      <h3>Duplicate Node Test</h3>
      <div className="text-sm">
        Nodes: {Object.keys(nodes).length} (should stay 1)
      </div>
      <button onClick={handleAddDuplicateNode}>Add Duplicate Nodes</button>
      <pre className="bg-gray-100 p-2 text-xs">
        {JSON.stringify(nodes['source-1'], null, 2)}
      </pre>
      <div className="text-xs text-gray-500">
        Expected: Title should be "Updated Version" (v2)
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST 6: Browser Console Testing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Paste into browser console during DeepResearch:
 */

// Check if graph panel exists
console.log('Live graph panels:', window.__liveGraphPanel);

// Get reference to current session
const sessionId = 'your-session-id'; // Get from DeepResearch state
const panel = window.__liveGraphPanel?.[sessionId];

// Test adding a node
panel?.handleGraphEvent({
  type: 'graph.node.created',
  payload: {
    nodeId: 'test-from-console-1',
    type: 'source',
    title: 'Added from Console',
    val: 8,
    color: '#117dff',
    layer: 'sources',
  },
});

// Test adding an edge
panel?.handleGraphEvent({
  type: 'graph.edge.created',
  payload: {
    edgeId: 'test-edge-1',
    source: 'test-from-console-1',
    target: 'source-1',
    type: 'related',
    color: '#11775060',
  },
});

// Monitor performance
console.time('Add 100 nodes');
for (let i = 0; i < 100; i++) {
  panel?.handleGraphEvent({
    type: 'graph.node.created',
    payload: {
      nodeId: `perf-test-${i}`,
      type: 'source',
      title: `Perf Test ${i}`,
      layer: 'sources',
    },
  });
}
console.timeEnd('Add 100 nodes');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERFORMANCE BENCHMARKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Expected results on modern hardware:
 *
 * Test: Add 100 nodes sequentially
 * Expected: < 50ms total
 * (Mutation queueing + batching via queueMicrotask)
 *
 * Test: Add 1000 nodes in burst
 * Expected: < 500ms total
 * All mutations batched into single state update
 *
 * Test: Layer filter on 500 nodes
 * Expected: < 1ms
 * Set-based O(1) lookups in layerIndex
 *
 * Test: Render with 1000 nodes/500 edges
 * Expected: < 60ms per frame
 * ForceGraph in-place updates (not full re-render)
 */

export { TestUseGraphState, TestRapidInsertion, TestOrphanEdges, TestLayerFiltering, TestDuplicateNodes };
