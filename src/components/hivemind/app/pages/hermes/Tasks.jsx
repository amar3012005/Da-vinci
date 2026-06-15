/**
 * Hermes Agents v2 — Tasks tab
 *
 * CONTRACT (props received from HermesAgents shell):
 *   agent      {object|null}  The tenant's Hermes agent record from GET /hermes/agent.
 *                             Shape: { id, name, status, config, tenant_id, created_at, updated_at }
 *                             null while loading or when not enabled.
 *   apiClient  {object}       The shared HiveMindApiClient singleton (api-client.js).
 *                             Relevant methods:
 *                               apiClient.listHermesRuns(id)          — recent run history
 *                               apiClient.runHermesAgent(id, payload) — trigger a task
 *   refresh    {function}     Call to re-fetch agent state from the shell.
 *                             Signature: () => void
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ListTodo,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link2,
  Check,
} from 'lucide-react';
import apiClient from '../../shared/api-client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRunTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function extractErrorText(err) {
  if (!err) return 'An unexpected error occurred.';
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.detail) return err.response.data.detail;
  if (err.response?.status === 502) return 'The agent runtime is temporarily unavailable (502). Please try again shortly.';
  if (err.response?.status === 503) return 'Service unavailable. The agent may be paused or unreachable.';
  return err.message || 'An unexpected error occurred.';
}

// ─── Run status pill ──────────────────────────────────────────────────────────

const RUN_STATUS = {
  completed: { bg: 'bg-emerald-500/10', text: 'text-[#16a34a]', Icon: CheckCircle2 },
  success:   { bg: 'bg-emerald-500/10', text: 'text-[#16a34a]', Icon: CheckCircle2 },
  failed:    { bg: 'bg-red-500/10',     text: 'text-[#dc2626]', Icon: XCircle      },
  error:     { bg: 'bg-red-500/10',     text: 'text-[#dc2626]', Icon: XCircle      },
  running:   { bg: 'bg-blue-500/10',    text: 'text-blue-700',  Icon: RefreshCw    },
  pending:   { bg: 'bg-[#f3f1ec]',      text: 'text-[#737373]', Icon: Clock        },
};

function RunStatusPill({ status }) {
  const s = RUN_STATUS[status] || RUN_STATUS.pending;
  const { Icon } = s;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.text}`}>
      <Icon size={10} className={status === 'running' ? 'animate-spin' : ''} />
      {status}
    </span>
  );
}

// ─── Single run history card ──────────────────────────────────────────────────

function RunCard({ run, agentId }) {
  const [expanded, setExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareInfo, setShareInfo] = useState(null); // { url, expires_at }
  const [copied, setCopied] = useState(false);

  const isFailed = run.status === 'failed' || run.status === 'error';
  const resultText = run.result
    ? (typeof run.result === 'string' ? run.result : JSON.stringify(run.result, null, 2))
    : null;
  const payloadText = run.payload
    ? (typeof run.payload === 'string' ? run.payload : JSON.stringify(run.payload, null, 2))
    : null;
  const actionLabel = run.action || 'task';

  return (
    <div
      className={`rounded-[10px] border bg-white p-4 transition-colors ${
        isFailed ? 'border-red-200' : 'border-[#e3e0db]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#0a0a0a] truncate">{actionLabel}</p>
          <p className="text-[10px] text-[#a3a3a3] font-mono mt-0.5">{formatRunTime(run.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RunStatusPill status={run.status} />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[#a3a3a3] hover:text-[#525252] p-0.5 rounded transition-colors"
            aria-label={expanded ? 'Collapse run details' : 'Expand run details'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Payload preview (always shown, truncated) */}
      {payloadText && !expanded && (
        <p className="mt-2 text-[11px] text-[#525252] line-clamp-2 break-words">{payloadText}</p>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {payloadText && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#a3a3a3] mb-1">Payload</p>
              <pre className="text-[11px] text-[#334155] bg-[#faf9f4] border border-[#e3e0db] rounded-[6px] p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                {payloadText}
              </pre>
            </div>
          )}
          {resultText && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#a3a3a3] mb-1">Result</p>
              <pre className={`text-[11px] bg-[#faf9f4] border rounded-[6px] p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto ${
                isFailed ? 'border-red-200 text-[#dc2626]' : 'border-[#e3e0db] text-[#334155]'
              }`}>
                {resultText}
              </pre>
            </div>
          )}
          {!resultText && (
            <p className="text-[11px] text-[#a3a3a3] italic">No result recorded.</p>
          )}

          {/* View-as-HTML + temporary share link — only for succeeded runs with output. */}
          {resultText && !isFailed && agentId && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.open(apiClient.hermesRunHtmlUrl(agentId, run.id), '_blank', 'noopener')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-[#117dff] border border-[#cfe2ff] bg-[#f5f9ff] hover:bg-[#eaf3ff] transition-colors"
              >
                <ExternalLink size={12} /> View as HTML
              </button>
              <button
                type="button"
                disabled={sharing}
                onClick={async () => {
                  setSharing(true);
                  try {
                    const info = await apiClient.shareHermesRun(agentId, run.id);
                    setShareInfo(info);
                    try { await navigator.clipboard.writeText(info.url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch (_) {}
                  } catch (_) { /* surfaced inline below */ }
                  finally { setSharing(false); }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-[#525252] border border-[#e3e0db] bg-white hover:bg-[#faf9f4] hover:text-[#0a0a0a] transition-colors disabled:opacity-50"
              >
                {copied ? <Check size={12} /> : <Link2 size={12} />}
                {copied ? 'Link copied' : sharing ? 'Creating…' : 'Share link'}
              </button>
              {shareInfo?.url && (
                <span className="text-[10px] text-[#a3a3a3] truncate max-w-[260px]" title={shareInfo.url}>
                  {shareInfo.url} · expires {new Date(shareInfo.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RunResult: inline result of the just-submitted task ─────────────────────

function RunResult({ result, error }) {
  if (error) {
    return (
      <div className="rounded-[10px] border border-red-200 bg-red-50 p-4 flex gap-3">
        <AlertCircle size={16} className="text-[#dc2626] shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#dc2626] mb-1">Run failed</p>
          <p className="text-[11px] text-[#dc2626] break-words">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const statusStyle = result.status === 'failed' || result.status === 'error'
    ? 'border-red-200 bg-red-50'
    : 'border-emerald-200 bg-emerald-50';

  const resultText = result.result
    ? (typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2))
    : null;

  return (
    <div className={`rounded-[10px] border p-4 ${statusStyle}`}>
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 size={14} className="text-[#16a34a]" />
        <p className="text-[12px] font-semibold text-[#0a0a0a]">Task queued</p>
        {result.job_id && (
          <span className="text-[10px] font-mono text-[#a3a3a3] ml-auto">{result.job_id}</span>
        )}
      </div>
      {result.status && (
        <p className="text-[11px] text-[#525252] mb-1">
          Status: <span className="font-semibold">{result.status}</span>
        </p>
      )}
      {resultText && (
        <pre className="mt-2 text-[11px] text-[#334155] bg-white/70 border border-[#e3e0db] rounded-[6px] p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
          {resultText}
        </pre>
      )}
    </div>
  );
}

// ─── Tasks tab ───────────────────────────────────────────────────────────────

export default function Tasks({ agent, apiClient, refresh }) {
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState(null);

  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState(null);

  // ── Load run history ──────────────────────────────────────────────────────
  const loadRuns = useCallback(async () => {
    if (!agent?.id) return;
    setRunsLoading(true);
    setRunsError(null);
    try {
      const data = await apiClient.listHermesRuns(agent.id);
      setRuns(data?.runs || []);
    } catch (err) {
      setRunsError(extractErrorText(err));
    } finally {
      setRunsLoading(false);
    }
  }, [agent, apiClient]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // ── Submit task ───────────────────────────────────────────────────────────
  const handleRun = async () => {
    const trimmedTask = task.trim();
    if (!trimmedTask || !agent?.id || running) return;

    setRunning(true);
    setRunResult(null);
    setRunError(null);

    try {
      const payload = { task: trimmedTask };
      if (context.trim()) payload.context = context.trim();

      const result = await apiClient.runHermesAgent(agent.id, payload);
      setRunResult(result);
      setTask('');
      setContext('');
      // Refresh run history + agent state after successful run
      await loadRuns();
      refresh();
    } catch (err) {
      setRunError(extractErrorText(err));
    } finally {
      setRunning(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !running) {
      e.preventDefault();
      handleRun();
    }
  };

  // ── No agent guard ────────────────────────────────────────────────────────
  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-[#f3f1ec] flex items-center justify-center mb-3">
          <ListTodo size={20} className="text-[#a3a3a3]" />
        </div>
        <p className="text-[14px] font-semibold text-[#0a0a0a]">Agent not available</p>
        <p className="text-[11px] text-[#737373] mt-1">
          The Hermes agent record has not loaded yet.
        </p>
      </div>
    );
  }

  const canRun = !!task.trim() && !running;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Top: task compose area ─────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-[#e3e0db] shrink-0">
        <h2 className="text-[14px] font-semibold text-[#0a0a0a] mb-1">Run a task</h2>
        <p className="text-[11px] text-[#737373] mb-4">
          Describe what Hermes should do in plain English. Press
          {' '}<kbd className="font-mono text-[#525252] bg-[#f3f1ec] rounded px-1">Cmd+Enter</kbd>
          {' '}or click Run to submit.
        </p>

        {/* Task textarea */}
        <div className="mb-3">
          <label htmlFor="hermes-task" className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a3a3a3] mb-1.5">
            Task
          </label>
          <textarea
            id="hermes-task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="e.g. Summarise the last 7 days of memory activity and flag any blockers…"
            disabled={running}
            className="w-full resize-none rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] px-3.5 py-2.5 text-[13px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff] disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Optional context textarea */}
        <div className="mb-4">
          <label htmlFor="hermes-context" className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a3a3a3] mb-1.5">
            Context <span className="normal-case font-normal text-[#a3a3a3]">(optional)</span>
          </label>
          <textarea
            id="hermes-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Additional background or constraints…"
            disabled={running}
            className="w-full resize-none rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] px-3.5 py-2.5 text-[13px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff] disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Run button */}
        <button
          type="button"
          onClick={handleRun}
          disabled={!canRun}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[#117dff] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0066e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {running ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Send size={14} />
              Run
            </>
          )}
        </button>
      </div>

      {/* ── Middle: inline run result ──────────────────────────────────────── */}
      {(runResult || runError) && (
        <div className="px-6 pt-4 pb-0 shrink-0">
          <RunResult result={runResult} error={runError} />
        </div>
      )}

      {/* ── Bottom: past runs list ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a3a3a3]">
            Past runs
          </h3>
          <button
            type="button"
            onClick={loadRuns}
            disabled={runsLoading}
            className="text-[#a3a3a3] hover:text-[#525252] p-0.5 rounded transition-colors disabled:opacity-40"
            aria-label="Refresh run history"
          >
            <RefreshCw size={12} className={runsLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {runsError && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2 mb-3">
            <AlertCircle size={14} className="text-[#dc2626] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#dc2626]">{runsError}</p>
          </div>
        )}

        {runsLoading && runs.length === 0 && (
          <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3] py-4">
            <RefreshCw size={12} className="animate-spin" />
            Loading run history…
          </div>
        )}

        {!runsLoading && !runsError && runs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-[#f3f1ec] flex items-center justify-center mb-2">
              <ListTodo size={16} className="text-[#a3a3a3]" />
            </div>
            <p className="text-[12px] text-[#737373]">No runs yet.</p>
            <p className="text-[10px] text-[#a3a3a3] mt-0.5">Submit a task above to get started.</p>
          </div>
        )}

        {runs.length > 0 && (
          <div className="space-y-3">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} agentId={agent.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
