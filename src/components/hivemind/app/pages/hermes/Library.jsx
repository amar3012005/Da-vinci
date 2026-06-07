/**
 * Hermes Agents v2 — Library tab
 *
 * CONTRACT (props received from HermesAgents shell):
 *   agent      {object|null}  The tenant's Hermes agent record.
 *                             Shape: { id, name, status, config, tenant_id, created_at, updated_at }
 *                             null while loading or when not enabled.
 *   apiClient  {object}       HiveMindApiClient singleton (api-client.js).
 *                               apiClient.getHermesLibrary()       → { items: [...] }
 *                               apiClient.runHermesLibrary(id, payload) → { job_id, status, result? }
 *   refresh    {function}     () => void — re-fetches agent from shell after mutations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Play, RefreshCw, AlertCircle, ChevronUp, CheckCircle, XCircle, Loader } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errMessage(e) {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'An unexpected error occurred.';
}

// ─── RunBox — inline task input + result display ───────────────────────────────

function RunBox({ item, apiClient, onClose }) {
  const [task, setTask] = useState(item.suggestedTask || item.suggested_task || '');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRun = useCallback(async () => {
    if (!task.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const data = await apiClient.runHermesLibrary(item.id, { task: task.trim() });
      setResult(data);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setRunning(false);
    }
  }, [task, item.id, apiClient]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleRun();
    }
  };

  return (
    <div className="mt-3 rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] p-3 space-y-2">
      {/* Task textarea */}
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] block mb-1">
          Task
        </span>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="Describe what you want Hermes to do…"
          disabled={running}
          className="w-full resize-none rounded-[6px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a] placeholder-[#a3a3a3] focus:outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]/20 disabled:opacity-60 transition-colors"
        />
        <p className="text-[10px] text-[#a3a3a3] mt-0.5">
          Cmd+Enter to run
        </p>
      </label>

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleRun}
          disabled={running || !task.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#117dff] text-white text-[11px] font-semibold hover:bg-[#0066e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {running ? (
            <Loader size={11} className="animate-spin" />
          ) : (
            <Play size={11} />
          )}
          {running ? 'Running…' : 'Run'}
        </button>
        <button
          onClick={onClose}
          disabled={running}
          className="text-[11px] text-[#737373] hover:text-[#0a0a0a] disabled:opacity-50 transition-colors px-2 py-1.5"
        >
          Cancel
        </button>
      </div>

      {/* Result */}
      {result && !error && (
        <div className="rounded-[6px] border border-[#16a34a]/20 bg-[#16a34a]/5 p-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-[#16a34a] shrink-0" />
            <span className="text-[10px] font-semibold text-[#16a34a]">
              {result.status === 'queued' ? 'Queued' : 'Done'}
              {result.job_id ? ` — job ${result.job_id}` : ''}
            </span>
          </div>
          {result.result && (
            <pre className="text-[11px] text-[#0a0a0a] whitespace-pre-wrap break-words font-['JetBrains_Mono','Fira_Code',monospace] leading-relaxed max-h-48 overflow-y-auto">
              {typeof result.result === 'string'
                ? result.result
                : JSON.stringify(result.result, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-[6px] border border-[#dc2626]/20 bg-[#dc2626]/5 p-2.5 flex items-start gap-2">
          <XCircle size={12} className="text-[#dc2626] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#dc2626] leading-snug">{error}</p>
        </div>
      )}
    </div>
  );
}

// ─── LibraryCard ──────────────────────────────────────────────────────────────

function LibraryCard({ item, apiClient }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => setExpanded((prev) => !prev);

  return (
    <article className="rounded-[10px] border border-[#e3e0db] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow p-4">
      {/* Card header */}
      <div className="flex items-start gap-3">
        {/* Icon badge */}
        <div className="w-9 h-9 rounded-[8px] bg-[#117dff]/10 border border-[#117dff]/15 flex items-center justify-center shrink-0 mt-0.5">
          <BookOpen size={15} className="text-[#117dff]" />
        </div>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[13px] font-semibold text-[#0a0a0a] leading-snug">
              {item.name || 'Unnamed template'}
            </h3>
            {item.version && (
              <span className="text-[9px] font-mono text-[#a3a3a3] bg-[#f3f1ec] px-1.5 py-0.5 rounded-[4px] border border-[#e3e0db]">
                v{item.version}
              </span>
            )}
          </div>
          {(item.description || item.blurb) && (
            <p className="text-[11px] text-[#525252] mt-1 leading-relaxed line-clamp-2">
              {item.description || item.blurb}
            </p>
          )}
        </div>

        {/* Run button — toggles the inline RunBox */}
        <button
          onClick={toggleExpanded}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-semibold shrink-0 transition-colors ${
            expanded
              ? 'bg-[#f3f1ec] text-[#525252] hover:bg-[#eae7e1]'
              : 'bg-[#117dff] text-white hover:bg-[#0066e0]'
          }`}
          aria-expanded={expanded}
          aria-label={expanded ? `Close ${item.name}` : `Run ${item.name}`}
        >
          {expanded ? (
            <>
              <ChevronUp size={11} />
              Close
            </>
          ) : (
            <>
              <Play size={11} />
              Run
            </>
          )}
        </button>
      </div>

      {/* Inline RunBox */}
      {expanded && (
        <RunBox
          item={item}
          apiClient={apiClient}
          onClose={toggleExpanded}
        />
      )}
    </article>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-14 h-14 rounded-full bg-[#f3f1ec] flex items-center justify-center mb-4">
        <BookOpen size={22} className="text-[#a3a3a3]" />
      </div>
      <p className="text-[14px] font-semibold text-[#0a0a0a]">No templates yet</p>
      <p className="text-[11px] text-[#737373] mt-1 max-w-xs leading-relaxed">
        The Hermes library is empty. Templates will appear here once they are published to your workspace.
      </p>
    </div>
  );
}

// ─── Library (shell contract default export) ──────────────────────────────────

export default function Library({ apiClient }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getHermesLibrary();
      const list = data?.templates ?? data?.items;
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <RefreshCw size={18} className="animate-spin text-[#a3a3a3]" />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-[#dc2626]/10 flex items-center justify-center mb-3">
          <AlertCircle size={20} className="text-[#dc2626]" />
        </div>
        <p className="text-[13px] font-semibold text-[#0a0a0a]">Failed to load library</p>
        <p className="text-[11px] text-[#737373] mt-1 max-w-xs">{error}</p>
        <button
          onClick={load}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#e3e0db] text-[11px] font-medium text-[#525252] hover:bg-[#f3f1ec] transition-colors"
        >
          <RefreshCw size={11} />
          Retry
        </button>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-full">
        <EmptyLibrary />
      </div>
    );
  }

  // ── Card grid ─────────────────────────────────────────────────────────────
  return (
    <section className="flex-1 flex flex-col min-h-full p-5">
      {/* Section header */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[#0a0a0a]">Library</h2>
          <p className="text-[11px] text-[#737373] mt-0.5">
            {items.length} template{items.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-[6px] text-[#a3a3a3] hover:text-[#525252] hover:bg-[#f3f1ec] transition-colors"
          aria-label="Refresh library"
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </header>

      {/* Cards */}
      <div className="space-y-3">
        {items.map((item) => (
          <LibraryCard key={item.id} item={item} apiClient={apiClient} />
        ))}
      </div>
    </section>
  );
}
