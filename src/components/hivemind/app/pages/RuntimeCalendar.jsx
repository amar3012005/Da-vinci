import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink, MoreHorizontal, Pause, Play, RefreshCw, Search, Square, Trash2, X } from 'lucide-react';
import AgentAvatar from '../hyperagents/AgentAvatar';
import {
  CalendarActionError, CalendarUnavailableError, boardRows, deleteCalendarItem, fetchDutyHistory, fetchMergedCalendar, groupByDay, isLocalItem, nextRunText, pauseCalendarItem, rangeEntries,
  resumeCalendarItem, runMessageHref, stopCalendarItem, weekWindow,
} from '../shared/runtime-calendar';
import { useRuntimeEnabled } from '../shared/runtime-enabled';
import '../shared/skeleton.css';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3484ff]';
/** Shown calendars refresh on this cadence while the page is visible. */
const REFRESH_MS = 60000;
const KIND_LABEL = { duty: 'Scheduled task', assignment: 'Booked work', meeting: 'Meeting', decision: 'Decision', source_request: 'Source request', wake: 'Runtime wake' };
const STATUS_TABS = [['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']];
const ACTION_ERROR = {
  calendar_item_not_found: 'That task is no longer on the calendar.',
  same_origin_required: 'Reload the page and try again.',
  authentication_required: 'Sign in again to change the calendar.',
};

/** Pastel tile behind each run outcome; the text on it is always near-black. */
const OUTCOME_TONE = { done: 'bg-[#cfe9cf]', no_change: 'bg-[#cfeaee]', blocked: 'bg-[#f4e3a1]', failed: 'bg-[#f6d0cc]', skipped: 'bg-[#ebe8df]', missed: 'bg-[#d9d2f3]', running: 'bg-[#e7e4dd]' };
const OUTCOME_DEFAULT = { done: 'Done', no_change: 'No change', blocked: 'Blocked', failed: 'Failed', skipped: 'Skipped (paused)', missed: 'Missed', running: 'Running' };
const outcomeKey = outcome => (outcome === 'no_change' ? 'noChange' : outcome);

const timeOf = at => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const dayOf = (day, options) => new Date(day).toLocaleDateString(undefined, options);
const untilText = until => (until ? `Until ${new Date(until).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : '');

function actionMessage(error) {
  if (error instanceof CalendarActionError) {
    if (error.status === 403) return 'Only the company administrator can change the calendar.';
    return ACTION_ERROR[error.code] || 'The calendar could not be changed. Nothing was lost; try again.';
  }
  return 'The calendar could not be changed. Nothing was lost; try again.';
}

/** The owner's avatar with the saved appearance; Runtime's own wakes have none. */
function Owner({ agent, size = 28 }) {
  return agent
    ? <AgentAvatar agent={agent} size={size} />
    : <span className="grid shrink-0 place-items-center rounded-full bg-[#ebe8df] text-[#5f646b]" style={{ width: size, height: size }} aria-hidden="true"><Clock size={Math.round(size * 0.5)} /></span>;
}

function RowMenu({ row, onAction, onToggle }) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const holder = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (!holder.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  const item = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-[#f1efe9]';
  return <div ref={holder} className="relative shrink-0">
    <button type="button" aria-label={`Actions for ${row.label}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}
      className={`grid h-9 w-9 place-items-center rounded-md text-[#5f646b] hover:bg-[#f1efe9] ${FOCUS}`}><MoreHorizontal size={16} aria-hidden="true" /></button>
    {open ? <div role="menu" aria-label={`${row.label} actions`} className="absolute right-0 top-10 z-20 w-40 rounded-lg border border-[#e7e4dd] bg-white p-1 shadow-lg">
      {row.local && row.state === 'active' ? <button type="button" role="menuitem" className={`${item} text-[#20252a] ${FOCUS}`} onClick={() => { setOpen(false); onToggle(row, 'pause'); }}><Pause size={14} aria-hidden="true" />{t('runtimeCalendar.drawer.pause', 'Pause')}</button> : null}
      {row.local && row.state === 'paused' ? <button type="button" role="menuitem" className={`${item} text-[#20252a] ${FOCUS}`} onClick={() => { setOpen(false); onToggle(row, 'resume'); }}><Play size={14} aria-hidden="true" />{t('runtimeCalendar.drawer.resume', 'Resume')}</button> : null}
      {row.status === 'active' || row.state === 'paused' ? <button type="button" role="menuitem" className={`${item} text-[#20252a] ${FOCUS}`} onClick={() => { setOpen(false); onAction(row, 'stop'); }}><Square size={14} aria-hidden="true" />Stop</button> : null}
      <button type="button" role="menuitem" className={`${item} text-[#b42318] ${FOCUS}`} onClick={() => { setOpen(false); onAction(row, 'delete'); }}><Trash2 size={14} aria-hidden="true" />Delete</button>
    </div> : null}
  </div>;
}

