import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Square, Moon, Sun, Filter, X, Clock, Monitor, Trash2, Loader2,
} from 'lucide-react';
import MobileShell from '../MobileShell';
import apiClient from '../../shared/api-client';
import MemoryGraph3D from '../../pages/MemoryGraph3D';
import MemoryGraph2DCanvas from '../../pages/MemoryGraph2DCanvas';
import { normalizeGraphPayload } from '../../pages/MemoryGraph';

/**
 * MobileMemoryGraph — /hivemind/m/graph. Mobile-native chrome around the
 * SAME two renderers and data layer the desktop graph uses (no second
 * fetch path, no second force-graph implementation):
 *   - MemoryGraph3D / MemoryGraph2DCanvas for rendering (dimension toggle)
 *   - apiClient.getGraph() + normalizeGraphPayload() for data (both
 *     exported from the desktop page rather than re-implemented here)
 *
 * What's actually new here (the desktop page has no mobile equivalent
 * for any of this): a real ResizeObserver-driven canvas size (desktop
 * computes width/height once from window.inner*, never on resize/
 * rotation), touch-sized floating controls instead of a dense desktop
 * toolbar row, and a bottom sheet for node detail instead of a
 * `fixed right-0 max-w-lg` sidecar that would cover the whole screen
 * on a phone.
 *
 * Layout: full-bleed canvas under MobileShell's bareHeader hamburger.
 * Floating controls: dimension toggle bottom-center, scope bottom-left,
 * day/night bottom-right. Tap a node -> bottom sheet slides up (same
 * spring/rounded-t-[28px] recipe as MobileMemories.jsx).
 */

const SCOPE_OPTIONS = [
  { value: 'visible', label: 'All' },
  { value: 'tier:organization', label: 'Org' },
  { value: 'tier:project', label: 'Project' },
  { value: 'tier:personal', label: 'Personal' },
];

const THEME_KEY = 'hm-graph-theme-v2'; // shared with desktop graph — one preference, either surface
const DIM_KEY = 'hm-m-graph-dim-v1';

function useContainerSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // orientation change fires a resize on most browsers already, but iOS
    // Safari can be a beat late relative to the layout settling — nudge once more.
    const onOrientation = () => setTimeout(update, 150);
    window.addEventListener('orientationchange', onOrientation);
    return () => { ro.disconnect(); window.removeEventListener('orientationchange', onOrientation); };
  }, []);
  return [ref, size];
}

