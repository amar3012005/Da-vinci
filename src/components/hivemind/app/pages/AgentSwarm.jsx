import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Sparkles, Eye, Brain, ShieldCheck, Play, Loader2,
  ChevronDown, Folder, Globe2, AlertTriangle, CheckCircle2,
  XCircle, GitBranch, Zap,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useTranslation } from 'react-i18next';

/* ─── Constants ────────────────────────────────────────────── */

const AGENTS = [
  {
    id: 'faraday',
    name: 'Faraday',
    role: 'Scanner',
    icon: Search,
    color: '#f59e0b',
    bg: 'from-amber-500/10 to-orange-500/10',
    border: 'border-amber-500/20',
    desc: 'Scans your knowledge graph for anomalies, duplicate clusters, and stale truths.',
  },
  {
    id: 'feynman',
    name: 'Feynman',
    role: 'Analyst',
    icon: Brain,
    color: '#8b5cf6',
    bg: 'from-violet-500/10 to-purple-500/10',
    border: 'border-violet-500/20',
    desc: 'Forms testable hypotheses from detected patterns with verification checks.',
  },
  {
    id: 'turing',
    name: 'Turing',
    role: 'Verifier',
    icon: ShieldCheck,
    color: '#10b981',
    bg: 'from-emerald-500/10 to-green-500/10',
    border: 'border-emerald-500/20',
    desc: 'Verifies hypotheses and executes graph actions — merges, links, promotes.',
  },
];

const TERMINAL = new Set(['completed', 'complete', 'succeeded', 'failed', 'cancelled', 'error', 'done']);

// Optimized system goals per agent — used when "Run All" or no custom goal
const AGENT_GOALS = {
  faraday: 'Perform a deep scan of the knowledge graph. For each semantic cluster: (1) identify exact and near-duplicate memories, (2) detect stale or conflicting facts that were updated across conversations, (3) find temporal update chains where newer info supersedes older, (4) flag orphaned memories with no relationships. Use LLM analysis on every cluster with 2+ memories. Output specific memory IDs for each finding.',
  feynman: 'Analyze Faraday\'s findings and form testable hypotheses. For each cluster: (1) classify as duplicate_cluster, stale_truth, update_chain, recurring_issue, or emerging_pattern, (2) identify the canonical memory (most complete/recent), (3) list which memories should be merged, linked, or suppressed, (4) compute confidence based on evidence spread and cross-session coverage. Include all related memory IDs.',
  turing: 'Verify each Feynman hypothesis. For verified findings PROPOSE actions for human approval — do NOT auto-execute: (1) archive_duplicates to keep one canonical version and hide near-identical copies (reversible, no content fusion), (2) link_update_chain to connect old→new fact versions, (3) suppress_noise_cluster on low-value repetitive memories, (4) promote_known_risk for validated recurring issues. Refuse any action on memories tagged pinned, do-not-delete, important, or legal-hold. Every proposal goes to the approval queue — the user clicks Approve before anything mutates.',
};

// Suggested goals for individual runs
const GOAL_PRESETS = [
  { label: 'Find & merge duplicates', goal: 'Find all duplicate and near-duplicate memories. Merge them into canonical nodes.' },
  { label: 'Detect stale truths', goal: 'Find facts that were updated or corrected across conversations. Link old→new as update chains.' },
  { label: 'Full graph cleanup', goal: 'Comprehensive cleanup: merge duplicates, link update chains, suppress noise, promote verified patterns.' },
  { label: 'Temporal analysis', goal: 'Analyze temporal patterns. Find events mentioned with dates, track how facts evolved over time.' },
  { label: 'Conflict detection', goal: 'Find contradicting facts across memories. Flag where the user said X in one conversation but Y in another.' },
];

/* ─── Helpers ──────────────────────────────────────────────── */

function confBar(value) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 85 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-[#eeeae3] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-[#a3a3a3] w-8 text-right">{pct}%</span>
    </div>
  );
}

function verdictBadge(verdict) {
  if (verdict === 'likely_true') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Verified</span>;
  if (verdict === 'uncertain') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Uncertain</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Weak</span>;
}

/* ─── Main Component ───────────────────────────────────────── */