function TaskRow({ row, now, onAction, onToggle, onOpen }) {
  const { t } = useTranslation('dashboard');
  const next = row.status === 'active' ? nextRunText(row.at, now) : null;
  const meta = 'text-[11.5px] text-[#7a7f86]';
  const body = <>
    <Owner agent={row.agent} />
    <span className="min-w-0 flex-1">
      <span className={`block truncate text-[13.5px] font-medium ${row.status === 'active' ? 'text-[#20252a]' : 'text-[#8b9097]'}`} title={row.title}>{row.label}</span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {row.status !== 'active' ? <span className="rounded bg-[#f1efe9] px-1.5 py-px text-[11px] font-medium text-[#5f646b]">{row.state === 'paused' ? t('runtimeCalendar.drawer.pausedBadge', 'Paused') : row.statusText}</span> : null}
        <span className={meta}>{row.owner}</span>
        {row.repeat ? <span className={meta}>{row.repeat}</span> : <span className={meta}>{KIND_LABEL[row.kind] || 'Calendar item'}</span>}
        {next ? <span className={meta}>Next <time dateTime={new Date(row.at).toISOString()}>{next.absolute}</time> <span className="text-[#9aa0a6]">{next.relative}</span></span> : null}
        {row.until ? <span className={meta} data-calendar-until>{untilText(row.until)}</span> : null}
      </span>
    </span>
  </>;
  return <li className="flex items-start gap-3 px-3 py-2.5" data-calendar-row={row.kind} data-status={row.status}>
    {row.kind === 'duty'
      ? <button type="button" onClick={() => onOpen(row)} data-calendar-open={row.id} className={`flex min-w-0 flex-1 items-start gap-3 rounded-md text-left ${FOCUS}`}>{body}</button>
      : <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>}
    {row.manageable ? <RowMenu row={row} onAction={onAction} onToggle={onToggle} /> : null}
  </li>;
}

function Skeleton() {
  return <ul className="divide-y divide-[#ece9e2] rounded-xl border border-[#e7e4dd] bg-white" aria-hidden="true" data-calendar-loading>
    {Array.from({ length: 5 }, (unused, index) => <li key={index} className="flex items-center gap-3 px-3 py-3">
      <span className="hm-skeleton h-7 w-7 rounded-full" />
      <span className="flex-1 space-y-2"><span className="hm-skeleton block h-3 w-2/5 rounded" /><span className="hm-skeleton block h-2.5 w-1/4 rounded" /></span>
    </li>)}
  </ul>;
}

function Notice({ title, body, action }) {
  return <div className="grid place-items-center rounded-xl border border-dashed border-[#d9d5cb] bg-white px-6 py-14 text-center" role="status">
    <div className="max-w-sm"><p className="text-[14px] font-semibold text-[#20252a]">{title}</p>{body ? <p className="mt-1.5 text-[12.5px] leading-5 text-[#6b6f76]">{body}</p> : null}{action}</div>
  </div>;
}

