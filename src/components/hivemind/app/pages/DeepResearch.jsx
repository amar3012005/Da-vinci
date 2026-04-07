import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import {
  ArrowUp, Sparkles, History,
  Loader2, Search, CheckCircle2, BookOpen, Brain,
  Globe, Zap, AlertCircle,
  GitBranch, Target, ListTodo, Users, X,
  Trophy, Layers, Scroll, Award,
  Server, FileText, Save, RotateCcw,
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

/* ─── Web Intelligence Runtime Badges ─────────────────────────────── */
const RUNTIME_BADGES = {
  tavily: { label: 'Tavily', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', icon: Server },
  lightpanda: { label: 'LightPanda', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: Zap },
  fetch: { label: 'Fetch', color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: Globe },
};

/* ─── Node Icons by Type ──────────────────────────────────────────── */
const NODE_ICONS = {
  source: Globe,
  claim: CheckCircle2,
  trail: Scroll,
  blueprint: Award,
};

/* ─── Quota Text Color Helper ────────────────────────────────────── */
function quotaTextColor(used, limit) {
  if (!limit) return 'text-[#117dff]';
  const pct = (used / limit) * 100;
  if (pct >= 80) return 'text-red-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-emerald-600';
}

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

/* ═══════════════════════════════════════════════════════════════════
   DeepResearch — Main Component
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
  const [projectId, setProjectId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [error, setError] = useState(null);
  const [showProcessPanel, setShowProcessPanel] = useState(false);
  const [showGraphView, setShowGraphView] = useState(false);
  const [trailSteps, setTrailSteps] = useState([]);
  const [agentStates, setAgentStates] = useState({});
  const [subgoals, setSubgoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState('');

  /* ── Graph View State ─────────────────────────────────────────── */
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [graphLayers, setGraphLayers] = useState({
    sources: true,      // webpages, docs, notes
    claims: true,       // extracted findings
    trails: true,       // research path taken
    blueprints: true,   // reused or forming
  });
  const [graphLoading, setGraphLoading] = useState(false);
  const [webUsage, setWebUsage] = useState(null);
  const [savingMemories, setSavingMemories] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [graphRefreshKey, setGraphRefreshKey] = useState(0);

  const eventsEndRef = useRef(null);
  const textareaRef = useRef(null);

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

      if (data?.query) {
        setActiveGoal(data.query);
      }
    } catch (e) {
      console.error('Failed to fetch trail:', e);
    }
  }, []);

  /* ── Fetch Graph Data ─────────────────────────────────────────── */
  const fetchGraphData = useCallback(async (sid) => {
    setGraphLoading(true);
    try {
      const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/graph`);

      // Transform backend data into layered graph structure
      const layers = data.layers || {};
      const nodes = [];
      const links = [];

      // Layer 1: Sources (webpages, docs, notes)
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

      // Layer 2: Claims (extracted findings)
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

      // Layer 3: Trails (research path taken)
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

          // Link to previous step
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

      // Layer 4: Blueprints (reused or forming)
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

      // Add links between layers (sources → claims, trails → sources, etc.)
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

  /* ── Fetch Web Usage Quota ────────────────────────────────────── */
  const fetchWebUsage = useCallback(async () => {
    try {
      const { data } = await apiClient.controlPlane.get('/v1/proxy/web/usage');
      setWebUsage(data);
    } catch (e) {
      console.error('Failed to fetch web usage:', e);
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

        // Update graph in real-time during research
        if (showGraphView) {
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

            // Fetch trail and graph on completion
            fetchTrailSteps(sessionId);
            fetchGraphData(sessionId);
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
  }, [sessionId, status, projectId, showGraphView, fetchTrailSteps, fetchGraphData]);

  /* ── Fetch Graph when view is opened ───────────────────────────── */
  useEffect(() => {
    if (showGraphView && sessionId) {
      fetchGraphData(sessionId);
      fetchWebUsage();
    }
  }, [showGraphView, sessionId, fetchGraphData, fetchWebUsage]);

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
        if (rpt.projectId) setProjectId(rpt.projectId);
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
    setError(null);
    setDurationMs(0);
    setConfidence(0);
    setFromCache(false);
    textareaRef.current?.focus();
  }, []);

  /* ── Save source to memory ────────────────────────────────────── */
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

  /* ── Refresh Graph ────────────────────────────────────────────── */
  const handleRefreshGraph = useCallback(() => {
    if (sessionId) {
      setGraphRefreshKey(prev => prev + 1);
      fetchGraphData(sessionId);
    }
  }, [sessionId, fetchGraphData]);

  /* ── Handle Node Click ────────────────────────────────────────── */
  const handleNodeClick = useCallback((node) => {
    if (node.type === 'source' && node.url) {
      setSelectedNode(node);
    } else {
      setSelectedNode(null);
    }
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
  }, [events]);

  /* ── Auto-hide sidebar when research starts ───────────────────── */
  useEffect(() => {
    if (status === 'running') {
      // Emit custom event to close sidebar
      window.dispatchEvent(new CustomEvent('hivemind:close-sidebar'));
    }
    return () => {
      if (status === 'idle') {
        window.dispatchEvent(new CustomEvent('hivemind:open-sidebar'));
      }
    };
  }, [status]);

  /* ─── Render ───────────────────────────────────────────────────── */
  const isResearchActive = status === 'running' || status === 'completed';

  return (
    <div className={`fixed inset-0 overflow-hidden transition-all duration-500 ${isResearchActive ? 'sidebar-hidden' : ''}`} style={{ background: '#faf9f4' }}>
      {/* ── Main Content Area ─────────────────────────────────────── */}
      <div className={`relative h-full flex flex-col transition-all duration-500 ${isResearchActive ? 'items-stretch justify-start pt-8' : 'items-center justify-center'}`}>

        {/* ── Header ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`text-center transition-all duration-500 ${isResearchActive ? 'mb-4 sm:mb-6' : 'mb-8 sm:mb-12'}`}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center">
              <Search size={20} className="sm:w-5 sm:h-5 text-[#117dff]" />
            </div>
          </div>
          <h1 className={`font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-3 transition-all duration-500 ${isResearchActive ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl md:text-5xl'}`}>
            Deep Research
          </h1>
          <p className={`text-[#525252] leading-relaxed transition-all duration-500 ${isResearchActive ? 'text-xs sm:text-sm max-w-lg' : 'text-sm sm:text-base max-w-xl'}`}>
            Ask anything. HIVEMIND searches the web, your memory graph, and synthesizes comprehensive reports.
          </p>
        </motion.div>

        {/* ── Search Input ─────────────────────────────────────────── */}
        {(status === 'idle' || status === 'running' || status === 'completed') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`transition-all duration-500 ${isResearchActive ? 'w-full max-w-5xl px-4' : 'w-full max-w-2xl'}`}
          >
            <div className={`relative bg-white rounded-2xl sm:rounded-3xl border border-[#e3e0db] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-500 ${isResearchActive ? 'mx-0' : 'mx-auto'}`}>
              {/* Top Bar */}
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-[#e3e0db] bg-gradient-to-b from-[#faf9f4] to-white">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-[#dba520]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-[#1aab29]" />
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#faf9f4] border border-[#e3e0db]">
                  <Sparkles size={12} className="text-[#9333ea]" />
                  <span className="text-[10px] text-[#525252] font-medium">Deep Research</span>
                </div>
              </div>

              {/* Input Area */}
              <div className="p-4 sm:p-5">
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What would you like to research?"
                  rows={3}
                  className="w-full bg-transparent text-[#0a0a0a] text-sm sm:text-base placeholder:text-[#a3a3a3] resize-none focus:outline-none leading-relaxed font-mono"
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[4px] bg-[#117dff] text-white text-xs sm:text-sm font-semibold uppercase tracking-[0.075em] hover:bg-[#0066e0] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_2px_8px_rgba(17,125,255,0.2)]"
                  >
                    {status === 'running' ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span className="hidden sm:inline">Running...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Start Research</span>
                        <span className="sm:hidden">Start</span>
                        <ArrowUp size={14} />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── View Toggle (when research active) ─────────────── */}
        {isResearchActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#e3e0db] shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
          >
            <button
              onClick={() => { setShowGraphView(false); setShowProcessPanel(!showProcessPanel); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                showProcessPanel && !showGraphView ? 'bg-[#9333ea]/10 text-[#9333ea]' : 'text-[#525252] hover:bg-[#faf9f4]'
              }`}
            >
              <ListTodo size={14} />
              <span className="hidden sm:inline">Process</span>
            </button>
            <button
              onClick={() => { setShowProcessPanel(false); setShowGraphView(!showGraphView); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                showGraphView ? 'bg-[#117dff]/10 text-[#117dff]' : 'text-[#525252] hover:bg-[#faf9f4]'
              }`}
            >
              <GitBranch size={14} />
              <span className="hidden sm:inline">Graph</span>
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#d97706]/10 border border-[#d97706]/20">
              <Trophy size={12} className="text-[#d97706]" />
              <span className="text-[10px] text-[#d97706] font-medium hidden sm:inline">Blueprint Ready</span>
            </div>
          </motion.div>
        )}

        {/* ── History & New Research ───────────────────────────────── */}
        {sessions.length > 0 && status === 'idle' && (
          <div className="fixed top-4 left-4 z-40">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#e3e0db] text-[#525252] text-xs hover:bg-[#faf9f4] transition-all shadow-sm"
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
                  className="mt-2 bg-white rounded-xl border border-[#e3e0db] p-2 w-72 max-h-80 overflow-y-auto shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
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

        {status === 'completed' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleNewResearch}
            className="fixed top-4 right-4 z-40 flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e3e0db] text-[#525252] text-xs hover:bg-[#faf9f4] transition-all shadow-sm"
          >
            <Sparkles size={12} />
            New Research
          </motion.button>
        )}

        {/* ── Close Button (when running) ──────────────────────────── */}
        {status === 'running' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleNewResearch}
            className="fixed top-4 right-4 z-50 p-2 rounded-xl bg-white border border-[#e3e0db] text-[#525252] hover:bg-[#faf9f4] transition-all shadow-sm"
            title="Close research"
          >
            <X size={16} />
          </motion.button>
        )}

        {/* ── Process Panel ────────────────────────────────────────── */}
        <AnimatePresence>
          {showProcessPanel && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProcessPanel(false)}
                className="absolute inset-0 bg-[#0a0a0a]/20 z-40"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 bottom-0 w-[400px] sm:w-[420px] z-50 bg-[#faf9f4] border-l border-[#e3e0db] overflow-y-auto"
              >
                <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-[#e3e0db] bg-[#faf9f4]/95 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <ListTodo size={16} className="text-[#9333ea]" />
                    <span className="text-sm font-semibold text-[#0a0a0a]">Research Process</span>
                  </div>
                  <button onClick={() => setShowProcessPanel(false)} className="p-1.5 rounded-lg hover:bg-[#e3e0db]/40 text-[#525252]">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Active Goal */}
                  {activeGoal && (
                    <div className="bg-white border border-[#e3e0db] rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Target size={14} className="text-[#117dff]" />
                        <span className="text-[10px] uppercase tracking-wider text-[#525252]/60 font-medium">Active Goal</span>
                      </div>
                      <p className="text-sm text-[#0a0a0a] leading-relaxed">{activeGoal}</p>
                    </div>
                  )}

                  {/* Agent States */}
                  <div className="bg-white border border-[#e3e0db] rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={14} className="text-[#9333ea]" />
                      <span className="text-[10px] uppercase tracking-wider text-[#525252]/60 font-medium">Agent States</span>
                    </div>
                    <div className="space-y-2">
                      {['Explorer', 'Analyst', 'Verifier', 'Synthesizer'].map((agent) => {
                        const state = agentStates[agent] || { status: 'idle' };
                        const color = AGENT_COLORS[agent];
                        return (
                          <div key={agent} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${state.status === 'active' ? 'animate-pulse' : ''}`} style={{ backgroundColor: state.status === 'active' ? color : `${color}40` }} />
                            <span className="text-xs text-[#525252] flex-1">{agent}</span>
                            {state.lastAction && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}12`, color }}>
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
                    <div className="bg-white border border-[#e3e0db] rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <ListTodo size={14} className="text-[#16a34a]" />
                        <span className="text-[10px] uppercase tracking-wider text-[#525252]/60 font-medium">Subgoals</span>
                      </div>
                      <div className="space-y-2">
                        {subgoals.map((goal, i) => (
                          <div key={goal.id || i} className="flex items-start gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${goal.status === 'completed' ? 'bg-[#16a34a]/10 border border-[#16a34a]/30' : 'bg-[#faf9f4] border border-[#e3e0db]'}`}>
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

                  {/* Trail Timeline */}
                  {trailSteps.length > 0 && (
                    <div className="bg-white border border-[#e3e0db] rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <GitBranch size={14} className="text-[#d97706]" />
                        <span className="text-[10px] uppercase tracking-wider text-[#525252]/60 font-medium">Timeline</span>
                      </div>
                      <div className="space-y-2">
                        {trailSteps.slice(0, 20).map((step, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-px h-full bg-[#e3e0db] ml-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {step.action && ACTION_BADGES[step.action] && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: ACTION_BADGES[step.action].bg, color: ACTION_BADGES[step.action].color }}>
                                    {ACTION_BADGES[step.action].label}
                                  </span>
                                )}
                                {step.timestamp && (
                                  <span className="text-[10px] text-[#a3a3a3]">{new Date(step.timestamp).toLocaleTimeString()}</span>
                                )}
                              </div>
                              {step.thought && <p className="text-xs text-[#525252]/70 mt-1">{step.thought}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Graph View ────────────────────────────────────────── */}
        <AnimatePresence>
          {showGraphView && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowGraphView(false)}
                className="absolute inset-0 bg-[#0a0a0a]/20 z-40"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 h-[60vh] bg-white border-t border-[#e3e0db] z-50 overflow-hidden"
              >
                {/* Graph Header */}
                <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-[#e3e0db] bg-[#faf9f4]/95 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <GitBranch size={16} className="text-[#117dff]" />
                      <span className="text-sm font-semibold text-[#0a0a0a]">Research Graph</span>
                    </div>
                    <div className="h-4 w-px bg-[#e3e0db]" />
                    {/* Layer Toggles */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setGraphLayers(prev => ({ ...prev, sources: !prev.sources }))}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all ${
                          graphLayers.sources ? 'bg-[#117dff]/10 text-[#117dff]' : 'text-[#a3a3a3] hover:bg-[#faf9f4]'
                        }`}
                      >
                        <Globe size={10} />
                        Sources
                      </button>
                      <button
                        onClick={() => setGraphLayers(prev => ({ ...prev, claims: !prev.claims }))}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all ${
                          graphLayers.claims ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'text-[#a3a3a3] hover:bg-[#faf9f4]'
                        }`}
                      >
                        <CheckCircle2 size={10} />
                        Claims
                      </button>
                      <button
                        onClick={() => setGraphLayers(prev => ({ ...prev, trails: !prev.trails }))}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all ${
                          graphLayers.trails ? 'bg-[#9333ea]/10 text-[#9333ea]' : 'text-[#a3a3a3] hover:bg-[#faf9f4]'
                        }`}
                      >
                        <Scroll size={10} />
                        Trails
                      </button>
                      <button
                        onClick={() => setGraphLayers(prev => ({ ...prev, blueprints: !prev.blueprints }))}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all ${
                          graphLayers.blueprints ? 'bg-[#d97706]/10 text-[#d97706]' : 'text-[#a3a3a3] hover:bg-[#faf9f4]'
                        }`}
                      >
                        <Award size={10} />
                        Blueprints
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Web Usage Quota */}
                    {webUsage && (
                      <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#faf9f4] border border-[#e3e0db]">
                        <div className="flex items-center gap-1.5">
                          <Search size={10} className="text-[#a3a3a3]" />
                          <span className="text-[10px] text-[#525252]">
                            <span className={quotaTextColor(webUsage.web_search_requests?.used || 0, webUsage.web_search_requests?.limit || 50)}>
                              {webUsage.web_search_requests?.used || 0}
                            </span>
                            /{webUsage.web_search_requests?.limit || 50}
                          </span>
                        </div>
                        <div className="h-3 w-px bg-[#e3e0db]" />
                        <div className="flex items-center gap-1.5">
                          <FileText size={10} className="text-[#a3a3a3]" />
                          <span className="text-[10px] text-[#525252]">
                            <span className={quotaTextColor(webUsage.web_crawl_pages?.used || 0, webUsage.web_crawl_pages?.limit || 100)}>
                              {webUsage.web_crawl_pages?.used || 0}
                            </span>
                            /{webUsage.web_crawl_pages?.limit || 100}
                          </span>
                        </div>
                      </div>
                    )}
                    {graphLoading && (
                      <span className="flex items-center gap-1.5 text-[10px] text-[#525252]">
                        <Loader2 size={12} className="animate-spin" />
                        Loading...
                      </span>
                    )}
                    <button onClick={() => setShowGraphView(false)} className="p-1.5 rounded-lg hover:bg-[#e3e0db]/40 text-[#525252]">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Graph Canvas */}
                <div className="relative h-full bg-gradient-to-b from-[#faf9f4] to-white">
                  {/* Refresh Button */}
                  <button
                    onClick={handleRefreshGraph}
                    className="absolute top-3 right-4 z-10 p-2 rounded-lg bg-white border border-[#e3e0db] text-[#525252] hover:bg-[#faf9f4] hover:text-[#117dff] transition-all shadow-sm"
                    title="Refresh graph"
                  >
                    <RotateCcw size={14} className={graphLoading ? 'animate-spin' : ''} />
                  </button>

                  {sessionId && graphData.nodes.length > 0 ? (
                    <ForceGraph2D
                      key={graphRefreshKey}
                      graphData={graphData}
                      width={window.innerWidth}
                      height={400}
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

                        // Draw node circle
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
                        ctx.fillStyle = node.color;
                        ctx.fill();

                        // Draw runtime badge for source nodes
                        if (node.type === 'source' && node.runtime) {
                          const runtimeBadge = RUNTIME_BADGES[node.runtime] || RUNTIME_BADGES.fetch;
                          ctx.fillStyle = runtimeBadge.color;
                          ctx.beginPath();
                          ctx.arc(node.x + node.val - 2, node.y - node.val + 2, 4, 0, 2 * Math.PI);
                          ctx.fill();
                        }

                        // Draw label
                        ctx.fillStyle = '#0a0a0a';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(label, node.x, node.y - node.val - 2);

                        // Draw type badge
                        if (node.type) {
                          ctx.fillStyle = `${node.color}40`;
                          ctx.fillRect(node.x - 20, node.y + node.val + 4, 40, 14);
                          ctx.fillStyle = node.color;
                          ctx.font = `bold ${8 / globalScale}px Sans-Serif`;
                          ctx.fillText(node.type, node.x, node.y + node.val + 15);
                        }

                        // Draw confidence ring for claims
                        if (node.type === 'claim' && node.confidence != null) {
                          const ringRadius = node.val + 3;
                          const confidence = Math.max(0, Math.min(1, node.confidence));
                          const startAngle = -Math.PI / 2;
                          const endAngle = startAngle + (confidence * 2 * Math.PI);

                          ctx.beginPath();
                          ctx.arc(node.x, node.y, ringRadius, startAngle, endAngle);
                          ctx.strokeStyle = confidence > 0.7 ? '#16a34a' : confidence > 0.4 ? '#d97706' : '#ef4444';
                          ctx.lineWidth = 2;
                          ctx.stroke();
                        }
                      }}
                      linkDirectionalParticles={2}
                      linkDirectionalParticleWidth={2}
                      linkDirectionalParticleSpeed={0.005}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[#525252]">
                      {graphLoading ? (
                        <>
                          <Loader2 size={32} className="animate-spin text-[#117dff] mb-3" />
                          <p className="text-sm">Loading research graph...</p>
                        </>
                      ) : (
                        <>
                          <Layers size={48} className="text-[#e3e0db] mb-3" />
                          <p className="text-sm">
                            {status === 'running'
                              ? 'Research in progress. Graph will appear when complete.'
                              : 'No graph data available. Start a new research session.'}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Graph Legend */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur border border-[#e3e0db] rounded-lg p-3 shadow-lg">
                  <p className="text-[10px] font-semibold text-[#525252] mb-2">Legend</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#117dff]" />
                      <span className="text-[10px] text-[#525252]">Sources (webpages, docs)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#16a34a]" />
                      <span className="text-[10px] text-[#525252]">Claims (findings)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#9333ea]" />
                      <span className="text-[10px] text-[#525252]">Trails (research steps)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#d97706]" />
                      <span className="text-[10px] text-[#525252]">Blueprints (patterns)</span>
                    </div>
                    <div className="h-px bg-[#e3e0db] my-1" />
                    <div className="flex items-center gap-2 pt-1">
                      <div className="w-3 h-3 rounded-full bg-[#0ea5e9]" />
                      <span className="text-[10px] text-[#525252]">Tavily runtime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
                      <span className="text-[10px] text-[#525252]">LightPanda runtime</span>
                    </div>
                  </div>
                </div>

                {/* Node Detail Popup */}
                <AnimatePresence>
                  {selectedNode && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-4 right-4 w-80 bg-white/98 backdrop-blur border border-[#e3e0db] rounded-xl shadow-2xl p-4 z-20"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${selectedNode.color}20` }}
                          >
                            {(() => {
                              const Icon = NODE_ICONS[selectedNode.type] || Globe;
                              return <Icon size={16} style={{ color: selectedNode.color }} />;
                            })()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#0a0a0a] capitalize">{selectedNode.type}</p>
                            {selectedNode.runtime && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {(() => {
                                  const RuntimeIcon = RUNTIME_BADGES[selectedNode.runtime]?.icon || Globe;
                                  return <RuntimeIcon size={10} className="text-[#a3a3a3]" />;
                                })()}
                                <span className="text-[10px] text-[#525252] capitalize">
                                  {RUNTIME_BADGES[selectedNode.runtime]?.label || selectedNode.runtime}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedNode(null)}
                          className="p-1 rounded hover:bg-[#e3e0db]/40 text-[#525252]"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <p className="text-xs text-[#525252]/80 leading-relaxed mb-3 line-clamp-2">
                        {selectedNode.title}
                      </p>

                      {selectedNode.url && (
                        <a
                          href={selectedNode.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] text-[#117dff] hover:text-[#0a6ddb] hover:underline mb-3"
                        >
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
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={12} />
                              Save to Memory
                            </>
                          )}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Running: Live Event Stream ─────────────────────────── */}
        {status === 'running' && events.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mt-6 ${isResearchActive ? 'w-full max-w-4xl px-4' : 'w-full max-w-2xl'}`}
          >
            <div className="bg-white rounded-2xl border border-[#e3e0db] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e3e0db] bg-gradient-to-b from-[#faf9f4] to-white">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-[#dba520]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-[#1aab29]" />
                </div>
                <span className="text-[10px] text-[#525252] font-medium ml-2">Research in Progress</span>
              </div>

              {/* Events */}
              <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                {events.map((event, i) => (
                  <EventCard key={`${event.type}-${i}`} event={event} index={i} />
                ))}
                <div ref={eventsEndRef} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Running: Spinner (no events yet) ───────────────────── */}
        {status === 'running' && events.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 mt-8"
          >
            <Loader2 size={20} className="text-[#117dff] animate-spin" />
            <p className="text-sm text-[#525252]">Starting deep research...</p>
          </motion.div>
        )}

        {/* ── Error State ─────────────────────────────────────────── */}
        {status === 'failed' && error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-[#dc2626]/5 border border-[#dc2626]/20 rounded-2xl px-6 py-4 max-w-md text-center"
          >
            <AlertCircle size={20} className="text-[#dc2626] mx-auto mb-2" />
            <p className="text-sm text-[#dc2626]">{error}</p>
          </motion.div>
        )}

        {/* ── Completed: Report ──────────────────────────────────── */}
        {status === 'completed' && report && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`mt-6 mb-32 ${isResearchActive ? 'w-full max-w-5xl px-4' : 'w-full max-w-3xl'}`}
          >
            <div className="bg-white rounded-2xl border border-[#e3e0db] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e3e0db] bg-gradient-to-b from-[#faf9f4] to-white">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#16a34a] border border-[#158f3a]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] border border-[#d97706]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#117dff] border border-[#0a6ddb]" />
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-[10px] text-[#525252] font-medium">Research Complete</span>
                  {fromCache && (
                    <span className="px-2 py-0.5 rounded-full bg-[#16a34a]/10 border border-[#16a34a]/20 text-[#16a34a] text-[10px] font-medium">
                      Cached
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex items-center gap-4 px-6 py-3 border-b border-[#e3e0db] bg-[#faf9f4]">
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-[#117dff]" />
                  <span className="text-xs text-[#525252] font-mono">{findings.length} findings</span>
                </div>
                <span className="text-[#e3e0db]">&middot;</span>
                <span className="text-xs text-[#525252] font-mono">{(durationMs / 1000).toFixed(1)}s</span>
                <span className="text-[#e3e0db]">&middot;</span>
                <span className="text-xs text-[#525252] font-mono">{(confidence * 100).toFixed(0)}% confidence</span>
              </div>

              {/* Report Content */}
              <div className="p-6">
                <div
                  className="text-[#525252] leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
                />
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
