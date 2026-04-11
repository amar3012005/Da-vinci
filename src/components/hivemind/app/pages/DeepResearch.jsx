/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp, Sparkles, History,
  Loader2, Search, CheckCircle2, BookOpen, Brain,
  Globe, Zap, AlertCircle,
  GitBranch, Target, ListTodo, Users, X,
  Layers, Scroll, Award, Eye, Activity,
  Server, FileText, Save, RotateCcw,
  ChevronUp, ChevronDown, PanelTop,
  ExternalLink, RefreshCw,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import DeepResearchGraph2D from './DeepResearchGraph2D';

/* ─── Cartesia Light Theme Constants ───────────────────────────────── */
const ACTION_BADGES = {
  SEARCH_WEB:    { label: 'Web Search',    color: '#117dff', bg: 'rgba(17,125,255,0.12)' },
  SEARCH_MEMORY: { label: 'Memory Search', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  READ_URL:      { label: 'Reading',       color: '#9333ea', bg: 'rgba(147,51,234,0.12)' },
  SYNTHESIZE:    { label: 'Synthesize',    color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  FINISH:        { label: 'Finish',        color: '#059669', bg: 'rgba(5,150,105,0.12)' },
};

const AGENT_COLORS = {
  Faraday: '#117dff',
  Feynmann: '#9333ea',
  Turing: '#16a34a',
  Synthesis: '#d97706',
  Explorer: '#117dff',
  Analyst: '#9333ea',
  Verifier: '#16a34a',
  Synthesizer: '#d97706',
};

const AGENT_DISPLAY_ALIASES = {
  faraday: 'Faraday',
  explorer: 'Faraday',
  feynmann: 'Feynmann',
  analyst: 'Feynmann',
  turing: 'Turing',
  verifier: 'Turing',
  synthesis: 'Synthesis',
  synthesizer: 'Synthesis',
};

function normalizeAgentDisplay(agent) {
  if (!agent) return '';
  const key = String(agent).toLowerCase();
  return AGENT_DISPLAY_ALIASES[key] || agent;
}

function normalizeAgentStateMap(states = {}) {
  const normalized = {};
  Object.entries(states || {}).forEach(([agent, state]) => {
    const display = normalizeAgentDisplay(agent);
    normalized[display.toLowerCase()] = state;
  });
  return normalized;
}

const RUNTIME_BADGES = {
  tavily: { label: 'Tavily', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', icon: Server },
  lightpanda: { label: 'LightPanda', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: Zap },
  fetch: { label: 'Fetch', color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: Globe },
};

const NODE_ICONS = {
  source: Globe,
  claim: CheckCircle2,
  'structured-claim': CheckCircle2,
  'plain-claim': CheckCircle2,
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
        const agentColor = AGENT_COLORS[normalizeAgentDisplay(event.agent)] || '#a3a3a3';
        return (
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Brain size={14} style={{ color: agentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: badge.color, background: badge.bg }}
                >
                  {badge.label}
                </span>
                {event.agent && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {event.agent}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#525252]/70 leading-relaxed">{event.thought || event.message}</p>
            </div>
          </div>
        );
      }
      case 'research.started':
        return (
          <div className="flex items-center gap-3">
            <Sparkles size={14} className="text-[#117dff]" />
            <span className="text-xs text-[#117dff] font-medium">Research started: {event.query}</span>
          </div>
        );
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
            <span className="text-xs text-[#525252]/70"><span className="text-[#16a34a] font-medium">{event.count}</span> results found {event.via && `via ${event.via}`}</span>
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
            <span className="text-xs text-[#525252]/70">Read <span className="text-[#9333ea] font-medium">{event.length?.toLocaleString()}</span> chars {event.via && `via ${event.via}`}</span>
          </div>
        );
      case 'web.error':
        return (
          <div className="flex items-center gap-3">
            <AlertCircle size={14} className="text-[#dc2626]" />
            <span className="text-xs text-[#dc2626]">Search error: {event.error}</span>
          </div>
        );
      case 'follow_up':
        return (
          <div className="flex items-center gap-3">
            <GitBranch size={14} className="text-[#d97706]" />
            <span className="text-xs text-[#525252]/70">{event.title}</span>
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
      case 'task.started':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-[#117dff] animate-spin" />
            <span className="text-xs text-[#525252]/70">Task started: {event.taskId}</span>
          </div>
        );
      case 'task.failed':
        return (
          <div className="flex items-center gap-3">
            <AlertCircle size={14} className="text-[#dc2626]" />
            <span className="text-xs text-[#dc2626]">Task failed: {event.error}</span>
          </div>
        );
      case 'task.observation': {
        const agentColor = AGENT_COLORS[normalizeAgentDisplay(event.agent)] || '#9333ea';
        return (
          <div className="flex items-center gap-3">
            <Target size={14} style={{ color: agentColor }} />
            <span className="text-xs text-[#525252]/70">
              {event.agent && <span className="font-medium" style={{ color: agentColor }}>{event.agent}:</span>} {event.title}
            </span>
          </div>
        );
      }
      case 'agent.state': {
        const agentColor = AGENT_COLORS[normalizeAgentDisplay(event.agent)] || '#a3a3a3';
        const stateIcon = event.state === 'active' ? <Loader2 size={14} className="animate-spin" /> :
                         event.state === 'completed' ? <CheckCircle2 size={14} /> :
                         <Globe size={14} />;
        return (
          <div className="flex items-center gap-3">
            <span style={{ color: agentColor }}>{stateIcon}</span>
            <span className="text-xs text-[#525252]/70">
              <span className="font-medium" style={{ color: agentColor }}>{event.agent}</span>
              <span className="text-gray-400 mx-1">→</span>
              <span className={event.state === 'active' ? 'text-[#117dff]' : event.state === 'completed' ? 'text-[#16a34a]' : ''}>
                {event.state}
              </span>
              {event.detail && <span className="text-gray-400 ml-1">({event.detail})</span>}
            </span>
          </div>
        );
      }
      case 'agent.states': {
        const states = event.states || {};
        return (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Agent Status</span>
            <div className="flex items-center gap-3">
              {Object.entries(states).map(([agent, state]) => {
                const color = AGENT_COLORS[normalizeAgentDisplay(agent)] || '#a3a3a3';
                return (
                  <div key={agent} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, opacity: state === 'active' ? 1 : state === 'completed' ? 0.8 : 0.3 }} />
                    <span className="text-[10px]" style={{ color }}>{agent}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      case 'verifier.contradiction':
        return (
          <div className="flex items-center gap-3 bg-red-50 p-2 rounded-lg border border-red-100">
            <AlertCircle size={14} className="text-red-500" />
            <span className="text-xs text-red-600 font-medium">
              Contradiction detected: {event.count} conflicting {event.count === 1 ? 'claim' : 'claims'}
            </span>
          </div>
        );
      case 'verifier.contradiction_resolved':
        return (
          <div className="flex items-center gap-3 bg-green-50 p-2 rounded-lg border border-green-100">
            <CheckCircle2 size={14} className="text-green-600" />
            <span className="text-xs text-green-700 font-medium">
              Contradiction resolved: supports Claim {event.supports} ({(event.confidence * 100).toFixed(0)}% confidence)
            </span>
          </div>
        );
      case 'verifier.contradictions_summary':
        return (
          <div className="flex items-center gap-3">
            <Activity size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#525252]/70">
              Contradictions: {event.resolved} resolved, {event.unresolved} unresolved of {event.total}
            </span>
          </div>
        );
      case 'research.decomposed':
        return (
          <div className="flex items-center gap-3">
            <GitBranch size={14} className="text-[#d97706]" />
            <span className="text-xs text-[#525252]/70">Decomposed into {event.taskCount || event.dimensions?.length || 'multiple'} tasks</span>
          </div>
        );
      case 'research.wave_started':
        return (
          <div className="flex items-center gap-3">
            <Layers size={14} className="text-[#117dff]" />
            <span className="text-xs text-[#525252]/70">
              Wave {event.wave}: Running {event.taskCount} dimensions in parallel
            </span>
          </div>
        );
      case 'research.wave_completed':
        return (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#16a34a]">
              Wave {event.wave} complete — {event.findingCount} findings ({(event.confidence * 100).toFixed(0)}% confidence)
            </span>
          </div>
        );
      case 'research.depth_decision':
        return (
          <div className="flex items-center gap-3">
            <Activity size={14} className={event.decision === 'high_confidence_early_stop' ? 'text-[#16a34a]' : 'text-[#d97706]'} />
            <span className="text-xs text-[#525252]/70">
              {event.decision === 'high_confidence_early_stop'
                ? `High confidence (${(event.avgConfidence * 100).toFixed(0)}%) — skipping to synthesis`
                : `Low confidence (${(event.avgConfidence * 100).toFixed(0)}%) — extending search depth to ${event.newMaxDepth}`}
            </span>
          </div>
        );
      case 'research.skipping_waves':
        return (
          <div className="flex items-center gap-3">
            <Zap size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#16a34a]">Confidence sufficient — fast-tracking to gap analysis</span>
          </div>
        );
      case 'research.reflecting':
        return (
          <div className="flex items-center gap-3">
            <Brain size={14} className="text-[#9333ea] animate-pulse" />
            <span className="text-xs text-[#525252]/70">Reflecting (round {event.round}, {(event.confidence * 100).toFixed(0)}%)</span>
          </div>
        );
      case 'research.cached':
        return (
          <div className="flex items-center gap-3">
            <History size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#16a34a]">Using {event.findingCount} cached findings</span>
          </div>
        );
      case 'memory.cache_hit':
        return (
          <div className="flex items-center gap-3 bg-[#9333ea]/5 p-2 rounded-lg border border-[#9333ea]/20">
            <Brain size={14} className="text-[#9333ea]" />
            <span className="text-xs text-[#9333ea] font-medium">
              Memory hit: {event.title?.slice(0, 60)} ({((event.confidence || 0) * 100).toFixed(0)}%)
            </span>
          </div>
        );
      case 'research.blueprint_suggested':
        return (
          <div className="flex items-center gap-3">
            <Award size={14} className="text-[#d97706]" />
            <span className="text-xs text-[#d97706]">Blueprint suggested: {event.blueprintId || event.name}</span>
          </div>
        );
      case 'research.blueprints_mined':
        return (
          <div className="flex items-center gap-3">
            <Layers size={14} className="text-[#9333ea]" />
            <span className="text-xs text-[#9333ea]">Mined {event.count || event.blueprintCount} new blueprints</span>
          </div>
        );
      case 'research.claims_promoted':
        return (
          <div className="flex items-center gap-2 text-[10px] text-[#f43f5e]">
            <span>◈</span>
            <span>{event.count} claim{event.count !== 1 ? 's' : ''} promoted to knowledge graph</span>
          </div>
        );
      case 'research.blueprint_recall_started':
        return (
          <div className="flex items-center gap-2 text-[10px] text-[#f43f5e]">
            <span>◈</span>
            <span>Recalling prior knowledge from {event.blueprintId ? 'blueprint' : 'knowledge graph'}...</span>
          </div>
        );
      case 'web.read_error':
        return (
          <div className="flex items-center gap-3">
            <AlertCircle size={14} className="text-orange-500" />
            <span className="text-xs text-orange-500">Read error: {event.error}</span>
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
  const [fromBlueprint, setFromBlueprint] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [projectId, setProjectId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [error, setError] = useState(null);
  
  // Sliding panel state
  const [showPanel, setShowPanel] = useState(false);
  const [panelTab, setPanelTab] = useState('status'); // 'status' | 'report' | 'graph'
  const [panelWidth, setPanelWidth] = useState(420); // Custom width in px (resize handle on left)
  const [isResizing, setIsResizing] = useState(false);
  const [detachedWindow, setDetachedWindow] = useState(null);
  const panelRef = useRef(null);

  // Graph state
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [graphLayers, setGraphLayers] = useState({
    sources: true,
    claims: true,
    trails: true,
    observations: true,      // NEW: Real-time observations
    executionEvents: true,   // NEW: Execution events
    promoted: true,
    blueprints: true,
  });
  const [csiNodes, setCsiNodes] = useState([]); // CSI analysis nodes
  const [csiVerdicts, setCsiVerdicts] = useState([]); // CSI verdict nodes
  const [csiLayers, setCsiLayers] = useState({
    nodes: true,
    verdicts: true,
  });
  const [graphLoading, setGraphLoading] = useState(false);
  const [webUsage, setWebUsage] = useState(null);
  const [savingMemories, setSavingMemories] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [graphRefreshKey, setGraphRefreshKey] = useState(0);

  // Detached graph window state
  const [isGraphDetached, setIsGraphDetached] = useState(false);
  const [showGraphWindow, setShowGraphWindow] = useState(false); // Toggle for showing graph window
  const [detachedGraphPos, setDetachedGraphPos] = useState({ x: 100, y: 100, width: 600, height: 500 });
  const [isDraggingGraph, setIsDraggingGraph] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizingGraph, setIsResizingGraph] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const graphWindowRef = useRef(null);

  // Process panel state
  // eslint-disable-next-line no-unused-vars
  const [trailSteps, setTrailSteps] = useState([]);
  const [trailDiagnostics, setTrailDiagnostics] = useState(null);
  const [reportProvenance, setReportProvenance] = useState(null);
  const [goldenLine, setGoldenLine] = useState('');
  const [agentStates, setAgentStates] = useState({});
  const [subgoals, setSubgoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState('');

  const eventsEndRef = useRef(null);
  const textareaRef = useRef(null);
  const panelContentRef = useRef(null);
  const latestEvents = events.slice(0, 6);
  const retainedMemoryCount = reportProvenance?.recalledMemoryIds?.length || 0;
  const reportInfluencedByRetention = retainedMemoryCount > 0 || (trailDiagnostics?.source_path || '').includes('trail_store_memories');

  /* ── URL Persistence: Update URL when sessionId changes ─────────────────── */
  useEffect(() => {
    if (!sessionId) return;
    const url = new URL(window.location);
    url.searchParams.set('session', sessionId);
    window.history.replaceState({}, '', url);
  }, [sessionId]);

  /* ── Auto-load session if coming from URL on mount ─────────────────────────────── */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('session');
    if (urlSessionId) {
      console.log('[DeepResearch] Auto-loading session from URL:', urlSessionId);
      setShowPanel(true);
      loadSession(urlSessionId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch Trail Steps ─────────────────────────────────────────── */
  const fetchTrailSteps = useCallback(async (sid) => {
    try {
      const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/trail`);
      setTrailSteps(Array.isArray(data) ? data : data?.trail || []);
      setTrailDiagnostics(data?.trail_diagnostics || data?.diagnostics || null);
      setReportProvenance(data?.reportProvenance || data?.trail?.reportProvenance || data?.result?.reportProvenance || null);
      setGoldenLine(data?.goldenLine || data?.trail?.goldenLine || data?.result?.goldenLine || '');
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
          const isStructured = claim.type === 'structured-claim' || claim.structured;
          nodes.push({
            id: `claim-${claim.id || idx}`,
            type: isStructured ? 'structured-claim' : 'plain-claim',
            title: claim.content?.slice(0, 80) || 'Finding',
            confidence: claim.confidence,
            val: isStructured ? 12 : 8,
            color: isStructured ? '#16a34a' : '#86efac',
            sourceId: claim.source,
            // NEW: Structured claim details for popup
            structured: claim.structured,
            source: claim.source,
          });
          // Link structured claims to their sources
          if (isStructured && claim.structured?.sourceIds?.length > 0) {
            claim.structured.sourceIds.forEach(sourceId => {
              links.push({
                source: `claim-${claim.id || idx}`,
                target: `source-${sourceId}`,
                type: 'derived_from',
                color: '#16a34a40',
              });
            });
          }
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

      if (graphLayers.promoted && layers.promoted) {
        layers.promoted.forEach((mem, idx) => {
          nodes.push({
            id: `promoted-${mem.id || idx}`,
            type: 'promoted-memory',
            title: mem.title || 'Promoted memory',
            content: mem.content,
            confidence: mem.confidence,
            val: 11,
            color: '#0f766e',
            reportId: mem.reportId || null,
            goldenLine: mem.goldenLine || null,
          });
          (mem.claimIds || []).forEach((claimId) => {
            links.push({
              source: `promoted-${mem.id || idx}`,
              target: `claim-${claimId}`,
              type: 'uses',
              color: '#0f766e40',
            });
          });
          (mem.sourceIds || []).forEach((sourceId) => {
            links.push({
              source: `promoted-${mem.id || idx}`,
              target: `source-${sourceId}`,
              type: 'uses',
              color: '#0f766e40',
            });
          });
        });
      }

      // NEW: Observations layer (real-time findings from agent actions)
      if (graphLayers.observations && layers.observations) {
        layers.observations.forEach((obs, idx) => {
          const obsAgent = String(obs.agent || '').toLowerCase();
          const normalizedObsAgent = obsAgent === 'explorer' ? 'faraday' : obsAgent === 'analyst' ? 'feynmann' : obsAgent === 'verifier' ? 'turing' : obsAgent;
          nodes.push({
            id: `obs-${obs.id || idx}`,
            type: 'observation',
            title: `${obs.agent}/${obs.action}: ${obs.title?.slice(0, 40) || 'Observation'}`,
            agent: obs.agent,
            action: obs.action,
            findingType: obs.findingType,
            source: obs.source,
            sourceId: obs.sourceId,
            confidence: obs.confidence,
            val: 7,
            color: normalizedObsAgent === 'faraday' ? '#3b82f6' : normalizedObsAgent === 'feynmann' ? '#10b981' : normalizedObsAgent === 'turing' ? '#f59e0b' : '#8b5cf6',
            createdAt: obs.createdAt,
            isLive: Date.now() - new Date(obs.createdAt).getTime() < 5000, // Mark as live if < 5 seconds old
          });
        });
      }

      // NEW: Execution Events layer (agent phase completions)
      if (graphLayers.executionEvents && layers.executionEvents) {
        layers.executionEvents.forEach((exec, idx) => {
          nodes.push({
            id: `exec-${exec.id || idx}`,
            type: 'execution-event',
            title: `${exec.agent}/${exec.action}`,
            agent: exec.agent,
            action: exec.action,
            success: exec.success,
            val: 5,
            color: exec.success ? '#059669' : '#dc2626',
            createdAt: exec.createdAt,
            isLive: Date.now() - new Date(exec.createdAt).getTime() < 5000,
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

  /* ── Detached Graph Window Handlers ─────────────────────────── */
  const handleDetachGraph = useCallback(() => {
    setIsGraphDetached(true);
    setShowGraphWindow(true);
    setPanelTab('status');
  }, []);

  const handleToggleGraphWindow = useCallback(() => {
    setShowGraphWindow((prev) => {
      const next = !prev;
      setIsGraphDetached(next);
      if (next) {
        setPanelTab('status');
      }
      return next;
    });
  }, []);

  const handleCloseGraphWindow = useCallback(() => {
    setShowGraphWindow(false);
    setIsGraphDetached(false);
  }, []);

  const handleGraphDragStart = useCallback((e) => {
    if (e.target.closest('[data-no-drag]')) return; // Don't drag when clicking buttons
    setIsDraggingGraph(true);
    setDragOffset({
      x: e.clientX - detachedGraphPos.x,
      y: e.clientY - detachedGraphPos.y,
    });
  }, [detachedGraphPos]);

  const handleGraphDrag = useCallback((e) => {
    if (!isDraggingGraph) return;
    setDetachedGraphPos(prev => {
      const nextX = e.clientX - dragOffset.x;
      const nextY = e.clientY - dragOffset.y;
      const maxX = Math.max(0, window.innerWidth - prev.width);
      const maxY = Math.max(0, window.innerHeight - prev.height);
      return {
        ...prev,
        x: Math.min(Math.max(0, nextX), maxX),
        y: Math.min(Math.max(0, nextY), maxY),
      };
    });
  }, [isDraggingGraph, dragOffset]);

  const handleGraphDragEnd = useCallback(() => {
    setIsDraggingGraph(false);
  }, []);

  const handleResizeStart = useCallback((e, handle) => {
    e.stopPropagation();
    setIsResizingGraph(true);
    setResizeHandle(handle);
  }, []);

  const handleGraphResize = useCallback((e) => {
    if (!isResizingGraph || !resizeHandle) return;
    setDetachedGraphPos(prev => {
      const newPos = { ...prev };
      if (resizeHandle.includes('right')) {
        newPos.width = Math.max(400, e.clientX - prev.x);
      }
      if (resizeHandle.includes('bottom')) {
        newPos.height = Math.max(300, e.clientY - prev.y);
      }
      if (resizeHandle.includes('left')) {
        const newRight = e.clientX;
        if (newRight < prev.x + prev.width - 100) {
          newPos.width = prev.width - (newRight - prev.x);
          newPos.x = newRight;
        }
      }
      if (resizeHandle.includes('top')) {
        const newBottom = e.clientY;
        if (newBottom < prev.y + prev.height - 100) {
          newPos.height = prev.height - (newBottom - prev.y);
          newPos.y = newBottom;
        }
      }
      return newPos;
    });
  }, [isResizingGraph, resizeHandle]);

  const handleResizeEnd = useCallback(() => {
    setIsResizingGraph(false);
    setResizeHandle(null);
  }, []);

  // Global mouse move/up for drag and resize
  useEffect(() => {
    if (isDraggingGraph || isResizingGraph) {
      window.addEventListener('mousemove', isResizingGraph ? handleGraphResize : handleGraphDrag);
      window.addEventListener('mouseup', isResizingGraph ? handleResizeEnd : handleGraphDragEnd);
      return () => {
        window.removeEventListener('mousemove', isResizingGraph ? handleGraphResize : handleGraphDrag);
        window.removeEventListener('mouseup', isResizingGraph ? handleResizeEnd : handleGraphDragEnd);
      };
    }
  }, [isDraggingGraph, isResizingGraph, handleGraphDrag, handleGraphResize, handleGraphDragEnd, handleResizeEnd]);

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

  /* ── SSE stream for real-time events ─────────────────────────── */
  useEffect(() => {
    if (!sessionId || status !== 'running') return;

    const baseUrl = apiClient.controlPlane.defaults?.baseURL || '';
    const streamUrl = `${baseUrl}/v1/proxy/research/${sessionId}/stream`;
    console.log('[DeepResearch] Connecting to SSE stream:', streamUrl, 'sessionId:', sessionId, 'status:', status);
    console.log('[DeepResearch] API Client baseURL:', apiClient.controlPlane.defaults?.baseURL);

    let source;
    try {
      source = new EventSource(streamUrl);
    } catch (e) {
      console.warn("[DeepResearch] EventSource creation failed:", e);
      return;
    }

    source.onopen = () => {
      console.log('[DeepResearch] ✓ SSE stream connected for session:', sessionId);
    };

    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        console.log('[DeepResearch] Received SSE event:', event.type);
        setEvents(prev => [...prev, event]);

        if (event.type === 'agent.states' && event.states) {
          setAgentStates(prev => ({ ...prev, [event.taskId]: normalizeAgentStateMap(event.states) }));
        } else if (event.type === 'agent.state') {
          const agentKey = normalizeAgentDisplay(event.agent || event.agent_id || '').toLowerCase();
          setAgentStates(prev => ({
            ...prev,
            [event.taskId]: { ...(prev[event.taskId] || {}), [agentKey]: event.state }
          }));
        }

        if (event.type === 'task.started' && event.dimension) {
          setSubgoals(prev => {
            const exists = prev.find(g => g.id === event.taskId);
            if (exists) return prev;
            return [...prev, { id: event.taskId, query: event.query, dimension: event.dimension, status: 'running' }];
          });
        }
        if (event.type === 'task.completed') {
          setSubgoals(prev => prev.map(g => g.id === event.taskId ? { ...g, status: 'completed', confidence: event.confidence } : g));
        }

        // CSI verdict events - add to graph
        if (event.type === 'csi.verdict') {
          setCsiVerdicts(prev => [...prev, {
            id: `csi-verdict-${event.claimId}-${event.verdict}`,
            type: 'csi-verdict',
            title: `${event.verdict.toUpperCase()}: ${event.reason?.slice(0, 40) || ''}`,
            verdict: event.verdict,
            confidence: event.confidence,
            claimId: event.claimId,
            agent: event.agent,
            createdAt: new Date().toISOString(),
          }]);
          setEvents(prev => [...prev, event]);
        }

        // CSI analysis events
        if (event.type === 'csi.analysis') {
          setCsiNodes(prev => [...prev, {
            id: `csi-node-${event.analysisId}`,
            type: 'csi-node',
            title: `${event.agent}: ${event.finding?.slice(0, 40) || ''}`,
            agent: event.agent,
            finding: event.finding,
            confidence: event.confidence,
            createdAt: new Date().toISOString(),
          }]);
        }

        if (showPanel && (event.type?.startsWith('task.completed') || event.type?.startsWith('csi.'))) {
          fetchGraphData(sessionId);
        }
      } catch (err) {
        console.error('[SSE] Failed to parse event:', err);
      }
    };

    source.addEventListener('done', async (e) => {
      const data = JSON.parse(e.data);
      source.close();

      if (data.status === 'completed') {
        setStatus('completed');
        try {
          const { data: rpt } = await apiClient.controlPlane.get(`/v1/proxy/research/${sessionId}/report`);
          setReport(rpt.report);
          setFindings(rpt.findings || []);
          setDurationMs(rpt.durationMs || 0);
          setConfidence(rpt.confidence ?? rpt.taskProgress?.overallConfidence ?? 0);
          setFromCache(!!rpt.fromCache);
          if (rpt.projectId) setProjectId(rpt.projectId);
          fetchTrailSteps(sessionId);
          fetchGraphData(sessionId);
        } catch (err) {
          console.error('Failed to fetch report:', err);
        }
      } else if (data.status === 'failed') {
        setStatus('failed');
        setError(data.error || 'Research failed');
      }
    });

    source.onerror = (err) => {
      console.error('[DeepResearch] ✗ SSE error, falling back to polling:', err);
      source.close();
      // Fall back to polling if SSE fails
      const fallbackInterval = setInterval(async () => {
        try {
          console.log('[DeepResearch] [Fallback polling] Fetching status for session:', sessionId);
          const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sessionId}/status`, {
            timeout: 30000, // 30s timeout for status checks
          });
          console.log('[DeepResearch] [Fallback polling] Got', data.events?.length || 0, 'events, status:', data.status);
          setEvents(data.events || []);
          const agentStateEvents = (data.events || []).filter(e => e.type === 'agent.state' || e.type === 'agent.states');
          agentStateEvents.forEach(event => {
            if (event.type === 'agent.states' && event.states) {
              setAgentStates(prev => ({ ...prev, [event.taskId]: normalizeAgentStateMap(event.states) }));
            } else if (event.type === 'agent.state') {
              const agentKey = normalizeAgentDisplay(event.agent || event.agent_id || '').toLowerCase();
              setAgentStates(prev => ({
                ...prev,
                [event.taskId]: { ...(prev[event.taskId] || {}), [agentKey]: event.state }
              }));
            }
          });
          if (showPanel) fetchGraphData(sessionId);
          if (data.status === 'completed') {
            setStatus('completed');
            clearInterval(fallbackInterval);
            try {
              const { data: rpt } = await apiClient.controlPlane.get(`/v1/proxy/research/${sessionId}/report`);
              setReport(rpt.report);
              setFindings(rpt.findings || []);
              setDurationMs(rpt.durationMs || 0);
              setConfidence(rpt.confidence ?? rpt.taskProgress?.overallConfidence ?? 0);
              setFromCache(!!rpt.fromCache);
              if (rpt.projectId) setProjectId(rpt.projectId);
              fetchTrailSteps(sessionId);
              fetchGraphData(sessionId);
            } catch (e) { console.error('Failed to fetch report:', e); }
          } else if (data.status === 'failed') {
            setStatus('failed');
            setError(data.error || 'Research failed');
            clearInterval(fallbackInterval);
          }
        } catch (e) { console.error('[DeepResearch] [Fallback polling] Error:', e.message); }
      }, 3000); // Poll every 3 seconds (reduced from 2s to ease backend load)
      // Store cleanup ref
      source._fallbackInterval = fallbackInterval;
    };

    return () => {
      source.close();
      if (source._fallbackInterval) clearInterval(source._fallbackInterval);
    };
  }, [sessionId, status, showPanel, fetchTrailSteps, fetchGraphData]);

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
      SEARCH_WEB: 'Faraday',
      SEARCH_MEMORY: 'Feynmann',
      READ_URL: 'Faraday',
      SYNTHESIZE: 'Synthesis',
      FINISH: 'Synthesis',
    };
    events.forEach((event) => {
      if (event.type === 'task.reasoning' && event.action) {
        const agent = actionToAgent[event.action] || 'Turing';
        newAgentStates[agent] = {
          status: 'active',
          lastAction: event.action,
          thought: event.thought,
        };
      }
    });
    ['Faraday', 'Feynmann', 'Turing', 'Synthesis'].forEach((agent) => {
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

  const handleSaveAsBlueprint = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { data } = await apiClient.controlPlane.post(`/v1/proxy/research/${sessionId}/save-as-blueprint`, {
        name: `Research: ${query?.slice(0, 40) || 'Deep Research'}`,
      });
      alert(data.message || 'Research saved as reusable blueprint');
      console.log('[DeepResearch] Saved as blueprint:', data.blueprint);
    } catch (e) {
      console.error('Failed to save as blueprint:', e);
      alert('Failed to save as blueprint: ' + (e.response?.data?.error || e.message));
    }
  }, [sessionId, query]);

  const handlePromoteResearchToMemory = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { data } = await apiClient.controlPlane.post(`/v1/proxy/research/${sessionId}/promote-memory`, {});
      alert(`Promoted ${data.promotedCount || 0} claims into durable memory`);
    } catch (e) {
      console.error('Failed to promote research to memory:', e);
      alert('Failed to promote memory: ' + (e.response?.data?.error || e.message));
    }
  }, [sessionId]);

  // Resume: synthesize final report from blueprint recall (no new web search)
  const handleSynthesizeFromBlueprint = useCallback(async (blueprintId) => {
    if (!sessionId) return;
    setIsSynthesizing(true);
    setPanelTab('report');
    try {
      const { data } = await apiClient.controlPlane.post(
        `/v1/proxy/research/${sessionId}/synthesize-from-blueprint`,
        blueprintId ? { blueprintId } : {}
      );
      setReport(data.report);
      setFindings(data.findings || []);
      setFromBlueprint(true);
      setFromCache(false);
      console.log('[DeepResearch] Synthesized from blueprint:', data.findingCount, 'findings,', data.sourceCount, 'sources');
    } catch (e) {
      console.error('Failed to synthesize from blueprint:', e);
      alert('Failed to synthesize from blueprint: ' + (e.response?.data?.error || e.message));
    } finally {
      setIsSynthesizing(false);
    }
  }, [sessionId]);

  const handleRerunFromBlueprint = useCallback(async (blueprintOrId, baseQuery) => {
    try {
      const blueprintId = typeof blueprintOrId === 'string'
        ? blueprintOrId
        : blueprintOrId?.blueprintId || blueprintOrId?.id?.replace('blueprint-', '');
      const nextBaseQuery = baseQuery || query;
      if (!blueprintId) {
        throw new Error('Blueprint id is required');
      }
      const { data } = await apiClient.controlPlane.post(`/v1/proxy/research/blueprint/${blueprintId}/rerun`, {
        baseQuery: nextBaseQuery,
      });
      setSessionId(data.session_id);
      setStatus('running');
      setEvents([]);
      setReport(null);
      console.log('[DeepResearch] Rerun from blueprint:', data);
    } catch (e) {
      console.error('Failed to rerun from blueprint:', e);
      alert('Failed to rerun from blueprint: ' + (e.response?.data?.error || e.message));
    }
  }, [query]);

  const handleNodeClick = useCallback((node) => {
    if (node.type === 'source' && node.url) {
      setSelectedNode(node);
    } else if (node.type === 'blueprint') {
      // Blueprint clicked - offer to use as base
      const useAsBase = window.confirm(`Use "${node.title}" as a base for new research?`);
      if (useAsBase && node.id) {
        handleRerunFromBlueprint(node.id.replace('blueprint-', ''), node.title);
      } else {
        setSelectedNode(null);
      }
    } else if (node.type === 'structured-claim' || node.type === 'plain-claim') {
      // Claim clicked - show details
      setSelectedNode(node);
    } else {
      setSelectedNode(null);
    }
  }, [handleRerunFromBlueprint]);

  const handlePanelResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handlePanelResizeMove = useCallback((e) => {
    if (!isResizing) return;
    const newWidth = Math.max(300, Math.min(window.innerWidth - 100, window.innerWidth - e.clientX));
    setPanelWidth(newWidth);
  }, [isResizing]);

  const handlePanelResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    document.addEventListener('mousemove', handlePanelResizeMove);
    document.addEventListener('mouseup', handlePanelResizeEnd);
    return () => {
      document.removeEventListener('mousemove', handlePanelResizeMove);
      document.removeEventListener('mouseup', handlePanelResizeEnd);
    };
  }, [isResizing, handlePanelResizeMove, handlePanelResizeEnd]);

  const handleDetachPanel = useCallback(() => {
    const width = 700;
    const height = 800;
    const left = window.screenX + window.outerWidth - width - 20;
    const top = window.screenY + 50;

    const detached = window.open(
      '',
      'DeepResearchPanel',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no`
    );

    if (detached) {
      detached.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Deep Research - ${panelTab.charAt(0).toUpperCase() + panelTab.slice(1)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #faf9f4;
              color: #0a0a0a;
            }
            .container { height: 100vh; display: flex; flex-direction: column; }
            .header {
              padding: 12px 16px;
              border-bottom: 1px solid #e3e0db;
              background: #faf9f4;
              font-size: 12px;
              font-weight: 500;
              color: #525252;
            }
            .content {
              flex: 1;
              overflow-y: auto;
              padding: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">Deep Research - ${panelTab.toUpperCase()} (Detached)</div>
            <div class="content" id="content">
              <p style="text-align: center; padding: 20px; color: #a3a3a3;">Loading...</p>
            </div>
          </div>
          <script>
            // Update content from parent
            const updateContent = () => {
              const content = sessionStorage.getItem('deepResearchPanelContent');
              if (content) {
                document.getElementById('content').innerHTML = content;
              }
            };
            updateContent();
            setInterval(updateContent, 500);
          </script>
        </body>
        </html>
      `);
      detached.document.close();
      setDetachedWindow(detached);
    }
  }, [panelTab]);

  /* ─── Render ───────────────────────────────────────────────────── */
  // Panel uses dynamic width from panelWidth state now (set via resize handle)
  const isResearchActive = status === 'running' || status === 'completed';

  // Graph shows only core research layers: sources, claims, trails, blueprints
  // CSI verdicts are tracked for future analysis, not rendered in graph
  // This keeps the 3D graph responsive with reasonable node count

  return (
    <div className="fixed inset-0 bg-[#faf9f4] overflow-hidden flex flex-col z-[100]">
      {/* Top Bar - Always visible */}
      <div className="flex-none flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e3e0db] bg-white/90 backdrop-blur-sm z-[60]">
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
            <>
              {/* Toggle Process Panel Button */}
              <button
                onClick={() => setShowPanel(!showPanel)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs transition-colors ${
                  showPanel
                    ? 'bg-[#9333ea]/10 border border-[#9333ea]/20 text-[#9333ea]'
                    : 'bg-[#faf9f4] border border-[#e3e0db] text-[#525252] hover:bg-[#f3f1ec]'
                }`}
              >
                <GitBranch size={12} />
                <span className="hidden sm:inline">{showPanel ? 'Hide' : 'Show'} Process</span>
              </button>
              <button
                onClick={handleNewResearch}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#faf9f4] border border-[#e3e0db] text-[#525252] text-xs hover:bg-[#f3f1ec] transition-colors"
              >
                <Sparkles size={12} />
                <span className="hidden sm:inline">New</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Layout - Side by Side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat/Content Area */}
        <div className="flex-1 flex flex-col justify-start pt-6 sm:pt-8 px-4 sm:px-6 pb-6 overflow-y-auto">
          <div className="w-full max-w-[58rem]">
            <motion.div
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="bg-white/90 backdrop-blur border border-[#e3e0db] rounded-2xl px-4 py-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#737373] font-medium">Current brief</p>
                  <p className="mt-2 text-sm text-[#0a0a0a] leading-relaxed line-clamp-3">
                    {activeGoal || query || 'Start a research question to build a live evidence graph, trail, and report workspace.'}
                  </p>
                </div>
                <div className="bg-white/90 backdrop-blur border border-[#e3e0db] rounded-2xl px-4 py-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#737373] font-medium">Run status</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      status === 'running' ? 'bg-[#117dff] animate-pulse' :
                      status === 'completed' ? 'bg-[#16a34a]' :
                      status === 'failed' ? 'bg-[#dc2626]' :
                      'bg-[#a3a3a3]'
                    }`} />
                    <p className="text-sm text-[#0a0a0a] capitalize">{status}</p>
                  </div>
                  <p className="mt-2 text-[11px] text-[#737373]">
                    {confidence ? `${(confidence * 100).toFixed(0)}% confidence` : 'Waiting for a run'}
                    {durationMs ? ` · ${(durationMs / 1000).toFixed(1)}s` : ''}
                  </p>
                  {reportInfluencedByRetention && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0f766e]/10 text-[#0f766e] text-[10px] font-medium">
                      <Award size={10} />
                      Retained memory influenced this run
                    </div>
                  )}
                </div>
                <div className="bg-white/90 backdrop-blur border border-[#e3e0db] rounded-2xl px-4 py-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#737373] font-medium">Graph layers</p>
                  <p className="mt-2 text-sm text-[#0a0a0a]">
                    {Object.entries(graphLayers).filter(([, enabled]) => enabled).length} visible
                    <span className="text-[#737373]"> / {Object.keys(graphLayers).length}</span>
                  </p>
                  <p className="mt-2 text-[11px] text-[#737373]">Sources, claims, trails, observations, events, blueprints</p>
                </div>
              </div>

              {status === 'idle' && (
                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] items-start">
                  <div className="bg-white rounded-[1.5rem] border border-[#e3e0db] overflow-hidden shadow-lg">
                    <div className="px-5 py-4 border-b border-[#e3e0db] bg-gradient-to-b from-[#faf9f4] to-white">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#117dff]/10 flex items-center justify-center">
                          <Search size={22} className="text-[#117dff]" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Deep Research workspace</h2>
                          <p className="text-sm text-[#525252]">Ask a question, then track sources, claims, trails, and the generated report in one place.</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <textarea
                        ref={textareaRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="What would you like to research?"
                        rows={4}
                        className="w-full bg-transparent text-[#0a0a0a] text-sm placeholder:text-[#a3a3a3] resize-none focus:outline-none leading-relaxed font-mono min-h-[120px]"
                        disabled={status === 'running'}
                      />
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e3e0db]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1.5 rounded-full bg-[#117dff]/10 border border-[#117dff]/20 text-[#117dff] text-xs font-medium">
                            Live graph + provenance
                          </span>
                          <span className="px-3 py-1.5 rounded-full bg-[#d97706]/10 border border-[#d97706]/20 text-[#d97706] text-xs font-medium">
                            Blueprint-aware
                          </span>
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

                  <div className="space-y-4">
                    <div className="bg-white rounded-[1.25rem] border border-[#e3e0db] p-4 shadow-sm">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#737373] font-medium">What this page does</p>
                      <ul className="mt-3 space-y-2 text-sm text-[#525252] leading-relaxed">
                        <li>Builds a live evidence graph from sources, claims, trails, and blueprints.</li>
                        <li>Surfaces agent states and event timeline while research is running.</li>
                        <li>Turns completed runs into reusable blueprints and report provenance.</li>
                      </ul>
                    </div>
                    {sessions.length > 0 && (
                      <div className="bg-white rounded-[1.25rem] border border-[#e3e0db] p-4 shadow-sm">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#737373] font-medium">Recent sessions</p>
                        <div className="mt-3 space-y-2 max-h-52 overflow-y-auto">
                          {sessions.slice(0, 4).map((s) => (
                            <button
                              key={s.id || s.session_id}
                              onClick={() => loadSession(s.id || s.session_id)}
                              className="w-full text-left px-3 py-2 rounded-lg border border-[#e3e0db] hover:border-[#117dff]/30 hover:bg-[#faf9f4] transition-colors"
                            >
                              <p className="text-sm text-[#0a0a0a] truncate">{s.query || 'Untitled'}</p>
                              <p className="text-[10px] text-[#737373] mt-0.5">
                                {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Search Input - Always visible ───────── */}
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`w-full ${status === 'idle' ? 'mt-2' : 'mt-3'}`}
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
                      {/* Show Process Button - appears when panel is closed but research is active */}
                      {(status === 'running' || status === 'completed') && !showPanel && (
                        <button
                          onClick={() => setShowPanel(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#9333ea]/10 border border-[#9333ea]/20 text-[#9333ea] text-xs font-medium hover:bg-[#9333ea]/20 transition-colors"
                        >
                          <GitBranch size={12} />
                          Show Process
                        </button>
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
            {status !== 'idle' && (
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="bg-white rounded-[1.25rem] border border-[#e3e0db] p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#737373] font-medium">Live trail</p>
                      <p className="text-sm text-[#0a0a0a] mt-1">Newest research events and agent transitions.</p>
                    </div>
                    <button
                      onClick={() => setShowPanel(true)}
                      className="px-3 py-1.5 rounded-lg bg-[#117dff]/10 text-[#117dff] text-xs font-medium hover:bg-[#117dff]/15 transition-colors"
                    >
                      Open panel
                    </button>
                  </div>
                  <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
                    {latestEvents.length > 0 ? latestEvents.map((event, i) => (
                      <EventCard key={`${event.type}-${i}`} event={event} index={i} />
                    )) : (
                      <div className="rounded-xl border border-dashed border-[#e3e0db] px-4 py-8 text-center text-sm text-[#737373]">
                        Events will appear here as the run progresses.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-[1.25rem] border border-[#e3e0db] p-4 shadow-sm">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#737373] font-medium">Progress</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[#faf9f4] border border-[#e3e0db] p-3">
                        <p className="text-[10px] text-[#737373] uppercase tracking-wider">Findings</p>
                        <p className="mt-1 text-lg font-semibold text-[#0a0a0a]">{findings.length}</p>
                      </div>
                      <div className="rounded-xl bg-[#faf9f4] border border-[#e3e0db] p-3">
                        <p className="text-[10px] text-[#737373] uppercase tracking-wider">Budget</p>
                        <p className="mt-1 text-lg font-semibold text-[#0a0a0a]">
                          {webUsage?.llm_calls?.used != null && webUsage?.llm_calls?.limit != null
                            ? `${webUsage.llm_calls.used}/${webUsage.llm_calls.limit}`
                            : '100 max'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-[1.25rem] border border-[#e3e0db] p-4 shadow-sm">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#737373] font-medium">Current agents</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {['Faraday', 'Feynmann', 'Turing', 'Synthesis'].map((agent) => {
                        const color = AGENT_COLORS[agent];
                        const latestTaskId = Object.keys(agentStates).pop();
                        const state = latestTaskId ? agentStates[latestTaskId][agent.toLowerCase()] : 'idle';
                        return (
                          <div key={agent} className="flex items-center gap-2 rounded-xl border border-[#e3e0db] px-3 py-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, opacity: state === 'active' ? 1 : 0.35 }} />
                            <div>
                              <p className="text-xs text-[#0a0a0a]">{agent}</p>
                              <p className="text-[10px] text-[#737373] capitalize">{state || 'idle'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {(trailDiagnostics || goldenLine) && (
                    <div className="bg-white rounded-[1.25rem] border border-[#e3e0db] p-4 shadow-sm">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#737373] font-medium">Synthesis gate</p>
                      {trailDiagnostics && (
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-[#faf9f4] border border-[#e3e0db] p-3">
                            <p className="text-[10px] uppercase tracking-wider text-[#737373]">Trail source</p>
                            <p className="mt-1 text-[#0a0a0a]">{trailDiagnostics.source_path || 'unknown'}</p>
                          </div>
                          <div className="rounded-xl bg-[#faf9f4] border border-[#e3e0db] p-3">
                            <p className="text-[10px] uppercase tracking-wider text-[#737373]">Steps</p>
                            <p className="mt-1 text-[#0a0a0a]">{trailDiagnostics.total_step_count ?? trailSteps.length}</p>
                          </div>
                          <div className="rounded-xl bg-[#faf9f4] border border-[#e3e0db] p-3">
                            <p className="text-[10px] uppercase tracking-wider text-[#737373]">Trails</p>
                            <p className="mt-1 text-[#0a0a0a]">{trailDiagnostics.trail_count ?? 0}</p>
                          </div>
                          <div className="rounded-xl bg-[#faf9f4] border border-[#e3e0db] p-3">
                            <p className="text-[10px] uppercase tracking-wider text-[#737373]">Provenance nodes</p>
                            <p className="mt-1 text-[#0a0a0a]">{reportProvenance?.nodeIds?.length ?? reportProvenance?.reportNodes?.length ?? 0}</p>
                          </div>
                        </div>
                      )}
                      {goldenLine && (
                        <pre className="mt-3 max-h-56 overflow-y-auto rounded-xl bg-[#0a0a0a] text-[#e5e7eb] border border-[#1f2937] p-3 text-[10px] leading-relaxed whitespace-pre-wrap">
                          {goldenLine}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            </motion.div>
          </div>
        </div>

        {/* Right Panel - Status/Report/Graph - Part of flex layout */}
        <AnimatePresence>
          {showPanel && isResearchActive && (
            <>
              {/* Mobile Backdrop */}
              <div
                className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                onClick={() => setShowPanel(false)}
              />
              <motion.div
                ref={panelRef}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: panelWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                className="flex-none bg-white border-l border-[#e3e0db] shadow-lg flex flex-col overflow-hidden relative z-40"
                style={{ minWidth: 0, maxWidth: '100%', width: panelWidth }}
              >
              {/* Resize Handle (Left Edge) */}
              <div
                onMouseDown={handlePanelResizeStart}
                className={`absolute left-0 top-0 w-1 h-full bg-[#e3e0db] hover:bg-[#117dff] transition-colors cursor-col-resize z-50 ${
                  isResizing ? 'bg-[#117dff]' : ''
                }`}
                title="Drag to resize panel"
              />

              {/* Panel Header */}
              <div
                className="flex-none flex items-center justify-between px-3 py-2 border-b border-[#e3e0db] bg-[#faf9f4]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 rounded-full bg-[#d1cfc6] opacity-50 flex-shrink-0" />
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setPanelTab('status')}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex-shrink-0 ${
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
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex-shrink-0 ${
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
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                      panelTab === 'graph' ? 'bg-[#9333ea]/10 text-[#9333ea]' : 'text-[#525252] hover:bg-[#f3f1ec]'
                    }`}
                  >
                    <GitBranch size={14} />
                    <span className="font-medium">Graph</span>
                  </button>
                </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Detach Button */}
                  <button
                    onClick={handleDetachPanel}
                    className="p-1.5 rounded-lg hover:bg-[#e3e0db]/40 text-[#525252] transition-colors"
                    title="Open panel in detached window"
                  >
                    <ExternalLink size={14} />
                  </button>
                  {/* Close Button */}
                  <button
                    onClick={() => setShowPanel(false)}
                    className="p-1.5 rounded-lg hover:bg-[#e3e0db]/40 text-[#525252] transition-colors"
                    title="Close panel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

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
                      <div className="bg-gradient-to-br from-[#faf9f4] to-white border border-[#e3e0db] rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Users size={14} className="text-[#9333ea]" />
                          <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">CSI Agents</span>
                          {status === 'running' && (
                            <span className="ml-auto flex items-center gap-1 text-[10px] text-[#117dff]">
                              <Loader2 size={10} className="animate-spin" />
                              Active
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {['Faraday', 'Feynmann', 'Turing', 'Synthesis'].map((agent) => {
                            const color = AGENT_COLORS[agent];
                            // Get latest state from any task
                            const latestTaskId = Object.keys(agentStates).pop();
                            const state = latestTaskId ? agentStates[latestTaskId][agent.toLowerCase()] : 'idle';
                            const isActive = state === 'active';
                            const isCompleted = state === 'completed';

                            return (
                              <div key={agent} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${isActive ? 'bg-white border-[#117dff]/30 shadow-sm' : 'bg-white/50 border-[#e3e0db]'}`}>
                                <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: isActive ? color : isCompleted ? color : `${color}40` }} />
                                <div className="flex-1 min-w-0">
                                  <span className={`text-xs block ${isActive ? 'text-[#0a0a0a] font-medium' : 'text-[#525252]'}`}>{agent}</span>
                                  {state && state !== 'idle' && state !== 'not_used' && (
                                    <span className={`text-[9px] ${isActive ? 'text-[#117dff]' : isCompleted ? 'text-[#16a34a]' : 'text-[#a3a3a3]'}`}>
                                      {state}
                                    </span>
                                  )}
                                </div>
                                {isActive && <Loader2 size={12} className="text-[#117dff] animate-spin flex-shrink-0" />}
                                {isCompleted && <CheckCircle2 size={12} className="text-[#16a34a] flex-shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-[#a3a3a3] mt-2 leading-relaxed">
                          CSI workers coordinate through shared graph traces: Faraday explores sources, Feynmann extracts claims, Turing verifies them, and Synthesis composes the report.
                        </p>
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
                        <div className="space-y-2">
                          {events.length === 0 ? (
                            <div className="text-center py-4 text-[#a3a3a3] text-xs">
                              <Loader2 size={16} className="animate-spin mx-auto mb-2" />
                              Waiting for events...
                            </div>
                          ) : (
                            events.map((event, i) => (
                              <EventCard key={`${event.type}-${i}`} event={event} index={i} />
                            ))
                          )}
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
                            {fromBlueprint && (
                              <><span className="text-[#e3e0db]">·</span><span className="px-2 py-0.5 rounded-full bg-[#9333ea]/10 border border-[#9333ea]/20 text-[#9333ea] text-[10px] font-medium">From Blueprint</span></>
                            )}
                            <div className="ml-auto flex items-center gap-2">
                              {/* Resume: re-synthesize report from stored blueprint recall */}
                              {(status === 'completed' || status === 'interrupted') && (
                                <button
                                  onClick={() => handleSynthesizeFromBlueprint()}
                                  disabled={isSynthesizing}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#9333ea]/10 border border-[#9333ea]/20 text-[#9333ea] text-[10px] font-medium hover:bg-[#9333ea]/20 transition-colors disabled:opacity-50"
                                  title="Re-synthesize report from stored claims, sources and trails (no new web search)"
                                >
                                  {isSynthesizing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                                  {isSynthesizing ? 'Synthesizing...' : 'Resume from Blueprint'}
                                </button>
                              )}
                              <button
                                onClick={handleSaveAsBlueprint}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-[#d97706]/10 border border-[#d97706]/20 text-[#d97706] text-[10px] font-medium hover:bg-[#d97706]/20 transition-colors"
                                title="Save this research state as reusable blueprint"
                              >
                                <Award size={10} />
                                Save as Blueprint
                              </button>
                            </div>
                          </div>
                        <div className="p-6 max-h-96 overflow-y-auto">
                          <div
                            className="text-[#525252] leading-relaxed space-y-3"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
                          />
                        </div>
                        {reportProvenance && (
                          <div className="border-t border-[#e3e0db] bg-[#faf9f4] p-4">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#737373] font-medium">Report provenance</p>
                            <div className="mt-3 grid gap-2 text-xs text-[#525252] sm:grid-cols-2">
                              <div>Claims: {reportProvenance.claimIds?.length || 0}</div>
                              <div>Sources: {reportProvenance.sourceIds?.length || 0}</div>
                              <div>Trail steps: {reportProvenance.trailStepIds?.length || 0}</div>
                              <div>Recalled memories: {reportProvenance.recalledMemoryIds?.length || 0}</div>
                            </div>
                            {reportInfluencedByRetention && (
                              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0f766e]/10 text-[#0f766e] text-[10px] font-medium">
                                <Award size={10} />
                                Report reuses retained memory
                              </div>
                            )}
                            <button
                              onClick={handlePromoteResearchToMemory}
                              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#16a34a]/10 text-[#16a34a] text-xs font-medium hover:bg-[#16a34a]/15 transition-colors"
                            >
                              Promote report to memory
                            </button>
                          </div>
                        )}
                      </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[#525252] gap-4">
                          {isSynthesizing ? (
                            <>
                              <Loader2 size={32} className="animate-spin text-[#9333ea]" />
                              <p className="text-sm">Synthesizing from blueprint recall...</p>
                              <p className="text-xs text-[#a3a3a3]">Recalling stored claims, sources and trails</p>
                            </>
                          ) : status === 'completed' || status === 'interrupted' ? (
                            <>
                              <div className="w-12 h-12 rounded-full bg-[#9333ea]/10 flex items-center justify-center">
                                <RefreshCw size={20} className="text-[#9333ea]" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium">No report generated yet</p>
                                <p className="text-xs text-[#a3a3a3] mt-1">Synthesize from stored claims and sources</p>
                              </div>
                              <button
                                onClick={() => handleSynthesizeFromBlueprint()}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9333ea] text-white text-sm font-medium hover:bg-[#7c3aed] transition-colors"
                              >
                                <RefreshCw size={14} />
                                Resume from Blueprint
                              </button>
                            </>
                          ) : (
                            <>
                              <Loader2 size={32} className="animate-spin text-[#117dff]" />
                              <p className="text-sm">Generating report...</p>
                            </>
                          )}
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
                        <div className="px-3 py-2 border-b border-[#e3e0db] bg-[#faf9f4]">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pr-1">
                              <button
                                onClick={() => setGraphLayers(prev => ({ ...prev, sources: !prev.sources }))}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all flex-shrink-0 ${
                                  graphLayers.sources ? 'bg-[#117dff]/10 text-[#117dff]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                                }`}
                              >
                                <Globe size={10} />
                                <span className="hidden sm:inline">Sources</span>
                              </button>
                              <button
                                onClick={() => setGraphLayers(prev => ({ ...prev, claims: !prev.claims }))}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all flex-shrink-0 ${
                                  graphLayers.claims ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                                }`}
                              >
                                <CheckCircle2 size={10} />
                                <span className="hidden sm:inline">Claims</span>
                              </button>
                              <button
                                onClick={() => setGraphLayers(prev => ({ ...prev, trails: !prev.trails }))}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all flex-shrink-0 ${
                                  graphLayers.trails ? 'bg-[#9333ea]/10 text-[#9333ea]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                                }`}
                              >
                                <Scroll size={10} />
                                <span className="hidden sm:inline">Trails</span>
                              </button>
                              <button
                                onClick={() => setGraphLayers(prev => ({ ...prev, blueprints: !prev.blueprints }))}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all flex-shrink-0 ${
                                  graphLayers.blueprints ? 'bg-[#d97706]/10 text-[#d97706]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                                }`}
                              >
                                <Award size={10} />
                                <span className="hidden sm:inline">Blueprints</span>
                              </button>
                              <button
                                onClick={() => setGraphLayers(prev => ({ ...prev, observations: !prev.observations }))}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all flex-shrink-0 ${
                                  graphLayers.observations ? 'bg-[#3b82f6]/10 text-[#3b82f6]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                                }`}
                              >
                                <Eye size={10} />
                                <span className="hidden sm:inline">Observations</span>
                              </button>
                              <button
                              onClick={() => setGraphLayers(prev => ({ ...prev, executionEvents: !prev.executionEvents }))}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all flex-shrink-0 ${
                                  graphLayers.executionEvents ? 'bg-[#059669]/10 text-[#059669]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                              }`}
                            >
                              <Activity size={10} />
                              <span className="hidden sm:inline">Events</span>
                            </button>
                            <button
                              onClick={() => setGraphLayers(prev => ({ ...prev, promoted: !prev.promoted }))}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all flex-shrink-0 ${
                                graphLayers.promoted ? 'bg-[#0f766e]/10 text-[#0f766e]' : 'text-[#a3a3a3] hover:bg-[#f3f1ec]'
                              }`}
                            >
                              <Award size={10} />
                              <span className="hidden sm:inline">Promoted</span>
                            </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
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
                                title="Refresh graph"
                              >
                                <RotateCcw size={12} className={graphLoading ? 'animate-spin' : ''} />
                              </button>
                              <button
                                onClick={handleToggleGraphWindow}
                                className={`p-1.5 rounded border transition-colors ${
                                  showGraphWindow
                                    ? 'border-[#117dff]/40 bg-[#117dff]/20 text-[#117dff]'
                                    : 'border-transparent text-[#525252] hover:bg-[#117dff]/10 hover:text-[#117dff]'
                                }`}
                                title={showGraphWindow ? 'Hide graph window' : 'Show graph window'}
                              >
                                <Layers size={12} />
                              </button>
                              <button
                                onClick={handleDetachGraph}
                                className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded border text-[10px] font-medium transition-colors ${
                                  isGraphDetached
                                    ? 'border-[#117dff]/50 bg-[#117dff]/20 text-[#117dff]'
                                    : 'border-[#d4d1ca] bg-white text-[#525252] hover:bg-[#117dff]/10 hover:border-[#117dff]/30 hover:text-[#117dff]'
                                }`}
                                title={isGraphDetached ? 'Graph is detached' : 'Detach graph to floating window'}
                                aria-pressed={isGraphDetached}
                              >
                                <ExternalLink size={12} />
                                <span>{isGraphDetached ? 'Detached' : 'Detach'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Graph Canvas - 2D with Real-Time Streaming */}
                        <div className="flex-1 relative">
                          {showGraphWindow ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#faf9f4] to-white border border-dashed border-[#e3e0db] rounded-2xl m-3">
                              <div className="text-center px-4">
                                <p className="text-sm font-medium text-[#0a0a0a]">Graph opened in floating window</p>
                                <p className="text-xs text-[#737373] mt-1">Use the detach panel to inspect the growing network.</p>
                              </div>
                            </div>
                          ) : (
                            <DeepResearchGraph2D
                              sessionId={sessionId}
                              currentQuery={query}
                              onReuseBlueprint={handleRerunFromBlueprint}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
          )}
        </AnimatePresence>
      </div>

      {/* Detached Graph Window */}
      <AnimatePresence>
        {showGraphWindow && (
          <motion.div
            ref={graphWindowRef}
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            className="fixed z-[140] overflow-hidden rounded-2xl border border-[#e3e0db] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            style={{
              left: detachedGraphPos.x,
              top: detachedGraphPos.y,
              width: detachedGraphPos.width,
              height: detachedGraphPos.height,
              cursor: isDraggingGraph ? 'grabbing' : 'default',
            }}
          >
            <div
              className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[#e3e0db] bg-[#faf9f4] cursor-move"
              onMouseDown={handleGraphDragStart}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#0a0a0a]">Research Graph</p>
                <p className="text-[10px] text-[#737373] truncate">Floating preview - drag the header to move</p>
              </div>
              <div className="flex items-center gap-1" data-no-drag>
                <button
                  onClick={handleRefreshGraph}
                  className="p-1.5 rounded hover:bg-[#e3e0db]/60 text-[#525252]"
                  title="Refresh graph"
                >
                  <RotateCcw size={12} className={graphLoading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={handleCloseGraphWindow}
                  className="p-1.5 rounded hover:bg-[#e3e0db]/60 text-[#525252]"
                  title="Close graph window"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            <div className="absolute inset-0 pt-[41px]">
              <DeepResearchGraph2D
                sessionId={sessionId}
                showChrome={false}
                currentQuery={query}
                onReuseBlueprint={handleRerunFromBlueprint}
              />
            </div>
            <button
              onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
              className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize bg-gradient-to-tl from-[#117dff]/25 to-transparent"
              aria-label="Resize graph window"
              data-no-drag
            />
            <button
              onMouseDown={(e) => handleResizeStart(e, 'right')}
              className="absolute top-10 right-0 w-2 h-[calc(100%-2.5rem)] cursor-e-resize"
              aria-label="Resize graph window horizontally"
              data-no-drag
            />
            <button
              onMouseDown={(e) => handleResizeStart(e, 'bottom')}
              className="absolute bottom-0 left-0 h-2 w-[calc(100%-0.5rem)] cursor-s-resize"
              aria-label="Resize graph window vertically"
              data-no-drag
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