export default function AgentSwarm() {
  const { t } = useTranslation('dashboard');
  const [selected, setSelected] = useState(null); // 'faraday' | 'feynman' | 'turing' | 'all'
  const [scope, setScope] = useState('workspace');
  const [goal, setGoal] = useState('');
  const [project, setProject] = useState('');
  const [dryRun, setDryRun] = useState(false);

  // Run state
  const [running, setRunning] = useState(false);
  const [runPhase, setRunPhase] = useState(null); // which agent is currently running
  const [, setRunIds] = useState({}); // { faraday: id, feynman: id, turing: id }
  const [results, setResults] = useState({}); // { faraday: {...}, feynman: {...}, turing: {...} }
  const [error, setError] = useState(null);

  // Findings panel
  const [, setShowFindings] = useState(false);

  // Hygiene proposals (post-Turing)
  const [hygieneProposals, setHygieneProposals] = useState([]);
  const [hygieneStats, setHygieneStats] = useState(null);
  const [hygieneLoading, setHygieneLoading] = useState(false);
  const [executingIds, setExecutingIds] = useState(new Set());
  const [executedIds, setExecutedIds] = useState(new Set());

  // Phase 3: Research session ephemeral-buffer panel
  const [researchSessions, setResearchSessions] = useState([]);
  const [researchPanelOpen, setResearchPanelOpen] = useState(false);
  const [researchActingOn, setResearchActingOn] = useState(null);

  const pollRef = useRef(null);
  const researchPollRef = useRef(null);

  // Cleanup polling on unmount
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (researchPollRef.current) clearInterval(researchPollRef.current);
  }, []);

  /* ── Research session buffer polling (Phase 3) ── */
  const refreshResearchSessions = useCallback(async () => {
    try {
      const data = await apiClient.listResearchSessions();
      setResearchSessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (err) {
      console.warn('listResearchSessions failed:', err.message);
    }
  }, []);

  useEffect(() => {
    refreshResearchSessions();
    researchPollRef.current = setInterval(refreshResearchSessions, 10000);
    return () => clearInterval(researchPollRef.current);
  }, [refreshResearchSessions]);

  const approveResearchSession = useCallback(async (sessionId, kinds) => {
    setResearchActingOn(sessionId);
    try {
      const result = await apiClient.approveResearchProposals(sessionId, kinds ? { kinds } : {});
      // eslint-disable-next-line no-alert
      window.alert(`Approved: ${result.persisted} memories persisted${result.errors ? `, ${result.errors} errors` : ''}.`);
      await refreshResearchSessions();
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(`Approve failed: ${err?.response?.data?.message || err.message}`);
    } finally {
      setResearchActingOn(null);
    }
  }, [refreshResearchSessions]);

  const discardResearchSession = useCallback(async (sessionId) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('agentswarm.discardConfirm', 'Discard all buffered research traces for this session? Nothing will be persisted to the graph.'))) return;
    setResearchActingOn(sessionId);
    try {
      await apiClient.discardResearchProposals(sessionId);
      await refreshResearchSessions();
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(`Discard failed: ${err?.response?.data?.message || err.message}`);
    } finally {
      setResearchActingOn(null);
    }
  }, [refreshResearchSessions, t]);

  /* ── Run agent ──────────────────────────────────── */

  const runAgent = useCallback(async (agentId, useSystemGoal = false) => {
    const agentGoal = useSystemGoal
      ? AGENT_GOALS[agentId] || 'Analyze the knowledge graph'
      : goal.trim() || AGENT_GOALS[agentId] || 'Scan for anomalies and patterns';

    const payload = {
      scope,
      goal: agentGoal,
      project: project.trim() || undefined,
      dry_run: dryRun,
    };

    try {
      const response = await apiClient.runResidentAgent(agentId, payload);
      const runId = response?.run_id || response?.runId || response?.id;
      setRunIds(prev => ({ ...prev, [agentId]: runId }));
      return runId;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, [scope, goal, project, dryRun]);

  const pollRun = useCallback(async (agentId, runId) => {
    return new Promise((resolve) => {
      const poll = setInterval(async () => {
        try {
          const data = await apiClient.getResidentRun(runId);
          const status = data?.status || '';
          if (TERMINAL.has(status)) {
            clearInterval(poll);
            setResults(prev => ({ ...prev, [agentId]: data }));
            resolve(data);
          }
        } catch (err) {
          clearInterval(poll);
          // Resident runs live in hm-core memory — a server restart wipes them
          // and the poll starts returning 404. Surface that as an explicit
          // 'expired' result instead of a silent dead-end.
          if (err?.response?.status === 404) {
            setResults(prev => ({
              ...prev,
              [agentId]: { status: 'expired', error: 'Run no longer available (server restarted) — re-run the agent.' },
            }));
          }
          resolve(null);
        }
      }, 2500);
      pollRef.current = poll;
    });
  }, []);

  /* ── Hygiene scan (runs automatically after Turing) ── */

  const runHygieneScan = useCallback(async () => {
    setHygieneLoading(true);
    try {
      // Pass NL goal to backend — it parses to structured intent + filter.
      // If goal blank, backend defaults to scanning all categories.
      const payload = { limit: 50 };
      if (goal && goal.trim()) {
        payload.goal = goal.trim();
      } else {
        payload.categories = ['duplicates', 'noise', 'stale', 'orphans', 'artifacts'];
      }
      const { data } = await apiClient.controlPlane.post('/v1/proxy/graph/hygiene/scan', payload);
      setHygieneProposals(data.proposals || []);
      setHygieneStats({ ...(data.stats || {}), intent: data.intent || null });
    } catch (err) {
      console.warn('Hygiene scan failed:', err.message);
    } finally {
      setHygieneLoading(false);
    }
  }, [goal]);

  const executeProposal = useCallback(async (proposal, action) => {
    setExecutingIds(prev => new Set([...prev, proposal.id]));
    try {
      // Action mapping: 'merge' (legacy from old proposals) → 'archive_duplicates'
      // (the new no-merge action). 'archive' / 'delete' / 'suppress' pass through.
      const serverAction = action === 'merge' ? 'archive_duplicates' : action;
      const res = await apiClient.controlPlane.post('/v1/proxy/graph/hygiene/execute', {
        proposals: [proposal],
        action: serverAction,
      });
      const results = res?.data?.results || [];
      const ok = results.every(r => r.status === 'executed');
      if (!ok) {
        const errMsg = results.find(r => r.status === 'failed')?.error || 'execute returned non-success';
        throw new Error(errMsg);
      }
      setExecutedIds(prev => new Set([...prev, proposal.id]));
    } catch (err) {
      console.error('Execute failed:', err?.response?.data?.error || err.message);
      // Surface to user — DON'T mark executed if it actually failed
      // eslint-disable-next-line no-alert
      window.alert(`Action failed: ${err?.response?.data?.error || err.message}\n\nProposal stays in queue. Check console for details.`);
    } finally {
      setExecutingIds(prev => { const n = new Set(prev); n.delete(proposal.id); return n; });
    }
  }, []);

  // executeBulk intentionally removed — per-card approval only per the
  // enterprise-non-tech UX policy. No bulk "Merge All / Delete All" buttons
  // (one click destroying 100s of memories at once is a foot-gun).

  const handleRunSingle = useCallback(async (agentId) => {
    setRunning(true);
    setRunPhase(agentId);
    setError(null);
    setResults({});
    setShowFindings(false);
    setHygieneProposals([]);
    setExecutedIds(new Set());

    try {
      const runId = await runAgent(agentId);
      await pollRun(agentId, runId);
      setShowFindings(true);
      // Auto-run hygiene scan after Turing
      if (agentId === 'turing') {
        setRunPhase('hygiene');
        await runHygieneScan();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
      setRunPhase(null);
    }
  }, [runAgent, pollRun, runHygieneScan]);

  const handleRunAll = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResults({});
    setShowFindings(false);
    setHygieneProposals([]);
    setExecutedIds(new Set());

    try {
      setRunPhase('faraday');
      const fId = await runAgent('faraday', true);
      await pollRun('faraday', fId);

      setRunPhase('feynman');
      const feId = await runAgent('feynman', true);
      await pollRun('feynman', feId);

      setRunPhase('turing');
      const tId = await runAgent('turing', true);
      await pollRun('turing', tId);

      // Auto-run hygiene scan after full chain
      setRunPhase('hygiene');
      await runHygieneScan();

      setShowFindings(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
      setRunPhase(null);
    }
  }, [runAgent, pollRun, runHygieneScan]);

  /* ── Extract findings ──────────────────────────── */

  const faradayObs = useMemo(() => {
    const r = results.faraday?.result || results.faraday || {};
    return (r.observations || []).filter(o => o.kind !== 'graph_observation');
  }, [results.faraday]);

  const feynmanHyps = useMemo(() => {
    const r = results.feynman?.result || results.feynman || {};
    return r.hypotheses || r.trail_mark?.blueprintMeta?.hypotheses || [];
  }, [results.feynman]);

  const turingVerdicts = useMemo(() => {
    const r = results.turing?.result || results.turing || {};
    return r.verification_results || [];
  }, [results.turing]);

  const graphActions = useMemo(() => {
    return results.turing?.graph_actions_result || null;
  }, [results.turing]);

  const hasFindings = faradayObs.length > 0 || feynmanHyps.length > 0 || turingVerdicts.length > 0;

  /* ── Render ─────────────────────────────────────── */

  return (
    <div className="h-full flex flex-col font-['Space_Grotesk']">
      {/* ── Header (compact) ── */}
      <div className="shrink-0 px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0a0a0a]">{t('agentswarm.title', 'Agent Swarm Intelligence')}</h1>
          <p className="text-xs text-[#a3a3a3]">{t('agentswarm.subtitle', 'Resident agents that make your knowledge graph smarter over time')}</p>
        </div>
        <div className="flex items-center gap-3">
          {running && (
            <div className="flex items-center gap-2 text-xs text-[#117dff]">
              <Loader2 size={14} className="animate-spin" />
              {t('agentswarm.running', 'Running {{phase}}...', { phase: runPhase })}
            </div>
          )}
          {/* Pending research approvals badge */}
          {researchSessions.length > 0 && (
            <button
              onClick={() => setResearchPanelOpen(v => !v)}
              className="text-xs font-mono px-3 py-1 rounded-lg border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors"
              title={t('agentswarm.pendingResearchTitle', 'Buffered research traces awaiting approval')}
            >
              📋 {researchSessions.length} {t('agentswarm.pendingResearch', 'pending research')} {researchSessions.length === 1 ? t('agentswarm.session', 'session') : t('agentswarm.sessions', 'sessions')}
              {' · '}
              {researchSessions.reduce((sum, s) => sum + (s.total || 0), 0)} {t('agentswarm.buffered', 'buffered')}
            </button>
          )}
        </div>
      </div>

      {/* ── Phase 3: Research session approval panel ── */}
      {researchPanelOpen && researchSessions.length > 0 && (
        <div className="shrink-0 mx-5 mb-3 bg-amber-50 border border-amber-300 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-amber-200 bg-amber-100/50">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-700" />
              <h3 className="text-sm font-bold text-amber-900">{t('agentswarm.pendingApprovalsHeading', 'Pending Research Approvals')}</h3>
              <span className="text-[10px] font-mono text-amber-700">
                {researchSessions.length} {researchSessions.length === 1 ? t('agentswarm.session', 'session') : t('agentswarm.sessions', 'sessions')} — {t('agentswarm.bufferedNotWritten', 'buffered in RAM, not yet written to graph')}
              </span>
            </div>
            <button
              onClick={() => setResearchPanelOpen(false)}
              className="text-[10px] px-2 py-0.5 rounded text-amber-800 hover:bg-amber-200/60"
            >
              {t('agentswarm.collapse', 'Collapse')}
            </button>
          </div>
          <div className="divide-y divide-amber-200">
            {researchSessions.map(s => {
              const acting = researchActingOn === s.sessionId;
              const ageMin = Math.floor((s.ageMs || 0) / 60000);
              return (
                <div key={s.sessionId} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-amber-900 truncate" title={s.sessionId}>
                      {s.firstTitle || s.sessionId.slice(0, 8)}
                    </div>
                    <div className="text-[10px] font-mono text-amber-700 mt-0.5">
                      {ageMin}m ago · {s.total} buffered ·
                      {' obs:' + s.counts.observations}
                      {' findings:' + s.counts.findings}
                      {' sources:' + s.counts.sources}
                      {' exec:' + s.counts.executionEvents}
                      {' chk:' + s.counts.checkpoints}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    <button
                      onClick={() => approveResearchSession(s.sessionId, ['findings', 'sources'])}
                      disabled={acting || (s.counts.findings + s.counts.sources === 0)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 font-semibold"
                      title={t('agentswarm.approveFindingsTitle', 'Persist only findings + sources (skip raw observations and execution events)')}
                    >
                      {t('agentswarm.approveFindingsSources', '✓ Findings + Sources')}
                    </button>
                    <button
                      onClick={() => approveResearchSession(s.sessionId, null)}
                      disabled={acting || s.total === 0}
                      className="text-[10px] px-2 py-1 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 font-semibold"
                      title={t('agentswarm.approveAllTitle', 'Persist everything in the buffer')}
                    >
                      {t('agentswarm.approveAll', '✓ Approve All')}
                    </button>
                    <button
                      onClick={() => discardResearchSession(s.sessionId)}
                      disabled={acting}
                      className="text-[10px] px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 font-semibold"
                      title={t('agentswarm.discardTitle', 'Drop buffer — nothing persisted')}
                    >
                      {t('agentswarm.discard', '🗑 Discard')}
                    </button>
                    {acting && <Loader2 size={12} className="animate-spin text-amber-700 ml-1" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Agent tabs (horizontal) ── */}
      <div className="shrink-0 px-5 flex gap-2">
        {AGENTS.map(agent => {
          const Icon = agent.icon;
          const isActive = selected === agent.id;
          const isRunning = runPhase === agent.id;
          const hasResult = !!results[agent.id];
          const resultStatus = results[agent.id]?.status || results[agent.id]?.result?.status;

          return (
            <button
              key={agent.id}
              onClick={() => setSelected(isActive ? null : agent.id)}
              disabled={running}
              className={`flex-1 rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? `border-[${agent.color}]/30 bg-gradient-to-br ${agent.bg} shadow-sm`
                  : 'border-[#e3e0db] bg-white hover:border-[#e3e0db]/80 hover:shadow-sm'
              } ${running ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${agent.bg} flex items-center justify-center`}>
                  {isRunning ? <Loader2 size={14} className="animate-spin" style={{ color: agent.color }} /> : <Icon size={14} style={{ color: agent.color }} />}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0a0a0a]">{agent.name}</div>
                  <div className="text-[10px] text-[#a3a3a3]">{agent.role}</div>
                </div>
                {hasResult && resultStatus === 'completed' && <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
                {hasResult && resultStatus === 'failed' && <XCircle size={14} className="text-red-400 ml-auto" />}
              </div>
              <p className="text-[10px] text-[#525252] leading-relaxed line-clamp-2">{agent.desc}</p>
            </button>
          );
        })}

        {/* Run All button */}
        <button
          onClick={() => setSelected(selected === 'all' ? null : 'all')}
          disabled={running}
          className={`w-[140px] shrink-0 rounded-xl border p-3 text-left transition-all ${
            selected === 'all'
              ? 'border-[#117dff]/30 bg-[#117dff]/5 shadow-sm'
              : 'border-[#e3e0db] bg-white hover:border-[#117dff]/20'
          } ${running ? 'opacity-60' : ''}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#117dff]/10 flex items-center justify-center">
              <Zap size={14} className="text-[#117dff]" />
            </div>
            <div className="text-sm font-bold text-[#0a0a0a]">{t('agentswarm.runAll', 'Run All')}</div>
          </div>
          <p className="text-[10px] text-[#525252]">{t('agentswarm.runAllChain', 'Chain: F → Fe → T')}</p>
        </button>
      </div>

      {/* ── Config panel (slides down when agent selected) ── */}
      <AnimatePresence>
        {selected && !running && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="px-5 py-3">
              <div className="bg-white border border-[#e3e0db] rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Scope */}
                  <div className="flex items-center gap-1.5">
                    <Globe2 size={12} className="text-[#a3a3a3]" />
                    <select
                      value={scope}
                      onChange={e => setScope(e.target.value)}
                      className="text-xs border border-[#e3e0db] rounded-lg px-2 py-1.5 bg-[#faf9f4] text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40"
                    >
                      <option value="workspace">{t('agentswarm.scopeWorkspace', 'Workspace')}</option>
                      <option value="project">{t('agentswarm.scopeProject', 'Project')}</option>
                      <option value="graph">{t('agentswarm.scopeGraph', 'Graph')}</option>
                      <option value="region">{t('agentswarm.scopeRegion', 'Region')}</option>
                    </select>
                  </div>

                  {/* Project (if scope = project) */}
                  {scope === 'project' && (
                    <div className="flex items-center gap-1.5">
                      <Folder size={12} className="text-[#a3a3a3]" />
                      <input
                        type="text"
                        value={project}
                        onChange={e => setProject(e.target.value)}
                        placeholder={t('agentswarm.projectPlaceholder', 'Project name')}
                        className="text-xs border border-[#e3e0db] rounded-lg px-2 py-1.5 bg-[#faf9f4] w-40 focus:outline-none focus:border-[#117dff]/40"
                      />
                    </div>
                  )}

                  {/* Goal with presets */}
                  <div className="flex-1 min-w-[200px] flex gap-1">
                    <select
                      onChange={e => { if (e.target.value) setGoal(e.target.value); e.target.value = ''; }}
                      className="text-xs border border-[#e3e0db] rounded-lg px-2 py-1.5 bg-[#faf9f4] text-[#a3a3a3] focus:outline-none w-[130px] shrink-0"
                      defaultValue=""
                    >
                      <option value="" disabled>{t('agentswarm.presetsPlaceholder', 'Presets...')}</option>
                      {GOAL_PRESETS.map((p, i) => (
                        <option key={i} value={p.goal}>{p.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={goal}
                      onChange={e => setGoal(e.target.value)}
                      placeholder={selected === 'all' ? t('agentswarm.goalPlaceholderAll', 'Auto-optimized per agent') : t('agentswarm.goalPlaceholder', 'Custom goal (or pick a preset)')}
                      className="flex-1 text-xs border border-[#e3e0db] rounded-lg px-3 py-1.5 bg-[#faf9f4] focus:outline-none focus:border-[#117dff]/40"
                    />
                  </div>

                  {/* Dry run */}
                  <label className="flex items-center gap-1.5 text-xs text-[#525252] cursor-pointer">
                    <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} className="rounded" />
                    {t('agentswarm.dryRun', 'Dry run')}
                  </label>

                  {/* Run button */}
                  <button
                    onClick={() => selected === 'all' ? handleRunAll() : handleRunSingle(selected)}
                    disabled={running}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0a0a0a] text-white text-xs font-semibold hover:bg-[#1a1a1a] transition-colors disabled:opacity-40"
                  >
                    <Play size={12} />
                    {selected === 'all' ? t('agentswarm.runFullChain', 'Run Full Chain') : t('agentswarm.runAgent', 'Run {{name}}', { name: AGENTS.find(a => a.id === selected)?.name || '' })}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      {error && (
        <div className="shrink-0 px-5 pb-2">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle size={14} />
            {error}
          </div>
        </div>
      )}

      {/* ── Findings (fills remaining space) ── */}
      <div className="flex-1 px-5 pb-4 pt-2 overflow-y-auto">
        {!hasFindings && !running && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#faf9f4] border border-[#e3e0db] flex items-center justify-center mx-auto mb-3">
                <Sparkles size={24} className="text-[#a3a3a3]" />
              </div>
              <p className="text-sm text-[#525252] font-medium">{t('agentswarm.emptyPrompt', 'Select an agent and run to see findings')}</p>
              <p className="text-xs text-[#a3a3a3] mt-1">{t('agentswarm.emptyHint', 'Faraday scans → Feynman analyzes → Turing verifies and repairs')}</p>
            </div>
          </div>
        )}

        {/* Running progress */}
        {running && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-[#117dff] mx-auto mb-3" />
              <p className="text-sm text-[#525252] font-medium">
                {runPhase === 'faraday' && t('agentswarm.runningFaraday', 'Faraday is scanning your knowledge graph...')}
                {runPhase === 'feynman' && t('agentswarm.runningFeynman', 'Feynman is forming hypotheses...')}
                {runPhase === 'turing' && t('agentswarm.runningTuring', 'Turing is verifying and executing graph actions...')}
                {runPhase === 'hygiene' && t('agentswarm.runningHygiene', 'Scanning graph for cleanup opportunities...')}
              </p>
              <div className="flex items-center justify-center gap-4 mt-3">
                {AGENTS.map(a => (
                  <div key={a.id} className="flex items-center gap-1">
                    {results[a.id] ? <CheckCircle2 size={12} className="text-emerald-500" /> :
                     runPhase === a.id ? <Loader2 size={12} className="animate-spin" style={{ color: a.color }} /> :
                     <div className="w-3 h-3 rounded-full bg-[#e3e0db]" />}
                    <span className="text-[10px] text-[#a3a3a3]">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Findings panels */}
        {hasFindings && (
          <div className="space-y-3">
            {/* Faraday findings */}
            {faradayObs.length > 0 && (
              <FindingsPanel
                title={t('agentswarm.faradayScanTitle', 'Faraday Scan')}
                subtitle={t('agentswarm.observationsCount', '{{count}} observations', { count: faradayObs.length })}
                color="#f59e0b"
                icon={Search}
              >
                {faradayObs.map((obs, i) => (
                  <div key={obs.id || i} className="flex items-start gap-3 py-2 border-b border-[#f5f3ee] last:border-0">
                    <Eye size={13} className="text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#0a0a0a] line-clamp-2">
                        {typeof obs.content === 'object' ? obs.content.summary || JSON.stringify(obs.content).slice(0, 100) : String(obs.content).slice(0, 100)}
                      </p>
                    </div>
                    {obs.certainty != null && confBar(obs.certainty)}
                  </div>
                ))}
              </FindingsPanel>
            )}

            {/* Feynman hypotheses */}
            {feynmanHyps.length > 0 && (
              <FindingsPanel
                title={t('agentswarm.feynmanHypothesesTitle', 'Feynman Hypotheses')}
                subtitle={t('agentswarm.hypothesesCount', '{{count}} hypotheses', { count: feynmanHyps.length })}
                color="#8b5cf6"
                icon={Brain}
              >
                {feynmanHyps.map((hyp, i) => (
                  <div key={hyp.id || i} className="py-2 border-b border-[#f5f3ee] last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                        {(hyp.hypothesis_type || 'pattern').replace(/_/g, ' ')}
                      </span>
                      {confBar(hyp.confidence)}
                    </div>
                    <p className="text-xs text-[#0a0a0a] line-clamp-2">{hyp.summary}</p>
                    {hyp.why_now && <p className="text-[10px] text-[#a3a3a3] mt-0.5 line-clamp-1">{hyp.why_now}</p>}
                  </div>
                ))}
              </FindingsPanel>
            )}

            {/* Turing verifications */}
            {turingVerdicts.length > 0 && (
              <FindingsPanel
                title={t('agentswarm.turingVerificationsTitle', 'Turing Verifications')}
                subtitle={t('agentswarm.verdictsCount', '{{count}} verdicts', { count: turingVerdicts.length })}
                color="#10b981"
                icon={ShieldCheck}
              >
                {turingVerdicts.map((v, i) => (
                  <div key={v.id || i} className="py-2 border-b border-[#f5f3ee] last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      {verdictBadge(v.verdict)}
                      {confBar(v.confidence)}
                    </div>
                    <p className="text-xs text-[#0a0a0a] line-clamp-2">{v.summary}</p>
                    {v.graph_actions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {v.graph_actions.map((ga, j) => (
                          <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {ga.action?.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </FindingsPanel>
            )}

            {/* Graph Impact */}
            {graphActions && (
              <div className="bg-white border border-[#e3e0db] rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={14} className="text-[#117dff]" />
                  <h3 className="text-sm font-bold text-[#0a0a0a]">{t('agentswarm.graphImpactTitle', 'Graph Impact')}</h3>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[#525252]">{graphActions.executed} {t('agentswarm.executed', 'executed')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[#525252]">{graphActions.skipped} {t('agentswarm.skipped', 'skipped')}</span>
                  </div>
                  {graphActions.failed > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-[#525252]">{graphActions.failed} {t('agentswarm.failed', 'failed')}</span>
                    </div>
                  )}
                </div>
                {graphActions.results?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {graphActions.results.filter(r => r.status === 'executed').map((r, i) => (
                      <div key={i} className="text-[10px] text-[#525252] flex items-center gap-1.5">
                        <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                        <span className="font-medium">{r.action?.replace(/_/g, ' ')}</span>
                        {r.merged && <span>— {r.merged} {t('agentswarm.merged', 'merged')}</span>}
                        {r.relationships_created && <span>— {r.relationships_created} {t('agentswarm.relationships', 'relationships')}</span>}
                        {r.promoted_memory_id && <span>— {t('agentswarm.promotedToCanonical', 'promoted to canonical')}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Graph Hygiene Proposals (post-Turing) ── */}
        {/* Always render once Turing has completed OR a scan is running */}
        {(hygieneProposals.length > 0 || hygieneLoading || hygieneStats || results.turing) && (
          <div className="space-y-3 mt-3">
            <div className="bg-white border border-[#e3e0db] rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f5f3ee]">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-[#0a0a0a]">{t('agentswarm.cleanupApprovalsTitle', 'Cleanup Approvals')}</h3>
                  {hygieneStats && (
                    <span className="text-[10px] font-mono text-[#a3a3a3]">
                      {hygieneStats.scanned ?? 0} {t('agentswarm.scanned', 'scanned')} · {hygieneStats.issues ?? 0} {t('agentswarm.issues', 'issues')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {hygieneStats?.intent && (
                    <span
                      className="text-[10px] font-mono text-[#117dff] bg-[#117dff]/8 border border-[#117dff]/20 rounded px-2 py-0.5 max-w-[420px] truncate"
                      title={`Parsed by ${hygieneStats.intent.source}: ${JSON.stringify(hygieneStats.intent.filter)}`}
                    >
                      {t('agentswarm.understood', 'Understood:')} {hygieneStats.intent.summary}
                    </span>
                  )}
                  {hygieneProposals.length > 0 && hygieneStats?.queued_for_approval !== undefined && (
                    <span className="text-[10px] font-mono text-[#a3a3a3]">
                      {hygieneStats.queued_for_approval ?? hygieneProposals.length} {t('agentswarm.forApproval', 'for approval')}
                      {hygieneStats.llm_verified ? ` · ${t('agentswarm.llmVerified', 'LLM-verified')}: ${hygieneStats.llm_verified}` : ''}
                      {hygieneStats.llm_dropped ? ` · ${t('agentswarm.dropped', 'dropped')}: ${hygieneStats.llm_dropped}` : ''}
                    </span>
                  )}
                  {/* Approve All — runs each proposal w/ its suggestedAction */}
                  {hygieneProposals.filter(p => !executedIds.has(p.id) && !executingIds.has(p.id)).length > 0 && (
                    <button
                      onClick={async () => {
                        const pending = hygieneProposals.filter(p => !executedIds.has(p.id) && !executingIds.has(p.id));
                        // eslint-disable-next-line no-alert
                        if (!window.confirm(`Approve ALL ${pending.length} proposals? Each runs its suggested action (archive/delete/suppress). Reversible only for archive.`)) return;
                        // Run sequentially so failures don't cascade
                        for (const p of pending) {
                          await executeProposal(p, p.suggestedAction || 'archive');
                        }
                      }}
                      className="text-[10px] px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-semibold"
                      title={t('agentswarm.approveAllProposalsTitle', 'Approve every pending proposal at once')}
                    >
                      ▶ {t('agentswarm.approveAllProposals', 'Approve All')} ({hygieneProposals.filter(p => !executedIds.has(p.id) && !executingIds.has(p.id)).length})
                    </button>
                  )}

                  {/* Bulk Delete By Tag — only when NL intent is destructive + has explicit tag filter.
                      Two-step: dry-run preview match count → confirm → execute hard delete. */}
                  {hygieneStats?.intent?.safety_class === 'destructive'
                   && Array.isArray(hygieneStats?.intent?.filter?.tags)
                   && hygieneStats.intent.filter.tags.length > 0 && (
                    <button
                      onClick={async () => {
                        const f = hygieneStats.intent.filter;
                        try {
                          const dry = await apiClient.bulkDeleteByTag({
                            tags: f.tags,
                            date_from: f.date_from,
                            date_to: f.date_to,
                            dry_run: true,
                          });
                          const n = dry.matched_count || 0;
                          if (n === 0) {
                            // eslint-disable-next-line no-alert
                            window.alert('No memories match the tag/date filter. Nothing to delete.');
                            return;
                          }
                          // eslint-disable-next-line no-alert
                          if (!window.confirm(`Permanently delete ${n} memories matching:\n  tags: ${f.tags.join(', ')}\n  ${f.date_to ? `older than ${new Date(f.date_to).toLocaleDateString()}` : ''}\n  ${f.date_from ? `newer than ${new Date(f.date_from).toLocaleDateString()}` : ''}\n\nIncludes Qdrant vector purge. NOT reversible.`)) return;
                          let totalDeleted = 0;
                          for (let i = 0; i < 5; i++) {
                            const res = await apiClient.bulkDeleteByTag({
                              tags: f.tags,
                              date_from: f.date_from,
                              date_to: f.date_to,
                              dry_run: false,
                            });
                            totalDeleted += res.deleted || 0;
                            if (!res.matched || res.matched === 0) break;
                          }
                          // eslint-disable-next-line no-alert
                          window.alert(`Deleted ${totalDeleted} memories. Re-scanning graph...`);
                          await runHygieneScan();
                        } catch (err) {
                          console.error('Bulk delete by tag failed:', err);
                          // eslint-disable-next-line no-alert
                          window.alert(`Bulk delete failed: ${err?.response?.data?.message || err.message}`);
                        }
                      }}
                      className="text-[10px] px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold"
                      title={`Permanently delete every memory matching tags=[${hygieneStats.intent.filter.tags.join(', ')}]`}
                    >
                      {t('agentswarm.bulkDeleteMatching', '🗑 Bulk Delete Matching')}
                    </button>
                  )}
                  {/* Re-scan */}
                  <button
                    onClick={runHygieneScan}
                    disabled={hygieneLoading}
                    className="text-[10px] px-2 py-1 rounded-lg bg-[#faf9f4] text-[#525252] border border-[#e3e0db] hover:bg-[#f3f1ec] transition-colors disabled:opacity-40"
                  >
                    {hygieneLoading ? '…' : t('agentswarm.rescan', '↻ Re-scan')}
                  </button>
                </div>
              </div>

              {hygieneLoading && hygieneProposals.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-[#117dff]" />
                  <span className="text-xs text-[#a3a3a3] ml-2">{t('agentswarm.scanningGraph', 'Scanning graph health...')}</span>
                </div>
              )}

              {!hygieneLoading && hygieneProposals.length === 0 && hygieneStats && (
                <div className="px-4 py-10 text-center">
                  <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[#0a0a0a]">{t('agentswarm.nothingToClean', 'Nothing to clean.')}</p>
                  <p className="text-xs text-[#a3a3a3] mt-1">
                    {t('agentswarm.nothingToCleanHint', '{{count}} memories scanned. No proposals after LLM verification.', { count: hygieneStats.scanned ?? 0 })}
                  </p>
                  <button
                    onClick={runHygieneScan}
                    className="mt-3 text-[10px] px-3 py-1 rounded-lg bg-[#faf9f4] text-[#525252] border border-[#e3e0db] hover:bg-[#f3f1ec] transition-colors"
                  >
                    {t('agentswarm.runAgain', '↻ Run again')}
                  </button>
                </div>
              )}

              {!hygieneLoading && hygieneProposals.length === 0 && !hygieneStats && results.turing && (
                <div className="px-4 py-10 text-center">
                  <AlertTriangle size={20} className="text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[#0a0a0a]">{t('agentswarm.runCleanupScanTitle', 'Run the cleanup scan')}</p>
                  <p className="text-xs text-[#a3a3a3] mt-1">{t('agentswarm.runCleanupScanHint', 'Turing finished but no hygiene scan triggered. Click below.')}</p>
                  <button
                    onClick={runHygieneScan}
                    className="mt-3 text-[11px] px-3 py-1.5 rounded-lg bg-[#117dff] text-white hover:bg-[#0066e0] transition-colors font-semibold"
                  >
                    {t('agentswarm.scanGraphForCleanup', '▶ Scan graph for cleanup')}
                  </button>
                </div>
              )}

              <div className="max-h-[400px] overflow-y-auto">
                {hygieneProposals.map(proposal => {
                  const isExecuted = executedIds.has(proposal.id);
                  const isExecuting = executingIds.has(proposal.id);
                  const memories = proposal.memories || [];
                  const catColors = {
                    duplicate: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                    noise: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
                    stale: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                    orphan: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
                    artifact: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                    contradiction: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                  };
                  const cc = catColors[proposal.category] || catColors.stale;

                  return (
                    <div
                      key={proposal.id}
                      className={`px-4 py-3 border-b border-[#f5f3ee] last:border-0 transition-all ${isExecuted ? 'opacity-40 bg-[#faf9f4]' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cc.bg} ${cc.text} border ${cc.border}`}>
                              {proposal.category}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${proposal.severity === 'high' ? 'bg-red-100 text-red-700' : proposal.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                              {proposal.severity}
                            </span>
                            {confBar(proposal.confidence)}
                          </div>
                          {/* Plain English reason — prefer LLM output, fall back to heuristic */}
                          <p className="text-xs text-[#0a0a0a] font-medium mb-1">
                            {proposal.llmReason || proposal.plainEnglishReason || proposal.reason}
                          </p>
                          {/* Verdict chip for transparency */}
                          {proposal.verdict && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-[0.06em] ${
                                proposal.verdict === 'confirm'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : proposal.verdict === 'low_confidence'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-gray-100 text-gray-600'
                              }`}>
                                {proposal.verdict === 'confirm' ? t('agentswarm.verdictLlmVerified', 'LLM-verified') : proposal.verdict === 'low_confidence' ? t('agentswarm.verdictNeedsReview', 'Needs your review') : proposal.verdict}
                              </span>
                              {proposal.llmReason && proposal.reason && (
                                <span className="text-[9px] text-[#a3a3a3] font-mono">{t('agentswarm.heuristic', 'heuristic:')} {proposal.reason.slice(0, 80)}{proposal.reason.length > 80 ? '…' : ''}</span>
                              )}
                            </div>
                          )}
                          {/* Memory list — show the action target chip
                              based on suggestedAction, not is_canonical.
                              keep   = canonical reference to preserve
                              delete = will be hard-deleted on approve
                              archive = will be marked is_latest=false
                              link    = will be linked to canonical newer */}
                          <div className="space-y-0.5">
                            {memories.slice(0, 3).map(m => {
                              let chip = null;
                              if (proposal.category === 'targeted' || (m.role && m.role !== 'newer')) {
                                if (proposal.suggestedAction === 'delete') {
                                  chip = <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-700">{t('agentswarm.chipDelete', 'delete')}</span>;
                                } else if (proposal.suggestedAction === 'archive' || proposal.suggestedAction === 'archive_duplicates') {
                                  chip = <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700">{t('agentswarm.chipArchive', 'archive')}</span>;
                                } else if (proposal.suggestedAction === 'link_update_chain') {
                                  chip = <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700">{t('agentswarm.chipLink', 'link')}</span>;
                                } else if (proposal.suggestedAction === 'suppress') {
                                  chip = <span className="text-[9px] px-1 py-0.5 rounded bg-gray-200 text-gray-700">{t('agentswarm.chipSuppress', 'suppress')}</span>;
                                }
                              } else if (m.is_canonical) {
                                chip = <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">{t('agentswarm.chipKeep', 'keep')}</span>;
                              }
                              return (
                                <div key={m.id} className="flex items-center gap-1.5 text-[10px]">
                                  {chip}
                                  <span className="text-[#a3a3a3] font-mono">{m.id?.slice(0, 8)}</span>
                                  <span className="text-[#525252] truncate">{m.title || m.content_preview || '—'}</span>
                                </div>
                              );
                            })}
                            {memories.length > 3 && (
                              <span className="text-[10px] text-[#a3a3a3]">+{memories.length - 3} {t('agentswarm.more', 'more')}</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="shrink-0 flex flex-col gap-1">
                          {isExecuted ? (
                            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle2 size={12} /> {t('agentswarm.done', 'Done')}
                            </span>
                          ) : isExecuting ? (
                            <Loader2 size={14} className="animate-spin text-[#117dff]" />
                          ) : (
                            <>
                              {/* No 'Merge' action — policy: never fuse content. */}
                              {/* Approve = run the safe action for this category   */}
                              <button
                                onClick={() => executeProposal(proposal, proposal.suggestedAction || 'archive')}
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium"
                                title={`Run ${proposal.suggestedAction || 'archive'} on this memory`}
                              >
                                {t('agentswarm.approve', 'Approve')}
                              </button>
                              <button
                                onClick={() => setExecutedIds(prev => new Set([...prev, proposal.id]))}
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-[#faf9f4] text-[#525252] border border-[#e3e0db] hover:bg-[#f3f1ec] transition-colors font-medium"
                                title={t('agentswarm.skipTitle', 'Skip this proposal — no action taken')}
                              >
                                {t('agentswarm.skip', 'Skip')}
                              </button>
                              <button
                                onClick={() => executeProposal(proposal, 'delete')}
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors font-medium"
                                title={t('agentswarm.deleteTitle', 'Permanently delete (cannot undo)')}
                              >
                                {t('agentswarm.delete', 'Delete')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Findings Panel (collapsible) ──────────────────────────── */

function FindingsPanel({ title, subtitle, color, icon: Icon, children }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white border border-[#e3e0db] rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#faf9f4] transition-colors"
      >
        <Icon size={14} style={{ color }} />
        <h3 className="text-sm font-bold text-[#0a0a0a] flex-1">{title}</h3>
        <span className="text-[10px] text-[#a3a3a3] font-mono">{subtitle}</span>
        <ChevronDown size={14} className={`text-[#a3a3a3] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 max-h-[200px] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
