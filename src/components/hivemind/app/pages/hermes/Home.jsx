/**
 * Hermes Agents v2 — Home tab
 *
 * CONTRACT (props received from HermesAgents shell):
 *   agent      {object|null}  The tenant's Hermes agent record from GET /hermes/agent.
 *                             Shape: { id, name, status, config, tenant_id, created_at, updated_at }
 *                             null while loading or when not enabled.
 *   apiClient  {object}       The shared HiveMindApiClient singleton (api-client.js).
 *                             Relevant methods:
 *                               apiClient.listHermesRuns(id)
 *                               apiClient.listHermesApprovals(id)
 *                               apiClient.pauseHermesAgent(id)
 *                               apiClient.resumeHermesAgent(id)
 *   refresh    {function}     Call to re-fetch agent state from the shell. () => void
 */

import React, { useState, useEffect, useCallback } from 'react';
import ModelCard from './ModelCard';
import BrowserCard from './BrowserCard';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Pause,
  Play,
  Activity,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function capabilityLine(config) {
  if (!config) return 'General-purpose autonomous agent.';
  if (typeof config === 'string') return config;
  const { description, capabilities, tools } = config;
  if (description) return description;
  if (Array.isArray(capabilities) && capabilities.length > 0) {
    return `Capable of: ${capabilities.slice(0, 3).join(', ')}${capabilities.length > 3 ? ' and more' : ''}.`;
  }
  if (Array.isArray(tools) && tools.length > 0) {
    return `Equipped with ${tools.length} tool${tools.length !== 1 ? 's' : ''}.`;
  }
  return 'General-purpose autonomous agent.';
}

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  active:   { bg: 'bg-emerald-500/10', text: 'text-[#16a34a]', dot: 'bg-[#16a34a]', label: 'Active' },
  running:  { bg: 'bg-emerald-500/10', text: 'text-[#16a34a]', dot: 'bg-[#16a34a]', label: 'Running' },
  paused:   { bg: 'bg-amber-500/10',   text: 'text-amber-700',  dot: 'bg-amber-500', label: 'Paused' },
  archived: { bg: 'bg-[#f3f1ec]',      text: 'text-[#737373]',  dot: 'bg-[#a3a3a3]', label: 'Archived' },
  error:    { bg: 'bg-red-500/10',     text: 'text-[#dc2626]',  dot: 'bg-[#dc2626]', label: 'Error' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.archived;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Run status badge ─────────────────────────────────────────────────────────

const RUN_STATUS = {
  success:   { Icon: CheckCircle2, color: 'text-[#16a34a]', label: 'Success' },
  completed: { Icon: CheckCircle2, color: 'text-[#16a34a]', label: 'Completed' },
  failed:    { Icon: XCircle,      color: 'text-[#dc2626]', label: 'Failed' },
  error:     { Icon: XCircle,      color: 'text-[#dc2626]', label: 'Error' },
  running:   { Icon: RefreshCw,    color: 'text-[#117dff]', label: 'Running' },
  pending:   { Icon: Clock,        color: 'text-amber-600',  label: 'Pending' },
  paused:    { Icon: Pause,        color: 'text-amber-600',  label: 'Paused' },
};

function RunStatusIcon({ status }) {
  const cfg = RUN_STATUS[status] || { Icon: Clock, color: 'text-[#a3a3a3]', label: status || '—' };
  const { Icon, color } = cfg;
  return <Icon size={14} className={`${color} shrink-0`} />;
}

// ─── Empty activity state ─────────────────────────────────────────────────────

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Activity size={22} className="text-[#a3a3a3] mb-2" />
      <p className="text-[12px] text-[#737373]">No recent activity yet.</p>
      <p className="text-[11px] text-[#a3a3a3] mt-0.5">Runs will appear here once the agent starts working.</p>
    </div>
  );
}

// ─── Home tab ─────────────────────────────────────────────────────────────────

