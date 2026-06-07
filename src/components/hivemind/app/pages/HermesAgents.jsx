import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cpu,
  Plus,
  RefreshCw,
  Pause,
  Play,
  Activity,
  ChevronRight,
  ChevronDown,
  X,
  Zap,
  AlertCircle,
  CheckCircle2,
  ShieldQuestion,
} from 'lucide-react';
import apiClient from '../shared/api-client';

// Phase 6f — Hermes Agents roster. One card per per-tenant Hermes profile agent.
// Wired to the 6e control-plane APIs (apiClient.*HermesAgent*). The backend is
// DEFAULT-OFF (HERMES_MANAGER_ENABLED): when the manager is disabled the list
// endpoint 404s, which we surface as a calm "not enabled" state — never an error.

function errMessage(e) {
  return e?.response?.data?.error || e?.message || 'Something went wrong';
}
function errStatus(e) {
  return e?.response?.status || null;
}

function formatTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

const STATUS_STYLES = {
  active:    { bg: 'bg-emerald-500/10', text: 'text-[#16a34a]', dot: 'bg-[#16a34a]', label: 'Active' },
  running:   { bg: 'bg-emerald-500/10', text: 'text-[#16a34a]', dot: 'bg-[#16a34a]', label: 'Active' },
  paused:    { bg: 'bg-amber-500/10',   text: 'text-amber-700',  dot: 'bg-amber-500', label: 'Paused' },
  archived:  { bg: 'bg-[#f3f1ec]',      text: 'text-[#737373]',  dot: 'bg-[#a3a3a3]', label: 'Archived' },
  error:     { bg: 'bg-red-500/10',     text: 'text-[#dc2626]',  dot: 'bg-[#dc2626]', label: 'Error' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.archived;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function RunResult({ result }) {
  if (!result) return null;
  // runOnce result shape: { ok, status, result|content, issues }
  const ok = result.ok !== false && result.status !== 'failed';
  const body = result.result?.content || result.content || result.result || (result.issues || []).join('; ') || JSON.stringify(result);
  return (
    <div className={`mt-2 rounded-[8px] border px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap ${ok ? 'border-emerald-200 bg-emerald-50 text-[#14532d]' : 'border-red-200 bg-red-50 text-[#7f1d1d]'}`}>
      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
        {ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />} {ok ? 'Result' : 'Failed'}
      </div>
      {typeof body === 'string' ? body : JSON.stringify(body, null, 2)}
    </div>
  );
}

function AgentCard({ agent, onRun, onPause, onResume, busy }) {
  const [expanded, setExpanded] = useState(false);
  const [runs, setRuns] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const isPaused = agent.status === 'paused';

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const [r, a] = await Promise.all([
        apiClient.listHermesRuns(agent.id),
        apiClient.listHermesApprovals(agent.id).catch(() => ({ approvals: [] })),
      ]);
      setRuns(r?.runs || []);
      setApprovals(a?.approvals || []);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoadingRuns(false);
    }
  }, [agent.id]);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && runs === null) loadRuns();
  };

  async function submitRun() {
    if (!task.trim() || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const out = await onRun(agent, { task: task.trim(), context: context.trim() || undefined });
      setResult(out);
      if (expanded) loadRuns();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bg-white border border-[#e3e0db] rounded-[10px] p-4 flex flex-col hover:border-[#d4d0ca] transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl border bg-[#117dff]/10 border-[#117dff]/20 flex items-center justify-center flex-shrink-0">
            <Cpu size={16} className="text-[#117dff]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-[#0a0a0a] truncate">{agent.name}</h3>
            <p className="text-[10px] text-[#a3a3a3] font-mono truncate">{agent.tenant_id || agent.id}</p>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {showRun ? (
        <div className="mb-3 rounded-[10px] border border-[#ece8e1] bg-[#fbfaf7] p-3">
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={3}
            placeholder="What should this agent do?"
            className="w-full resize-none rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff]"
          />
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Optional context"
            className="mt-2 w-full rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff]"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={submitRun}
              disabled={running || isPaused || !task.trim()}
              className="flex items-center gap-1.5 rounded-[6px] bg-[#117dff] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#0066e0] disabled:opacity-50"
            >
              {running ? <><RefreshCw size={11} className="animate-spin" /> Running…</> : <><Zap size={11} /> Run</>}
            </button>
            <button onClick={() => { setShowRun(false); setResult(null); setError(null); }} className="rounded-[6px] px-3 py-1.5 text-[11px] text-[#525252] hover:bg-[#f3f1ec]">
              Close
            </button>
            {isPaused && <span className="text-[10px] text-amber-700">Resume to run</span>}
          </div>
          {error && <div className="mt-2 text-[11px] text-[#dc2626]">{error}</div>}
          <RunResult result={result} />
        </div>
      ) : null}

      <div className="flex items-center gap-1 mt-auto pt-2 border-t border-[#eae7e1]">
        {!showRun && (
          <button onClick={() => setShowRun(true)} disabled={busy}
            className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-white bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-50">
            <Zap size={11} /> Run
          </button>
        )}
        {isPaused ? (
          <button onClick={() => onResume(agent)} disabled={busy}
            className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-[#16a34a] hover:bg-emerald-500/10 disabled:opacity-50">
            <Play size={11} /> Resume
          </button>
        ) : (
          <button onClick={() => onPause(agent)} disabled={busy}
            className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-amber-700 hover:bg-amber-500/10 disabled:opacity-50">
            <Pause size={11} /> Pause
          </button>
        )}
        <button onClick={toggleExpand}
          className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-[#525252] hover:bg-[#f3f1ec] ml-auto">
          Runs {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 border-t border-[#eae7e1] pt-2">
          {approvals.length > 0 && (
            <div className="mb-2 space-y-1">
              {approvals.map((ap) => (
                <div key={ap.id} className="flex items-center gap-2 rounded-[6px] border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                  <ShieldQuestion size={12} />
                  <span className="flex-1 truncate">{ap.action} · {formatTime(ap.created_at)}</span>
                </div>
              ))}
            </div>
          )}
          {loadingRuns ? (
            <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3] py-2"><RefreshCw size={11} className="animate-spin" /> Loading runs…</div>
          ) : (runs && runs.length > 0) ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {runs.map((run) => (
                <div key={run.id} className="flex items-center gap-2 text-[11px] text-[#525252] font-mono py-1">
                  <Activity size={10} className="text-[#a3a3a3] flex-shrink-0" />
                  <span className="flex-1 truncate">{run.action}</span>
                  <span className={run.status === 'succeeded' ? 'text-[#16a34a]' : run.status === 'failed' ? 'text-[#dc2626]' : 'text-[#a3a3a3]'}>{run.status}</span>
                  <span className="text-[#a3a3a3]">{formatTime(run.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[#a3a3a3] py-2">No runs yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CreateDialog({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [configText, setConfigText] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setName(''); setConfigText(''); setError(null); setSubmitting(false); }
  }, [open]);

  if (!open) return null;

  async function submit() {
    if (!name.trim() || submitting) return;
    let config = {};
    if (configText.trim()) {
      try {
        config = JSON.parse(configText);
      } catch {
        setError('Config must be valid JSON');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), config });
      onClose();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[130] bg-[#111827]/35 backdrop-blur-[2px] flex items-center justify-center px-6" onClick={onClose}>
      <div className="w-full max-w-md rounded-[16px] border border-[#e3e0db] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#ece7de] px-5 py-4">
          <p className="text-[15px] font-semibold text-[#0a0a0a]">New Hermes Agent</p>
          <button onClick={onClose} className="rounded-lg p-2 text-[#525252] hover:bg-[#f3f1ec]"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Competitor Watcher"
              className="w-full rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] px-3 py-2 text-[12px] outline-none focus:border-[#117dff]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1">Config (JSON, optional)</label>
            <textarea value={configText} onChange={(e) => setConfigText(e.target.value)} rows={5} placeholder='{ "goal": "..." }'
              className="w-full resize-none rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] px-3 py-2 text-[12px] font-mono outline-none focus:border-[#117dff]" />
          </div>
          {error && <div className="text-[11px] text-[#dc2626]">{error}</div>}
        </div>
        <div className="border-t border-[#ece7de] px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[8px] px-3 py-2 text-[12px] text-[#525252] hover:bg-[#f3f1ec]">Cancel</button>
          <button onClick={submit} disabled={submitting || !name.trim()}
            className="flex items-center gap-1.5 rounded-[8px] bg-[#117dff] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0066e0] disabled:opacity-50">
            {submitting ? <><RefreshCw size={12} className="animate-spin" /> Creating…</> : <><Plus size={12} /> Create</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HermesAgents() {
  const { t } = useTranslation('dashboard');
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notEnabled, setNotEnabled] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listHermesAgents();
      setAgents(data?.agents || []);
      setNotEnabled(false);
    } catch (e) {
      if (errStatus(e) === 404) {
        setNotEnabled(true);
        setAgents([]);
      } else {
        setError(errMessage(e));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = useCallback(async (payload) => {
    await apiClient.createHermesAgent(payload);
    await load();
  }, [load]);

  const handleRun = useCallback(async (agent, payload) => {
    return apiClient.runHermesAgent(agent.id, payload);
  }, []);

  const handlePause = useCallback(async (agent) => {
    setBusyId(agent.id);
    try {
      await apiClient.pauseHermesAgent(agent.id);
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, status: 'paused' } : a)));
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusyId(null);
    }
  }, []);

  const handleResume = useCallback(async (agent) => {
    setBusyId(agent.id);
    try {
      await apiClient.resumeHermesAgent(agent.id);
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, status: 'active' } : a)));
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <div className="px-6 py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] flex items-center gap-2">
            <Cpu size={20} className="text-[#117dff]" /> {t('hermesAgents.title', 'Hermes Agents')}
          </h1>
          <p className="text-[12px] text-[#737373] mt-0.5">
            {t('hermesAgents.subtitle', 'Per-tenant task agents with run history and approval flows.')}
          </p>
        </div>
        {!notEnabled && (
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 rounded-[8px] border border-[#e3e0db] px-3 py-2 text-[12px] text-[#525252] hover:bg-[#f3f1ec] disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {t('hermesAgents.refresh', 'Refresh')}
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-[8px] bg-[#117dff] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#0066e0]">
              <Plus size={14} /> {t('hermesAgents.newAgent', 'New Agent')}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-[#dc2626]">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#a3a3a3]">
          <RefreshCw size={20} className="animate-spin" />
        </div>
      ) : notEnabled ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[#117dff]/10 flex items-center justify-center mb-4">
            <Cpu size={28} className="text-[#117dff]" />
          </div>
          <p className="text-[15px] font-semibold text-[#0a0a0a]">{t('hermesAgents.notEnabledTitle', 'Hermes Agents is not enabled')}</p>
          <p className="text-[12px] text-[#737373] mt-1 max-w-sm">
            {t('hermesAgents.notEnabledBody', 'This workspace does not have the Hermes agent runtime enabled yet. Contact your administrator to turn it on.')}
          </p>
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[#117dff]/10 flex items-center justify-center mb-4">
            <Cpu size={28} className="text-[#117dff]" />
          </div>
          <p className="text-[15px] font-semibold text-[#0a0a0a]">{t('hermesAgents.emptyTitle', 'No agents yet')}</p>
          <p className="text-[12px] text-[#737373] mt-1">{t('hermesAgents.emptyBody', 'Create your first Hermes agent to get started.')}</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-1.5 rounded-[8px] bg-[#117dff] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0066e0]">
            <Plus size={14} /> {t('hermesAgents.newAgent', 'New Agent')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              busy={busyId === agent.id}
              onRun={handleRun}
              onPause={handlePause}
              onResume={handleResume}
            />
          ))}
        </div>
      )}

      <CreateDialog open={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
    </div>
  );
}
