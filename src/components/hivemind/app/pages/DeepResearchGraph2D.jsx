/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Network, X, Search, RefreshCw, Layers, GitBranch, Crosshair, CheckCircle2
} from 'lucide-react';
import apiClient from '../shared/api-client';

/* ──── Colors & Constants ──────────────────────────────────────── */
const LAYER_COLORS = {
  sources: '#117dff',
  claims: '#16a34a',
  trails: '#9333ea',
  blueprints: '#d97706',
  observations: '#3b82f6',
  promoted: '#0f766e',
  live: '#f59e0b',
};

const LAYER_ORDER = ['sources', 'claims', 'trails', 'observations', 'promoted', 'blueprints'];

const LAYER_META = {
  sources:      { label: 'Sources',      icon: '◉', z: 4 },
  claims:       { label: 'Claims',       icon: '◇', z: 3 },
  trails:       { label: 'Trails',       icon: '⬡', z: 2 },
  observations: { label: 'Observations', icon: '•', z: 1 },
  promoted:     { label: 'Promoted',     icon: '✦', z: 1 },
  blueprints:   { label: 'Blueprints',   icon: '◆', z: 0 },
};

const EDGE_COLORS = {
  derived_from: '#117dff',
  supports: '#16a34a',
  contradicts: '#dc2626',
  discovered: '#9333ea',
  explored: '#9333ea',
  found: '#3b82f6',
  related: '#a3a3a3',
  used_blueprint: '#d97706',
};

