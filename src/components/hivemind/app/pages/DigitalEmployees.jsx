import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Plus,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  AlertCircle,
  Activity,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useTeamContext } from '../shared/team-context';

const STATUS_STYLES = {
  draft:     { bg: 'bg-[#f3f1ec]',         text: 'text-[#525252]', dot: 'bg-[#a3a3a3]', label: 'Draft' },
  deploying: { bg: 'bg-blue-500/10',       text: 'text-blue-700',  dot: 'bg-blue-500 animate-pulse', label: 'Deploying' },
  running:   { bg: 'bg-emerald-500/10',    text: 'text-[#16a34a]', dot: 'bg-[#16a34a]', label: 'Running' },
  paused:    { bg: 'bg-amber-500/10',      text: 'text-amber-700', dot: 'bg-amber-500', label: 'Paused' },
  error:     { bg: 'bg-red-500/10',        text: 'text-[#dc2626]', dot: 'bg-[#dc2626]', label: 'Error' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function EmployeeCard({ employee, onPause, onResume, onArchive, onOpen }) {
  const isRunning = employee.status === 'running';
  const isPaused = employee.status === 'paused';
  const msgs = employee.metricsLast24h?.messages || 0;
  const tokens = employee.metricsLast24h?.tokens || 0;
  return (
    <div className="bg-white border border-[#e3e0db] rounded-[10px] p-4 hover:border-[#d4d0ca] transition-all cursor-pointer flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center flex-shrink-0">
            <Bot size={16} className="text-[#117dff]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-[#0a0a0a] truncate">{employee.name}</h3>
            <p className="text-[10px] text-[#a3a3a3] font-mono">{employee.slug}</p>
          </div>
        </div>
        <StatusBadge status={employee.status} />
      </div>

      {employee.persona && (
        <p className="text-[11px] text-[#525252] line-clamp-2 mb-3">{employee.persona}</p>
      )}

      <div className="flex items-center gap-3 text-[10px] text-[#a3a3a3] font-mono mt-auto pt-2 border-t border-[#eae7e1]">
        <span className="flex items-center gap-1"><Activity size={10} /> {msgs} msgs</span>
        <span>·</span>
        <span>{tokens} tok</span>
        <span>·</span>
        <span>{employee.model.split('-').slice(0, 2).join('-')}</span>
      </div>

      <div className="flex items-center gap-1 mt-3">
        {isRunning && (
          <button onClick={(e) => { e.stopPropagation(); onPause(employee); }}
            className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-amber-700 hover:bg-amber-500/10">
            <Pause size={11} /> Pause
          </button>
        )}
        {isPaused && (
          <button onClick={(e) => { e.stopPropagation(); onResume(employee); }}
            className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-[#16a34a] hover:bg-emerald-500/10">
            <Play size={11} /> Resume
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onOpen(employee); }}
          className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-[#525252] hover:bg-[#f3f1ec] ml-auto">
          Details <ChevronRight size={11} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onArchive(employee); }}
          className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-[#dc2626]/60 hover:text-[#dc2626] hover:bg-red-50"
          title="Archive">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

function CreateWizard({ open, onClose, onCreate, teams }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    persona: 'You are a helpful digital employee.',
    model: 'claude-haiku-4-5',
    llm_provider: 'anthropic',
    scope: 'team',
    team_id: '',
    slack_team_id: '',
    slack_channels_allowed: '',
    tools: ['hivemind_recall', 'hivemind_save_memory', 'hivemind_slack_post', 'hivemind_slack_search'],
    rate_limit_per_min: 30,
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const toggleTool = (t) => setForm(f => ({
    ...f,
    tools: f.tools.includes(t) ? f.tools.filter(x => x !== t) : [...f.tools, t],
  }));

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        persona: form.persona,
        model: form.model,
        llm_provider: form.llm_provider,
        scope: form.scope,
        team_id: form.scope === 'team' && form.team_id ? form.team_id : null,
        slack_team_id: form.slack_team_id || null,
        slack_channels_allowed: form.slack_channels_allowed
          ? form.slack_channels_allowed.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        tools: form.tools,
        policy_rules: {
          rate_limit_per_min: Number(form.rate_limit_per_min) || 30,
        },
      };
      await onCreate(payload);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-[12px] w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-[#eae7e1] flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0a0a0a]">Create Digital Employee</h2>
            <p className="text-[11px] text-[#a3a3a3] mt-0.5">Step {step} of 5</p>
          </div>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#525252]"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {step === 1 && (
            <>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Name</span>
                <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Sarah the QA Specialist"
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] focus:outline-none focus:border-[#117dff]" />
              </label>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Persona / System Prompt</span>
                <textarea value={form.persona} onChange={e => setForm({ ...form, persona: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] resize-y focus:outline-none focus:border-[#117dff]" />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">LLM Provider</span>
                <select value={form.llm_provider} onChange={e => setForm({ ...form, llm_provider: e.target.value })}
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="openai">OpenAI</option>
                  <option value="groq">Groq</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Model</span>
                <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
                  placeholder="claude-haiku-4-5"
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]" />
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Slack Team ID (workspace)</span>
                <input value={form.slack_team_id} onChange={e => setForm({ ...form, slack_team_id: e.target.value })}
                  placeholder="T0AF7AU1B6D"
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] font-mono" />
                <span className="text-[10px] text-[#a3a3a3]">From your connected Slack workspace</span>
              </label>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Channels Allowed</span>
                <input value={form.slack_channels_allowed}
                  onChange={e => setForm({ ...form, slack_channels_allowed: e.target.value })}
                  placeholder="C01ABC123,C02DEF456 (comma-separated)"
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] font-mono" />
                <span className="text-[10px] text-[#a3a3a3]">Empty = all channels owner can access</span>
              </label>
            </>
          )}
          {step === 4 && (
            <>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Scope</span>
                <select value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                  <option value="personal">Personal (creator only)</option>
                  <option value="team">Team</option>
                  <option value="organization">Organization-wide</option>
                </select>
              </label>
              {form.scope === 'team' && (
                <label className="block">
                  <span className="text-[11px] text-[#525252] font-medium">Team</span>
                  <select value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })}
                    className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                    <option value="">— select team —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Rate Limit (msgs/min)</span>
                <input type="number" value={form.rate_limit_per_min}
                  onChange={e => setForm({ ...form, rate_limit_per_min: e.target.value })}
                  min={1} max={300}
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]" />
              </label>
            </>
          )}
          {step === 5 && (
            <>
              <span className="text-[11px] text-[#525252] font-medium block mb-2">Enabled MCP Tools</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'hivemind_recall',
                  'hivemind_save_memory',
                  'hivemind_slack_post',
                  'hivemind_slack_react',
                  'hivemind_slack_search',
                  'hivemind_slack_history',
                  'hivemind_web_search',
                  'hivemind_web_crawl',
                ].map(t => (
                  <label key={t} className="flex items-center gap-2 p-1.5 hover:bg-[#f3f1ec] rounded cursor-pointer">
                    <input type="checkbox" checked={form.tools.includes(t)}
                      onChange={() => toggleTool(t)} />
                    <span className="text-[12px] font-mono text-[#525252]">{t}</span>
                  </label>
                ))}
              </div>
              <div className="p-3 bg-[#faf9f4] rounded-[6px] mt-3 border border-[#eae7e1]">
                <span className="text-[10px] uppercase text-[#a3a3a3] font-semibold tracking-wide">Summary</span>
                <div className="text-[12px] text-[#525252] mt-1">
                  <strong>{form.name || '(no name)'}</strong> · {form.model} · scope: {form.scope}
                  {form.slack_team_id && <> · slack: <span className="font-mono">{form.slack_team_id}</span></>}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-[11px] text-[#dc2626]">
              <AlertCircle size={12} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#eae7e1] flex items-center justify-between">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}
            className="px-3 py-2 text-[12px] text-[#525252] hover:bg-[#f3f1ec] rounded disabled:opacity-30">
            Back
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-3 py-2 text-[12px] text-[#525252] hover:bg-[#f3f1ec] rounded">
              Cancel
            </button>
            {step < 5 ? (
              <button onClick={() => setStep(step + 1)}
                disabled={step === 1 && !form.name.trim()}
                className="px-4 py-2 text-[12px] bg-[#117dff] text-white rounded hover:bg-[#0066e0] disabled:opacity-50">
                Next
              </button>
            ) : (
              <button onClick={submit} disabled={submitting || !form.name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] bg-[#117dff] text-white rounded hover:bg-[#0066e0] disabled:opacity-50">
                {submitting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Create
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DigitalEmployees() {
  const { teams } = useTeamContext();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { employees: list } = await apiClient.listEmployees();
      setEmployees(list || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleCreate(payload) {
    await apiClient.createEmployee(payload);
    await fetch();
  }
  async function handlePause(emp)   { await apiClient.pauseEmployee(emp.id); await fetch(); }
  async function handleResume(emp)  { await apiClient.resumeEmployee(emp.id); await fetch(); }
  async function handleArchive(emp) {
    if (!window.confirm(`Archive "${emp.name}"? Container will be stopped.`)) return;
    await apiClient.archiveEmployee(emp.id);
    await fetch();
  }
  function handleOpen(emp) {
    // Detail view comes in Phase 3 — placeholder
    window.alert(`Detail view (Phase 3): ${emp.name}\n\nStatus: ${emp.status}\nModel: ${emp.model}\nScope: ${emp.scope}`);
  }

  const running = employees.filter(e => e.status === 'running').length;
  const paused = employees.filter(e => e.status === 'paused').length;
  const draft = employees.filter(e => e.status === 'draft').length;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
            Digital Employees
          </h1>
          <p className="text-[12px] text-[#a3a3a3] mt-1">
            Autonomous AI agents with HIVEMIND memory + Slack access. {employees.length} total · {running} running · {paused} paused · {draft} draft.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#f3f1ec] border border-[#e3e0db] text-[12px] hover:bg-[#eae7e1]">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]">
            <Plus size={13} />
            New Employee
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[8px] text-[12px] text-[#dc2626]">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {employees.length === 0 && !loading ? (
        <div className="bg-white border border-dashed border-[#e3e0db] rounded-[10px] p-12 text-center">
          <Bot size={32} className="text-[#a3a3a3] mx-auto mb-3" />
          <h2 className="text-[#0a0a0a] font-semibold mb-1">No Digital Employees yet</h2>
          <p className="text-[12px] text-[#a3a3a3] mb-4">
            Create your first AI agent — give it a persona, connect Slack, define what tools it can use.
          </p>
          <button onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]">
            <Plus size={13} /> Create your first employee
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map(emp => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onPause={handlePause}
              onResume={handleResume}
              onArchive={handleArchive}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}

      <CreateWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        teams={teams || []}
      />
    </div>
  );
}
