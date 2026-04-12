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
  promotedClaims: '#f43f5e',  // rose — prior knowledge
  live: '#f59e0b',
};

const LAYER_ORDER = ['promotedClaims', 'sources', 'claims', 'trails', 'observations', 'promoted', 'blueprints'];

const LAYER_META = {
  promotedClaims: { label: 'Prior Knowledge', icon: '◈', z: 5 },
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

  if (layers.promotedClaims?.length > 0) {
    layers.promotedClaims.forEach((p) => {
      nodes.push({
        id: `promoted-${p.id}`,
        title: p.title || p.content?.slice(0, 60) || 'Prior knowledge',
        type: 'promoted-claim',
        layer: 'promotedClaims',
        content: p.content,
        confidence: p.confidence,
        agent: p.agent,
        val: 7,
      });
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

/* ──── Node Detail Sidecar (MemoryGraph style) ──────────────────── */
function NodeDetail({ node, edges, nodes, onClose, onNavigate, onReuseBlueprint, currentQuery }) {
  const nodeMap = useMemo(() => {
    const map = {};
    nodes?.forEach(n => { map[n.id] = n; });
    return map;
  }, [nodes]);

  if (!node) return null;

  const inbound = edges.filter(e => {
    const tid = typeof e.target === 'object' ? e.target.id : e.target;
    return tid === node.id;
  });
  const outbound = edges.filter(e => {
    const sid = typeof e.source === 'object' ? e.source.id : e.source;
    return sid === node.id;
  });

  const layerColor = LAYER_COLORS[node.layer] || '#525252';

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      className="absolute top-0 right-0 w-[340px] h-full bg-white border-l border-[#e3e0db] shadow-[-4px_0_20px_rgba(0,0,0,0.06)] z-20 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-[#e3e0db] px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-mono text-[#a3a3a3] uppercase tracking-wider">
          Node Detail
        </span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f3f1ec] transition-colors">
          <X size={14} className="text-[#a3a3a3]" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Title & type */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: layerColor }} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">
              {LAYER_META[node.layer]?.label || node.layer || 'node'}
            </span>
          </div>
          <h3 className="text-sm font-semibold font-['Space_Grotesk'] text-[#0a0a0a] leading-snug">
            {node.title || 'Untitled'}
          </h3>
          {node.agent && <p className="text-[10px] text-[#a3a3a3] mt-1">Agent: {node.agent}</p>}
        </div>

        {/* Content */}
        {node.content && (
          <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-3">
            <p className="text-xs text-[#525252] font-['Space_Grotesk'] leading-relaxed whitespace-pre-wrap">
              {truncate(node.content, 300)}
            </p>
          </div>
        )}

        {/* URL */}
        {node.url && (
          <a href={node.url} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-[#117dff] hover:underline block truncate font-['Space_Grotesk']">
            {node.url}
          </a>
        )}

        {/* Scores */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Confidence', value: node.confidence != null ? `${(node.confidence * 100).toFixed(0)}%` : null },
            { label: 'Type', value: node.type },
            { label: node.layer === 'blueprints' ? 'Reused' : 'Layer', value: node.layer === 'blueprints' ? node.timesReused ?? 0 : node.layer },
          ].map(s => (
            <div key={s.label} className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-2 text-center">
              <p className="text-[10px] text-[#a3a3a3] font-mono">{s.label}</p>
              <p className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a] truncate">{s.value ?? '—'}</p>
            </div>
          ))}
        </div>

        {/* Blueprint extras */}
        {node.layer === 'blueprints' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-2 text-center">
                <p className="text-[10px] text-[#a3a3a3] font-mono">Pattern</p>
                <p className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">{node.patternCount || 0} steps</p>
              </div>
              <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-2 text-center">
                <p className="text-[10px] text-[#a3a3a3] font-mono">State</p>
                <p className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">{node.hasCapturedState ? 'Ready' : 'Partial'}</p>
              </div>
            </div>
            {node.capturedStateSummary && (
              <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-3 text-[10px] text-[#525252] font-['Space_Grotesk'] space-y-0.5">
                <p>Sources: {node.capturedStateSummary.sourceCount ?? 0}</p>
                <p>Findings: {node.capturedStateSummary.findingCount ?? 0}</p>
                <p>Trails: {node.capturedStateSummary.trailCount ?? 0}</p>
              </div>
            )}
            {onReuseBlueprint && (
              <button onClick={() => onReuseBlueprint(node, currentQuery)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#d97706] text-white text-xs font-['Space_Grotesk'] font-medium hover:bg-[#b86505] transition-colors">
                <RefreshCw size={12} />
                Reuse Blueprint
              </button>
            )}
          </div>
        )}

        {/* Relationships */}
        {(inbound.length > 0 || outbound.length > 0) && (
          <div>
            <p className="text-[10px] font-mono text-[#a3a3a3] uppercase tracking-wider mb-2">Relationships</p>
            <div className="space-y-1.5">
              {outbound.map((e, i) => {
                const tid = typeof e.target === 'object' ? e.target.id : e.target;
                const target = nodeMap[tid];
                const edgeColor = EDGE_COLORS[e.type] || '#a3a3a3';
                return (
                  <button key={`out-${i}`} onClick={() => onNavigate(tid)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#faf9f4] border border-[#e3e0db] hover:border-[#117dff]/20 text-left transition-colors group">
                    <GitBranch size={10} style={{ color: edgeColor }} />
                    <span className="text-[10px] font-mono" style={{ color: edgeColor }}>{e.type}</span>
                    <span className="text-[9px] font-mono text-[#a3a3a3]">({((e.confidence || 0) * 100).toFixed(0)}%)</span>
                    <span className="text-[11px] text-[#525252] font-['Space_Grotesk'] truncate flex-1 group-hover:text-[#117dff]">
                      {target?.title || truncate(tid, 20)}
                    </span>
                  </button>
                );
              })}
              {inbound.map((e, i) => {
                const sid = typeof e.source === 'object' ? e.source.id : e.source;
                const source = nodeMap[sid];
                const edgeColor = EDGE_COLORS[e.type] || '#a3a3a3';
                return (
                  <button key={`in-${i}`} onClick={() => onNavigate(sid)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#faf9f4] border border-[#e3e0db] hover:border-[#117dff]/20 text-left transition-colors group">
                    <GitBranch size={10} className="rotate-180" style={{ color: edgeColor }} />
                    <span className="text-[10px] font-mono opacity-50" style={{ color: edgeColor }}>← {e.type}</span>
                    <span className="text-[9px] font-mono text-[#a3a3a3]">({((e.confidence || 0) * 100).toFixed(0)}%)</span>
                    <span className="text-[11px] text-[#525252] font-['Space_Grotesk'] truncate flex-1 group-hover:text-[#117dff]">
                      {source?.title || truncate(sid, 20)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="text-[10px] text-[#a3a3a3] font-mono space-y-0.5">
          <p>ID: {node.id}</p>
          {node.agent && <p>Agent: {node.agent}</p>}
        </div>
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

// Layer cluster offsets for semantic layout (fraction of canvas size)
const LAYER_Y = { promotedClaims: -0.35, sources: -0.2, claims: 0, trails: 0.15, observations: 0.1, blueprints: 0.35 };
const LAYER_X = { promotedClaims: 0, sources: -0.2, claims: 0, trails: 0.2, observations: -0.1, blueprints: 0 };

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
    const fg = graphRef.current;

    // Strong repulsion — prevent blob packing
    const charge = fg.d3Force('charge');
    if (charge?.strength) charge.strength(-500);

    // Hard collision — nodes cannot overlap
    const collide = fg.d3Force('collide');
    if (collide?.radius) collide.radius(n => Math.sqrt(n.val || 6) * 3 + 6).strength(0.9);

    // Semantic layer clustering — pull nodes toward their layer's region
    fg.d3Force('forceX', null);
    fg.d3Force('forceY', null);
    try {
      // Dynamic import d3 forces used internally by react-force-graph-2d
      const cx = dims.w / 2;
      const cy = dims.h / 2;
      const spread = Math.min(dims.w, dims.h) * 0.28;
      fg.d3Force('clusterX', { initialize: () => {}, force: (alpha) => {
        fg.graphData().nodes.forEach(n => {
          const tx = cx + (LAYER_X[n.layer] || 0) * spread;
          n.vx = (n.vx || 0) + (tx - n.x) * alpha * 0.06;
        });
      }});
      fg.d3Force('clusterY', { initialize: () => {}, force: (alpha) => {
        fg.graphData().nodes.forEach(n => {
          const ty = cy + (LAYER_Y[n.layer] || 0) * spread;
          n.vy = (n.vy || 0) + (ty - n.y) * alpha * 0.06;
        });
      }});
    } catch {}

    // Longer link distance — edges stretch out, nodes don't clump
    const link = fg.d3Force('link');
    if (link?.distance) link.distance(n => {
      const samLayer = n.source?.layer === n.target?.layer;
      return samLayer ? 60 : 120;
    }).strength(0.4);

    fg.d3ReheatSimulation?.();
  }, [viewMode, dims.w, dims.h, graphData.nodes.length]);

  // Filtered nodes
  // Cap visible nodes — too many causes blob. Keep top 80 by confidence + blueprints always
  const displayGraphData = useMemo(() => {
    const MAX_NODES = 80;
    if (graphData.nodes.length <= MAX_NODES) return graphData;

    // Always keep blueprints and promotedClaims; fill rest by confidence desc
    const priority = graphData.nodes.filter(n => n.layer === 'blueprints' || n.layer === 'promotedClaims');
    const rest = graphData.nodes
      .filter(n => n.layer !== 'blueprints' && n.layer !== 'promotedClaims')
      .sort((a, b) => (b.confidence || b.val || 0) - (a.confidence || a.val || 0));
    const kept = new Set([...priority, ...rest].slice(0, MAX_NODES).map(n => n.id));
    const nodes = graphData.nodes.filter(n => kept.has(n.id));
    const links = graphData.links.filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return kept.has(s) && kept.has(t);
    });
    return { nodes, links };
  }, [graphData]);

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

  // Paint node — MemoryGraph style (light bg, temporal glow, per-shape-per-layer)
  const paintNode = useCallback((node, ctx, globalScale) => {
    const isHighlighted = highlightNodes.size > 0 && highlightNodes.has(node.id);
    const isDimmed = (highlightNodes.size > 0 && !highlightNodes.has(node.id)) ||
                     (layerFilter !== 'all' && !filteredNodes.has(node.id));
    const isSelected = selectedNode?.id === node.id;
    const color = LAYER_COLORS[node.layer] || '#525252';
    const glow = node.confidence || 0.3;
    let radius = Math.sqrt(node.val || 4) * 2.5;

    if (node.layer === 'trails') radius = Math.max(radius * 0.7, 3);
    if (node.layer === 'blueprints') radius = radius * 1.3;
    if (node.layer === 'promotedClaims') radius = radius * 1.2;
    if (node.layer === 'promoted') radius = radius * 1.5;

    // Temporal glow (MemoryGraph exact)
    if (glow > 0.3 && !isDimmed) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4 + glow * 4, 0, 2 * Math.PI);
      ctx.fillStyle = hexToRgba(color, glow * 0.12);
      ctx.fill();
    }

    // Selection ring — #117dff (MemoryGraph exact)
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = '#117dff';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Highlight ring — #d97706 (MemoryGraph exact)
    if (isHighlighted) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    // Shape per layer (MemoryGraph pattern)
    if (node.layer === 'trails') {
      // Hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        ctx.lineTo(node.x + radius * Math.cos(angle), node.y + radius * Math.sin(angle));
      }
      ctx.closePath();
      ctx.fillStyle = isDimmed ? hexToRgba(color, 0.15) : hexToRgba(color, 0.75);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(color, 0.95);
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    } else if (node.layer === 'blueprints') {
      // Diamond
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - radius);
      ctx.lineTo(node.x + radius, node.y);
      ctx.lineTo(node.x, node.y + radius);
      ctx.lineTo(node.x - radius, node.y);
      ctx.closePath();
      ctx.fillStyle = isDimmed ? hexToRgba(color, 0.15) : hexToRgba(color, 0.7);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(color, 0.9);
      ctx.lineWidth = 0.5 / globalScale;
      ctx.stroke();
    } else if (node.layer === 'promotedClaims') {
      // 4-point star (MemoryGraph tara-insight shape)
      const spikes = 4;
      const outerR = radius;
      const innerR = radius * 0.45;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        ctx.lineTo(node.x + r * Math.cos(angle), node.y + r * Math.sin(angle));
      }
      ctx.closePath();
      ctx.fillStyle = isDimmed ? hexToRgba(color, 0.15) : hexToRgba(color, 0.8);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(color, 0.95);
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    } else if (node.layer === 'observations') {
      // Rounded square (MemoryGraph observation shape)
      const s = radius * 0.85;
      ctx.beginPath();
      ctx.roundRect(node.x - s, node.y - s, s * 2, s * 2, 3);
      ctx.fillStyle = isDimmed ? hexToRgba(color, 0.15) : hexToRgba(color, 0.6);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(color, 0.8);
      ctx.lineWidth = 0.5 / globalScale;
      ctx.stroke();
    } else {
      // Circle — sources, claims, promoted, default
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isDimmed ? hexToRgba(color, 0.15) : hexToRgba(color, 0.6 + glow * 0.4);
      ctx.fill();
      ctx.strokeStyle = isDimmed ? hexToRgba(color, 0.1) : hexToRgba(color, 0.8);
      ctx.lineWidth = 0.5 / globalScale;
      ctx.stroke();
    }

    // Label at zoom > 1.8 (MemoryGraph exact threshold)
    if (globalScale > 1.8 && !isDimmed) {
      const label = truncate(node.title || '', 30);
      ctx.font = `${Math.max(10, 11 / globalScale)}px Space Grotesk, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isDimmed ? 'rgba(0,0,0,0.1)' : 'rgba(10,10,10,0.8)';
      ctx.fillText(label, node.x, node.y + radius + 2);
    }
  }, [highlightNodes, selectedNode, layerFilter, filteredNodes]);

  // Paint edges (MemoryGraph style — straight lines, confidence-weighted, edge label with white bg)
  const paintLink = useCallback((link, ctx, globalScale) => {
    const color = EDGE_COLORS[link.type] || '#e3e0db';
    const opacity = 0.35 + (link.confidence || 0.5) * 0.3;
    const width = 0.5 + (link.confidence || 0.5) * 2;

    ctx.strokeStyle = hexToRgba(color, opacity);
    ctx.lineWidth = width;
    if (link.type === 'contradicts' || (link.confidence || 1) < 0.5) {
      ctx.setLineDash([4, 3]);
    }
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Edge label at high zoom (MemoryGraph exact — with white bg rect)
    if (globalScale > 2.5) {
      const midX = (link.source.x + link.target.x) / 2;
      const midY = (link.source.y + link.target.y) / 2;
      const label = `${link.type} ${((link.confidence || 1) * 100).toFixed(0)}%`;
      ctx.font = `${10 / globalScale}px Space Grotesk, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(midX - textWidth / 2 - 2, midY - 6, textWidth + 4, 12);
      ctx.fillStyle = 'rgba(10,10,10,0.8)';
      ctx.fillText(label, midX, midY);
    }
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
    <div className="h-full bg-[#faf9f4] flex flex-col overflow-hidden relative">
      {showChrome && (
        <div className="shrink-0 border-b border-[#e3e0db] bg-white px-4 py-3 flex items-center gap-3 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
              <Network size={16} className="text-[#8b5cf6]" />
            </div>
            <h1 className="text-sm font-bold font-['Space_Grotesk'] text-[#0a0a0a]">Research Graph</h1>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-[#e3e0db] bg-white p-1">
            <button onClick={() => setViewMode('force')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.08em] transition-all ${
                viewMode === 'force' ? 'bg-[#117dff]/10 text-[#117dff]' : 'text-[#737373]'
              }`}>
              <GitBranch size={10} className="inline mr-1" />Force
            </button>
            <button onClick={() => setViewMode('layered')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.08em] transition-all ${
                viewMode === 'layered' ? 'bg-[#117dff]/10 text-[#117dff]' : 'text-[#737373]'
              }`}>
              <Layers size={10} className="inline mr-1" />Layers
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
            <input type="text" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={highlightNodes.size > 0 ? `Search... (${highlightNodes.size} matches)` : 'Search nodes...'}
              className="w-full pl-8 pr-3 py-1.5 border border-[#e3e0db] rounded-lg text-xs font-['Space_Grotesk'] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40 bg-[#faf9f4]"
            />
          </div>

          {/* Layer Filters */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button onClick={() => setLayerFilter('all')}
              className={`px-2 py-1 rounded text-[10px] font-['Space_Grotesk'] ${
                layerFilter === 'all' ? 'bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/20' : 'text-[#525252] border border-transparent'
              }`}>All</button>
            {LAYER_ORDER.map(l => (
              <button key={l} onClick={() => setLayerFilter(l)}
                className={`px-2 py-1 rounded text-[10px] font-['Space_Grotesk'] whitespace-nowrap ${
                  layerFilter === l ? 'border' : 'border border-transparent'
                }`}
                style={layerFilter === l ? {
                  backgroundColor: hexToRgba(LAYER_COLORS[l], 0.1),
                  color: LAYER_COLORS[l],
                  borderColor: hexToRgba(LAYER_COLORS[l], 0.2),
                } : { color: '#525252' }}>
                {LAYER_META[l]?.icon} {LAYER_META[l]?.label}
                {layerCounts[l] > 0 && <span className="ml-1 opacity-60">({layerCounts[l]})</span>}
              </button>
            ))}
          </div>

          {/* Actions */}
          <button onClick={handleRefresh} disabled={isLoading}
            className="p-1.5 rounded-lg border border-[#e3e0db] text-[#a3a3a3] hover:text-[#525252] hover:border-[#117dff]/20 transition-colors disabled:opacity-40"
            title="Refresh">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { graphRef.current?.zoomToFit?.(400, 70); setFitRequested(false); }}
            className="p-1.5 rounded-lg border border-[#e3e0db] text-[#a3a3a3] hover:text-[#525252] hover:border-[#117dff]/20 transition-colors"
            title="Fit to view">
            <Crosshair size={13} />
          </button>

          {/* Stats */}
          <div className="flex items-center gap-3 ml-auto text-[10px] font-mono text-[#a3a3a3]">
            <span>{stats.nodes} nodes</span>
            <span>{stats.edges} edges</span>
            {layerCounts.promotedClaims > 0 && <span className="flex items-center gap-1"><span style={{ color: LAYER_COLORS.promotedClaims }}>◈</span>{layerCounts.promotedClaims}</span>}
            {layerCounts.blueprints > 0 && <span className="flex items-center gap-1"><span style={{ color: LAYER_COLORS.blueprints }}>◆</span>{layerCounts.blueprints}</span>}
          </div>
        </div>
      )}

      {/* Graph canvas */}
      <div ref={containerRef} className="flex-1 relative">
        {isLoading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#a3a3a3] font-['Space_Grotesk']">Loading research graph...</span>
            </div>
          </div>
        )}

        {graphData.nodes.length > 0 ? (
          viewMode === 'force' ? (
            <ForceGraph2D
              ref={graphRef}
              graphData={displayGraphData}
              nodeCanvasObject={paintNode}
              linkCanvasObject={paintLink}
              onNodeClick={handleNodeClick}
              onNodeHover={(node) => { if (!node) return; }}
              onBackgroundClick={() => setSelectedNode(null)}
              nodePointerAreaPaint={(node, color, ctx) => {
                const r = Math.sqrt(node.val || 4) * 2.5 + 4;
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
              }}
              enableNodeDrag={true}
              enableZoomPan={true}
              minZoom={0.2}
              maxZoom={8}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={0.85}
              linkDirectionalArrowColor={(link) => EDGE_COLORS[link.type] || '#d0ccc7'}
              linkCurvature={0.25}
              cooldownTicks={200}
              warmupTicks={80}
              d3AlphaDecay={0.015}
              d3VelocityDecay={0.25}
              backgroundColor="#faf9f4"
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
          graphData.nodes.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Network size={32} className="text-[#e3e0db] mx-auto mb-3" />
                <p className="text-sm text-[#a3a3a3] font-['Space_Grotesk']">
                  No graph data yet. Start a research session to see nodes grow.
                </p>
              </div>
            </div>
          )
        )}

        {/* Legend — MemoryGraph style */}
        {graphData.nodes.length > 0 && viewMode === 'force' && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-[#e3e0db] rounded-xl px-3 py-2.5 z-10 max-w-[400px]">
            <p className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-wider mb-1.5">Relationships</p>
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(EDGE_COLORS).slice(0, 4).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] font-['Space_Grotesk'] text-[#525252]">{type}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-wider mt-2 mb-1.5">Node Shapes = Layer</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Sources / Claims', shape: 'circle', color: '#117dff' },
                { label: 'Trails', shape: 'hex', color: '#9333ea' },
                { label: 'Blueprints', shape: 'diamond', color: '#d97706' },
                { label: 'Prior Knowledge', shape: 'star', color: '#f43f5e' },
                { label: 'Observations', shape: 'square', color: '#3b82f6' },
              ].map(({ label, shape, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    {shape === 'circle' && <circle cx="6" cy="6" r="5" fill={color} opacity="0.7" />}
                    {shape === 'hex' && <polygon points="6,1 10.2,3.5 10.2,8.5 6,11 1.8,8.5 1.8,3.5" fill={color} opacity="0.7" />}
                    {shape === 'diamond' && <polygon points="6,0 12,6 6,12 0,6" fill={color} opacity="0.7" />}
                    {shape === 'star' && <polygon points="6,0 7.5,4.5 12,4.5 8.5,7.5 9.5,12 6,9 2.5,12 3.5,7.5 0,4.5 4.5,4.5" fill={color} opacity="0.7" />}
                    {shape === 'square' && <rect x="1" y="1" width="10" height="10" rx="2" fill={color} opacity="0.7" />}
                  </svg>
                  <span className="text-[10px] font-['Space_Grotesk'] text-[#525252]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Node Detail Panel — right side (MemoryGraph style) */}
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
