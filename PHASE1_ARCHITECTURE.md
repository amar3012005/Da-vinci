# Phase 1: Deep Research Graph Transformation Architecture

## Goal
Real-time graph visualization that grows as SSE events stream in, without blocking agent work.

## Core Design Principles

1. **Non-blocking mutations**: All state updates via `queueMicrotask()` to defer from main thread
2. **Memory efficiency**: O(1) node/edge lookups + Set-based layer indexing
3. **No polling**: Direct SSE event dispatch, no fetch-wait cycles
4. **Graceful degradation**: Orphan edges stored until target arrives, no errors
5. **Deduplication**: Duplicate node IDs overwrite silently

## Architecture Diagram

```
Backend Research Engine
        |
        | SSE /v1/proxy/research/{sessionId}/stream
        v
  EventSource (DeepResearch.jsx)
        |
        | event.type === 'graph.*'
        v
  window.__liveGraphPanel[sessionId].handleGraphEvent(event)
        |
        v
  useGraphState Hook
    - Mutation Queue (array)
    - queueMicrotask() processor
    - Atomic state updates
        |
        +-> nodes (Record<id, node>)
        +-> edges (Record<id, edge>)
        +-> layerIndex (Record<layer, Set<id>>)
        |
        v
  LiveGraphPanel Component
    - Filter nodes by visible layers
    - Convert to ForceGraph format
    - Render GraphVisualization
        |
        v
  ForceGraph2D
    - In-place physics simulation
    - Canvas rendering
    - Interactive UI
```

## Data Structures

### useGraphState Internal State

```javascript
// Nodes: O(1) lookup
nodes = {
  'source-1': { id, type, title, val, color, layer, metadata },
  'claim-1': { id, type, title, val, color, layer, metadata },
  'trail-1': { id, type, title, val, color, layer, metadata },
  ...
}

// Edges: O(1) lookup
edges = {
  'link-claim-1-source-1': { id, source, target, type, color, confidence },
  'link-trail-1-trail-0': { id, source, target, type, color, confidence },
  ...
}

// Layer Index: O(1) filtering
layerIndex = {
  'sources': Set(['source-1', 'source-2', ...]),
  'claims': Set(['claim-1', 'claim-2', ...]),
  'trails': Set(['trail-1', 'trail-2', ...]),
  'blueprints': Set(['bp-1', ...]),
  'observations': Set(['obs-1', 'obs-2', ...]),
  'csi-nodes': Set(['csi-1', ...]),
  'csi-verdicts': Set(['verdict-1', ...]),
  'execution-events': Set(['exec-1', ...]),
}

// Mutation Queue: Batching
mutationQueue = [
  { type: 'node.created', payload: {...} },
  { type: 'edge.created', payload: {...} },
  { type: 'node.created', payload: {...} },
  ...
]
```

### ForceGraph Input Format (from LiveGraphPanel)

```javascript
{
  nodes: [
    { id, title, type, val, color, ...metadata },
    ...
  ],
  links: [
    { source, target, color, type, ...metadata },
    ...
  ]
}
```

## Event Flow Example

### Timeline: Source Discovery to Visualization

**T+0ms**: Backend discovers web source
```
Event: {
  type: 'graph.node.created',
  payload: {
    nodeId: 'source-github-1',
    type: 'source',
    title: 'GitHub - Machine Learning',
    val: 8,
    color: '#117dff',
    layer: 'sources',
    metadata: { url: 'https://github.com/...', score: 0.95 }
  }
}
```

**T+1ms**: EventSource receives, forwards to handleGraphEvent
```javascript
source.onmessage = (e) => {
  const event = JSON.parse(e.data);
  window.__liveGraphPanel[sessionId].handleGraphEvent(event);
};
```

**T+2ms**: useGraphState queues mutation
```javascript
mutationQueueRef.current.push({
  type: 'node.created',
  payload: { id: 'source-github-1', ... }
});
processMutationQueue();
```