/** One run of a task OpenDot keeps: when it was due, how it ended, what it reported and where the chat message is. */
function RunLine({ run, dotId }) {
  const { t } = useTranslation('dashboard');
  const href = runMessageHref(dotId, run);
  const outcome = OUTCOME_TONE[run.outcome] ? run.outcome : 'running';
  return <li className="flex items-start gap-3 py-2.5" data-calendar-run={outcome}>
    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#111] ${OUTCOME_TONE[outcome]}`}>{t(`runtimeCalendar.outcome.${outcomeKey(outcome)}`, OUTCOME_DEFAULT[outcome])}</span>
    <span className="min-w-0 flex-1">
      <time dateTime={run.at} className="block text-[12px] tabular-nums text-[#6b6b68]">{new Date(run.at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
      {run.note ? <span className="mt-0.5 block text-[13px] leading-5 text-[#111]">{run.note}</span> : null}
      {href ? <a href={href} className={`mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[#3484ff] hover:underline ${FOCUS}`}>{t('runtimeCalendar.drawer.openMessage', 'Open the chat message')}<ExternalLink size={12} aria-hidden="true" /></a> : null}
    </span>
  </li>;
}

/**
 * The side drawer of one scheduled task: next run, repeat, end date, Pause or Resume next to Stop and Delete, and the last ten runs. Only a task
 * OpenDot keeps has run history and Pause; Runtime does not expose either, so a Runtime task says where its history is kept.
 */
function DutyDrawer({ row, now, version, localFetcher, busy, error, onClose, onAction, onToggle }) {
  const { t } = useTranslation('dashboard');
  const closeButton = useRef(null);
  const [history, setHistory] = useState({ status: row.local ? 'loading' : 'none', value: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    closeButton.current?.focus();
    const escape = event => { if (event.key === 'Escape' && !document.querySelector('[data-calendar-confirm]')) onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);
  useEffect(() => {
    if (!row.local) return undefined;
    const controller = new AbortController();
    fetchDutyHistory(row.id, { signal: controller.signal, ...(localFetcher ? { fetcher: localFetcher } : {}) })
      .then(value => { if (!controller.signal.aborted) setHistory({ status: 'ready', value }); })
      .catch(() => { if (!controller.signal.aborted) setHistory(before => ({ status: 'error', value: before.value })); });
    return () => controller.abort();
  }, [row.id, row.local, localFetcher, version, attempt]);
  const paused = row.state === 'paused';
  const next = row.status === 'active' || paused ? nextRunText(row.at, now) : null;
  const fact = 'text-[11.5px] font-medium uppercase tracking-[0.04em] text-[#a3a39f]';
  const value = 'mt-0.5 text-[13.5px] text-[#111]';
  const pill = `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-50 ${FOCUS}`;
  const runs = history.value?.runs ?? [];
  return <div className="fixed inset-0 z-40" data-calendar-drawer-layer>
    <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden="true" />
    <aside role="dialog" aria-modal="true" aria-label={t('runtimeCalendar.drawer.label', 'Task details')} data-calendar-drawer={row.id}
      className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl sm:rounded-l-[28px]">
      <header className="flex items-start gap-3 px-5 pb-3 pt-5">
        <Owner agent={row.agent} size={36} />
        <span className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-semibold tracking-[-0.01em] text-[#111]" title={row.title}>{row.label}</h2>
          <span className="block text-[12.5px] text-[#6b6b68]">{row.owner}{paused ? <span className="ml-2 rounded-full bg-[#d9d2f3] px-2 py-px text-[11px] font-semibold text-[#111]">{t('runtimeCalendar.drawer.pausedBadge', 'Paused')}</span> : null}</span>
        </span>
        <button ref={closeButton} type="button" aria-label={t('runtimeCalendar.drawer.close', 'Close')} onClick={onClose} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#6b6b68] hover:bg-[#f1efe9] ${FOCUS}`}><X size={16} aria-hidden="true" /></button>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-3" data-calendar-facts>
        <div><dt className={fact}>{paused ? t('runtimeCalendar.drawer.nextRunPaused', 'Next run once resumed') : t('runtimeCalendar.drawer.nextRun', 'Next run')}</dt>
          <dd className={value} data-calendar-next>{next ? <><time dateTime={new Date(row.at).toISOString()}>{next.absolute}</time>{!paused ? <span className="text-[#a3a39f]"> {next.relative}</span> : null}</> : t('runtimeCalendar.drawer.nextRunNone', 'No run left')}</dd></div>
        <div><dt className={fact}>{t('runtimeCalendar.drawer.repeats', 'Repeats')}</dt><dd className={value}>{row.repeat || t('runtimeCalendar.drawer.once', 'Once')}</dd></div>
        <div><dt className={fact}>{t('runtimeCalendar.drawer.ends', 'Ends')}</dt>
          <dd className={value} data-calendar-ends>{row.until ? new Date(row.until).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : t('runtimeCalendar.drawer.noEnd', 'No end date')}</dd></div>
      </dl>

      {row.manageable ? <div className="flex flex-wrap items-center gap-2 px-5 py-2" data-calendar-drawer-actions>
        {row.local && row.state === 'active' ? <button type="button" disabled={busy} onClick={() => onToggle(row, 'pause')} className={`${pill} bg-[#111] text-white`}><Pause size={14} aria-hidden="true" />{t('runtimeCalendar.drawer.pause', 'Pause')}</button> : null}
        {row.local && paused ? <button type="button" disabled={busy} onClick={() => onToggle(row, 'resume')} className={`${pill} bg-[#111] text-white`}><Play size={14} aria-hidden="true" />{t('runtimeCalendar.drawer.resume', 'Resume')}</button> : null}
        {row.status === 'active' || paused ? <button type="button" disabled={busy} onClick={() => onAction(row, 'stop')} className={`${pill} border border-[#e7e4dd] text-[#111] hover:bg-[#f1efe9]`}><Square size={14} aria-hidden="true" />Stop</button> : null}
        <button type="button" disabled={busy} onClick={() => onAction(row, 'delete')} className={`${pill} border border-[#e7e4dd] text-[#b42318] hover:bg-[#f1efe9]`}><Trash2 size={14} aria-hidden="true" />Delete</button>
      </div> : null}
      {error ? <p role="alert" className="px-5 py-1 text-[12.5px] text-[#b42318]">{error}</p> : null}

      <section className="mt-2 flex-1 border-t border-[#ece9e2] px-5 pb-6 pt-4" aria-label={t('runtimeCalendar.drawer.lastRuns', 'Last runs')} data-calendar-history>
        <h3 className="text-[13px] font-semibold text-[#111]">{t('runtimeCalendar.drawer.lastRuns', 'Last runs')}</h3>
        {!row.local ? <p className="mt-2 text-[12.5px] leading-5 text-[#6b6b68]" data-calendar-history-elsewhere>{t('runtimeCalendar.drawer.runtimeHistory', 'History available for duties the employee keeps in HIVEMIND')}</p> : null}
        {row.local && history.status === 'loading' ? <p className="mt-2 text-[12.5px] text-[#6b6b68]" role="status">{t('runtimeCalendar.drawer.loading', 'Loading the runs…')}</p> : null}
        {row.local && history.status === 'error' && !history.value ? <p className="mt-2 text-[12.5px] text-[#b42318]" role="alert">{t('runtimeCalendar.drawer.error', 'The runs could not be loaded.')}
          <button type="button" onClick={() => setAttempt(count => count + 1)} className={`ml-2 rounded-md text-[#3484ff] hover:underline ${FOCUS}`}>{t('runtimeCalendar.drawer.retry', 'Try again')}</button></p> : null}
        {row.local && history.value && !runs.length ? <p className="mt-2 text-[12.5px] text-[#6b6b68]">{t('runtimeCalendar.drawer.empty', 'No runs yet.')}</p> : null}
        {runs.length ? <ul className="mt-1 divide-y divide-[#ece9e2]">{runs.map(run => <RunLine key={run.at} run={run} dotId={history.value?.dotId || row.dotId} />)}</ul> : null}
      </section>
    </aside>
  </div>;
}

/** In-page confirmation for stopping or deleting; it never opens a browser dialog. */
function ConfirmDialog({ target, busy, error, onCancel, onConfirm }) {
  const cancel = useRef(null);
  useEffect(() => {
    cancel.current?.focus();
    const escape = event => { if (event.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [busy, onCancel]);
  const deleting = target.mode === 'delete';
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4" data-calendar-confirm>
    <div role="alertdialog" aria-modal="true" aria-labelledby="calendar-confirm-title" aria-describedby="calendar-confirm-body" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
      <h2 id="calendar-confirm-title" className="text-[15px] font-semibold text-[#1f2328]">{deleting ? 'Delete' : 'Stop'} “{target.row.label}”?</h2>
      <p id="calendar-confirm-body" className="mt-2 text-[13px] leading-5 text-[#5f646b]">
        {deleting
          ? `${target.row.owner} will not run it again, and it is removed from the calendar.`
          : `${target.row.owner} will not run it again. It stays on the calendar as stopped.`} {target.row.owner} is told.
      </p>
      {error ? <p role="alert" className="mt-3 text-[12.5px] text-[#b42318]">{error}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button ref={cancel} type="button" disabled={busy} onClick={onCancel} className={`rounded-md border border-[#e7e4dd] px-3 py-2 text-[13px] text-[#3d4249] hover:bg-[#f1efe9] ${FOCUS}`}>Cancel</button>
        <button type="button" disabled={busy} onClick={onConfirm} className={`rounded-md px-3 py-2 text-[13px] font-medium text-white ${deleting ? 'bg-[#b42318]' : 'bg-[#117dff]'} ${FOCUS}`}>
          {busy ? (deleting ? 'Deleting…' : 'Stopping…') : (deleting ? 'Delete task' : 'Stop task')}
        </button>
      </div>
    </div>
  </div>;
}

/**
 * The company calendar, laid out like the native Automation board: a List and a Week view, All, Active and Inactive tabs, and a search box. Each
 * task shows its employee's avatar and name and a short label. A task an employee scheduled for itself has a menu to stop or delete it.
 * Read from the Runtime root as a data owner, so it opens in every HyperAgents view with or without Runtime.
 */
export default function RuntimeCalendar({ fetcher, localFetcher }) {
  const { t } = useTranslation('dashboard');
  const runtimeEnabled = useRuntimeEnabled();
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'loading', value: null });
  const [confirm, setConfirm] = useState(null);
  const [outcome, setOutcome] = useState({ busy: false, error: '' });
  const [notice, setNotice] = useState('');
  const [openId, setOpenId] = useState(null);
  const [toggling, setToggling] = useState({ busy: false, error: '' });
  const generation = useRef(0);
  const controller = useRef(null);
  const window_ = useMemo(() => weekWindow(Date.now(), offset), [offset]);

  const load = useCallback(async (silent = false) => {
    const current = ++generation.current;
    controller.current?.abort();
    controller.current = new AbortController();
    if (!silent) setState(before => ({ status: before.value ? 'refreshing' : 'loading', value: before.value }));
    try {
      const result = await fetchMergedCalendar(window_, { signal: controller.current.signal, ...(fetcher ? { fetcher } : {}), ...(localFetcher ? { localFetcher } : {}) });
      if (generation.current === current) setState({ status: 'ready', value: result.value ?? null, runtimeDown: result.runtimeDown === true });
    } catch (error) {
      if (generation.current !== current) return;
      setState(before => (error instanceof CalendarUnavailableError ? { status: 'unavailable', value: null } : { status: before.value ? 'ready' : 'error', value: before.value, runtimeDown: before.runtimeDown }));
    }
  }, [window_, fetcher, localFetcher]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState !== 'hidden') void load(true); }, REFRESH_MS);
    return () => { generation.current += 1; controller.current?.abort(); window.clearInterval(timer); };
  }, [load]);

  const toggleRun = useCallback(async (row, mode) => {
    setToggling({ busy: true, error: '' });
    try {
      const options = localFetcher ? { fetcher: localFetcher } : {};
      if (mode === 'pause') await pauseCalendarItem(row.id, options); else await resumeCalendarItem(row.id, options);
      setNotice(mode === 'pause'
        ? t('runtimeCalendar.notice.paused', { defaultValue: 'Paused “{{name}}”. Its runs are skipped until you resume it.', name: row.label })
        : t('runtimeCalendar.notice.resumed', { defaultValue: 'Resumed “{{name}}”.', name: row.label }));
      setToggling({ busy: false, error: '' });
      await load(true);
    } catch (error) {
      setToggling({ busy: false, error: actionMessage(error) });
    }
  }, [localFetcher, load, t]);
  const openDrawer = useCallback(row => { setToggling({ busy: false, error: '' }); setOpenId(row.id); }, []);
  const closeDrawer = useCallback(() => setOpenId(null), []);
  const openConfirm = useCallback((row, mode) => { setOutcome({ busy: false, error: '' }); setConfirm({ row, mode }); }, []);
  const closeConfirm = useCallback(() => setConfirm(null), []);
  const applyAction = useCallback(async () => {
    if (!confirm) return;
    setOutcome({ busy: true, error: '' });
    try {
      const transport = isLocalItem(confirm.row.id) ? localFetcher : fetcher;
      const options = transport ? { fetcher: transport } : {};
      if (confirm.mode === 'delete') await deleteCalendarItem(confirm.row.id, options);
      else await stopCalendarItem(confirm.row.id, options);
      setNotice(`${confirm.mode === 'delete' ? 'Deleted' : 'Stopped'} “${confirm.row.label}”.`);
      setConfirm(null);
      if (confirm.mode === 'delete') setOpenId(null);
      setOutcome({ busy: false, error: '' });
      await load(true);
    } catch (error) {
      setOutcome({ busy: false, error: actionMessage(error) });
    }
  }, [confirm, fetcher, localFetcher, load]);

  const now = Date.now();
  const entries = useMemo(() => rangeEntries(state.value, { runtimeEnabled }), [state.value, runtimeEnabled]);
  const days = useMemo(() => groupByDay(entries, window_), [entries, window_]);
  const rows = useMemo(() => boardRows(state.value, { status: statusFilter, query }), [state.value, statusFilter, query]);
  const drawerRow = useMemo(() => (openId ? boardRows(state.value).find(row => row.id === openId) ?? null : null), [openId, state.value]);
  const label = `${dayOf(window_.from, { day: 'numeric', month: 'short' })} – ${dayOf(window_.to - 1, { day: 'numeric', month: 'short' })}`;
  const today = new Date().setHours(0, 0, 0, 0);
  const empty = state.status === 'ready' && !state.value;
  const tab = active => `rounded-md px-3 py-1.5 text-[12.5px] ${active ? 'bg-[#ebe8df] font-medium text-[#1f2328]' : 'text-[#5f646b] hover:bg-[#f1efe9]'} ${FOCUS}`;

  return <div className="h-full min-h-0 overflow-y-auto bg-[#faf9f4]" data-runtime-calendar>
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <CalendarDays size={20} className="text-[#41608f]" aria-hidden="true" />
        <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1f2328]">Calendar</h1>
        <div className="ml-auto flex items-center gap-1" role="group" aria-label="Calendar view">
          <button type="button" className={tab(view === 'list')} aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
          <button type="button" className={tab(view === 'week')} aria-pressed={view === 'week'} onClick={() => setView('week')}>Week</button>
          <button type="button" aria-label="Refresh calendar" title="Refresh" onClick={() => void load()} className={`grid h-9 w-9 place-items-center rounded-md text-[#5f646b] hover:bg-[#f1efe9] ${FOCUS}`}><RefreshCw size={15} className={state.status === 'refreshing' ? 'animate-spin' : undefined} /></button>
        </div>
      </header>

      {state.runtimeDown ? <p role="status" className="mb-3 rounded-lg border border-[#e7e4dd] bg-white px-3 py-2 text-[12.5px] text-[#5f646b]" data-calendar-local-only>
        {t('runtimeCalendar.localOnly', 'Runtime’s calendar is not answering right now. These are the tasks your employees keep themselves; the rest returns with Runtime.')}
      </p> : null}

      {notice ? <p role="status" className="mb-3 flex items-center justify-between rounded-lg border border-[#e7e4dd] bg-white px-3 py-2 text-[12.5px] text-[#3d4249]" data-calendar-notice>
        <span>{notice}</span>
        <button type="button" aria-label="Dismiss" onClick={() => setNotice('')} className={`grid h-7 w-7 place-items-center rounded-md hover:bg-[#f1efe9] ${FOCUS}`}><X size={14} aria-hidden="true" /></button>
      </p> : null}

      {view === 'list' && state.value ? <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1" role="group" aria-label="Status">
          {STATUS_TABS.map(([id, text]) => <button key={id} type="button" className={tab(statusFilter === id)} aria-pressed={statusFilter === id} onClick={() => setStatusFilter(id)}>{text}</button>)}
        </div>
        <label className="relative ml-auto block w-full sm:w-64">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9aa0a6]" aria-hidden="true" />
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search tasks" placeholder="Search tasks"
            className={`h-9 w-full rounded-md border border-[#e7e4dd] bg-white pl-8 pr-3 text-[13px] text-[#20252a] ${FOCUS}`} />
        </label>
      </div> : null}

      {view === 'week' ? <div className="mb-3 flex items-center gap-2">
        <button type="button" aria-label="Previous week" onClick={() => setOffset(value => value - 1)} className={`grid h-9 w-9 place-items-center rounded-md border border-[#e7e4dd] bg-white text-[#3d4249] hover:bg-[#f1efe9] ${FOCUS}`}><ChevronLeft size={16} /></button>
        <button type="button" aria-label="Next week" onClick={() => setOffset(value => value + 1)} className={`grid h-9 w-9 place-items-center rounded-md border border-[#e7e4dd] bg-white text-[#3d4249] hover:bg-[#f1efe9] ${FOCUS}`}><ChevronRight size={16} /></button>
        <span className="text-[13px] font-medium text-[#20252a]" aria-live="polite">{label}</span>
        {offset !== 0 ? <button type="button" onClick={() => setOffset(0)} className={`rounded-md px-2.5 py-1.5 text-[12.5px] text-[#3484ff] hover:bg-[#eef4ff] ${FOCUS}`}>Today</button> : null}
      </div> : null}

      {state.status === 'loading' ? <Skeleton /> : null}
      {state.status === 'error' ? <Notice title="The calendar could not be loaded" body="Your saved work is unchanged." action={<button type="button" onClick={() => void load()} className={`mt-3 rounded-md bg-[#117dff] px-3 py-2 text-[12px] font-medium text-white ${FOCUS}`}>Try again</button>} /> : null}
      {state.status === 'unavailable' ? <Notice title="The calendar isn’t available here yet" body="Scheduled tasks and booked work appear here once this workspace is connected." /> : null}
      {empty ? <Notice title="Nothing is scheduled yet" body="When your team schedules a task or books work, it appears here." /> : null}

      {state.value && view === 'week' ? <div className="grid gap-3 md:grid-cols-7" data-calendar-week>
        {days.map(({ day, entries: list }) => <section key={day} aria-label={dayOf(day, { weekday: 'long', day: 'numeric', month: 'long' })}
          className={`min-w-0 rounded-xl border bg-white ${day === today ? 'border-[#3484ff]' : 'border-[#e7e4dd]'}`}>
          <h2 className="border-b border-[#ece9e2] px-3 py-2 text-[12px] font-semibold text-[#3d4249]">{dayOf(day, { weekday: 'short', day: 'numeric' })}</h2>
          {list.length ? <ul className="divide-y divide-[#ece9e2]">{list.map(entry => {
            const inner = <>
              <Owner agent={entry.agent} size={22} />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[12.5px] font-medium ${entry.status === 'active' ? 'text-[#20252a]' : 'text-[#8b9097] line-through'}`} title={entry.title}>{entry.label}</span>
                <span className="block truncate text-[11px] tabular-nums text-[#7a7f86]">{timeOf(entry.at)} · {entry.owner}</span>
              </span>
            </>;
            return <li key={entry.id} className="px-2.5 py-2" data-calendar-entry={entry.kind}>
              {entry.kind === 'duty' && entry.itemId
                ? <button type="button" onClick={() => openDrawer({ id: entry.itemId })} className={`flex w-full items-start gap-2 rounded-md text-left ${FOCUS}`}>{inner}</button>
                : <div className="flex items-start gap-2">{inner}</div>}
            </li>;
          })}</ul>
            : <p className="px-3 py-3 text-[11.5px] text-[#9aa0a6]">Nothing</p>}
        </section>)}
      </div> : null}

      {state.value && view === 'list' ? (rows.length
        ? <ul className="divide-y divide-[#ece9e2] rounded-xl border border-[#e7e4dd] bg-white" data-calendar-list aria-label="Tasks">{rows.map(row => <TaskRow key={row.id} row={row} now={now} onAction={openConfirm} onToggle={toggleRun} onOpen={openDrawer} />)}</ul>
        : <Notice title={query || statusFilter !== 'all' ? 'No tasks match' : 'No tasks yet'} body={query || statusFilter !== 'all' ? 'Change the filter or the search.' : 'Scheduled tasks and booked work are listed here.'} />) : null}

      {drawerRow ? <DutyDrawer row={drawerRow} now={now} version={state.value} localFetcher={localFetcher} busy={toggling.busy} error={toggling.error} onClose={closeDrawer} onAction={openConfirm} onToggle={toggleRun} /> : null}

      {confirm ? <ConfirmDialog target={confirm} busy={outcome.busy} error={outcome.error} onCancel={closeConfirm} onConfirm={() => void applyAction()} /> : null}
    </div>
  </div>;
}
