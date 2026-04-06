import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp, Sparkles, Network, History,
  Loader2, Search, CheckCircle2, BookOpen, Brain,
  Globe, Zap, AlertCircle, ChevronRight,
  GitBranch, Target, ListTodo, Users, FileText, X,
  Layers, Trophy,
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
  const [trailSteps, setTrailSteps] = useState([]);
  const [agentStates, setAgentStates] = useState({});
  const [subgoals, setSubgoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState('');

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

            // Fetch trail on completion
            fetchTrailSteps(sessionId);
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
  }, [sessionId, status, projectId, fetchTrailSteps]);

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
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#faf9f4', left: '260px', top: '0', right: '0', bottom: '0' }}>
      {/* ── Main Content Area ─────────────────────────────────────── */}
      <div className="relative h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">

        {/* ── Header ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center">
              <Search size={20} className="sm:w-5 sm:h-5 text-[#117dff]" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-3">
            Deep Research
          </h1>
          <p className="text-sm sm:text-base text-[#525252] max-w-xl mx-auto leading-relaxed">
            Ask anything. HIVEMIND searches the web, your memory graph, and synthesizes comprehensive reports.
          </p>
        </motion.div>

        {/* ── Search Input ─────────────────────────────────────────── */}
        {(status === 'idle' || status === 'running' || status === 'completed') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-2xl"
          >
            <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-[#e3e0db] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
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

        {/* ── Graph View Toggle (when research active) ─────────────── */}
        {(status === 'running' || status === 'completed') && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#e3e0db] shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          >
            <button
              onClick={() => setShowProcessPanel(!showProcessPanel)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                showProcessPanel ? 'bg-[#9333ea]/10 text-[#9333ea]' : 'text-[#525252] hover:bg-[#faf9f4]'
              }`}
            >
              <ListTodo size={14} />
              <span className="hidden sm:inline">Process</span>
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#d97706]/10 border border-[#d97706]/20">
              <Trophy size={12} className="text-[#d97706]" />
              <span className="text-[10px] text-[#d97706] font-medium hidden sm:inline">Blueprint Ready</span>
            </div>
          </motion.div>
        )}

        {/* ── History & New Research ───────────────────────────────── */}
        {sessions.length > 0 && status === 'idle' && (
          <div className="absolute top-4 left-4 z-30">
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
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e3e0db] text-[#525252] text-xs hover:bg-[#faf9f4] transition-all shadow-sm"
          >
            <Sparkles size={12} />
            New Research
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

        {/* ── Running: Live Event Stream ─────────────────────────── */}
        {status === 'running' && events.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-2xl mt-6"
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
              <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
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
            className="w-full max-w-3xl mt-6 mb-32"
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
