import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Repeat, RefreshCw } from 'lucide-react';
import {
  CalendarUnavailableError, fetchCalendar, groupByDay, rangeEntries, upcomingItems, weekWindow,
} from '../shared/runtime-calendar';
import { useRuntimeEnabled } from '../shared/runtime-enabled';
import '../shared/skeleton.css';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3484ff]';
/** Shown calendars refresh on this cadence while the page is visible. */
const REFRESH_MS = 60000;
const KIND_LABEL = { duty: 'Repeating duty', assignment: 'Booked work', meeting: 'Meeting', decision: 'Decision', source_request: 'Source request', wake: 'Runtime wake' };

const timeOf = at => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const dayOf = (day, options) => new Date(day).toLocaleDateString(undefined, options);

function Row({ entry, withDate = false }) {
  return <li className="flex items-start gap-3 px-3 py-2.5" data-calendar-entry={entry.kind}>
    <span className="w-14 shrink-0 pt-0.5 text-[12px] tabular-nums text-[#5f646b]">{withDate ? dayOf(entry.at, { day: 'numeric', month: 'short' }) : timeOf(entry.at)}</span>
    <span className="min-w-0 flex-1">
      <span className={`block truncate text-[13.5px] font-medium ${entry.active ? 'text-[#20252a]' : 'text-[#8b9097] line-through'}`}>{entry.title}</span>
      <span className="block truncate text-[11.5px] text-[#7a7f86]">
        {entry.owner} · {KIND_LABEL[entry.kind] || 'Calendar item'}{withDate ? ` · next ${timeOf(entry.at)}` : ''}
      </span>
      {entry.repeat ? <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-[#5f646b]"><Repeat size={11} aria-hidden="true" />{entry.repeat}</span> : null}
    </span>
  </li>;
}

function Skeleton() {
  return <ul className="divide-y divide-[#ece9e2] rounded-xl border border-[#e7e4dd] bg-white" aria-hidden="true" data-calendar-loading>
    {Array.from({ length: 5 }, (unused, index) => <li key={index} className="flex items-center gap-3 px-3 py-3">
      <span className="hm-skeleton h-3 w-12 rounded" />
      <span className="flex-1 space-y-2"><span className="hm-skeleton block h-3 w-2/5 rounded" /><span className="hm-skeleton block h-2.5 w-1/4 rounded" /></span>
    </li>)}
  </ul>;
}

function Notice({ title, body, action }) {
  return <div className="grid place-items-center rounded-xl border border-dashed border-[#d9d5cb] bg-white px-6 py-14 text-center" role="status">
    <div className="max-w-sm"><p className="text-[14px] font-semibold text-[#20252a]">{title}</p>{body ? <p className="mt-1.5 text-[12.5px] leading-5 text-[#6b6f76]">{body}</p> : null}{action}</div>
  </div>;
}

/**
 * The company calendar: repeating duties employees booked for themselves, booked work, meetings and, when the company has Runtime,
 * Runtime's own wakes. Read from the Runtime root as a data owner, so it opens in every HyperAgents view with or without Runtime.
 */
export default function RuntimeCalendar({ fetcher }) {
  const runtimeEnabled = useRuntimeEnabled();
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState('week');
  const [state, setState] = useState({ status: 'loading', value: null });
  const generation = useRef(0);
  const controller = useRef(null);
  const window_ = useMemo(() => weekWindow(Date.now(), offset), [offset]);

  const load = useCallback(async (silent = false) => {
    const current = ++generation.current;
    controller.current?.abort();
    controller.current = new AbortController();
    if (!silent) setState(before => ({ status: before.value ? 'refreshing' : 'loading', value: before.value }));
    try {
      const result = await fetchCalendar(window_, { signal: controller.current.signal, ...(fetcher ? { fetcher } : {}) });
      if (generation.current === current) setState({ status: 'ready', value: result.value ?? null });
    } catch (error) {
      if (generation.current !== current) return;
      setState(before => (error instanceof CalendarUnavailableError ? { status: 'unavailable', value: null } : { status: before.value ? 'ready' : 'error', value: before.value }));
    }
  }, [window_, fetcher]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState !== 'hidden') void load(true); }, REFRESH_MS);
    return () => { generation.current += 1; controller.current?.abort(); window.clearInterval(timer); };
  }, [load]);

  const entries = useMemo(() => rangeEntries(state.value, { runtimeEnabled }), [state.value, runtimeEnabled]);
  const days = useMemo(() => groupByDay(entries, window_), [entries, window_]);
  const upcoming = useMemo(() => upcomingItems(state.value), [state.value]);
  const label = `${dayOf(window_.from, { day: 'numeric', month: 'short' })} – ${dayOf(window_.to - 1, { day: 'numeric', month: 'short' })}`;
  const today = new Date().setHours(0, 0, 0, 0);
  const empty = state.status === 'ready' && !state.value;
  const toggle = id => `rounded-md px-3 py-1.5 text-[12.5px] ${view === id ? 'bg-[#ebe8df] font-medium text-[#1f2328]' : 'text-[#5f646b] hover:bg-[#f1efe9]'} ${FOCUS}`;

  return <div className="h-full min-h-0 overflow-y-auto bg-[#faf9f4]" data-runtime-calendar>
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <CalendarDays size={20} className="text-[#41608f]" aria-hidden="true" />
        <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1f2328]">Calendar</h1>
        <div className="ml-auto flex items-center gap-1" role="group" aria-label="Calendar view">
          <button type="button" className={toggle('week')} aria-pressed={view === 'week'} onClick={() => setView('week')}>Week</button>
          <button type="button" className={toggle('duties')} aria-pressed={view === 'duties'} onClick={() => setView('duties')}>Duties and booked work</button>
          <button type="button" aria-label="Refresh calendar" title="Refresh" onClick={() => void load()} className={`grid h-9 w-9 place-items-center rounded-md text-[#5f646b] hover:bg-[#f1efe9] ${FOCUS}`}><RefreshCw size={15} className={state.status === 'refreshing' ? 'animate-spin' : undefined} /></button>
        </div>
      </header>

      {view === 'week' ? <div className="mb-3 flex items-center gap-2">
        <button type="button" aria-label="Previous week" onClick={() => setOffset(value => value - 1)} className={`grid h-9 w-9 place-items-center rounded-md border border-[#e7e4dd] bg-white text-[#3d4249] hover:bg-[#f1efe9] ${FOCUS}`}><ChevronLeft size={16} /></button>
        <button type="button" aria-label="Next week" onClick={() => setOffset(value => value + 1)} className={`grid h-9 w-9 place-items-center rounded-md border border-[#e7e4dd] bg-white text-[#3d4249] hover:bg-[#f1efe9] ${FOCUS}`}><ChevronRight size={16} /></button>
        <span className="text-[13px] font-medium text-[#20252a]" aria-live="polite">{label}</span>
        {offset !== 0 ? <button type="button" onClick={() => setOffset(0)} className={`rounded-md px-2.5 py-1.5 text-[12.5px] text-[#3484ff] hover:bg-[#eef4ff] ${FOCUS}`}>Today</button> : null}
      </div> : null}

      {state.status === 'loading' ? <Skeleton /> : null}
      {state.status === 'error' ? <Notice title="The calendar could not be loaded" body="Your saved work is unchanged." action={<button type="button" onClick={() => void load()} className={`mt-3 rounded-md bg-[#117dff] px-3 py-2 text-[12px] font-medium text-white ${FOCUS}`}>Try again</button>} /> : null}
      {state.status === 'unavailable' ? <Notice title="The calendar isn’t available here yet" body="Booked work and repeating duties appear here once this workspace is connected." /> : null}
      {empty ? <Notice title="Nothing is booked yet" body="When your team books repeating duties or schedules work, it appears here." /> : null}

      {state.value && view === 'week' ? <div className="grid gap-3 md:grid-cols-7" data-calendar-week>
        {days.map(({ day, entries: list }) => <section key={day} aria-label={dayOf(day, { weekday: 'long', day: 'numeric', month: 'long' })}
          className={`min-w-0 rounded-xl border bg-white ${day === today ? 'border-[#3484ff]' : 'border-[#e7e4dd]'}`}>
          <h2 className="border-b border-[#ece9e2] px-3 py-2 text-[12px] font-semibold text-[#3d4249]">{dayOf(day, { weekday: 'short', day: 'numeric' })}</h2>
          {list.length ? <ul className="divide-y divide-[#ece9e2]">{list.map(entry => <Row key={entry.id} entry={entry} />)}</ul>
            : <p className="px-3 py-3 text-[11.5px] text-[#9aa0a6]">Nothing</p>}
        </section>)}
      </div> : null}

      {state.value && view === 'duties' ? (upcoming.length
        ? <ul className="divide-y divide-[#ece9e2] rounded-xl border border-[#e7e4dd] bg-white" data-calendar-duties>{upcoming.map(entry => <Row key={entry.id} entry={entry} withDate />)}</ul>
        : <Notice title="No upcoming duties" body="Repeating duties and booked work with a run ahead are listed here." />) : null}
    </div>
  </div>;
}
