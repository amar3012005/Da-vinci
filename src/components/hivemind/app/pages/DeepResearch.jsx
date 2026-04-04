import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  ArrowUp, Sparkles, Network, MessageSquare, History,
  Loader2, Search, CheckCircle2, BookOpen, Brain,
  Globe, Zap, AlertCircle, ChevronRight,
} from 'lucide-react';
import apiClient from '../shared/api-client';

/* ─── Constants ──────────────────────────────────────────────────── */
const BG = '#08080c';

const ACTION_BADGES = {
  SEARCH_WEB:    { label: 'Web Search',    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  SEARCH_MEMORY: { label: 'Memory Search', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  READ_URL:      { label: 'Reading',       color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  SYNTHESIZE:    { label: 'Synthesize',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  FINISH:        { label: 'Finish',        color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
};

/* ─── Simple Markdown Renderer ───────────────────────────────────── */
function renderMarkdown(text) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-white/90 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-white/90 mt-6 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-white mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/90 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 text-xs font-mono">$1</code>')
    .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc text-white/70">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-white/70">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-white/70">$1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-2">$1</a>')
    .replace(/^---$/gm, '<hr class="border-white/10 my-4" />')
    .replace(/\n\n/g, '</p><p class="text-white/70 leading-relaxed mb-2">')
    .replace(/\n/g, '<br/>');
}

/* ─── Event Card ─────────────────────────────────────────────────── */
function EventCard({ event, index }) {
  const getContent = () => {
    switch (event.type) {
      case 'task.reasoning': {
        const badge = ACTION_BADGES[event.action] || ACTION_BADGES.SYNTHESIZE;
        return (
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Brain size={14} className="text-white/40" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: badge.color, background: badge.bg }}
                >
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{event.thought || event.message}</p>
            </div>
          </div>
        );
      }
      case 'web.searching':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-blue-400 animate-spin" />
            <span className="text-xs text-white/60">Searching: <span className="text-blue-400">{event.query}</span></span>
          </div>
        );
      case 'web.results':
        return (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-xs text-white/60"><span className="text-emerald-400 font-medium">{event.count}</span> results found</span>
          </div>
        );
      case 'web.reading':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-purple-400 animate-spin" />
            <span className="text-xs text-white/60 truncate">Reading: <span className="text-purple-400">{event.url}</span></span>
          </div>
        );
      case 'web.read_complete':
        return (
          <div className="flex items-center gap-3">
            <BookOpen size={14} className="text-purple-400" />
            <span className="text-xs text-white/60">Read <span className="text-purple-400 font-medium">{event.length?.toLocaleString()}</span> chars from <span className="text-purple-300 truncate">{event.url}</span></span>
          </div>
        );
      case 'task.completed':
        return (
          <div className="flex items-center gap-3">
            <Zap size={14} className="text-amber-400" />
            <span className="text-xs text-white/60">
              Task complete: <span className="text-amber-400 font-medium">{event.findingCount}</span> findings
              {event.confidence != null && <>, confidence <span className="text-amber-400 font-medium">{(event.confidence * 100).toFixed(0)}%</span></>}
            </span>
          </div>
        );
      case 'research.synthesizing':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-amber-400 animate-spin" />
            <span className="text-xs text-amber-400 font-medium">Synthesizing final report...</span>
          </div>
        );
      case 'research.completed':
        return (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">
              Research complete! {event.findingCount} findings in {((event.durationMs || 0) / 1000).toFixed(1)}s
            </span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-3">
            <Globe size={14} className="text-white/30" />
            <span className="text-xs text-white/50">{event.message || event.type}</span>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-xl px-4 py-2.5"
    >
      {getContent()}
    </motion.div>
  );
}

/* ─── Graph Node Painter ─────────────────────────────────────────── */
function usePaintNode() {
  return useCallback((node, ctx, globalScale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

    const radius = Math.sqrt(node.val || 4) * 2;
    const color = node.tags?.includes('research-finding') ? '#60a5fa'
      : node.tags?.includes('research-trail') ? '#c084fc'
      : '#94a3b8';

    // Outer glow
    const glow = ctx.createRadialGradient(node.x, node.y, radius * 0.3, node.x, node.y, radius * 3);
    glow.addColorStop(0, `${color}44`);
    glow.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 3, 0, 2 * Math.PI);
    ctx.fillStyle = glow;
    ctx.fill();

    // Core orb
    const core = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
    core.addColorStop(0, '#ffffffdd');
    core.addColorStop(0.3, `${color}cc`);
    core.addColorStop(1, `${color}33`);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = core;
    ctx.fill();

    // Label at higher zoom
    if (globalScale > 1) {
      const fontSize = Math.max(10 / globalScale, 3);
      ctx.font = `${fontSize}px 'Space Grotesk', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText((node.title || node.label || '').slice(0, 30), node.x, node.y + radius + 3);
    }
  }, []);
}

/* ─── Link Painter ───────────────────────────────────────────────── */
function usePaintLink() {
  return useCallback((link, ctx) => {
    const src = link.source;
    const tgt = link.target;
    if (!src || !tgt || !Number.isFinite(src.x) || !Number.isFinite(tgt.x)) return;

    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.strokeStyle = 'rgba(148,163,184,0.08)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }, []);
}

/* ═══════════════════════════════════════════════════════════════════
   DeepResearch — Main Component
   ═══════════════════════════════════════════════════════════════════ */
export default function DeepResearch() {
  /* ── State ─────────────────────────────────────────────────────── */
  const [query, setQuery] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [events, setEvents] = useState([]);
  const [report, setReport] = useState(null);
  const [findings, setFindings] = useState([]);
  const [durationMs, setDurationMs] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [error, setError] = useState(null);

  const eventsEndRef = useRef(null);
  const textareaRef = useRef(null);
  const graphRef = useRef(null);

  const paintNode = usePaintNode();
  const paintLink = usePaintLink();

  /* ── Load prior sessions on mount ──────────────────────────────── */
  useEffect(() => {
    apiClient.controlPlane
      .get('/v1/proxy/research/sessions')
      .then(({ data }) => setSessions(Array.isArray(data) ? data : data?.sessions || []))
      .catch(() => {});
  }, []);

  /* ── Polling ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!sessionId || status !== 'running') return;

    const interval = setInterval(async () => {
      try {
        const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sessionId}/status`);
        setEvents(data.events || []);

        if (data.status === 'completed') {
          setStatus('completed');
          clearInterval(interval);
          try {
            const { data: rpt } = await apiClient.controlPlane.get(`/v1/proxy/research/${sessionId}/report`);
            setReport(rpt.report);
            setFindings(rpt.findings || []);
            setDurationMs(rpt.durationMs || 0);
            setConfidence(rpt.confidence ?? rpt.taskProgress?.overallConfidence ?? 0);
            setFromCache(!!rpt.fromCache);
            if (rpt.projectId) setProjectId(rpt.projectId);

            // Fetch sub-graph
            const pid = rpt.projectId || projectId;
            if (pid) {
              const graphResult = await apiClient.getGraph({ project: pid, limit: 200, scope: 'personal' });
              setGraphData({
                nodes: graphResult.nodes || [],
                links: graphResult.edges || graphResult.links || [],
              });
            }
          } catch (e) {
            console.error('Failed to fetch report:', e);
          }
        } else if (data.status === 'failed') {
          setStatus('failed');
          setError(data.error || 'Research failed');
          clearInterval(interval);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, status, projectId]);

  /* ── Auto-scroll events ────────────────────────────────────────── */
  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  /* ── Submit ────────────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    const q = query.trim();
    if (!q || status === 'running') return;

    setError(null);
    setStatus('running');
    setEvents([]);
    setReport(null);
    setFindings([]);
    setShowGraph(false);

    try {
      const { data } = await apiClient.controlPlane.post('/v1/proxy/research/start', {
        query: q,
        forceRefresh: false,
      });
      setSessionId(data.session_id);
      setProjectId(data.project_id || null);

      if (data.status === 'completed') {
        setStatus('completed');
        const { data: rpt } = await apiClient.controlPlane.get(`/v1/proxy/research/${data.session_id}/report`);
        setReport(rpt.report);
        setFindings(rpt.findings || []);
        setDurationMs(rpt.durationMs || 0);
        setConfidence(rpt.confidence ?? 0);
        setFromCache(!!rpt.fromCache);
        if (rpt.projectId) setProjectId(rpt.projectId);
      }
    } catch (e) {
      setStatus('failed');
      setError(e.response?.data?.detail || e.message || 'Failed to start research');
    }
  }, [query, status]);

  /* ── Load a prior session ──────────────────────────────────────── */
  const loadSession = useCallback(async (sid) => {
    setShowSessions(false);
    setSessionId(sid);
    setError(null);
    setEvents([]);

    try {
      const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/status`);
      setStatus(data.status || 'idle');
      setEvents(data.events || []);

      if (data.status === 'completed') {
        const { data: rpt } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/report`);
        setReport(rpt.report);
        setFindings(rpt.findings || []);
        setDurationMs(rpt.durationMs || 0);
        setConfidence(rpt.confidence ?? 0);
        setFromCache(!!rpt.fromCache);
        setQuery(rpt.query || '');
        if (rpt.projectId) {
          setProjectId(rpt.projectId);
          const graphResult = await apiClient.getGraph({ project: rpt.projectId, limit: 200, scope: 'personal' });
          setGraphData({
            nodes: graphResult.nodes || [],
            links: graphResult.edges || graphResult.links || [],
          });
        }
      }
    } catch (e) {
      setError('Failed to load session');
    }
  }, []);

  /* ── Keyboard shortcut ─────────────────────────────────────────── */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  /* ── New research ──────────────────────────────────────────────── */
  const handleNewResearch = useCallback(() => {
    setQuery('');
    setSessionId(null);
    setStatus('idle');
    setEvents([]);
    setReport(null);
    setFindings([]);
    setProjectId(null);
    setShowGraph(false);
    setError(null);
    setDurationMs(0);
    setConfidence(0);
    setFromCache(false);
    textareaRef.current?.focus();
  }, []);

  /* ─── Render ───────────────────────────────────────────────────── */
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: BG, margin: '-1.5rem', width: 'calc(100% + 3rem)', height: 'calc(100% + 3rem)' }}
    >
      {/* ── Watermark ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span
          style={{
            fontSize: '20vw',
            fontWeight: 900,
            fontFamily: "'Space Grotesk', sans-serif",
            color: 'rgba(255,255,255,0.02)',
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}
        >
          HIVEMIND
        </span>
      </div>

      {/* ── Graph Toggle ───────────────────────────────────────────── */}
      {projectId && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowGraph(!showGraph)}
          className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] backdrop-blur-md border border-white/[0.08] text-white/70 text-xs hover:bg-white/[0.1] transition-all duration-200"
        >
          {showGraph ? <MessageSquare size={14} /> : <Network size={14} />}
          {showGraph ? 'Research' : 'CSI Graph'}
        </motion.button>
      )}

      {/* ── History Button ─────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div className="absolute top-4 left-4 z-30">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] backdrop-blur-md border border-white/[0.08] text-white/70 text-xs hover:bg-white/[0.1] transition-all duration-200"
          >
            <History size={14} />
            History
            <ChevronRight
              size={12}
              className={`transition-transform duration-200 ${showSessions ? 'rotate-90' : ''}`}
            />
          </button>
          <AnimatePresence>
            {showSessions && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="mt-2 bg-black/80 backdrop-blur-xl rounded-xl border border-white/[0.08] p-2 w-80 max-h-80 overflow-y-auto"
              >
                {sessions.map((s) => (
                  <button
                    key={s.id || s.session_id}
                    onClick={() => loadSession(s.id || s.session_id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition-colors group"
                  >
                    <p className="text-xs text-white/80 truncate group-hover:text-white transition-colors">
                      {s.query || s.title || 'Untitled research'}
                    </p>
                    <p className="text-[10px] text-white/35 mt-0.5">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                      {s.status && <> &middot; {s.status}</>}
                    </p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── New Research Button (visible after completion) ──────────── */}
      {(status === 'completed' || status === 'failed') && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleNewResearch}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] backdrop-blur-md border border-white/[0.08] text-white/60 text-xs hover:bg-white/[0.1] hover:text-white/80 transition-all duration-200"
        >
          <Sparkles size={12} />
          New Research
        </motion.button>
      )}

      {/* ── Graph Mode ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showGraph && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10"
          >
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              backgroundColor={BG}
              nodeCanvasObject={paintNode}
              linkCanvasObject={paintLink}
              nodeLabel={(n) => n.title || n.label || n.id}
              cooldownTicks={120}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              enableZoomInteraction
              enablePanInteraction
              width={typeof window !== 'undefined' ? window.innerWidth : 1200}
              height={typeof window !== 'undefined' ? window.innerHeight : 800}
            />
            {/* Graph Stats Overlay */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 px-6 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/[0.08]">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-400 font-mono">{graphData.nodes.length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Nodes</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-lg font-bold text-purple-400 font-mono">{graphData.links.length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Connections</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-400 font-mono">{findings.length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Findings</p>
              </div>
              {confidence > 0 && (
                <>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-400 font-mono">{(confidence * 100).toFixed(0)}%</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Confidence</p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat Mode Content ──────────────────────────────────────── */}
      {!showGraph && (
        <>
          {/* ── Idle State: centered prompt ───────────────────────── */}
          {status === 'idle' && !report && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ paddingBottom: '12rem' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/[0.08] flex items-center justify-center">
                  <Search size={18} className="text-blue-400" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white/90 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Deep Research
              </h1>
              <p className="text-sm text-white/40 max-w-md text-center">
                Ask anything. HIVEMIND will search the web, your memory graph, and synthesize a comprehensive report.
              </p>
            </motion.div>
          )}

          {/* ── Running: Live event stream ────────────────────────── */}
          <AnimatePresence>
            {status === 'running' && events.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-36 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 max-h-[60vh] overflow-y-auto"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
              >
                <div className="space-y-2">
                  {events.map((event, i) => (
                    <EventCard key={`${event.type}-${i}`} event={event} index={i} />
                  ))}
                  <div ref={eventsEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Running: spinner if no events yet ─────────────────── */}
          {status === 'running' && events.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: '12rem' }}>
              <Loader2 size={24} className="text-blue-400 animate-spin mb-3" />
              <p className="text-sm text-white/40">Starting deep research...</p>
            </div>
          )}

          {/* ── Error ─────────────────────────────────────────────── */}
          {status === 'failed' && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: '12rem' }}>
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-4 max-w-md text-center">
                <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* ── Completed: Report ─────────────────────────────────── */}
          {status === 'completed' && report && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-14 bottom-36 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.07] rounded-2xl p-6 mb-4">
                {/* Stats bar */}
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-4 text-xs text-white/45 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Zap size={11} className="text-blue-400" />
                      {findings.length} findings
                    </span>
                    <span className="text-white/20">&middot;</span>
                    <span>{(durationMs / 1000).toFixed(1)}s</span>
                    <span className="text-white/20">&middot;</span>
                    <span>confidence: {(confidence * 100).toFixed(0)}%</span>
                    {fromCache && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-medium">
                        cached
                      </span>
                    )}
                  </div>
                </div>

                {/* Markdown report */}
                <div
                  className="prose prose-invert prose-sm max-w-none
                    [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-6 [&_h1]:mb-3
                    [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white/90 [&_h2]:mt-6 [&_h2]:mb-2
                    [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white/90 [&_h3]:mt-4 [&_h3]:mb-2
                    [&_p]:text-white/70 [&_p]:leading-relaxed [&_p]:mb-2
                    [&_li]:text-white/70 [&_li]:leading-relaxed
                    [&_strong]:text-white/90 [&_strong]:font-semibold
                    [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-300
                    [&_code]:text-emerald-300 [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
                    [&_hr]:border-white/10 [&_hr]:my-4"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
                />
              </div>
            </motion.div>
          )}

          {/* ── Chat Input ────────────────────────────────────────── */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What would you like to research?"
                rows={2}
                className="w-full bg-transparent text-white text-sm placeholder:text-white/25 resize-none focus:outline-none leading-relaxed"
                disabled={status === 'running'}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs">
                    <Sparkles size={12} className="text-purple-400" />
                    Deep research
                  </span>
                  {status === 'running' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
                      <Loader2 size={12} className="animate-spin" />
                      Researching...
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!query.trim() || status === 'running'}
                  className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/50 hover:bg-white/[0.15] hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
