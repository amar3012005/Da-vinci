import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  ArrowUp, Sparkles, History,
  Loader2, Search, CheckCircle2, BookOpen, Brain,
  Globe, Zap, AlertCircle,
  GitBranch, Target, ListTodo, Users, X,
  Layers, Scroll, Award,
  Server, FileText, Save, RotateCcw,
  ChevronUp, ChevronDown, PanelTop,
} from 'lucide-react';
import apiClient from '../shared/api-client';

/* ─── Cartesia Light Theme Constants ───────────────────────────────── */
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

const RUNTIME_BADGES = {
  tavily: { label: 'Tavily', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', icon: Server },
  lightpanda: { label: 'LightPanda', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: Zap },
  fetch: { label: 'Fetch', color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: Globe },
};

const NODE_ICONS = {
  source: Globe,
  claim: CheckCircle2,
  trail: Scroll,
  blueprint: Award,
};

function quotaTextColor(used, limit) {
  if (!limit) return 'text-[#117dff]';
  const pct = (used / limit) * 100;
  if (pct >= 80) return 'text-red-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-emerald-600';
}

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

/* ─── Event Card Component ────────────────────────────────────── */
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
            <span className="text-xs text-[#525252]/70">Read <span className="text-[#9333ea] font-medium">{event.length?.toLocaleString()}</span> chars</span>
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
      className="bg-white border border-[#e3e0db] rounded-xl px-4 py-2.5 shadow-sm"
    >
      {getContent()}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DeepResearch — Main Component (REDESIGNED)
   ═══════════════════════════════════════════════════════════════════ */
export default function DeepResearch() {
  const [query, setQuery] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [events, setEvents] = useState([]);
  const [report, setReport] = useState(null);
  const [findings, setFindings] = useState([]);
  const [durationMs, setDurationMs] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [projectId, setProjectId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [error, setError] = useState(null);
  
  // Sliding panel state
  const [showPanel, setShowPanel] = useState(false);
  const [panelTab, setPanelTab] = useState('status'); // 'status' | 'report' | 'graph'
  const [panelSize, setPanelSize] = useState('large'); // 'compact' | 'medium' | 'large'
  const [panelPosition, setPanelPosition] = useState({ x: window.innerWidth - 500, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);
  
  // Graph state
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [graphLayers, setGraphLayers] = useState({
    sources: true,
    claims: true,
    trails: true,
    blueprints: true,
  });
  const [graphLoading, setGraphLoading] = useState(false);
  const [webUsage, setWebUsage] = useState(null);
  const [savingMemories, setSavingMemories] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [graphRefreshKey, setGraphRefreshKey] = useState(0);

  // Process panel state
  // eslint-disable-next-line no-unused-vars
  const [trailSteps, setTrailSteps] = useState([]);
  const [agentStates, setAgentStates] = useState({});
  const [subgoals, setSubgoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState('');

  const eventsEndRef = useRef(null);
  const textareaRef = useRef(null);
  const panelContentRef = useRef(null);

  /* ── Fetch Trail Steps ─────────────────────────────────────────── */
  const fetchTrailSteps = useCallback(async (sid) => {
    try {
      const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/trail`);
      setTrailSteps(Array.isArray(data) ? data : data?.trail || []);
      if (data?.tasks) {
        setSubgoals(data.tasks.map((t, i) => ({
          id: t.id || i,
          query: t.query,
          status: t.status || 'pending',
          confidence: t.confidence,
        })));
      }
      if (data?.query) setActiveGoal(data.query);
    } catch (e) {
      console.error('Failed to fetch trail:', e);
    }
  }, []);

  /* ── Fetch Graph Data ─────────────────────────────────────────── */
  const fetchGraphData = useCallback(async (sid) => {
    setGraphLoading(true);
    try {
      const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/graph`);
      const layers = data.layers || {};
      const nodes = [];
      const links = [];

      if (graphLayers.sources && layers.sources) {
        layers.sources.forEach((source, idx) => {
          nodes.push({
            id: `source-${source.id || idx}`,
            type: 'source',
            title: source.title || source.url || 'Source',
            url: source.url,
            val: 8,
            color: '#117dff',
            runtime: source.runtime || 'tavily',
            score: source.score,
            favicon: source.favicon,
          });
        });
      }

      if (graphLayers.claims && layers.claims) {
        layers.claims.forEach((claim, idx) => {
          nodes.push({
            id: `claim-${claim.id || idx}`,
            type: 'claim',
            title: claim.content?.slice(0, 80) || 'Finding',
            confidence: claim.confidence,
            val: 10,
            color: '#16a34a',
            sourceId: claim.source,
          });
        });
      }

      if (graphLayers.trails && layers.trails) {
        layers.trails.forEach((step, idx) => {
          nodes.push({
            id: `trail-${step.id || idx}`,
            type: 'trail',
            title: `${step.agent}: ${step.action}`,
            action: step.action,
            agent: step.agent,
            val: 6,
            color: '#9333ea',
            runtime: step.runtime,
            confidence: step.confidence,
          });
          if (idx > 0) {
            links.push({
              source: `trail-${step.id || idx}`,
              target: `trail-${layers.trails[idx - 1].id || idx - 1}`,
              type: 'sequence',
              color: '#9333ea40',
            });
          }
        });
      }

      if (graphLayers.blueprints && layers.blueprints) {
        layers.blueprints.forEach((bp, idx) => {
          nodes.push({
            id: `blueprint-${bp.blueprintId || idx}`,
            type: 'blueprint',
            title: bp.name || 'Blueprint',
            domain: bp.domain,
            reused: bp.timesReused || 0,
            val: 12,
            color: '#d97706',
          });
        });
      }

      if (layers.weights?.edges) {
        layers.weights.edges.forEach(edge => {
          links.push({
            source: edge.from,
            target: edge.to,
            type: edge.type || 'related',
            confidence: edge.confidence,
            color: `rgba(147, 51, 234, ${0.2 + (edge.confidence || 0.5) * 0.5})`,
          });
        });
      }

      setGraphData({ nodes, links });
    } catch (e) {
      console.error('Failed to fetch graph:', e);
    } finally {
      setGraphLoading(false);
    }
  }, [graphLayers]);

  /* ── Fetch Web Usage ────────────────────────────────────────── */
  const fetchWebUsage = useCallback(async () => {
    try {
      const { data } = await apiClient.controlPlane.get('/v1/proxy/web/usage');
      setWebUsage(data);
    } catch (e) {
      console.error('Failed to fetch web usage:', e);
    }
  }, []);

  /* ── Load prior sessions ────────────────────────────────────── */
  useEffect(() => {
    apiClient.controlPlane
      .get('/v1/proxy/research/sessions')
      .then(({ data }) => setSessions(Array.isArray(data) ? data : data?.sessions || []))
      .catch(() => {});
  }, []);

  /* ── Polling for status ─────────────────────────────────────── */
  useEffect(() => {
    if (!sessionId || status !== 'running') return;

    const interval = setInterval(async () => {
      try {
        const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sessionId}/status`);
        setEvents(data.events || []);

        if (panelTab === 'graph' && showPanel) {
          fetchGraphData(sessionId);
        }

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
            fetchTrailSteps(sessionId);
            if (panelTab === 'graph') fetchGraphData(sessionId);
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
  }, [sessionId, status, panelTab, showPanel, fetchTrailSteps, fetchGraphData]);

  /* ── Fetch Graph when panel opens ───────────────────────────── */
  useEffect(() => {
    if (panelTab === 'graph' && showPanel && sessionId) {
      fetchGraphData(sessionId);
      fetchWebUsage();
    }
  }, [panelTab, showPanel, sessionId, fetchGraphData, fetchWebUsage]);

  /* ── Auto-scroll events ─────────────────────────────────────── */
  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  /* ── Auto-hide sidebar ──────────────────────────────────────── */
  useEffect(() => {
    if (status === 'running' || status === 'completed') {
      window.dispatchEvent(new CustomEvent('hivemind:close-sidebar'));
    }
    return () => {
      if (status === 'idle') {
        window.dispatchEvent(new CustomEvent('hivemind:open-sidebar'));
      }
    };
  }, [status]);

  /* ── Update Agent States ────────────────────────────────────── */
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
    ['Explorer', 'Analyst', 'Verifier', 'Synthesizer'].forEach((agent) => {
      if (!newAgentStates[agent]) {
        newAgentStates[agent] = { status: 'idle' };
      }
    });
    setAgentStates(newAgentStates);
  }, [events]);

  /* ── Handler Functions ───────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    const q = query.trim();
    if (!q || status === 'running') return;
    setError(null);
    setStatus('running');
    setEvents([]);
    setReport(null);
    setFindings([]);
    setShowPanel(true);
    setPanelTab('status');

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
        if (rpt.projectId) setProjectId(rpt.projectId);
      }
    } catch (e) {
      setError('Failed to load session');
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleNewResearch = useCallback(() => {
    setQuery('');
    setSessionId(null);
    setStatus('idle');
    setEvents([]);
    setReport(null);
    setFindings([]);
    setProjectId(null);
    setError(null);
    setDurationMs(0);
    setConfidence(0);
    setFromCache(false);
    setShowPanel(false);
    textareaRef.current?.focus();
  }, []);

  const handleSaveToMemory = useCallback(async (source, nodeId) => {
    if (!sessionId) return;
    setSavingMemories(prev => new Set(prev).add(nodeId));
    try {
      await apiClient.controlPlane.post(`/v1/proxy/research/${sessionId}/save-memory`, {
        sourceId: source.id,
        title: source.title,
        url: source.url,
        tags: ['web-search', 'deep-research'],
      });
    } catch (e) {
      console.error('Failed to save to memory:', e);
    } finally {
      setSavingMemories(prev => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    }
  }, [sessionId]);

  const handleRefreshGraph = useCallback(() => {
    if (sessionId) {
      setGraphRefreshKey(prev => prev + 1);
      fetchGraphData(sessionId);
    }
  }, [sessionId, fetchGraphData]);

  const handleNodeClick = useCallback((node) => {
    if (node.type === 'source' && node.url) {
      setSelectedNode(node);
    } else {
      setSelectedNode(null);
    }
  }, []);

  const togglePanelSize = useCallback(() => {
    setPanelSize(prev => prev === 'compact' ? 'medium' : prev === 'medium' ? 'large' : 'compact');
  }, []);

  const handlePanelMouseDown = useCallback((e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    const maxX = window.innerWidth - 400;
    const maxY = window.innerHeight - 100;
    setPanelPosition({
      x: Math.max(100, Math.min(newX, maxX)),
      y: Math.max(80, Math.min(newY, maxY)),
    });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  /* ─── Render ───────────────────────────────────────────────────── */
  const panelWidths = { compact: 'w-[350px]', medium: 'w-[450px]', large: 'w-[550px]' };
  const isResearchActive = status === 'running' || status === 'completed';

  return (
    <div className="fixed inset-0 bg-[#faf9f4] overflow-hidden flex flex-col">
      {/* Top Bar - Always visible */}
      <div className="flex-none flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e3e0db] bg-white/90 backdrop-blur-sm z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#117dff]/10 flex items-center justify-center flex-shrink-0">
            <Search size={16} className="sm:w-[18px] sm:h-[18px] text-[#117dff]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#0a0a0a] font-['Space_Grotesk'] truncate">Deep Research</h1>
            <p className="text-[9px] sm:text-[10px] text-[#a3a3a3] hidden sm:block">AI-powered research engine</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {sessions.length > 0 && status === 'idle' && (
            <div className="relative">
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#faf9f4] border border-[#e3e0db] text-[#525252] text-xs hover:bg-[#f3f1ec] transition-colors"
              >
                <History size={14} />
                <span className="hidden sm:inline">History</span>
              </button>
              <AnimatePresence>
                {showSessions && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 bg-white rounded-xl border border-[#e3e0db] p-2 w-64 sm:w-72 max-h-80 overflow-y-auto shadow-xl z-50"
                  >
                    {sessions.map((s) => (
                      <button
                        key={s.id || s.session_id}
                        onClick={() => loadSession(s.id || s.session_id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#faf9f4] transition-colors"
                      >
                        <p className="text-xs text-[#0a0a0a] truncate">{s.query || 'Untitled'}</p>
                        <p className="text-[10px] text-[#a3a3a3] mt-0.5">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                        </p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {status !== 'idle' && (
            <button
              onClick={handleNewResearch}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#faf9f4] border border-[#e3e0db] text-[#525252] text-xs hover:bg-[#f3f1ec] transition-colors"
            >
              <Sparkles size={12} />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
        </div>
      </div>

        {/* ── Main Content Area ────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl">

            {/* Welcome State - Only show when idle */}
            {status === 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6 sm:mb-8"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#117dff]/10 to-[#9333ea]/10 flex items-center justify-center">
                  <Search size={24} className="sm:w-[28px] sm:h-[28px] text-[#117dff]" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] font-['Space_Grotesk'] mb-3 px-4">
                  What would you like to research?
                </h2>
                <p className="text-sm sm:text-base text-[#525252] max-w-md mx-auto px-4">
                  Ask anything. HIVEMIND searches the web, analyzes sources, and synthesizes comprehensive reports.
                </p>
              </motion.div>
            )}

            {/* ── Search Input - Always visible, moved down ───────── */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <div className="bg-white rounded-2xl border border-[#e3e0db] overflow-hidden shadow-lg">
                {/* macOS-style traffic lights */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e3e0db] bg-gradient-to-b from-[#faf9f4] to-white">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dba520]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#faf9f4] border border-[#e3e0db]">
                    <Sparkles size={12} className="text-[#9333ea]" />
                    <span className="text-[10px] text-[#525252] font-medium">AI Research</span>
                  </div>
                </div>

                {/* Input */}
                <div className="p-5">
                  <textarea
                    ref={textareaRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What would you like to research?"
                    rows={status === 'idle' ? 4 : 3}
                    className="w-full bg-transparent text-[#0a0a0a] text-sm placeholder:text-[#a3a3a3] resize-none focus:outline-none leading-relaxed font-mono"
                    disabled={status === 'running'}
                  />
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e3e0db]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {status === 'running' && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#117dff]/10 border border-[#117dff]/20 text-[#117dff] text-xs font-medium">
                          <Loader2 size={12} className="animate-spin" />
                          Researching...
                        </span>
                      )}
                      {fromCache && status === 'completed' && (
                        <span className="px-3 py-1.5 rounded-full bg-[#16a34a]/10 border border-[#16a34a]/20 text-[#16a34a] text-xs font-medium">
                          From Cache
                        </span>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(17,125,255,0.3)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSubmit}
                      disabled={!query.trim() || status === 'running'}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#117dff] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#0066e0] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                      {status === 'running' ? (
                        <><Loader2 size={14} className="animate-spin" /><span className="hidden sm:inline">Running...</span></>
                      ) : (
                        <><span className="hidden sm:inline">Start Research</span><ArrowUp size={14} /></>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Error State */}
            {status === 'failed' && error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-[#dc2626]/5 border border-[#dc2626]/20 rounded-2xl px-6 py-4 text-center"
              >
                <AlertCircle size={20} className="text-[#dc2626] mx-auto mb-2" />
                <p className="text-sm text-[#dc2626]">{error}</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Draggable Right Panel - Status/Report/Graph ──────────────── */}
        <AnimatePresence>
          {showPanel && isResearchActive && (
            <motion.div
              ref={panelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="fixed top-0 right-0 h-full bg-white border-l border-[#e3e0db] shadow-2xl z-40 flex flex-col"
              style={{ width: panelWidths[panelSize] }}
              onMouseDown={handlePanelMouseDown}
            >
              {/* Panel Header - Drag Handle */}
              <div className="flex-none flex items-center justify-between px-3 py-2 border-b border-[#e3e0db] bg-[#faf9f4] cursor-move no-drag">
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    onClick={() => setPanelTab('status')}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                      panelTab === 'status' ? 'bg-[#117dff]/10 text-[#117dff]' : 'text-[#525252] hover:bg-[#f3f1ec]'
                    }`}
                  >
                    <ListTodo size={14} />
                    <span className="font-medium">Status</span>
                    {status === 'running' && (
                      <span className="w-2 h-2 rounded-full bg-[#117dff] animate-pulse" />
                    )}
                  </button>
                  <button
                    onClick={() => setPanelTab('report')}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                      panelTab === 'report' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'text-[#525252] hover:bg-[#f3f1ec]'
                    }`}
                    disabled={!report}
                  >
                    <FileText size={14} />
                    <span className="font-medium">Report</span>
                    {report && <CheckCircle2 size={12} />}
                  </button>
                  <button
                    onClick={() => setPanelTab('graph')}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                      panelTab === 'graph' ? 'bg-[#9333ea]/10 text-[#9333ea]' : 'text-[#525252] hover:bg-[#f3f1ec]'
                    }`}
                  >
                    <GitBranch size={14} />
                    <span className="font-medium">Graph</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 no-drag">
                  {/* Panel Size Toggle */}
                  <button
                    onClick={togglePanelSize}
                    className="p-1.5 rounded-lg hover:bg-[#e3e0db]/40 text-[#525252]"
                    title="Resize panel"
                  >
                    {panelSize === 'compact' && <ChevronUp size={14} />}
                    {panelSize === 'medium' && <PanelTop size={14} />}
                    {panelSize === 'large' && <ChevronDown size={14} />}
                  </button>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="p-1.5 rounded-lg hover:bg-[#e3e0db]/40 text-[#525252]"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Drag Handle Bar */}
              <div className="flex-none h-1 bg-[#e3e0db] cursor-move no-drag" onMouseDown={handlePanelMouseDown} />

              {/* Panel Content */}
              <div ref={panelContentRef} className="flex-1 overflow-y-auto p-3">
                <AnimatePresence mode="wait">
                  {/* STATUS TAB */}
                  {panelTab === 'status' && (
                    <motion.div
                      key="status"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-3"
                    >
                      {/* Active Goal */}
                      {activeGoal && (
                        <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Target size={14} className="text-[#117dff]" />
                            <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Active Goal</span>
                          </div>
                          <p className="text-sm text-[#0a0a0a]">{activeGoal}</p>
                        </div>
                      )}

                      {/* Agent States */}
                      <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Users size={14} className="text-[#9333ea]" />
                          <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Agent States</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {['Explorer', 'Analyst', 'Verifier', 'Synthesizer'].map((agent) => {
                            const state = agentStates[agent] || { status: 'idle' };
                            const color = AGENT_COLORS[agent];
                            return (
                              <div key={agent} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-[#e3e0db]">
                                <div className={`w-2 h-2 rounded-full ${state.status === 'active' ? 'animate-pulse' : ''}`} style={{ backgroundColor: state.status === 'active' ? color : `${color}40` }} />
                                <span className="text-xs text-[#525252]">{agent}</span>
                                {state.lastAction && (
                                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}12`, color }}>
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
                        <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-3">
                            <ListTodo size={14} className="text-[#16a34a]" />
                            <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Subgoals</span>
                          </div>
                          <div className="space-y-2">
                            {subgoals.map((goal, i) => (
                              <div key={goal.id || i} className="flex items-start gap-2">
                                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${goal.status === 'completed' ? 'bg-[#16a34a]/10 border border-[#16a34a]/30' : 'bg-white border border-[#e3e0db]'}`}>
                                  {goal.status === 'completed' && <CheckCircle2 size={10} className="text-[#16a34a]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-[#0a0a0a] truncate">{goal.query}</p>
                                  {goal.confidence != null && (
                                    <p className="text-[10px] text-[#525252]/50 mt-0.5">Confidence: {(goal.confidence * 100).toFixed(0)}%</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Event Timeline */}
                      <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <GitBranch size={14} className="text-[#d97706]" />
                          <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Timeline</span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {events.map((event, i) => (
                            <EventCard key={`${event.type}-${i}`} event={event} index={i} />
                          ))}
                          <div ref={eventsEndRef} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* REPORT TAB */}
                  {panelTab === 'report' && (
                    <motion.div
                      key="report"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="h-full"
                    >
                      {report ? (
                        <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden">
                          {/* Stats Bar */}
                          <div className="flex items-center gap-4 px-4 py-3 border-b border-[#e3e0db] bg-[#faf9f4]">
                            <div className="flex items-center gap-1.5">
                              <Zap size={12} className="text-[#117dff]" />
                              <span className="text-xs text-[#525252] font-mono">{findings.length} findings</span>
                            </div>
                            <span className="text-[#e3e0db]">·</span>
                            <span className="text-xs text-[#525252] font-mono">{(durationMs / 1000).toFixed(1)}s</span>
                            <span className="text-[#e3e0db]">·</span>
                            <span className="text-xs text-[#525252] font-mono">{(confidence * 100).toFixed(0)}% confidence</span>
                            {fromCache && (
                              <><span className="text-[#e3e0db]">·</span><span className="px-2 py-0.5 rounded-full bg-[#16a34a]/10 border border-[#16a34a]/20 text-[#16a34a] text-[10px] font-medium">Cached</span></>
                            )}
                          </div>
                          <div className="p-6 max-h-96 overflow-y-auto">
                            <div
                              className="text-[#525252] leading-relaxed space-y-3"
                              dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[#525252]">
                          <Loader2 size={32} className="animate-spin text-[#117dff] mb-3" />
                          <p className="text-sm">Generating report...</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* GRAPH TAB */}
                  {panelTab === 'graph' && (
                    <motion.div
                      key="graph"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="h-full"
                    >
                      <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden h-full flex flex-col">
                        {/* Graph Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[#e3e0db] bg-[#faf9f4]">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setGraphLayers(prev => ({ ...prev, sources: !prev.sources }))}
                                className={`px-2 py-1 rounded text-[10px] transition-all ${
                                  graphLayers.sources ? 'bg-[#117dff]/10 text-[#117dff]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                                }`}
                              >
                                <Globe size={10} className="inline mr-1" />
                                Sources
                              </button>
                              <button
                                onClick={() => setGraphLayers(prev => ({ ...prev, claims: !prev.claims }))}
                                className={`px-2 py-1 rounded text-[10px] transition-all ${
                                  graphLayers.claims ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                                }`}
                              >
                                <CheckCircle2 size={10} className="inline mr-1" />
                                Claims
                              </button>
                              <button
                                onClick={() => setGraphLayers(prev => ({ ...prev, trails: !prev.trails }))}
                                className={`px-2 py-1 rounded text-[10px] transition-all ${
                                  graphLayers.trails ? 'bg-[#9333ea]/10 text-[#9333ea]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                                }`}
                              >
                                <Scroll size={10} className="inline mr-1" />
                                Trails
                              </button>
                              <button
                                onClick={() => setGraphLayers(prev => ({ ...prev, blueprints: !prev.blueprints }))}
                                className={`px-2 py-1 rounded text-[10px] transition-all ${
                                  graphLayers.blueprints ? 'bg-[#d97706]/10 text-[#d97706]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                                }`}
                              >
                                <Award size={10} className="inline mr-1" />
                                Blueprints
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {webUsage && (
                              <div className="flex items-center gap-2 px-2 py-1 rounded bg-[#faf9f4] border border-[#e3e0db]">
                                <span className="text-[9px] text-[#525252]">
                                  <Search size={8} className="inline mr-0.5" />
                                  <span className={quotaTextColor(webUsage.web_search_requests?.used || 0, webUsage.web_search_requests?.limit || 50)}>
                                    {webUsage.web_search_requests?.used || 0}
                                  </span>
                                  /{webUsage.web_search_requests?.limit || 50}
                                </span>
                              </div>
                            )}
                            <button
                              onClick={handleRefreshGraph}
                              className="p-1.5 rounded hover:bg-[#e3e0db]/40 text-[#525252]"
                            >
                              <RotateCcw size={12} className={graphLoading ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        </div>

                        {/* Graph Canvas */}
                        <div className="flex-1 relative bg-gradient-to-b from-[#faf9f4] to-white">
                          {graphData.nodes.length > 0 ? (
                            <ForceGraph2D
                              key={graphRefreshKey}
                              graphData={graphData}
                              nodeLabel="title"
                              nodeColor={node => node.color}
                              nodeVal={node => node.val}
                              linkColor={link => link.color}
                              nodeRelSize={3}
                              enableNodeDrag={false}
                              enableZoomPan={true}
                              minZoom={0.5}
                              maxZoom={3}
                              onNodeClick={handleNodeClick}
                              nodeCanvasObject={(node, ctx, globalScale) => {
                                const label = node.title || '';
                                const fontSize = 10 / globalScale;
                                ctx.font = `${fontSize}px Sans-Serif`;
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
                                ctx.fillStyle = node.color;
                                ctx.fill();
                                if (node.type === 'source' && node.runtime) {
                                  const runtimeBadge = RUNTIME_BADGES[node.runtime] || RUNTIME_BADGES.fetch;
                                  ctx.fillStyle = runtimeBadge.color;
                                  ctx.beginPath();
                                  ctx.arc(node.x + node.val - 2, node.y - node.val + 2, 4, 0, 2 * Math.PI);
                                  ctx.fill();
                                }
                                ctx.fillStyle = '#0a0a0a';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.fillText(label, node.x, node.y - node.val - 2);
                              }}
                              linkDirectionalParticles={2}
                              linkDirectionalParticleWidth={2}
                              linkDirectionalParticleSpeed={0.005}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-[#525252]">
                              {graphLoading ? (
                                <><Loader2 size={32} className="animate-spin text-[#117dff] mb-3" /><p className="text-sm">Loading graph...</p></>
                              ) : (
                                <><Layers size={48} className="text-[#e3e0db] mb-3" /><p className="text-sm">No graph data available</p></>
                              )}
                            </div>
                          )}

                          {/* Node Detail Popup */}
                          <AnimatePresence>
                            {selectedNode && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-4 right-4 w-72 bg-white/98 backdrop-blur border border-[#e3e0db] rounded-xl shadow-xl p-4 z-20"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${selectedNode.color}20` }}>
                                      {(() => {
                                        const Icon = NODE_ICONS[selectedNode.type] || Globe;
                                        return <Icon size={16} style={{ color: selectedNode.color }} />;
                                      })()}
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-[#0a0a0a] capitalize">{selectedNode.type}</p>
                                      {selectedNode.runtime && (
                                        <div className="flex items-center gap-1">
                                          {(() => {
                                            const RuntimeIcon = RUNTIME_BADGES[selectedNode.runtime]?.icon || Globe;
                                            return <RuntimeIcon size={8} className="text-[#a3a3a3]" />;
                                          })()}
                                          <span className="text-[9px] text-[#525252] capitalize">{RUNTIME_BADGES[selectedNode.runtime]?.label || selectedNode.runtime}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <button onClick={() => setSelectedNode(null)} className="p-1 rounded hover:bg-[#e3e0db]/40 text-[#525252]">
                                    <X size={12} />
                                  </button>
                                </div>
                                <p className="text-xs text-[#525252]/80 leading-relaxed mb-3 line-clamp-2">{selectedNode.title}</p>
                                {selectedNode.url && (
                                  <a href={selectedNode.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-[#117dff] hover:underline mb-3">
                                    <Globe size={10} />
                                    <span className="truncate">{selectedNode.url}</span>
                                  </a>
                                )}
                                {selectedNode.confidence != null && (
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] text-[#525252]">Confidence:</span>
                                    <span className={`text-[10px] font-semibold ${(selectedNode.confidence * 100) >= 70 ? 'text-emerald-600' : (selectedNode.confidence * 100) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                                      {(selectedNode.confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                )}
                                {selectedNode.type === 'source' && (
                                  <button
                                    onClick={() => handleSaveToMemory(selectedNode, selectedNode.id)}
                                    disabled={savingMemories.has(selectedNode.id)}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-all"
                                  >
                                    {savingMemories.has(selectedNode.id) ? (
                                      <><Loader2 size={12} className="animate-spin" />Saving...</>
                                    ) : (
                                      <><Save size={12} />Save to Memory</>
                                    )}
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