export default function Home({ agent, apiClient, refresh }) {
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchRuns = useCallback(async () => {
    if (!agent?.id) return;
    setRunsLoading(true);
    setRunsError(null);
    try {
      const data = await apiClient.listHermesRuns(agent.id);
      setRuns(data?.runs || []);
    } catch (err) {
      setRunsError(err?.response?.data?.error || err?.message || 'Failed to load runs.');
    } finally {
      setRunsLoading(false);
    }
  }, [agent?.id, apiClient]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handlePauseResume = useCallback(async () => {
    if (!agent?.id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (agent.status === 'paused') {
        await apiClient.resumeHermesAgent(agent.id);
      } else {
        await apiClient.pauseHermesAgent(agent.id);
      }
      refresh();
    } catch (err) {
      setActionError(err?.response?.data?.error || err?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  }, [agent, apiClient, refresh]);

  // ── No agent ────────────────────────────────────────────────────────────────
  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-[#f3f1ec] flex items-center justify-center mb-3">
          <Cpu size={20} className="text-[#a3a3a3]" />
        </div>
        <p className="text-[13px] text-[#737373]">Agent data unavailable.</p>
      </div>
    );
  }

  const isPaused = agent.status === 'paused';
  const canPauseResume = ['active', 'running', 'paused'].includes(agent.status);
  const recentRuns = runs.slice(0, 10);

  return (
    <div className="p-6 space-y-5 font-['Space_Grotesk'] max-w-2xl">

      <ModelCard agent={agent} apiClient={apiClient} />

      <BrowserCard agent={agent} apiClient={apiClient} />

      {/* ── Agent status card ──────────────────────────────────────────────── */}
      <section
        className="rounded-[10px] border border-[#e3e0db] bg-white p-5"
        aria-label="Agent status"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[10px] border bg-[#117dff]/10 border-[#117dff]/20 flex items-center justify-center shrink-0">
              <Cpu size={18} className="text-[#117dff]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-[#0a0a0a] truncate">
                {agent.name || 'Hermes Agent'}
              </h2>
              <p className="text-[11px] text-[#737373] mt-0.5 line-clamp-2">
                {capabilityLine(agent.config)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusPill status={agent.status} />
          </div>
        </div>

        {/* Pause / Resume action */}
        {canPauseResume && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handlePauseResume}
              disabled={actionLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isPaused
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-[#16a34a] hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-700 hover:bg-amber-500/20'
              }`}
              aria-label={isPaused ? 'Resume agent' : 'Pause agent'}
            >
              {actionLoading
                ? <RefreshCw size={11} className="animate-spin" />
                : isPaused
                  ? <Play size={11} />
                  : <Pause size={11} />
              }
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            {actionError && (
              <span className="text-[10px] text-[#dc2626] flex items-center gap-1">
                <AlertCircle size={11} />
                {actionError}
              </span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="mt-4 pt-3 border-t border-[#f3f1ec] flex flex-wrap gap-x-5 gap-y-1">
          {agent.created_at && (
            <span className="text-[10px] text-[#a3a3a3]">
              Created {relativeTime(agent.created_at)}
            </span>
          )}
          {agent.updated_at && (
            <span className="text-[10px] text-[#a3a3a3]">
              Updated {relativeTime(agent.updated_at)}
            </span>
          )}
          {agent.id && (
            <span className="text-[10px] font-mono text-[#a3a3a3] truncate max-w-[180px]" title={agent.id}>
              {agent.id}
            </span>
          )}
        </div>
      </section>

      {/* ── Recent activity feed ───────────────────────────────────────────── */}
      <section
        className="rounded-[10px] border border-[#e3e0db] bg-white"
        aria-label="Recent activity"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#f3f1ec]">
          <h3 className="text-[12px] font-semibold text-[#0a0a0a]">Recent activity</h3>
          <button
            onClick={fetchRuns}
            disabled={runsLoading}
            className="text-[#a3a3a3] hover:text-[#525252] transition-colors p-0.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh activity"
          >
            <RefreshCw size={12} className={runsLoading ? 'animate-spin' : ''} />
          </button>
        </header>

        <div className="divide-y divide-[#f3f1ec]">
          {runsLoading && recentRuns.length === 0 && (
            <div className="flex items-center justify-center py-10">
              <RefreshCw size={16} className="animate-spin text-[#a3a3a3]" />
            </div>
          )}

          {runsError && (
            <div className="flex items-center gap-2 px-4 py-4">
              <AlertCircle size={13} className="text-[#dc2626] shrink-0" />
              <span className="text-[11px] text-[#dc2626]">{runsError}</span>
            </div>
          )}

          {!runsLoading && !runsError && recentRuns.length === 0 && (
            <EmptyActivity />
          )}

          {recentRuns.map((run) => (
            <div
              key={run.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-[#faf9f4] transition-colors"
            >
              <div className="mt-0.5">
                <RunStatusIcon status={run.status} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#0a0a0a] truncate">
                  {run.action || run.task || 'Run'}
                </p>
                {run.result && typeof run.result === 'string' && (
                  <p className="text-[10px] text-[#737373] mt-0.5 line-clamp-1">
                    {run.result}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-[#a3a3a3] shrink-0 mt-0.5">
                {relativeTime(run.updated_at || run.created_at)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