/* ──── Helpers ──────────────────────────────────────────────────── */
function truncate(str, len = 60) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hashCode(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/* ──── Shared: build nodes + links from API response ──────────── */
function buildGraphFromLayers(layers) {
  const nodes = [];
  const links = [];
  const seenLinks = new Set();
  const addLink = (source, target, type = 'related', confidence = 0.5) => {
    if (!source || !target || source === target) return;
    const key = `${source}|${target}|${type}`;
    if (seenLinks.has(key)) return;
    seenLinks.add(key);
    links.push({ source, target, type, confidence });
  };

  if (layers.sources?.length > 0) {
    layers.sources.forEach((s) => {
      nodes.push({
        id: `source-${s.id}`, title: s.title || s.url || 'Source',
        type: 'source', layer: 'sources', url: s.url,
        runtime: s.runtime, val: 10,
        sourceIds: [s.id].filter(Boolean),
      });
    });
  }
  if (layers.claims?.length > 0) {
    layers.claims.forEach((c) => {
      const sourceIds = [
        ...(Array.isArray(c.sourceIds) ? c.sourceIds : []),
        c.source,
        c.sourceId,
      ].filter(Boolean);
      nodes.push({
        id: `claim-${c.id}`, title: c.content?.slice(0, 80) || 'Claim',
        type: 'claim', layer: 'claims', confidence: c.confidence,
        content: c.content, agent: c.agent, val: 11,
        sourceIds,
        trailId: c.trailId || null,
        observationIds: Array.isArray(c.observationIds) ? c.observationIds : [],
      });
      sourceIds.forEach((sourceId) => addLink(`claim-${c.id}`, `source-${sourceId}`, 'derived_from', c.confidence ?? 0.7));
    });
  }
  if (layers.trails?.length > 0) {
    layers.trails.forEach((t, idx) => {
      const sourceIds = [
        ...(Array.isArray(t.sourceIds) ? t.sourceIds : []),
        t.sourceId,
      ].filter(Boolean);
      const claimIds = [
        ...(Array.isArray(t.claimIds) ? t.claimIds : []),
        t.claimId,
      ].filter(Boolean);
      const observationIds = [
        ...(Array.isArray(t.observationIds) ? t.observationIds : []),
        t.observationId,
      ].filter(Boolean);
      const relatedNodeIds = [
        ...(Array.isArray(t.relatedNodeIds) ? t.relatedNodeIds : []),
      ].filter(Boolean);
      nodes.push({
        id: `trail-${t.id}`, title: `${t.agent}: ${t.action}`,
        type: 'trail', layer: 'trails', agent: t.agent,
        action: t.action, val: 8,
        sourceIds,
        claimIds,
        observationIds,
        relatedNodeIds,
        parentStepId: t.parentStepId || null,
        relationType: t.relationType || null,
        reportId: t.reportId || null,
      });
      if (idx > 0) {
        const prev = layers.trails[idx - 1];
        addLink(`trail-${t.id}`, `trail-${prev.id}`, 'sequence', 0.72);
      }
      sourceIds.forEach((sourceId) => addLink(`trail-${t.id}`, `source-${sourceId}`, 'used_source', 0.75));
      claimIds.forEach((claimId) => addLink(`trail-${t.id}`, `claim-${claimId}`, t.relationType || 'derived_from', 0.8));
      observationIds.forEach((obsId) => addLink(`trail-${t.id}`, `obs-${obsId}`, 'observed', 0.75));
      relatedNodeIds.forEach((nodeId) => addLink(`trail-${t.id}`, nodeId, 'related', 0.62));
      if (t.parentStepId) addLink(`trail-${t.id}`, `trail-${t.parentStepId}`, 'sequence', 0.64);
    });
  }
  if (layers.observations?.length > 0) {
    layers.observations.forEach((o) => {
      const sourceIds = [
        ...(Array.isArray(o.sourceIds) ? o.sourceIds : []),
        o.sourceId,
      ].filter(Boolean);
      const claimIds = [
        ...(Array.isArray(o.claimIds) ? o.claimIds : []),
        o.claimId,
      ].filter(Boolean);
      nodes.push({
        id: `obs-${o.id}`,
        title: `${o.agent}/${o.action}: ${o.title?.slice(0, 40) || 'Obs'}`,
        type: 'observation', layer: 'observations', agent: o.agent,
        action: o.action, confidence: o.confidence, val: 8,
        sourceIds,
        claimIds,
      });
      sourceIds.forEach((sourceId) => addLink(`obs-${o.id}`, `source-${sourceId}`, 'found', 0.7));
      claimIds.forEach((claimId) => addLink(`obs-${o.id}`, `claim-${claimId}`, 'supports', 0.68));
    });
  }
  if (layers.executionEvents?.length > 0) {
    layers.executionEvents.forEach((e) => {
      nodes.push({
        id: `exec-${e.id}`, title: `${e.agent}/${e.action}`,
        type: 'execution-event', layer: 'observations',
        agent: e.agent, action: e.action, success: e.success, val: 5,
      });
    });
  }
  if (layers.blueprints?.length > 0) {
    layers.blueprints.forEach((b) => {
      const trailIds = [
        ...(Array.isArray(b.trailIds) ? b.trailIds : []),
        b.trailId,
      ].filter(Boolean);
      nodes.push({
        id: `blueprint-${b.blueprintId}`, title: b.name || 'Blueprint',
        type: 'blueprint', layer: 'blueprints', domain: b.domain,
        timesReused: b.timesReused, val: 12,
        patternCount: b.patternCount || (Array.isArray(b.pattern) ? b.pattern.length : 0),
        hasCapturedState: !!b.hasCapturedState,
        capturedStateSummary: b.capturedStateSummary || null,
        trailIds,
      });
      trailIds.forEach((trailId) => addLink(`blueprint-${b.blueprintId}`, `trail-${trailId}`, 'used_blueprint', 0.72));
    });
  }

  if (layers.promoted?.length > 0) {
    layers.promoted.forEach((p) => {
      const sourceIds = [
        ...(Array.isArray(p.sourceIds) ? p.sourceIds : []),
      ].filter(Boolean);
      const claimIds = [
        ...(Array.isArray(p.claimIds) ? p.claimIds : []),
      ].filter(Boolean);
      const trailStepIds = [
        ...(Array.isArray(p.trailStepIds) ? p.trailStepIds : []),
      ].filter(Boolean);
      const recalledMemoryIds = [
        ...(Array.isArray(p.recalledMemoryIds) ? p.recalledMemoryIds : []),
      ].filter(Boolean);
      nodes.push({
        id: `promoted-${p.id}`, title: p.title || 'Promoted memory',
        type: 'promoted-memory', layer: 'promoted', confidence: p.confidence,
        content: p.content, val: 13, reportId: p.reportId || null,
        goldenLine: p.goldenLine || null, promotedAt: p.promotedAt || null,
        sourceIds, claimIds, trailStepIds, recalledMemoryIds,
      });
      sourceIds.forEach((sourceId) => addLink(`promoted-${p.id}`, `source-${sourceId}`, 'uses', 0.7));
      claimIds.forEach((claimId) => addLink(`promoted-${p.id}`, `claim-${claimId}`, 'uses', 0.8));
      trailStepIds.forEach((stepId) => addLink(`promoted-${p.id}`, `trail-${stepId}`, 'recalls', 0.7));
      recalledMemoryIds.forEach((memoryId) => addLink(`promoted-${p.id}`, memoryId, 'recalls', 0.65));
    });
  }

  const nodeIds = new Set(nodes.map(n => n.id));
  if (layers.weights?.edges?.length > 0) {
    layers.weights.edges.forEach((edge) => {
      if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
        addLink(edge.from, edge.to, edge.type || 'related', edge.confidence);
      }
    });
  }

  // Infer missing structural edges when backend only provides node payloads.
  const sourcesById = new Set(nodes.filter(n => n.type === 'source').map(n => n.id));
  const claimsById = new Set(nodes.filter(n => n.type === 'claim').map(n => n.id));
  const trailsById = new Set(nodes.filter(n => n.type === 'trail').map(n => n.id));
  const obsById = new Set(nodes.filter(n => n.type === 'observation').map(n => n.id));
  nodes.forEach((node) => {
    (node.sourceIds || []).forEach((sourceId) => {
      const sourceNodeId = `source-${sourceId}`;
      if (sourcesById.has(sourceNodeId)) addLink(node.id, sourceNodeId, node.type === 'claim' ? 'derived_from' : 'used_source', 0.66);
    });
    (node.claimIds || []).forEach((claimId) => {
      const claimNodeId = `claim-${claimId}`;
      if (claimsById.has(claimNodeId)) addLink(node.id, claimNodeId, node.type === 'observation' ? 'supports' : 'derived_from', 0.66);
    });
    (node.observationIds || []).forEach((obsId) => {
      const obsNodeId = `obs-${obsId}`;
      if (obsById.has(obsNodeId)) addLink(node.id, obsNodeId, 'observed', 0.6);
    });
    if (node.parentStepId) {
      const parentId = `trail-${node.parentStepId}`;
      if (trailsById.has(parentId)) addLink(node.id, parentId, 'sequence', 0.6);
    }
  });

  return { nodes, links };
}