function NodeSheet({ node, edges, nodes, onClose, onNavigate, onDelete, deleting }) {
  const nodeMap = useMemo(() => {
    const map = {};
    (nodes || []).forEach((n) => { map[n.id] = n; });
    return map;
  }, [nodes]);

  if (!node) return null;

  const inbound = (edges || []).filter((e) => e.target === node.id || e.target?.id === node.id);
  const outbound = (edges || []).filter((e) => e.source === node.id || e.source?.id === node.id);
  const niceTags = (node.tags || []).filter(Boolean).slice(0, 12);
  const deletable = node.id && node.kind !== 'document' && node.kind !== 'entity';
  const createdLabel = node.createdAt ? new Date(node.createdAt).toLocaleDateString() : null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-[#0a0a0a]/25 flex items-end"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.section
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 360, damping: 34 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-h-[78vh] overflow-y-auto bg-white rounded-t-[28px] p-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
        >
          <div className="w-10 h-1 rounded-full bg-[#d4d0ca] mx-auto mb-4" />

          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[17px] font-semibold font-['Space_Grotesk'] leading-snug flex-1">
              {node.title || node.label || 'Untitled Memory'}
            </h2>
            <button onClick={onClose} className="w-9 h-9 rounded-full grid place-items-center active:bg-[#f1eee7] flex-shrink-0" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-2.5">
            <span className="inline-flex items-center rounded-full bg-[#eaf9ea] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#44a44a]">
              {node.memoryType || 'memory'}
            </span>
            {node.sourcePlatform && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[#cfe2ff] bg-[#edf5ff] px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] text-[#4d59dd]">
                <Monitor size={11} /> {node.sourcePlatform}
              </span>
            )}
            {createdLabel && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8a8a82]">
                <Clock size={11} /> {createdLabel}
              </span>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-mono uppercase tracking-wider mb-1.5 text-[#a3a3a3]">Content</p>
            <div className="border border-[#e3e0db] rounded-xl p-3.5 text-[14px] leading-relaxed whitespace-pre-wrap bg-[#faf9f4]">
              {node.content || 'No content'}
            </div>
          </div>

          {niceTags.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-mono uppercase tracking-wider mb-1.5 text-[#a3a3a3]">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {niceTags.map((t) => (
                  <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border border-[#e3e0db] bg-white">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Importance', value: node.importanceScore?.toFixed(2) },
              { label: 'Strength', value: node.strength?.toFixed(2) },
              { label: 'Recalls', value: node.recallCount },
            ].map((s) => (
              <div key={s.label} className="border border-[#e3e0db] rounded-xl p-2.5 text-center bg-[#faf9f4]">
                <p className="text-[9.5px] font-mono text-[#a3a3a3]">{s.label}</p>
                <p className="text-[14px] font-semibold font-['Space_Grotesk']">{s.value ?? '—'}</p>
              </div>
            ))}
          </div>

          {(inbound.length + outbound.length) > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-mono uppercase tracking-wider mb-1.5 text-[#a3a3a3]">
                Relations · {inbound.length + outbound.length}
              </p>
              <div className="space-y-2">
                {[...outbound.map((e) => ({ e, dir: 'out' })), ...inbound.map((e) => ({ e, dir: 'in' }))].slice(0, 8).map(({ e, dir }, i) => {
                  const targetId = typeof e.target === 'object' ? e.target.id : e.target;
                  const sourceId = typeof e.source === 'object' ? e.source.id : e.source;
                  const peerId = dir === 'out' ? targetId : sourceId;
                  const peerNode = nodeMap[peerId];
                  const peerTitle = peerNode?.title || peerNode?.label || 'Memory';
                  return (
                    <button
                      key={`${dir}-${i}`}
                      onClick={() => onNavigate(peerId)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-[#e3e0db] text-left active:bg-[#f1eee7]"
                    >
                      <span className="text-[#117dff]">{dir === 'out' ? '→' : '←'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold truncate">{peerTitle}</span>
                        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#a3a3a3]">
                          {String(e.type || 'related').replace(/[_-]+/g, ' ')}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {deletable && onDelete && (
            <button
              onClick={() => onDelete(node)}
              disabled={deleting}
              className="mt-5 w-full flex items-center justify-center gap-2 h-12 rounded-xl text-[14px] font-semibold border border-[#e3e0db] bg-[#f3f1ec] text-[#525252] active:bg-red-50 active:text-[#dc2626] disabled:opacity-50"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Delete Memory
            </button>
          )}
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}

function ScopeSheet({ open, value, onSelect, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-[#0a0a0a]/25 flex items-end"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-[28px] p-5"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
          >
            <div className="w-10 h-1 rounded-full bg-[#d4d0ca] mx-auto mb-4" />
            <p className="text-[13px] font-semibold font-['Space_Grotesk'] mb-3">Scope</p>
            <div className="space-y-1.5">
              {SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onSelect(opt.value); onClose(); }}
                  className={`w-full h-12 px-4 rounded-xl flex items-center justify-between text-[14.5px] ${
                    value === opt.value ? 'bg-[#ece9e2] font-semibold' : 'active:bg-[#f1eee7]'
                  }`}
                >
                  {opt.label}
                  {value === opt.value && <span className="text-[#117dff]">✓</span>}
                </button>
              ))}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function MobileMemoryGraph() {
  const [containerRef, size] = useContainerSize();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [rawEdges, setRawEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dim, setDim] = useState(() => { try { return window.localStorage.getItem(DIM_KEY) || '2d'; } catch { return '2d'; } });
  const [theme, setTheme] = useState(() => { try { return window.localStorage.getItem(THEME_KEY) || 'day'; } catch { return 'day'; } });
  const [scope, setScope] = useState('visible');
  const [scopeSheetOpen, setScopeSheetOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { try { window.localStorage.setItem(DIM_KEY, dim); } catch { /* noop */ } }, [dim]);
  useEffect(() => { try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* noop */ } }, [theme]);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getGraph({ scope, limit: 300 });
      const { nodes, links } = normalizeGraphPayload(data.nodes || [], data.edges || []);
      setGraphData({ nodes, links });
      const nodeIdSet = new Set(nodes.map((n) => n.id));
      setRawEdges((data.edges || []).filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load graph');
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const handleNodeClick = useCallback((node) => setSelectedNode(node), []);
  const handleNavigate = useCallback((peerId) => {
    const peer = graphData.nodes.find((n) => n.id === peerId);
    if (peer) setSelectedNode(peer);
  }, [graphData.nodes]);

  const handleDelete = useCallback(async (node) => {
    if (!node?.id) return;
    setDeleting(true);
    try {
      await apiClient.deleteMemory(node.id, { hard: true });
      setSelectedNode(null);
      fetchGraph();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }, [fetchGraph]);

  const bgColor = theme === 'night' ? '#0d0b09' : '#faf9f4';
  const controlClass = theme === 'night'
    ? 'bg-[#1b1512]/90 border-[#2f2925] text-[#fff0e5]'
    : 'bg-white/90 border-[#e3e0db] text-[#0a0a0a]';
  const activeControlClass = theme === 'night' ? 'bg-[#2f2925] text-[#ff746d]' : 'bg-[#ece9e2] text-[#117dff]';

  return (
    <MobileShell bareHeader noScroll>
      <div ref={containerRef} className="relative flex-1 min-h-0 w-full overflow-hidden" style={{ background: bgColor }}>
        {loading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 size={26} className="animate-spin text-[#a3a3a3]" />
          </div>
        )}

        {error && (
          <div className="absolute inset-x-4 top-16 z-30 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-[#b3261e]">
            {error}
          </div>
        )}

        {size.width > 0 && size.height > 0 && (
          dim === '3d' ? (
            <MemoryGraph3D
              graphData={graphData}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              width={size.width}
              height={size.height}
              theme={theme === 'night' ? 'atlas' : 'day'}
              scope={scope}
            />
          ) : (
            <MemoryGraph2DCanvas
              graphData={graphData}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              width={size.width}
              height={size.height}
              backgroundColor={bgColor}
            />
          )
        )}

        {/* bottom-center: 2D/3D toggle */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full border backdrop-blur-sm p-1 shadow-lg ${controlClass}`}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
        >
          <button
            onClick={() => setDim('3d')}
            className={`w-11 h-11 rounded-full grid place-items-center transition-colors ${dim === '3d' ? activeControlClass : 'active:bg-black/5'}`}
            aria-label="3D view"
          >
            <Box size={19} />
          </button>
          <button
            onClick={() => setDim('2d')}
            className={`w-11 h-11 rounded-full grid place-items-center transition-colors ${dim === '2d' ? activeControlClass : 'active:bg-black/5'}`}
            aria-label="2D view"
          >
            <Square size={19} />
          </button>
        </div>

        {/* bottom-left: scope select */}
        <button
          onClick={() => setScopeSheetOpen(true)}
          className={`absolute left-4 flex items-center gap-1.5 h-11 px-4 rounded-full border backdrop-blur-sm shadow-lg text-[13px] font-medium ${controlClass}`}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
        >
          <Filter size={15} />
          {SCOPE_OPTIONS.find((o) => o.value === scope)?.label || 'All'}
        </button>

        {/* bottom-right: day/night toggle */}
        <button
          onClick={() => setTheme((t) => (t === 'night' ? 'day' : 'night'))}
          className={`absolute right-4 w-11 h-11 rounded-full grid place-items-center border backdrop-blur-sm shadow-lg ${controlClass}`}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
          aria-label="Toggle day/night theme"
        >
          {theme === 'night' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </div>

      <ScopeSheet open={scopeSheetOpen} value={scope} onSelect={setScope} onClose={() => setScopeSheetOpen(false)} />

      <NodeSheet
        node={selectedNode}
        edges={rawEdges}
        nodes={graphData.nodes}
        onClose={() => setSelectedNode(null)}
        onNavigate={handleNavigate}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </MobileShell>
  );
}
