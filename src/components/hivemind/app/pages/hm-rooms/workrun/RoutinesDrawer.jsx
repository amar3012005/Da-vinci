import React, { useMemo, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronRight, Pause, Play, RotateCw, X } from 'lucide-react';

function statusTone(status) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700';
  if (status === 'paused') return 'bg-amber-50 text-amber-700';
  return 'bg-[#f3f1ec] text-[#737373]';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleString();
}

export default function RoutinesDrawer({ open, routines, onClose, onStatus, onRunNow, onHistory }) {
  const [expanded, setExpanded] = useState(null);
  const [history, setHistory] = useState({});
  const [busy, setBusy] = useState(null);
  const rows = useMemo(() => (Array.isArray(routines) ? routines : []), [routines]);
  if (!open) return null;

  const loadHistory = async (routine) => {
    if (expanded === routine.id) {
      setExpanded(null);
      return;
    }
    setExpanded(routine.id);
    if (history[routine.id]) return;
    setBusy(`history:${routine.id}`);
    try {
      const data = await onHistory(routine.id);
      setHistory((current) => ({ ...current, [routine.id]: data?.history || [] }));
    } finally {
      setBusy(null);
    }
  };

  const act = async (key, fn) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  return (
    <aside className="absolute inset-y-0 right-0 z-30 w-[min(420px,92vw)] border-l border-[#e3e0db] bg-[#faf9f4] shadow-[-12px_0_30px_rgba(0,0,0,0.08)]" aria-label="Routines">
      <div className="flex items-center justify-between border-b border-[#e3e0db] bg-white px-4 py-3">
        <div className="flex items-center gap-2"><CalendarClock size={15} className="text-[#117dff]" /><div><h2 className="text-[13px] font-semibold text-[#0a0a0a]">Routines</h2><p className="text-[10px] text-[#737373]">AgentScope schedules · HIVE governed</p></div></div>
        <button type="button" onClick={onClose} aria-label="Close routines" className="rounded-md p-1.5 text-[#737373] hover:bg-[#f3f1ec]"><X size={15} /></button>
      </div>
      <div className="h-full overflow-y-auto px-3 py-3">
        {!rows.length ? <div className="rounded-lg border border-dashed border-[#d8d3cc] bg-white p-4 text-[11px] text-[#737373]">No governed routines yet.</div> : null}
        <div className="space-y-2">
          {rows.map((routine) => {
            const isActive = routine.status === 'active';
            const routineHistory = history[routine.id] || [];
            return (
              <section key={routine.id} className="rounded-lg border border-[#e3e0db] bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><h3 className="truncate text-[12px] font-semibold text-[#0a0a0a]">{routine.goal || 'Routine'}</h3><p className="mt-1 text-[10px] text-[#737373]">{routine.schedule_expression || 'schedule'} · {routine.timezone || 'UTC'}</p></div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase ${statusTone(routine.status)}`}>{routine.status || 'unknown'}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <button type="button" disabled={busy === `run:${routine.id}` || routine.status === 'archived'} onClick={() => act(`run:${routine.id}`, () => onRunNow(routine.id))} className="inline-flex items-center gap-1 rounded-md border border-[#d8d3cc] px-2 py-1 text-[10px] font-medium text-[#3f3b36] disabled:opacity-50"><RotateCw size={11} />Run now</button>
                  {routine.status !== 'archived' ? <button type="button" disabled={busy === `status:${routine.id}`} onClick={() => act(`status:${routine.id}`, () => onStatus(routine.id, isActive ? 'paused' : 'active'))} className="inline-flex items-center gap-1 rounded-md border border-[#d8d3cc] px-2 py-1 text-[10px] font-medium text-[#3f3b36] disabled:opacity-50">{isActive ? <Pause size={11} /> : <Play size={11} />}{isActive ? 'Pause' : 'Resume'}</button> : null}
                  <button type="button" disabled={busy === `history:${routine.id}`} onClick={() => loadHistory(routine)} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-[#737373] hover:bg-[#f3f1ec]">{expanded === routine.id ? <ChevronDown size={11} /> : <ChevronRight size={11} />}History</button>
                </div>
                {expanded === routine.id ? <div className="mt-2 border-t border-[#eeeae4] pt-2">{routineHistory.length ? routineHistory.map((entry) => <div key={entry.fire_key || entry.id} className="flex items-center justify-between gap-2 py-1 text-[10px]"><span className="truncate text-[#525252]">{formatDate(entry.scheduled_at || entry.created_at)}</span><span className="font-mono text-[#737373]">{entry.status || 'started'}</span></div>) : <p className="text-[10px] text-[#a3a3a3]">No fires recorded yet.</p>}</div> : null}
              </section>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
