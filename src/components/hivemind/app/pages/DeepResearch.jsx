import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  ArrowUp, Sparkles, Network, History,
  Loader2, Search, CheckCircle2, BookOpen, Brain,
  Globe, Zap, AlertCircle, ChevronRight,
  GitBranch, Target, ListTodo, Users, FileText, X,
  Layers, Eye, EyeOff, Trophy,
} from 'lucide-react';
import apiClient from '../shared/api-client';

/* ─── Dark Background for Fullscreen Graph ───────────────────────────────── */
const BG = '#08080c';

/* ─── Cartesia Light Theme Constants ───────────────────────────────── */
const THEME = {
  bg: '#faf9f4',
  bgSecondary: '#ffffff',
  border: '#e3e0db',
  borderLight: '#d4d0ca',
  text: '#0a0a0a',
  textSecondary: '#525252',
  textMuted: '#a3a3a3',
  accent: '#117dff',
  accentHover: '#0a6ddb',
};

const ACTION_BADGES = {
  SEARCH_WEB:    { label: 'Web Search',    color: '#117dff', bg: 'rgba(17,125,255,0.12)' },
  SEARCH_MEMORY: { label: 'Memory Search', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  READ_URL:      { label: 'Reading',       color: '#9333ea', bg: 'rgba(147,51,234,0.12)' },
  SYNTHESIZE:    { label: 'Synthesize',    color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  FINISH:        { label: 'Finish',        color: '#059669', bg: 'rgba(5,150,105,0.12)' },
};

const AGENT_COLORS = {
  Explorer: '#117dff',
  Analyst: '#9333ea',
  Verifier: '#16a34a',
  Synthesizer: '#d97706',
};

const GRAPH_LAYERS = {
  sources: { label: 'Sources', color: '#117dff', icon: Globe },
  claims: { label: 'Claims', color: '#9333ea', icon: FileText },
  trails: { label: 'Trails', color: '#16a34a', icon: GitBranch },
  blueprints: { label: 'Blueprints', color: '#d97706', icon: Layers },
};

/* ─── Simple Markdown Renderer (Light Theme) ───────────────────────── */
function renderMarkdown(text) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-[#0a0a0a]/90 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-[#0a0a0a]/90 mt-6 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-[#0a0a0a] mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#0a0a0a]/90 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-[#117dff]/10 text-[#117dff] text-xs font-mono">$1</code>')
    .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc text-[#525252]/80">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-[#525252]/80">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-[#525252]/80">$1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#117dff] hover:text-[#0a6ddb] underline underline-offset-2">$1</a>')
    .replace(/^---$/gm, '<hr class="border-[#e3e0db] my-4" />')
    .replace(/\n\n/g, '</p><p class="text-[#525252]/80 leading-relaxed mb-2">')
    .replace(/\n/g, '<br/>');
}

/* ─── Event Card (Light Theme) ────────────────────────────────────── */
function EventCard({ event, index }) {
  const getContent = () => {
    switch (event.type) {
      case 'task.reasoning': {
        const badge = ACTION_BADGES[event.action] || ACTION_BADGES.SYNTHESIZE;
        return (
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Brain size={14} className="text-[#a3a3a3]" />
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
              <p className="text-xs text-[#525252]/70 leading-relaxed">{event.thought || event.message}</p>
            </div>
          </div>
        );
      }
      case 'web.searching':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-[#117dff] animate-spin" />
            <span className="text-xs text-[#525252]/70">Searching: <span className="text-[#117dff]">{event.query}</span></span>
          </div>
        );
      case 'web.results':
        return (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#525252]/70"><span className="text-[#16a34a] font-medium">{event.count}</span> results found</span>
          </div>
        );
      case 'web.reading':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-[#9333ea] animate-spin" />
            <span className="text-xs text-[#525252]/70 truncate">Reading: <span className="text-[#9333ea]">{event.url}</span></span>
          </div>
        );
      case 'web.read_complete':
        return (
          <div className="flex items-center gap-3">
            <BookOpen size={14} className="text-[#9333ea]" />
            <span className="text-xs text-[#525252]/70">Read <span className="text-[#9333ea] font-medium">{event.length?.toLocaleString()}</span> chars from <span className="text-[#9333ea] truncate">{event.url}</span></span>
          </div>
        );
      case 'task.completed':
        return (
          <div className="flex items-center gap-3">
            <Zap size={14} className="text-[#d97706]" />
            <span className="text-xs text-[#525252]/70">
              Task complete: <span className="text-[#d97706] font-medium">{event.findingCount}</span> findings
              {event.confidence != null && <>, confidence <span className="text-[#d97706] font-medium">{(event.confidence * 100).toFixed(0)}%</span></>}
            </span>
          </div>
        );
      case 'research.synthesizing':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-[#d97706] animate-spin" />
            <span className="text-xs text-[#d97706] font-medium">Synthesizing final report...</span>
          </div>
        );
      case 'research.completed':
        return (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#16a34a] font-medium">
              Research complete! {event.findingCount} findings in {((event.durationMs || 0) / 1000).toFixed(1)}s
            </span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-3">
            <Globe size={14} className="text-[#a3a3a3]" />
            <span className="text-xs text-[#a3a3a3]">{event.message || event.type}</span>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="bg-white border border-[#e3e0db] rounded-xl px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
    >
      {getContent()}
    </motion.div>
  );
}

/* ─── Graph Node Painter (Light Theme) ────────────────────────────── */
function usePaintNode() {
  return useCallback((node, ctx, globalScale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

    const radius = Math.sqrt(node.val || 4) * 2;
    const color = node.tags?.includes('research-finding') ? '#117dff'
      : node.tags?.includes('research-trail') ? '#9333ea'
      : '#6b7280';

    // Outer glow
    const glow = ctx.createRadialGradient(node.x, node.y, radius * 0.3, node.x, node.y, radius * 3);
    glow.addColorStop(0, `${color}33`);
    glow.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 3, 0, 2 * Math.PI);
    ctx.fillStyle = glow;
    ctx.fill();

    // Core orb
    const core = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.3, `${color}cc`);
    core.addColorStop(1, `${color}66`);
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
      ctx.fillStyle = 'rgba(10,10,10,0.75)';
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
    ctx.strokeStyle = 'rgba(107,114,128,0.15)';
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

  // Process Panel state
  const [showProcessPanel, setShowProcessPanel] = useState(false);
  const [trailSteps, setTrailSteps] = useState([]);
  const [contradictions, setContradictions] = useState([]);
  const [agentStates, setAgentStates] = useState({});
  const [subgoals, setSubgoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState('');
  const [confidenceOverTime, setConfidenceOverTime] = useState([]);

  // Graph layer toggles
  const [graphLayers, setGraphLayers] = useState({
    sources: true,
    claims: true,
    trails: true,
    blueprints: false,
  });

  const eventsEndRef = useRef(null);
  const textareaRef = useRef(null);
  const graphRef = useRef(null);

  const paintNode = usePaintNode();
  const paintLink = usePaintLink();

  /* ── Fetch Trail Steps ─────────────────────────────────────────── */
  const fetchTrailSteps = useCallback(async (sid) => {
    try {
      const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/trail`);
      setTrailSteps(Array.isArray(data) ? data : data?.trail || []);

      // Extract subgoals from trail
      if (data?.tasks) {
        setSubgoals(data.tasks.map((t, i) => ({
          id: t.id || i,
          query: t.query,
          status: t.status || 'pending',
          confidence: t.confidence,
        })));
      }

      // Update active goal
      if (data?.query) {
        setActiveGoal(data.query);
      }
    } catch (e) {
      console.error('Failed to fetch trail:', e);
    }
  }, []);

  /* ── Fetch Contradictions ──────────────────────────────────────── */
  const fetchContradictions = useCallback(async (sid) => {
    try {
      const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/contradictions`);
      setContradictions(Array.isArray(data) ? data : data?.contradictions || []);
    } catch (e) {
      console.error('Failed to fetch contradictions:', e);
    }
  }, []);

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

            // Fetch trail and contradictions on completion
            fetchTrailSteps(sessionId);
            fetchContradictions(sessionId);
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
  }, [sessionId, status, projectId, fetchTrailSteps, fetchContradictions]);

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

  /* ── Update Agent States from Events ───────────────────────────── */
  useEffect(() => {
    if (events.length === 0) return;

    const newAgentStates = {};
    const actionToAgent = {
      SEARCH_WEB: 'Explorer',
      SEARCH_MEMORY: 'Explorer',
      READ_URL: 'Explorer',
      SYNTHESIZE: 'Analyst',
      FINISH: 'Synthesizer',
    };

    // Track the latest action per agent
    events.forEach((event) => {
      if (event.type === 'task.reasoning' && event.action) {
        const agent = actionToAgent[event.action] || 'Verifier';
        newAgentStates[agent] = {
          status: 'active',
          lastAction: event.action,
          thought: event.thought,
        };
      }
    });

    // Set agents without recent activity to idle
    ['Explorer', 'Analyst', 'Verifier', 'Synthesizer'].forEach((agent) => {
      if (!newAgentStates[agent]) {
        newAgentStates[agent] = { status: 'idle' };
      }
    });

    setAgentStates(newAgentStates);

    // Update confidence over time
    const lastEvent = events[events.length - 1];
    if (lastEvent?.type === 'task.completed' && lastEvent?.confidence != null) {
      setConfidenceOverTime((prev) => [...prev, {
        timestamp: lastEvent.timestamp || Date.now(),
        confidence: lastEvent.confidence,
      }]);
    }
  }, [events]);

  /* ─── Render ───────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: THEME.bg, left: '260px', top: '0', right: '0', bottom: '0', zIndex: 10 }}
    >
      {/* ── Watermark ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span
          style={{
            fontSize: '20vw',
            fontWeight: 900,
            fontFamily: "'Space Grotesk', sans-serif",
            color: 'rgba(17,125,255,0.03)',
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}
        >
          HIVEMIND
        </span>
      </div>

      {/* ── Top Controls Bar (when research is active) ─────────────── */}
      {(status === 'running' || status === 'completed') && projectId && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#e3e0db] shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        >
          {/* Process Panel Toggle */}
          <button
            onClick={() => setShowProcessPanel(!showProcessPanel)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
              showProcessPanel
                ? 'bg-[#9333ea]/10 text-[#9333ea]'
                : 'text-[#525252] hover:bg-[#faf9f4]'
            }`}
          >
            <ListTodo size={14} />
            Process
          </button>

          {/* Graph View Toggle */}
          <button
            onClick={() => setShowGraph(!showGraph)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
              showGraph
                ? 'bg-[#117dff]/10 text-[#117dff]'
                : 'text-[#525252] hover:bg-[#faf9f4]'
            }`}
          >
            <Network size={14} />
            {showGraph ? 'Research' : 'Graph'}
          </button>

          {/* Blueprint Badge (V2 placeholder) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#d97706]/10 border border-[#d97706]/20">
            <Trophy size={12} className="text-[#d97706]" />
            <span className="text-[10px] text-[#d97706] font-medium">Blueprint Ready</span>
          </div>
        </motion.div>
      )}

      {/* ── History Button ─────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div className="absolute top-4 left-4 z-30">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#e3e0db] text-[#525252] text-xs hover:bg-[#faf9f4] transition-all duration-200 shadow-sm"
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
                className="mt-2 bg-white rounded-xl border border-[#e3e0db] p-2 w-80 max-h-80 overflow-y-auto shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              >
                {sessions.map((s) => (
                  <button
                    key={s.id || s.session_id}
                    onClick={() => loadSession(s.id || s.session_id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#faf9f4] transition-colors group"
                  >
                    <p className="text-xs text-[#0a0a0a]/80 truncate group-hover:text-[#0a0a0a] transition-colors">
                      {s.query || s.title || 'Untitled research'}
                    </p>
                    <p className="text-[10px] text-[#525252]/50 mt-0.5">
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
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e3e0db] text-[#525252] text-xs hover:bg-[#faf9f4] transition-all duration-200 shadow-sm"
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

            {/* Layer Toggles */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
              {Object.entries(GRAPH_LAYERS).map(([key, layer]) => {
                const Icon = layer.icon;
                const isActive = graphLayers[key];
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setGraphLayers((prev) => ({ ...prev, [key]: !prev[key] }));
                      // In a real implementation, this would re-fetch the graph with updated layers
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border text-xs transition-all duration-200 ${
                      isActive
                        ? 'bg-white/[0.1] border-white/[0.15] text-white/90'
                        : 'bg-black/40 border-white/[0.08] text-white/40 hover:bg-black/60'
                    }`}
                  >
                    <Icon size={14} style={{ color: layer.color }} />
                    <span>{layer.label}</span>
                    {isActive ? (
                      <Eye size={12} className="ml-1" />
                    ) : (
                      <EyeOff size={12} className="ml-1" />
                    )}
                  </button>
                );
              })}
            </div>

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

            {/* Layer Legend */}
            <div className="absolute bottom-8 right-4 z-20 bg-black/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-2">Active Layers</p>
              <div className="space-y-1">
                {Object.entries(GRAPH_LAYERS).map(([key, layer]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${graphLayers[key] ? 'animate-pulse' : 'opacity-30'}`}
                      style={{ backgroundColor: graphLayers[key] ? layer.color : '#666' }}
                    />
                    <span className={`text-xs ${graphLayers[key] ? 'text-white/80' : 'text-white/30'}`}>
                      {layer.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Process Panel (Mode 2) ─────────────────────────────────── */}
      <AnimatePresence>
        {showProcessPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProcessPanel(false)}
              className="absolute inset-0 bg-black/40 z-40"
            />

            {/* Slide-in Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-[420px] z-50 bg-[#0a0a0f] border-l border-white/[0.08] overflow-y-auto"
            >
              {/* Panel Header */}
              <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#0a0a0f]/95 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <ListTodo size={16} className="text-purple-400" />
                  <span className="text-sm font-semibold text-white/90">Research Process</span>
                </div>
                <button
                  onClick={() => setShowProcessPanel(false)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Panel Content */}
              <div className="p-4 space-y-4">
                {/* Active Goal */}
                {activeGoal && (
                  <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} className="text-blue-400" />
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Active Goal</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">{activeGoal}</p>
                  </div>
                )}

                {/* Agent States */}
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={14} className="text-purple-400" />
                    <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Agent States</span>
                  </div>
                  <div className="space-y-2">
                    {['Explorer', 'Analyst', 'Verifier', 'Synthesizer'].map((agent) => {
                      const state = agentStates[agent] || { status: 'idle' };
                      const color = AGENT_COLORS[agent];
                      return (
                        <div key={agent} className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${state.status === 'active' ? 'animate-pulse' : ''}`}
                            style={{ backgroundColor: state.status === 'active' ? color : `${color}40` }}
                          />
                          <span className="text-xs text-white/70 flex-1">{agent}</span>
                          {state.lastAction && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${color}20`, color }}
                            >
                              {ACTION_BADGES[state.lastAction]?.label || state.lastAction}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Subgoals */}
                {subgoals.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <ListTodo size={14} className="text-emerald-400" />
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Subgoals</span>
                    </div>
                    <div className="space-y-2">
                      {subgoals.map((goal, i) => (
                        <div key={goal.id || i} className="flex items-start gap-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              goal.status === 'completed'
                                ? 'bg-emerald-500/20 border border-emerald-500/40'
                                : 'bg-white/[0.05] border border-white/[0.1]'
                            }`}
                          >
                            {goal.status === 'completed' && <CheckCircle2 size={10} className="text-emerald-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/70 truncate">{goal.query}</p>
                            {goal.confidence != null && (
                              <p className="text-[10px] text-white/40 mt-0.5">
                                Confidence: {(goal.confidence * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trail Timeline */}
                {trailSteps.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <GitBranch size={14} className="text-amber-400" />
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Trail Timeline</span>
                    </div>
                    <div className="space-y-2">
                      {trailSteps.slice(0, 20).map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-px h-full bg-white/[0.1] ml-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {step.action && ACTION_BADGES[step.action] && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: ACTION_BADGES[step.action].bg,
                                    color: ACTION_BADGES[step.action].color,
                                  }}
                                >
                                  {ACTION_BADGES[step.action].label}
                                </span>
                              )}
                              {step.timestamp && (
                                <span className="text-[10px] text-white/30">
                                  {new Date(step.timestamp).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                            {step.thought && (
                              <p className="text-xs text-white/60 mt-1">{step.thought}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contradictions */}
                {contradictions.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle size={14} className="text-red-400" />
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Contradictions</span>
                    </div>
                    <div className="space-y-2">
                      {contradictions.map((c, i) => (
                        <div
                          key={i}
                          className="bg-red-500/[0.05] border border-red-500/[0.2] rounded-lg p-2"
                        >
                          <p className="text-xs text-white/70">{c.description || c.statement}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-red-400">Source A: {c.sourceA}</span>
                            <span className="text-[10px] text-white/30">vs</span>
                            <span className="text-[10px] text-blue-400">Source B: {c.sourceB}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confidence Over Time */}
                {confidenceOverTime.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={14} className="text-amber-400" />
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Confidence</span>
                    </div>
                    <div className="flex items-end gap-1 h-16">
                      {confidenceOverTime.slice(-20).map((point, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-amber-500/60 rounded-t"
                          style={{ height: `${Math.max(10, point.confidence * 100)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
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
