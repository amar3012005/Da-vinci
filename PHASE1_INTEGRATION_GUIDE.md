# Phase 1: Deep Research Graph SSE → Direct Node Insertion

## Overview
Real-time graph growth: nodes/edges are inserted immediately as SSE events arrive, without waiting for full graph fetch.

## Files Created

### 1. `/src/components/hivemind/app/hooks/useGraphState.js`
**Purpose:** Manage real-time node/edge state with non-blocking mutations

**Key Features:**
- `nodes` state: Record<nodeId, node> - O(1) lookup
- `edges` state: Record<edgeId, edge> - O(1) lookup
- `layerIndex` state: Object mapping layer names to Set<nodeIds> - O(1) filtering
- `handleGraphEvent(event)` - Routes graph.*.* events to mutations
- `clearGraph()` - Reset state for new session
- All mutations queued via `queueMicrotask()` to avoid blocking agent work

**Supported Events:**
```javascript
// Node creation
{ type: 'graph.node.created', payload: {
  nodeId: string,
  type: 'source|claim|structured-claim|plain-claim|trail|blueprint|observation|csi-node|csi-verdict|execution-event',
  title: string,
  val?: number,
  color?: string,
  layer?: string,
  ...metadata
}}

// Edge creation
{ type: 'graph.edge.created', payload: {
  edgeId: string,
  source: string,
  target: string,
  type: string,
  color?: string,
  confidence?: number
}}

// Layer migration
{ type: 'graph.node.layer_updated', payload: {
  nodeId: string,
  layer: string
}}
```

### 2. `/src/components/hivemind/app/components/LiveGraphPanel.jsx`
**Purpose:** Wrapper component connecting SSE stream to real-time graph state

**Key Features:**
- Renders `<GraphVisualization />` with live data
- Converts internal node/edge store to ForceGraph format
- Layer filtering UI (8 toggles: sources, claims, trails, blueprints, observations, csi-nodes, csi-verdicts, execution-events)
- Orphan edge handling (edges with missing target stored but not rendered)
- Deduplication (node overwrites quietly)
- Props: `sessionId`, `width?`, `height?`, `onNodeClick?`, `onNodeHover?`

**Data Flow:**
1. SSE event arrives from backend
2. DeepResearch calls `handleGraphEvent(event)` 
3. `useGraphState` queues mutation via `queueMicrotask()`
4. State updates atomically (nodes + edges + layers together)
5. `LiveGraphPanel` re-renders with filtered visible nodes/edges
6. ForceGraph updates in-place

---

## Integration Steps

### Step 1: Update DeepResearch.jsx

**Add import:**
```javascript
import LiveGraphPanel from '../components/LiveGraphPanel';
import { useRef } from 'react';
```

**Create ref for live graph panel:**
```javascript
const liveGraphPanelRef = useRef(null);
```

**Add to JSX (in graph panel tab):**
```javascript
{panelTab === 'graph' && (
  <LiveGraphPanel 
    sessionId={sessionId}
    width={containerWidth}
    height={containerHeight}
    onNodeClick={handleNodeClick}
    onNodeHover={handleNodeHover}
    ref={liveGraphPanelRef}
  />
)}
```

**Wire SSE handler (in existing EventSource setup around line 745):**

Replace the old `setEvents()` pattern with:
```javascript
source.onmessage = (e) => {
  try {
    const event = JSON.parse(e.data);
    setEvents(prev => [...prev, event]);

    // NEW: Send graph events to live panel
    if (event.type?.startsWith('graph.')) {
      const methods = window.__liveGraphPanel?.[sessionId];
      if (methods) {
        methods.handleGraphEvent(event);
      }
    }

    // Existing event handling (agent.states, task.*, csi.*, etc.)
    if (event.type === 'agent.states' && event.states) {
      // ... existing code
    }
    // ... etc.
  } catch (err) {
    console.error('[SSE] Failed to parse event:', err);
  }
};
```

**Clear graph on new session:**
```javascript
// When starting a new research (in the research start handler)
const methods = window.__liveGraphPanel?.[newSessionId];
if (methods) {
  methods.clearGraph();
}
```

### Step 2: Backend Event Format

Backend must emit graph events in this format during research:

```javascript
// When discovering a source
{
  type: 'graph.node.created',
  payload: {
    nodeId: 'source-' + sourceId,
    type: 'source',
    title: source.title || source.url,
    val: 8,
    color: '#117dff',
    layer: 'sources',
    metadata: {
      url: source.url,
      runtime: source.runtime,
      score: source.score,
      favicon: source.favicon
    }
  }
}

// When claiming something
{
  type: 'graph.node.created',
  payload: {
    nodeId: 'claim-' + claimId,
    type: isStructured ? 'structured-claim' : 'plain-claim',
    title: claim.content.slice(0, 80),
    val: isStructured ? 12 : 8,
    color: isStructured ? '#16a34a' : '#86efac',
    layer: 'claims',
    metadata: {
      confidence: claim.confidence,
      sourceId: claim.source,
      structured: claim.structured
    }
  }
}

// When linking claim to source
{
  type: 'graph.edge.created',
  payload: {
    edgeId: 'link-' + claimId + '-' + sourceId,
    source: 'claim-' + claimId,
    target: 'source-' + sourceId,
    type: 'derived_from',
    color: '#16a34a40',
    confidence: 0.95
  }
}

// When observation occurs
{
  type: 'graph.node.created',
  payload: {
    nodeId: 'obs-' + obsId,
    type: 'observation',
    title: agent + '/' + action + ': ' + title,
    val: 7,
    color: '#3b82f6',
    layer: 'observations',
    metadata: {
      agent: agent,
      action: action,
      findingType: type,
      confidence: confidence,
      source: source,
      createdAt: new Date().toISOString()
    }
  }
}

// When CSI verdict rendered
{
  type: 'graph.node.created',
  payload: {
    nodeId: 'csi-verdict-' + claimId + '-' + verdict,
    type: 'csi-verdict',
    title: verdict.toUpperCase() + ': ' + reason,
    val: 10,
    color: verdictColor,
    layer: 'csi-verdicts',
    metadata: {
      verdict: verdict,
      confidence: confidence,
      claimId: claimId,
      agent: agent,
      reason: reason
    }
  }
}
```

---

## Edge Cases Handled

### Duplicate Node IDs
- New nodes with same ID overwrite previous ones
- No duplication in memory
- Silent overwrite (no warnings)

### Orphan Edges
- Edges stored even if target node doesn't exist yet
- Not rendered until both endpoints exist
- Rendered automatically when target node arrives

### Rapid Event Bursts
- All mutations queued and batched via `queueMicrotask()`
- Multiple events processed in single state update
- Avoids render thrashing with 100+ nodes/second

### Layer Filter During Streaming
- Layer toggles apply immediately to visible set
- In-flight events go to correct layer
- Old events update layerIndex retroactively

---

## Testing Checklist

### Unit Tests
- [ ] `useGraphState` handles 100 nodes/second without blocking
- [ ] Duplicate node IDs overwrite quietly
- [ ] Orphan edges stored and rendered on target arrival
- [ ] Layer filtering O(1) with Set lookups
- [ ] Mutations batched and applied atomically

### Integration Tests
- [ ] LiveGraphPanel renders empty graph initially
- [ ] SSE events add nodes/edges in real-time
- [ ] Layer toggles filter visible nodes/edges
- [ ] Node clicks forward to onNodeClick callback
- [ ] Graph clears on new session start

### Performance Tests
- [ ] 1000 nodes doesn't block agent work
- [ ] Layer filtering < 1ms with 500 nodes
- [ ] SSE event dispatch < 5ms through entire pipeline
- [ ] Memory stable (Set-based dedup prevents leaks)

---

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Add node | O(1) | Mutation queued, batched |
| Add edge | O(1) | Mutation queued, batched |
| Filter by layer | O(n) worst, O(1) avg | Set lookups on layerIndex |
| Render update | O(n) | ForceGraph updates in-place |
| Clear graph | O(1) | State reset via `clearGraph()` |

**Memory:** ~500 bytes/node + ~200 bytes/edge. 1000 nodes = ~700KB.

---

## Debugging

### Enable verbose logging (in useGraphState.js)
```javascript
// Add to handleGraphEvent:
console.log('[useGraphState] Event:', event.type, event.payload);
console.log('[useGraphState] Nodes:', Object.keys(nodes).length);
console.log('[useGraphState] Edges:', Object.keys(edges).length);
```

### Check window global (in browser console)
```javascript
window.__liveGraphPanel[sessionId].handleGraphEvent({
  type: 'graph.node.created',
  payload: { nodeId: 'test-1', type: 'source', title: 'Test' }
});
```

### Monitor mutation queue
```javascript
// In LiveGraphPanel or DeepResearch:
const { nodes, edges, layerIndex } = useGraphState(sessionId);
console.log('Nodes:', Object.keys(nodes).length, 'Edges:', Object.keys(edges).length);
```

---

## Future Enhancements

1. **Persistence:** Save graph to localStorage/IndexedDB between sessions
2. **Conflict Merging:** Handle CSI verdicts that contradict earlier findings
3. **Graph Clustering:** Group related nodes by domain/topic
4. **Temporal Playback:** Scrub through graph growth timeline
5. **Analytics:** Track node creation rate, layer distribution, edge density
6. **Infinite Scroll:** Paginate older nodes out of memory if > 10K
7. **Web Worker:** Offload mutation processing to avoid main thread blocking

---

## References

- `GraphVisualization.jsx` - Renders the force-directed graph (2D/3D)
- `ForceGraph2D` - react-force-graph-2d library
- Backend `/v1/proxy/research/{sessionId}/stream` - SSE endpoint
- DeepResearch.jsx line 745+ - EventSource setup pattern