/* ──── Node Detail Sidecar ──────────────────────────────────────── */
function NodeDetail({ node, edges, nodes, onClose, onNavigate, onReuseBlueprint, currentQuery }) {
  if (!node) return null;

  const inbound = edges.filter(e => {
    const tid = typeof e.target === 'object' ? e.target.id : e.target;
    return tid === node.id;
  });
  const outbound = edges.filter(e => {
    const sid = typeof e.source === 'object' ? e.source.id : e.source;
    return sid === node.id;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      className="absolute bottom-4 right-4 w-[320px] max-w-[calc(100%-2rem)] max-h-[70%] bg-white/98 backdrop-blur border border-[#e3e0db] rounded-2xl shadow-2xl z-20 overflow-y-auto"
    >
      <div className="sticky top-0 bg-[#faf9f4]/95 backdrop-blur border-b border-[#e3e0db] px-4 py-3 flex items-center justify-between rounded-t-2xl">
        <span className="text-xs font-mono uppercase tracking-wider" style={{ color: LAYER_COLORS[node.layer] || '#525252' }}>
          {node.layer || 'node'}
        </span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#e3e0db]/50">
          <X size={14} className="text-[#525252]" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0a0a0a]">
            {node.title || 'Untitled'}
          </h3>
          {node.agent && <p className="text-[10px] text-[#737373] mt-1">Agent: {node.agent}</p>}
        </div>

        {node.content && (
          <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-3">
            <p className="text-xs text-[#525252] whitespace-pre-wrap">
              {truncate(node.content, 300)}
            </p>
          </div>
        )}

        {node.url && (
          <a href={node.url} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-[#117dff] hover:underline block truncate">
            {node.url}
          </a>
        )}

        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#737373]">
          <div>
            <p>Type: {node.type || 'unknown'}</p>
            <p>Layer: {node.layer || 'default'}</p>
          </div>
        {node.confidence != null && (
          <div>
            <p>Confidence:</p>
            <p className="font-semibold text-[#0a0a0a]">
              {(node.confidence * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </div>

        {node.layer === 'blueprints' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[10px] text-[#737373]">
              <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-2">
                <p className="uppercase tracking-wider text-[9px] mb-1">Pattern</p>
                <p className="text-[#0a0a0a] font-medium">{node.patternCount || 0} steps</p>
              </div>
              <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-2">
                <p className="uppercase tracking-wider text-[9px] mb-1">Captured State</p>
                <p className="text-[#0a0a0a] font-medium">{node.hasCapturedState ? 'Ready' : 'Backfilling'}</p>
              </div>
            </div>

            {node.capturedStateSummary && (
              <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-3 text-[10px] text-[#525252] space-y-1">
                <p className="font-mono uppercase tracking-wider text-[9px] text-[#737373]">Captured summary</p>
                <p>Sources: {node.capturedStateSummary.sourceCount ?? 0}</p>
                <p>Findings: {node.capturedStateSummary.findingCount ?? 0}</p>
                <p>Trails: {node.capturedStateSummary.trailCount ?? 0}</p>
              </div>
            )}

            {onReuseBlueprint && (
              <button
                onClick={() => onReuseBlueprint(node, currentQuery)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#d97706] text-white text-xs font-medium hover:bg-[#b86505] transition-colors"
              >
                <RefreshCw size={13} />
                Reuse Blueprint
              </button>
            )}
          </div>
        )}

        {(inbound.length > 0 || outbound.length > 0) && (
          <div>
            <p className="text-[10px] font-mono text-[#737373] mb-2">Connections</p>
            <div className="space-y-1.5">
              {outbound.map((e, i) => {
                const tid = typeof e.target === 'object' ? e.target.id : e.target;
                return (
                  <button key={`out-${i}`} onClick={() => onNavigate(tid)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#e3e0db] text-left hover:border-[#117dff]/30 transition-colors">
                    <span className="text-[10px] text-[#117dff]">→</span>
                    <span className="text-[10px] flex-1 truncate text-[#525252]">
                      {nodes.find(n => n.id === tid)?.title || tid}
                    </span>
                    <span className="text-[9px] text-[#737373]">{e.type}</span>
                  </button>
                );
              })}
              {inbound.map((e, i) => {
                const sid = typeof e.source === 'object' ? e.source.id : e.source;
                return (
                  <button key={`in-${i}`} onClick={() => onNavigate(sid)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#e3e0db] text-left hover:border-[#117dff]/30 transition-colors">
                    <span className="text-[10px] text-[#117dff]">←</span>
                    <span className="text-[10px] flex-1 truncate text-[#525252]">
                      {nodes.find(n => n.id === sid)?.title || sid}
                    </span>
                    <span className="text-[9px] text-[#737373]">{e.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ──── Layered Isometric View ────────────────────────────────────── */
function LayeredView({ graphData, selectedNode, onNodeClick }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [pov, setPov] = useState({ pitch: 55, yaw: -5, roll: 0, zoom: 1, panX: 0, panY: 0 });
  const [focusedLayer, setFocusedLayer] = useState(null);
  const [puckPos, setPuckPos] = useState({ x: 16, y: 138 });
  const [isPuckDragging, setIsPuckDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startYaw: 0, startPitch: 0, startXPos: 0, startYPos: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setPuckPos((prev) => {
      const maxY = Math.max(16, dims.h - 150);
      if (prev.y >= 32 && prev.y <= maxY) return prev;
      return {
        x: Math.min(prev.x, Math.max(16, dims.w - 120)),
        y: Math.min(Math.max(16, prev.y), maxY),
      };
    });
  }, [dims.w, dims.h]);

  useEffect(() => {
    if (!isPuckDragging) return undefined;
    const handleMove = (e) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPov(prev => ({
        ...prev,
        yaw: Math.max(-24, Math.min(24, dragRef.current.startYaw + dx * 0.22)),
        pitch: Math.max(20, Math.min(78, dragRef.current.startPitch - dy * 0.18)),
      }));
      setPuckPos(() => ({
        x: Math.max(8, Math.min((containerRef.current?.clientWidth || 240) - 108, dragRef.current.startXPos + dx)),
        y: Math.max(8, Math.min((containerRef.current?.clientHeight || 240) - 96, dragRef.current.startYPos + dy)),
      }));
    };
    const handleUp = () => setIsPuckDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isPuckDragging]);

  // Group nodes by layer
  const layerGroups = useMemo(() => {
    const groups = {};
    LAYER_ORDER.forEach(l => { groups[l] = []; });
    graphData.nodes.forEach(n => {
      const layer = n.layer || 'observations';
      if (!groups[layer]) groups[layer] = [];
      groups[layer].push(n);
    });
    return groups;
  }, [graphData.nodes]);

  const focusedNodes = useMemo(
    () => (focusedLayer ? (layerGroups[focusedLayer] || []) : []),
    [focusedLayer, layerGroups]
  );

  // Assign x,y positions per layer using force-like spreading
  const nodePositions = useMemo(() => {
    const positions = {};
    const planeW = Math.min(Math.max(dims.w - 120, 320), 680) * (focusedLayer ? 0.78 : 0.62);
    const planeH = Math.min(Math.max(dims.h - 96, 240), 520) * (focusedLayer ? 0.34 : 0.22);

    LAYER_ORDER.forEach((layerKey) => {
      const layerNodes = layerGroups[layerKey] || [];
      if (layerNodes.length === 0) return;

      // Spread nodes in a grid/spiral pattern within the plane
      const cols = Math.max(1, Math.ceil(Math.sqrt(layerNodes.length)));
      const cellW = planeW / (cols + 1);
      const rows = Math.ceil(layerNodes.length / cols);
      const cellH = planeH / (rows + 1);

      layerNodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        // Add slight randomness to avoid grid look
        const jitterX = (Math.sin(node.id.length * 7 + i * 13) * 0.3) * cellW;
        const jitterY = (Math.cos(node.id.length * 11 + i * 17) * 0.3) * cellH;
        positions[node.id] = {
          x: Math.max(24, cellW * (col + 1) + jitterX + (planeW * 0.06)),
          y: Math.max(18, cellH * (row + 1) + jitterY + (planeH * 0.06)),
          layer: layerKey,
        };
      });
    });
    return positions;
  }, [layerGroups, dims, focusedLayer]);

  // Cross-layer edges
  const crossEdges = useMemo(() => {
    return graphData.links.filter(l => {
      const sid = typeof l.source === 'object' ? l.source.id : l.source;
      const tid = typeof l.target === 'object' ? l.target.id : l.target;
      const sp = nodePositions[sid];
      const tp = nodePositions[tid];
      return sp && tp && sp.layer !== tp.layer;
    });
  }, [graphData.links, nodePositions]);

  const focusedCrossEdges = useMemo(() => {
    if (!focusedLayer) return [];
    return crossEdges.filter((edge) => {
      const sid = typeof edge.source === 'object' ? edge.source.id : edge.source;
      const tid = typeof edge.target === 'object' ? edge.target.id : edge.target;
      const sp = nodePositions[sid];
      const tp = nodePositions[tid];
      return sp && tp && (sp.layer === focusedLayer || tp.layer === focusedLayer);
    });
  }, [crossEdges, focusedLayer, nodePositions]);

  const planeSpacing = 120;
  const totalHeight = LAYER_ORDER.length * planeSpacing;
  const isTopView = focusedLayer != null;
  const stageW = Math.min(Math.max(dims.w - 40, 320), 820);
  const stageH = Math.min(Math.max(dims.h - 24, 260), 560);
  const planeW = focusedLayer ? Math.min(stageW * 0.76, 640) : Math.min(stageW * 0.58, 520);
  const planeH = focusedLayer ? Math.min(stageH * 0.34, 220) : Math.min(stageH * 0.22, 160);
  const miniW = 176;
  const miniH = 116;
  const miniScaleX = planeW > 0 ? miniW / planeW : 1;
  const miniScaleY = planeH > 0 ? miniH / planeH : 1;
  const containerTransform = isTopView
    ? 'rotateX(0deg) rotateZ(0deg) scale(0.98)'
    : `translate(${pov.panX}px, ${pov.panY}px) scale(${pov.zoom}) rotateX(${pov.pitch}deg) rotateY(${pov.yaw}deg) rotateZ(${pov.roll}deg)`;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative bg-gradient-to-b from-[#fbfaf6] via-white to-[#f6f3ed]"
      style={{ perspective: '1200px', perspectiveOrigin: '50% 40%' }}>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 18% 18%, rgba(17,125,255,0.09), transparent 22%),
            radial-gradient(circle at 82% 10%, rgba(217,119,6,0.08), transparent 18%),
            linear-gradient(rgba(227,224,219,0.55) 1px, transparent 1px),
            linear-gradient(90deg, rgba(227,224,219,0.55) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 48px 48px, 48px 48px',
          opacity: 0.7,
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center px-3 py-3"
        style={{
          transformStyle: 'preserve-3d',
          transform: containerTransform,
          transition: isPuckDragging ? 'none' : 'transform 260ms ease',
        }}>

        <div
          className="absolute inset-0 rounded-[28px] border border-[#e3e0db] bg-white/55 backdrop-blur-[2px] shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
          style={{ transform: 'translateZ(-120px)' }}
        />

        <div className="absolute left-4 top-4 z-30 max-w-[240px]">
          <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-[#737373]">Layer POV</p>
          <h3 className="mt-1 text-sm font-semibold text-[#0a0a0a]">Inspect one layer at a time</h3>
          <p className="mt-1 text-[11px] text-[#737373] leading-snug">
            Click a layer to flatten it into a top view with its live connections.
          </p>
        </div>

        {/* Layer labels on left */}
        <div
          className="absolute left-4 top-0 h-full flex flex-col justify-center gap-2 z-30"
          style={{ transform: isTopView ? 'rotateZ(0deg) rotateX(0deg)' : 'rotateZ(5deg) rotateX(-55deg)', transformStyle: 'preserve-3d' }}
        >
          {LAYER_ORDER.map((layerKey, i) => {
            const meta = LAYER_META[layerKey];
            const count = (layerGroups[layerKey] || []).length;
            return (
              <button
                key={layerKey}
                onClick={() => setFocusedLayer(prev => prev === layerKey ? null : layerKey)}
                className="flex items-center gap-2 text-xs text-left transition-opacity px-2 py-1.5 rounded-full border backdrop-blur-sm"
                style={{
                  color: LAYER_COLORS[layerKey],
                  opacity: focusedLayer && focusedLayer !== layerKey ? 0.32 : 1,
                  background: focusedLayer === layerKey ? hexToRgba(LAYER_COLORS[layerKey], 0.08) : 'rgba(255,255,255,0.55)',
                  borderColor: focusedLayer === layerKey ? hexToRgba(LAYER_COLORS[layerKey], 0.18) : 'rgba(227,224,219,0.9)',
                }}
              >
                <span className="text-base">{meta.icon}</span>
                <span className="font-mono uppercase text-[10px] tracking-[0.18em]">{meta.label}</span>
                <span className="text-[9px] opacity-50 tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Stacked planes */}
        {LAYER_ORDER.map((layerKey, layerIndex) => {
          const meta = LAYER_META[layerKey];
          const color = LAYER_COLORS[layerKey];
          const layerNodes = layerGroups[layerKey] || [];
          const zOffset = (LAYER_ORDER.length - 1 - layerIndex) * planeSpacing;

          return (
            <div key={layerKey}
              className="absolute"
              onClick={() => setFocusedLayer(prev => prev === layerKey ? null : layerKey)}
              style={{
                width: focusedLayer === layerKey ? planeW * 1.06 : planeW,
                height: focusedLayer === layerKey ? planeH * 1.12 : planeH,
                transform: `translateZ(${zOffset}px)`,
                transformStyle: 'preserve-3d',
                background: `linear-gradient(180deg, ${hexToRgba(color, focusedLayer === layerKey ? 0.06 : 0.035)}, rgba(255,255,255,0.65))`,
                border: `1px solid ${hexToRgba(color, focusedLayer === layerKey ? 0.2 : 0.1)}`,
                borderRadius: '18px',
                boxShadow: `0 14px 30px ${hexToRgba(color, focusedLayer === layerKey ? 0.08 : 0.045)}`,
                opacity: focusedLayer && focusedLayer !== layerKey ? 0.22 : 1,
                transition: 'all 220ms ease',
              }}>
              <div className="absolute left-3 top-3 z-20 flex items-center gap-2 pointer-events-none">
                <span className="text-[10px] font-mono uppercase tracking-[0.26em]" style={{ color }}>
                  {meta.label}
                </span>
                <span className="text-[9px] text-[#737373] tabular-nums">{layerNodes.length}</span>
              </div>

              {/* Nodes on this plane */}
              {layerNodes.map(node => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const isSelected = selectedNode?.id === node.id;
                const size = Math.sqrt(node.val || 6) * 2.35;

                return (
                  <button key={node.id}
                    onClick={() => onNodeClick(node)}
                    className="absolute rounded-full transition-transform duration-200 hover:scale-[1.45]"
                    style={{
                      left: pos.x - size / 2,
                      top: pos.y - size / 2,
                      width: size,
                      height: size,
                      background: isSelected
                        ? color
                        : hexToRgba(color, 0.7),
                      boxShadow: isSelected
                        ? `0 0 20px ${color}, 0 0 40px ${hexToRgba(color, 0.4)}`
                        : `0 0 8px ${hexToRgba(color, 0.3)}`,
                      border: isSelected ? '2px solid white' : 'none',
                      zIndex: isSelected ? 10 : 1,
                    }}
                    title={node.title}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Cross-layer connection lines (SVG overlay) */}
        <svg className="absolute pointer-events-none"
          style={{
            width: focusedLayer ? planeW * 1.05 : planeW,
            height: focusedLayer ? planeH * 1.35 : totalHeight + planeH,
            transform: focusedLayer ? 'translateZ(0px)' : `translateZ(${(LAYER_ORDER.length - 1) * planeSpacing / 2}px)`,
            transformStyle: 'preserve-3d',
            overflow: 'visible',
          }}>
          {crossEdges.map((edge, i) => {
            const sid = typeof edge.source === 'object' ? edge.source.id : edge.source;
            const tid = typeof edge.target === 'object' ? edge.target.id : edge.target;
            const sp = nodePositions[sid];
            const tp = nodePositions[tid];
            if (!sp || !tp) return null;

            const sLayerIdx = LAYER_ORDER.indexOf(sp.layer);
            const tLayerIdx = LAYER_ORDER.indexOf(tp.layer);
            const sY = sp.y + (LAYER_ORDER.length - 1 - sLayerIdx) * planeSpacing * 0.4;
            const tY = tp.y + (LAYER_ORDER.length - 1 - tLayerIdx) * planeSpacing * 0.4;
            const edgeColor = EDGE_COLORS[edge.type] || '#444';

            return (
              <line key={`cross-${i}`}
                x1={sp.x} y1={sY} x2={tp.x} y2={tY}
                stroke={edgeColor} strokeWidth={focusedLayer ? 0.85 : 0.5}
                strokeOpacity={focusedLayer ? 0.42 : 0.3} strokeDasharray="3,3"
                />
            );
          })}
        </svg>

        {focusedLayer && (
          <div className="absolute right-4 top-4 z-30 w-[194px] rounded-[18px] border border-[#e3e0db] bg-white/90 backdrop-blur shadow-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#737373]">Top view</p>
                <p className="text-[11px] font-semibold text-[#0a0a0a]">{LAYER_META[focusedLayer]?.label}</p>
              </div>
              <button
                onClick={() => setFocusedLayer(null)}
                className="px-2 py-1 rounded-md text-[10px] border border-[#e3e0db] text-[#525252] hover:border-[#117dff]/30 hover:text-[#117dff]"
              >
                Reset
              </button>
            </div>
            <svg className="mt-3 w-full h-[116px] overflow-visible" viewBox={`0 0 ${miniW} ${miniH}`}>
              <rect x="0" y="0" width={miniW} height={miniH} rx="14" fill="rgba(250,249,244,0.92)" stroke="rgba(227,224,219,0.95)" />
              {focusedCrossEdges.map((edge, i) => {
                const sid = typeof edge.source === 'object' ? edge.source.id : edge.source;
                const tid = typeof edge.target === 'object' ? edge.target.id : edge.target;
                const sp = nodePositions[sid];
                const tp = nodePositions[tid];
                if (!sp || !tp) return null;
                const edgeColor = EDGE_COLORS[edge.type] || '#444';
                return (
                  <line
                    key={`mini-edge-${i}`}
                    x1={sp.x * miniScaleX}
                    y1={sp.y * miniScaleY}
                    x2={tp.x * miniScaleX}
                    y2={tp.y * miniScaleY}
                    stroke={edgeColor}
                    strokeWidth="1"
                    strokeOpacity="0.3"
                  />
                );
              })}
              {focusedNodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const isSelected = selectedNode?.id === node.id;
                const radius = isSelected ? 4.2 : 3.2;
                return (
                  <circle
                    key={`mini-${node.id}`}
                    cx={pos.x * miniScaleX}
                    cy={pos.y * miniScaleY}
                    r={radius}
                    fill={isSelected ? LAYER_COLORS[focusedLayer] : hexToRgba(LAYER_COLORS[focusedLayer], 0.72)}
                    stroke={isSelected ? '#fff' : 'none'}
                  />
                );
              })}
              <rect x="0" y="0" width={miniW} height={miniH} rx="14" fill="none" stroke="rgba(227,224,219,0.65)" />
            </svg>
            <div className="mt-2 flex items-center justify-between text-[10px] text-[#737373]">
              <span>{focusedNodes.length} nodes</span>
              <span>{focusedCrossEdges.length} links</span>
            </div>
          </div>
        )}
      </div>

      <div
        className="absolute z-40 rounded-2xl border border-[#e3e0db] bg-white/92 backdrop-blur shadow-lg p-2"
        style={{ left: puckPos.x, top: puckPos.y, width: 104 }}
        data-no-drag
      >
        <div
          className="h-11 rounded-xl bg-[#faf9f4] border border-[#e3e0db] cursor-move flex items-center justify-center text-[10px] font-medium tracking-[0.22em] text-[#737373]"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsPuckDragging(true);
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              startYaw: pov.yaw,
              startPitch: pov.pitch,
              startXPos: puckPos.x,
              startYPos: puckPos.y,
            };
          }}
          title="Drag to change POV"
        >
          POV
        </div>
        <div className="mt-2 flex items-center gap-1">
          <button
            className="flex-1 text-[10px] px-2 py-1 rounded-md border border-[#e3e0db] bg-white text-[#525252]"
            onClick={() => setPov({ pitch: 55, yaw: -5, roll: 0, zoom: 1, panX: 0, panY: 0 })}
          >
            Reset
          </button>
          <button
            className="flex-1 text-[10px] px-2 py-1 rounded-md border border-[#e3e0db] bg-white text-[#525252]"
            onClick={() => setPov({ pitch: 0, yaw: 0, roll: 0, zoom: 1.05, panX: 0, panY: 0 })}
          >
            Top
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──── Main Component ──────────────────────────────────────────── */
export default function DeepResearchGraph2D({ sessionId, showChrome = true, onReuseBlueprint = null, currentQuery = '' }) {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [layerFilter, setLayerFilter] = useState('all');
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('force'); // 'force' | 'layered'
  const [fitRequested, setFitRequested] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const obs = new ResizeObserver(([entry]) => {
      setDims({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fetch graph data with incremental updates
  useEffect(() => {
    if (!sessionId) return;

    const fetchGraphData = async () => {
      try {
        const { data } = await apiClient.controlPlane.get(
          `/v1/proxy/research/${sessionId}/graph`,
          { timeout: 30000 }
        );
        if (!data || !data.layers) return;

        const { nodes: newNodes, links: newLinks } = buildGraphFromLayers(data.layers);

        setGraphData((prev) => {
          const existingIds = new Set(prev.nodes.map(n => n.id));
          const nodesToAdd = newNodes.filter(n => !existingIds.has(n.id));

          const existingLinkKeys = new Set(
            prev.links.map(l => {
              const sid = typeof l.source === 'object' ? l.source.id : l.source;
              const tid = typeof l.target === 'object' ? l.target.id : l.target;
              return `${sid}|${tid}`;
            })
          );
          const linksToAdd = newLinks.filter(
            l => !existingLinkKeys.has(`${l.source}|${l.target}`)
          );

          if (nodesToAdd.length > 0 || linksToAdd.length > 0) {
            if (prev.nodes.length === 0 && (nodesToAdd.length > 0 || linksToAdd.length > 0)) {
              setFitRequested(true);
            }
            return {
              nodes: [...prev.nodes, ...nodesToAdd],
              links: [...prev.links, ...linksToAdd],
            };
          }
          return prev;
        });
      } catch (e) {
        console.error('[DeepResearchGraph2D] Fetch failed:', e.message);
      }
    };

    fetchGraphData();
    const poll = setInterval(fetchGraphData, 3000);
    return () => clearInterval(poll);
  }, [sessionId]);

  useEffect(() => {
    if (viewMode !== 'force' || !fitRequested || !graphRef.current || graphData.nodes.length === 0) {
      return undefined;
    }
    const timer = setTimeout(() => {
      graphRef.current?.zoomToFit?.(400, 70);
      setFitRequested(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [graphData.nodes.length, viewMode, fitRequested]);

  useEffect(() => {
    if (viewMode !== 'force' || !graphRef.current) return;
    const charge = graphRef.current.d3Force('charge');
    if (charge?.strength) charge.strength(-180);
    const collide = graphRef.current.d3Force('collide');
    if (collide?.radius) collide.radius((node) => Math.max(10, Math.sqrt(node.val || 6) * 2.2));
    const center = graphRef.current.d3Force('center');
    if (center?.x && center?.y) {
      center.x(dims.w / 2);
      center.y(dims.h / 2);
    }
  }, [viewMode, dims.w, dims.h, graphData.nodes.length]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    let result = new Set(graphData.nodes.map(n => n.id));

    if (layerFilter !== 'all') {
      result = new Set(graphData.nodes.filter(n => n.layer === layerFilter).map(n => n.id));
    }
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      const matches = new Set();
      graphData.nodes.forEach(n => {
        if (n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q) || n.agent?.toLowerCase().includes(q)) {
          matches.add(n.id);
        }
      });
      result = new Set([...result].filter(id => matches.has(id)));
    }
    setHighlightNodes(result);
    return result;
  }, [graphData.nodes, layerFilter, searchInput]);

  // Paint node (force view)
  const paintNode = useCallback((node, ctx, globalScale) => {
    const isDimmed = layerFilter !== 'all' && !filteredNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const color = LAYER_COLORS[node.layer] || '#525252';
    const pulse = 0.92 + (Math.abs(hashCode(node.id)) % 12) / 100;
    let radius = Math.sqrt(node.val || 6) * 2.35 * pulse;

    if (node.layer === 'trails') radius = Math.max(radius * 0.8, 3);
    if (node.layer === 'blueprints') radius = radius * 1.3;
    if (node.layer === 'promoted') radius = radius * 1.2;

    // Glow
    if (!isDimmed) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
      ctx.fillStyle = hexToRgba(color, 0.12);
      ctx.fill();
    }

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Shape per layer
    if (node.layer === 'trails') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        ctx.lineTo(node.x + radius * Math.cos(angle), node.y + radius * Math.sin(angle));
      }
      ctx.closePath();
    } else if (node.layer === 'blueprints') {
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - radius);
      ctx.lineTo(node.x + radius, node.y);
      ctx.lineTo(node.x, node.y + radius);
      ctx.lineTo(node.x - radius, node.y);
      ctx.closePath();
    } else if (node.layer === 'promoted') {
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - radius);
      ctx.lineTo(node.x + radius * 0.85, node.y);
      ctx.lineTo(node.x, node.y + radius);
      ctx.lineTo(node.x - radius * 0.85, node.y);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    }

    ctx.fillStyle = isDimmed ? hexToRgba(color, 0.15) : hexToRgba(color, 0.7);
    ctx.fill();
    ctx.strokeStyle = isDimmed ? hexToRgba(color, 0.1) : hexToRgba(color, 0.9);
    ctx.lineWidth = 0.8 / globalScale;
    ctx.stroke();

    // Label
    if (globalScale > 1.2 && !isDimmed) {
      const label = truncate(node.title, 25);
      ctx.font = `${Math.max(9, 10 / globalScale)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#0a0a0a';
      ctx.fillText(label, node.x, node.y + radius + 2);
    }
  }, [selectedNode, layerFilter, filteredNodes]);

  // Paint edges (force view)
  const paintLink = useCallback((link, ctx, globalScale) => {
    const color = EDGE_COLORS[link.type] || '#333';
    const opacity = 0.25 + (link.confidence || 0.5) * 0.3;
    const width = 0.5 + (link.confidence || 0.5) * 1.35;
    const sx = link.source.x;
    const sy = link.source.y;
    const tx = link.target.x;
    const ty = link.target.y;
    const dx = tx - sx;
    const dy = ty - sy;
    const curvature = 0.16;
    const cx = (sx + tx) / 2 - dy * curvature;
    const cy = (sy + ty) / 2 + dx * curvature;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.strokeStyle = hexToRgba(color, opacity * 0.3);
    ctx.lineWidth = width + 2.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.strokeStyle = hexToRgba(color, opacity);
    ctx.lineWidth = width;
    if (link.type === 'contradicts' || (link.confidence || 1) < 0.5) {
      ctx.setLineDash([4, 3]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    if (viewMode === 'force' && graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 400);
      graphRef.current.zoom(3, 400);
    }
  }, [viewMode]);

  const handleNavigate = useCallback((nodeId) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) handleNodeClick(node);
  }, [graphData.nodes, handleNodeClick]);

  const handleRefresh = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setFitRequested(true);
    try {
      const { data } = await apiClient.controlPlane.get(
        `/v1/proxy/research/${sessionId}/graph`, { timeout: 30000 }
      );
      if (data?.layers) {
        setGraphData(buildGraphFromLayers(data.layers));
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const stats = useMemo(() => ({
    nodes: graphData.nodes.length,
    edges: graphData.links.length,
  }), [graphData]);

  const layerCounts = useMemo(() => {
    const counts = {};
    LAYER_ORDER.forEach(l => { counts[l] = 0; });
    graphData.nodes.forEach(n => {
      if (counts[n.layer] !== undefined) counts[n.layer]++;
    });
    return counts;
  }, [graphData.nodes]);

  const blueprintReplayCounts = useMemo(() => {
    const blueprints = graphData.nodes.filter(node => node.layer === 'blueprints');
    const replayReady = blueprints.filter(node => node.hasCapturedState || (node.patternCount || 0) > 0);
    return {
      total: blueprints.length,
      ready: replayReady.length,
    };
  }, [graphData.nodes]);

  const promotedCounts = useMemo(() => {
    const promoted = graphData.nodes.filter(node => node.layer === 'promoted');
    return {
      total: promoted.length,
    };
  }, [graphData.nodes]);

  return (
    <div className="h-full bg-gradient-to-b from-[#faf9f4] to-white flex flex-col overflow-hidden relative">
      {showChrome && (
        <div className="shrink-0 border-b border-[#e3e0db] bg-[#faf9f4] px-4 py-2.5 flex items-center gap-3 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#117dff]/10 flex items-center justify-center">
              <Network size={14} className="text-[#117dff]" />
            </div>
            <h1 className="text-xs font-bold text-[#0a0a0a] tracking-wide">RESEARCH GRAPH</h1>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-0.5 bg-white rounded-lg p-0.5 border border-[#e3e0db]">
            <button onClick={() => setViewMode('force')}
              className={`px-2.5 py-1 text-[10px] rounded-md transition-all ${
                viewMode === 'force' ? 'bg-[#117dff] text-white' : 'text-[#525252] hover:text-[#117dff]'
              }`}>
              <GitBranch size={11} className="inline mr-1" />Force
            </button>
            <button onClick={() => setViewMode('layered')}
              className={`px-2.5 py-1 text-[10px] rounded-md transition-all ${
                viewMode === 'layered' ? 'bg-[#117dff] text-white' : 'text-[#525252] hover:text-[#117dff]'
              }`}>
              <Layers size={11} className="inline mr-1" />Layers
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
            <input type="text" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search nodes..."
              className="w-full pl-7 pr-3 py-1.5 border border-[#e3e0db] rounded-lg text-xs text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40 bg-white"
            />
          </div>

          {/* Refresh */}
          <button onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-[#e3e0db]/60 text-[#525252] transition-colors" title="Refresh">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              graphRef.current?.zoomToFit?.(400, 70);
              setFitRequested(false);
            }}
            className="p-1.5 rounded hover:bg-[#e3e0db]/60 text-[#525252] transition-colors"
            title="Fit graph to view"
          >
            <Crosshair size={13} />
          </button>

          {/* Layer Filters */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button onClick={() => setLayerFilter('all')}
              className={`px-2 py-1 text-[10px] rounded transition-all ${
                layerFilter === 'all' ? 'bg-[#117dff] text-white' : 'text-[#525252] hover:text-[#117dff]'
              }`}>All</button>
            {LAYER_ORDER.map(l => (
              <button key={l} onClick={() => setLayerFilter(l)}
                className="px-2 py-1 text-[10px] rounded whitespace-nowrap transition-all"
                style={{
                  backgroundColor: layerFilter === l ? hexToRgba(LAYER_COLORS[l], 0.2) : '#111',
                  color: layerFilter === l ? LAYER_COLORS[l] : '#525252',
                  border: layerFilter === l ? `1px solid ${hexToRgba(LAYER_COLORS[l], 0.4)}` : '1px solid #e3e0db',
                }}>
                {LAYER_META[l]?.icon} {LAYER_META[l]?.label}
                {layerCounts[l] > 0 && <span className="ml-1 opacity-50">({layerCounts[l]})</span>}
              </button>
            ))}
          </div>

          {blueprintReplayCounts.total > 0 && (
            <button
              onClick={() => setLayerFilter('blueprints')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-colors ${
                blueprintReplayCounts.ready > 0
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-[#e3e0db] bg-[#faf9f4] text-[#737373] hover:border-[#117dff]/30 hover:text-[#117dff]'
              }`}
              title="Blueprints that are ready to replay were backfilled with captured state and reusable patterns"
            >
              <CheckCircle2 size={11} />
              <span>Replay-ready</span>
              <span className="font-mono opacity-80">
                {blueprintReplayCounts.ready}/{blueprintReplayCounts.total}
              </span>
            </button>
          )}

          {promotedCounts.total > 0 && (
            <button
              onClick={() => setLayerFilter('promoted')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-colors ${
                layerFilter === 'promoted'
                  ? 'border-teal-200 bg-teal-50 text-teal-700'
                  : 'border-[#e3e0db] bg-[#faf9f4] text-[#737373] hover:border-teal-300 hover:text-teal-700'
              }`}
              title="Promoted memories retained after synthesis"
            >
              <CheckCircle2 size={11} />
              <span>Promoted</span>
              <span className="font-mono opacity-80">{promotedCounts.total}</span>
            </button>
          )}

          {/* Stats */}
          <div className="ml-auto text-[10px] text-[#737373] font-mono">
            {stats.nodes} · {stats.edges}
          </div>
        </div>
      )}

      {/* Graph Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {graphData.nodes.length > 0 ? (
          viewMode === 'force' ? (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeLabel="title"
              nodeColor={node => LAYER_COLORS[node.layer] || '#525252'}
              nodeRelSize={1.45}
              nodeVal={node => node.val || 6}
              linkColor={(link) => EDGE_COLORS[link.type] || '#b7c7db'}
              linkOpacity={0.42}
              enableNodeDrag={true}
              enableZoomPan={true}
              minZoom={0.3}
              maxZoom={6}
              onNodeClick={handleNodeClick}
              nodeCanvasObject={paintNode}
              linkCanvasObject={paintLink}
              numDimensions={2}
              cooldownTicks={560}
              d3AlphaDecay={0.03}
              d3VelocityDecay={0.45}
              linkDistance={160}
              d3AlphaMin={0.005}
              warmupTicks={80}
              linkDirectionalParticles={4}
              linkDirectionalParticleWidth={1.2}
              linkDirectionalParticleSpeed={0.0034}
              backgroundColor="#fbfaf6"
              width={dims.w}
              height={dims.h}
            />
          ) : (
            <LayeredView
              graphData={graphData}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#444] gap-2">
            <Network size={32} className="text-[#222]" />
            <p className="text-sm text-[#555]">
              {isLoading ? 'Loading graph...' : 'No graph data yet'}
            </p>
          </div>
        )}
      </div>

      {/* Node Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            nodes={graphData.nodes}
            edges={graphData.links}
            onClose={() => setSelectedNode(null)}
            onNavigate={handleNavigate}
            onReuseBlueprint={onReuseBlueprint}
            currentQuery={currentQuery}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