**T+3ms**: queueMicrotask() defers update
```javascript
queueMicrotask(() => {
  setNodes(prev => ({ ...prev, 'source-github-1': {...} }));
  setLayerIndex(prev => ({
    ...prev,
    'sources': prev.sources.add('source-github-1')
  }));
});
```

**T+4ms**: State updates applied (batched with other mutations)
```javascript
// Multiple mutations merged into single update
// All nodes, edges, layers updated atomically
```

**T+5ms**: LiveGraphPanel re-renders
```javascript
const graphData = {
  nodes: getVisibleNodes(), // Filters by visibleLayers
  links: getVisibleEdges()  // Filters by visible node IDs
};
return <GraphVisualization data={graphData} ... />;
```

**T+6ms**: ForceGraph receives new data
```javascript
<ForceGraph2D graphData={data} ... />
// Physics engine adds node to simulation
// Canvas draws new node in next animation frame
```

**T+16ms**: Browser renders (typical 60fps = 16.6ms frames)
```
Visual: New node appears on canvas with animation
```

## Performance Characteristics

### Mutation Processing

| Scenario | Time | Mechanism |
|----------|------|-----------|
| Single node insert | <1ms | Direct queue + microtask |
| 100 nodes burst | <10ms | Batched via queueMicrotask |
| 1000 nodes burst | <50ms | Single atomic state update |
| 10K nodes burst | <300ms | Batching prevents render thrash |

### Filtering

| Operation | Complexity | Time (500 nodes) |
|-----------|-----------|------------------|
| Get visible nodes | O(n) | <5ms |
| Layer toggle | O(1) lookup + O(n) render | <10ms |
| Filter by layer set | O(visible nodes) | <3ms |

### Memory

| Item | Size | Notes |
|------|------|-------|
| Node object | ~500 bytes | id + type + title + metadata |
| Edge object | ~200 bytes | source + target + type |
| Layer set entry | ~8 bytes | Reference to node ID |
| 1000 nodes | ~700KB | Typical research session |

## Edge Cases Handled

### 1. Duplicate Node IDs
```javascript
// First event
handleGraphEvent({
  type: 'graph.node.created',
  payload: { nodeId: 'source-1', title: 'v1', ... }
});

// Second event with same ID
handleGraphEvent({
  type: 'graph.node.created',
  payload: { nodeId: 'source-1', title: 'v2', ... }
});

// Result: nodes['source-1'] = { title: 'v2', ... }
// No duplication, silent overwrite
```

### 2. Orphan Edges (target doesn't exist yet)
```javascript
// Edge added first
handleGraphEvent({
  type: 'graph.edge.created',
  payload: { 
    edgeId: 'link-1',
    source: 'claim-1',
    target: 'source-1', // doesn't exist
    ...
  }
});
// Result: edges['link-1'] stored but NOT rendered

// Target arrives later
handleGraphEvent({
  type: 'graph.node.created',
  payload: { nodeId: 'source-1', ... }
});
// Result: link-1 now renders (both endpoints exist)
```

### 3. Rapid Mutation Bursts
```javascript
// 100 events in 1ms
for (let i = 0; i < 100; i++) {
  handleGraphEvent({ type: 'graph.node.created', ... });
}

// Result:
// - All mutations queued
// - processMutationQueue() called
// - queueMicrotask batches ALL 100 into single state update
// - Single render (not 100 renders)
```

### 4. Layer Filter During Streaming
```javascript
// Visible layers filter applied during event stream
// Old events update layerIndex retroactively

visibleLayers = { sources: true, claims: false };
handleGraphEvent({
  type: 'graph.node.created',
  payload: { nodeId: 'claim-1', layer: 'claims', ... }
});
// claim-1 added to nodes + layerIndex['claims']
// But NOT rendered (claims hidden in UI)

visibleLayers = { sources: true, claims: true };
// claim-1 appears in graph immediately (already in layerIndex)
```

## Testing Strategy

