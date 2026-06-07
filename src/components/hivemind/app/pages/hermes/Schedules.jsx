import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Cron helpers ─────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { value: 'daily',    label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { value: 'weekly',   label: 'Weekly (Monday)' },
];

/** Build a cron expression from frequency + HH:MM time string. */
function buildCron(frequency, time) {
  const [hh, mm] = (time || '09:00').split(':').map(Number);
  const h = Number.isFinite(hh) ? hh : 9;
  const m = Number.isFinite(mm) ? mm : 0;
  switch (frequency) {
    case 'weekdays': return `${m} ${h} * * 1-5`;
    case 'weekly':   return `${m} ${h} * * 1`;
    default:         return `${m} ${h} * * *`;
  }
}

/** Parse a cron expression back to a human label. Best-effort — returns raw cron if unknown. */
function describeCron(cron) {
  if (!cron) return '';
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, , , dow] = parts;
  const pad = (n) => String(n).padStart(2, '0');
  const time = `${pad(hour)}:${pad(min)}`;
  if (dow === '1-5') return `Weekdays at ${time}`;
  if (dow === '1')   return `Every Monday at ${time}`;
  if (dow === '*')   return `Daily at ${time}`;
  return cron;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function errMessage(e) {
  return e?.response?.data?.error || e?.message || 'Something went wrong';
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-[#117dff]/10 flex items-center justify-center mb-4">
        <Calendar size={28} className="text-[#117dff]" />
      </div>
      <p className="text-[15px] font-semibold text-[#0a0a0a]">No schedules yet</p>
      <p className="text-[12px] text-[#737373] mt-1 max-w-sm">
        Add a schedule to run your Hermes agent automatically on a recurring basis.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 flex items-center gap-1.5 rounded-[8px] bg-[#117dff] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0066e0]"
      >
        <Plus size={14} /> Add Schedule
      </button>
    </div>
  );
}

function ScheduleRow({ schedule, onDelete, deleting }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[10px] border border-[#e3e0db] bg-white px-4 py-3 hover:border-[#d4d0ca] transition-all">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 w-8 h-8 rounded-lg border bg-[#117dff]/10 border-[#117dff]/20 flex items-center justify-center flex-shrink-0">
          <Clock size={14} className="text-[#117dff]" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#0a0a0a] truncate">
            {schedule.name || describeCron(schedule.cron)}
          </p>
          <p className="text-[11px] text-[#737373] mt-0.5 line-clamp-2">
            {schedule.task || schedule.prompt || '—'}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] text-[#a3a3a3]">
              <Clock size={9} /> {describeCron(schedule.cron)}
            </span>
            {schedule.created_at && (
              <span className="text-[10px] text-[#a3a3a3]">
                Added {formatDate(schedule.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => onDelete(schedule.id)}
        disabled={deleting}
        aria-label="Delete schedule"
        className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-[6px] text-[#a3a3a3] hover:text-[#dc2626] hover:bg-red-50 disabled:opacity-40 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function AddScheduleForm({ onSubmit, onCancel, submitting }) {
  const [frequency, setFrequency] = useState('daily');
  const [time, setTime]           = useState('09:00');
  const [prompt, setPrompt]       = useState('');
  const [name, setName]           = useState('');
  const [advanced, setAdvanced]   = useState(false);
  const [customCron, setCustomCron] = useState('');
  const [error, setError]         = useState(null);

  const derivedCron = advanced && customCron.trim() ? customCron.trim() : buildCron(frequency, time);

  function handleSubmit(e) {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please describe what the agent should do.');
      return;
    }
    if (advanced && customCron.trim()) {
      const parts = customCron.trim().split(/\s+/);
      if (parts.length !== 5) {
        setError('Custom cron must have exactly 5 fields (minute hour day month weekday).');
        return;
      }
    }
    setError(null);
    onSubmit({
      cron: derivedCron,
      prompt: prompt.trim(),
      name: name.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[10px] border border-[#117dff]/30 bg-[#f0f7ff] px-5 py-4 space-y-3"
    >
      <p className="text-[13px] font-semibold text-[#0a0a0a]">New Schedule</p>

      {/* Name */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1">
          Name (optional)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Daily briefing"
          className="w-full rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff]"
        />
      </div>

      {/* Frequency picker */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1">
            Frequency
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            disabled={advanced && customCron.trim() !== ''}
            className="w-full rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a] outline-none focus:border-[#117dff] disabled:opacity-50"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1">
            Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={advanced && customCron.trim() !== ''}
            className="w-full rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a] outline-none focus:border-[#117dff] disabled:opacity-50"
          />
        </div>
      </div>

      {/* What should it do */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1">
          What should it do?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. Summarise overnight news and send a Slack digest"
          className="w-full resize-none rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff]"
        />
      </div>

      {/* Advanced toggle */}
      <div>
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-[#737373] hover:text-[#0a0a0a] transition-colors"
        >
          {advanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          Advanced (custom cron)
        </button>
        {advanced && (
          <div className="mt-2 space-y-1">
            <input
              value={customCron}
              onChange={(e) => setCustomCron(e.target.value)}
              placeholder="e.g. 30 8 * * 1-5"
              className="w-full rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] font-mono text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff]"
            />
            <p className="text-[10px] text-[#a3a3a3]">
              Will be used as-is. Leave blank to use the frequency picker above.
            </p>
          </div>
        )}
      </div>

      {/* Cron preview */}
      <p className="text-[10px] text-[#a3a3a3]">
        Cron: <span className="font-mono text-[#525252]">{derivedCron}</span>
      </p>

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#dc2626]">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting || !prompt.trim()}
          className="flex items-center gap-1.5 rounded-[8px] bg-[#117dff] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0066e0] disabled:opacity-50"
        >
          {submitting
            ? <><RefreshCw size={12} className="animate-spin" /> Saving…</>
            : <><Plus size={12} /> Add Schedule</>}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-[8px] px-3 py-2 text-[12px] text-[#525252] hover:bg-[#e8f0fe] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function Schedules({ apiClient, refresh }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getHermesSchedules();
      setSchedules(data?.schedules || []);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = useCallback(async (payload) => {
    setSubmitting(true);
    try {
      await apiClient.addHermesSchedule(payload);
      setShowForm(false);
      await load();
      if (typeof refresh === 'function') refresh();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, load, refresh]);

  const handleDelete = useCallback(async (jobId) => {
    setDeletingId(jobId);
    setError(null);
    try {
      await apiClient.deleteHermesSchedule(jobId);
      setSchedules((prev) => prev.filter((s) => s.id !== jobId));
      if (typeof refresh === 'function') refresh();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setDeletingId(null);
    }
  }, [apiClient, refresh]);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-[12px] text-[#737373]">
          Recurring tasks — runs automatically on your Hermes agent.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-[8px] border border-[#e3e0db] px-3 py-2 text-[12px] text-[#525252] hover:bg-[#f3f1ec] disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-[8px] bg-[#117dff] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#0066e0]"
            >
              <Plus size={14} /> Add Schedule
            </button>
          )}
        </div>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="mb-5">
          <AddScheduleForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            submitting={submitting}
          />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-[#dc2626]">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#a3a3a3]">
          <RefreshCw size={20} className="animate-spin" />
        </div>
      ) : schedules.length === 0 && !showForm ? (
        <EmptyState onAdd={() => setShowForm(true)} />
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <ScheduleRow
              key={schedule.id}
              schedule={schedule}
              onDelete={handleDelete}
              deleting={deletingId === schedule.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