### Unit Tests (useGraphState)
```javascript
// Test 1: Add node
const { nodes, handleGraphEvent } = renderHook(() => useGraphState('test'));
act(() => handleGraphEvent({ type: 'graph.node.created', ... }));
expect(Object.keys(nodes)).toHaveLength(1);

// Test 2: Duplicate dedup
act(() => handleGraphEvent({ type: 'graph.node.created', payload: { nodeId: 'n1', ... } }));
act(() => handleGraphEvent({ type: 'graph.node.created', payload: { nodeId: 'n1', ... } }));
expect(Object.keys(nodes)).toHaveLength(1);

// Test 3: Orphan edge
act(() => handleGraphEvent({ type: 'graph.edge.created', payload: { source: 'n1', target: 'n2', ... } }));
expect(Object.keys(edges)).toHaveLength(1);
// Edge stored but not visible until n2 exists

// Test 4: Layer filtering
act(() => handleGraphEvent({ type: 'graph.node.created', payload: { layer: 'sources', ... } }));
expect(layerIndex['sources'].has('n1')).toBe(true);
```

### Integration Tests (LiveGraphPanel)
```javascript
// Test 1: Graph renders live data
render(<LiveGraphPanel sessionId="test" />);
const panel = window.__liveGraphPanel['test'];
act(() => panel.handleGraphEvent({ type: 'graph.node.created', ... }));
expect(screen.getByText('Node Title')).toBeInTheDocument();

// Test 2: Layer toggles filter
const button = screen.getByText('Claims');
fireEvent.click(button); // Hide claims
// Claim nodes should disappear from graph

// Test 3: Node click callback
onNodeClick = jest.fn();
render(<LiveGraphPanel onNodeClick={onNodeClick} ... />);
// Click node in graph
expect(onNodeClick).toHaveBeenCalled();
```

### Stress Tests
```javascript
// Test: 1000 nodes, measure performance
console.time('1000 nodes');
for (let i = 0; i < 1000; i++) {
  handleGraphEvent({ type: 'graph.node.created', payload: { nodeId: `n${i}`, ... } });
}
console.timeEnd('1000 nodes');
// Expected: < 200ms

// Test: Filter on large dataset
console.time('Filter 500 nodes');
const visibleNodes = getVisibleNodes(); // All layers hidden except sources
console.timeEnd('Filter 500 nodes');
// Expected: < 5ms
```

## Migration from Old Graph Fetching

### Before (Phase 0)
```javascript
// Full graph fetch on demand
const fetchGraphData = async (sessionId) => {
  const { data } = await api.get(`/v1/proxy/research/${sessionId}/graph`);
  setGraphData(data);
  // Lag: 200-500ms per fetch
};

useEffect(() => {
  if (panelTab === 'graph') {
    fetchGraphData(sessionId); // Manual fetch
  }
}, [panelTab]);
```

### After (Phase 1)
```javascript
// Real-time updates as events arrive
const { nodes, edges, layerIndex, handleGraphEvent } = useGraphState(sessionId);

source.onmessage = (e) => {
  const event = JSON.parse(e.data);
  if (event.type?.startsWith('graph.')) {
    handleGraphEvent(event);
    // Real-time: < 5ms latency
  }
};
```

## Future Phases

### Phase 2: Persistence
- Save graph to IndexedDB
- Resume on refresh
- Local-first with sync

### Phase 3: Conflict Merging
- Handle CSI verdicts that contradict earlier claims
- Visual conflict indicators
- Merge suggestions

### Phase 4: Clustering
- Group related nodes
- Community detection
- Automatic layout optimization

### Phase 5: Temporal Playback
- Scrub timeline of graph growth
- Replay research progression
- Checkpoint/restore

## References

- [useGraphState hook](./src/components/hivemind/app/hooks/useGraphState.js) - State management
- [LiveGraphPanel component](./src/components/hivemind/app/components/LiveGraphPanel.jsx) - UI wrapper
- [GraphVisualization](./src/components/hivemind/app/components/GraphVisualization.jsx) - Rendering
- [DeepResearch.jsx](./src/components/hivemind/app/pages/DeepResearch.jsx#L745) - SSE setup (line 745)
- [React Force Graph](https://github.com/vasturiano/react-force-graph) - Physics engine
