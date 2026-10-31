import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import AgentAvatar from './AgentAvatar';
import { aggregateAgentRooms } from '../layout/AgentRoomStatus';
import { useCopy, useLocaleFormat } from '../layout/sidebar-copy';
import { boardColumns, boardSignature, fetchTeamBoard, fetchTeamWeek } from '../shared/team-board';
import './team-board.css';

/** Shortest gap between two board reads, so a burst of status changes costs one request. */
const MIN_GAP_MS = 6000;
const STATE_KEYS = { working: ['stateWorking', 'Working'], waiting: ['stateWaiting', 'Waiting for you'], idle: ['stateIdle', 'Idle'], paused: ['statePaused', 'Paused'], error: ['stateError', 'Needs a look'] };
const KIND_KEYS = { question: ['kindQuestion', 'Question'], reply: ['kindReply', 'Reply'], update: ['kindUpdate', 'Update'], message: ['kindMessage', 'Message'] };
const OUTCOME_KEYS = { completed: ['outcomeCompleted', 'Done'], blocked: ['outcomeBlocked', 'Blocked'], failed: ['outcomeFailed', 'Failed'] };

/**
 * Live team board: one column per employee (state, current task, last result), the recent handoffs between colleagues, the team digest and
 * the week's summary. States come from the room rows the sidebar's shared poll and live frames already fill, so the board adds no polling:
 * it reads the extra facts once when it opens, then again when a state or activity changes (at most once per few seconds).
 * @param {{ team: Array<object>, rooms?: Array<object>, onOpenTeammate?: (event: Event, agent: object) => void }} props - Roster, live room rows and the handler that opens an employee's room.
 */
export default function TeamBoard({ team, rooms, onOpenTeammate }) {
  const cr = useCopy('teamBoard');
  const format = useLocaleFormat();
  const roomFor = useCallback(id => (Array.isArray(rooms) && rooms.length ? aggregateAgentRooms(rooms, id) : undefined), [rooms]);
  const [extras, setExtras] = useState(null);
  const [week, setWeek] = useState(null);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);
  const lastRead = useRef(0);
  const trailing = useRef(null);
  const generation = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearTimeout(trailing.current); }; }, []);

  const read = useCallback(async () => {
    lastRead.current = Date.now();
    const mine = ++generation.current;
    try {
      const [board, summary] = await Promise.all([fetchTeamBoard(), fetchTeamWeek().catch(() => null)]);
      if (!alive.current || mine !== generation.current) return;
      setExtras(board); setWeek(summary); setFailed(false);
    } catch { if (alive.current && mine === generation.current) setFailed(true); }
  }, []);
  const request = useCallback(() => {
    if (document.hidden) return;
    const wait = lastRead.current + MIN_GAP_MS - Date.now();
    if (wait <= 0) { read(); return; }
    if (!trailing.current) trailing.current = setTimeout(() => { trailing.current = null; read(); }, wait);
  }, [read]);

  const columns = useMemo(() => boardColumns({ team, roomFor, extras }), [team, roomFor, extras]);
  const signature = boardSignature(columns);
  useEffect(() => { request(); }, [request, signature]);
  useEffect(() => {
    window.addEventListener('hivemind:employee-status-changed', request);
    document.addEventListener('visibilitychange', request);
    return () => { window.removeEventListener('hivemind:employee-status-changed', request); document.removeEventListener('visibilitychange', request); };
  }, [request]);

  const byDot = useMemo(() => new Map(columns.filter(column => column.dotId).map(column => [column.dotId, column])), [columns]);
  const open = (event, agent) => { if (agent) onOpenTeammate?.(event, agent); };
  const ago = at => format.ago(new Date(at).toISOString()) || cr('justNow', 'Just now');
  const stateLabel = state => cr(...STATE_KEYS[state]);
  const handoffs = extras?.handoffs || [];
  const digest = extras?.digests?.[0];
  const totals = week?.totals;
  const moved = totals && Object.values(totals).some(Boolean);

  return <section className="tb" data-team-board aria-label={cr('title', 'Team')}>
    <div className="tb-top">
      <h2 className="tb-title">{cr('title', 'Team')}</h2>
      <span className="tb-live"><i aria-hidden="true" />{cr('live', 'Live')}</span>
    </div>
    {failed && !extras && <p role="alert" className="tb-note">{cr('loadFailed', 'Tasks and handoffs could not be loaded.')} <button type="button" className="tb-link" onClick={read}>{cr('retry', 'Try again')}</button></p>}
    {columns.length === 0 && <p role="status" className="tb-note">{cr('noTeam', 'No employees yet.')}</p>}
    {columns.length > 0 && <ul className="tb-cols" aria-label={cr('columnsLabel', 'Employees')}>{columns.map(column => <li key={column.id} className="tb-col" data-board-state={column.state}>
      <div className="tb-who">
        <span className="tb-avatar"><AgentAvatar agent={column.agent} size={36} /></span>
        <span style={{ minWidth: 0 }}><span className="tb-name">{column.name}</span>{column.role && <span className="tb-role">{column.role}</span>}</span>
      </div>
      <span className="tb-state" data-state={column.state}><i aria-hidden="true" />{stateLabel(column.state)}</span>
      <div>
        <p className="tb-label">{cr('currentTask', 'Now')}</p>
        {column.task || column.activity
          ? <p className="tb-task">{column.task?.title || column.activity}{column.task?.status === 'blocked' ? ` · ${cr('taskBlocked', 'blocked')}` : ''}</p>
          : <p className="tb-task" data-empty>{cr('taskNone', 'No task right now')}</p>}
      </div>
      <div>
        <p className="tb-label">{cr('lastResult', 'Last result')}</p>
        {column.lastResult
          ? <p className="tb-result"><b>{column.lastResult.outcome && OUTCOME_KEYS[column.lastResult.outcome] ? cr(...OUTCOME_KEYS[column.lastResult.outcome]) : ''}</b>{column.lastResult.outcome ? ' · ' : ''}{column.lastResult.subject}{column.lastResult.at ? ` · ${ago(column.lastResult.at)}` : ''}</p>
          : <p className="tb-result">{cr('resultNone', 'Nothing finished yet')}</p>}
      </div>
      {onOpenTeammate && <button type="button" className="tb-open" aria-label={cr('openAria', 'Open {{name}}’s chat', { name: column.name })} onClick={event => open(event, column.agent)}>{cr('open', 'Open')}</button>}
    </li>)}</ul>}

    <h3 className="tb-h">{cr('handoffsTitle', 'Handoffs')}</h3>
    {extras && handoffs.length === 0 && <p role="status" className="tb-note">{cr('handoffsEmpty', 'No messages between colleagues yet.')}</p>}
    {handoffs.length > 0 && <ol className="tb-hand" data-handoffs>{handoffs.map(item => {
      const from = byDot.get(item.fromDotId), to = byDot.get(item.toDotId);
      const fromName = from?.name || item.fromName, toName = to?.name || item.toName;
      return <li key={item.id} className="tb-hrow" data-handoff-kind={item.kind}>
        <span className="tb-pair" aria-hidden="true">
          <span className="tb-avatar">{from ? <AgentAvatar agent={from.agent} size={30} /> : null}</span><ArrowRight className="tb-arrow" />
          <span className="tb-avatar">{to ? <AgentAvatar agent={to.agent} size={30} /> : null}</span>
        </span>
        <div className="tb-hmain">
          <div className="tb-hmeta"><strong>{cr('fromTo', '{{from}} to {{to}}', { from: fromName, to: toName })}</strong><span className="tb-kind">{cr(...KIND_KEYS[item.kind])}</span><time dateTime={new Date(item.at).toISOString()}>{ago(item.at)}</time></div>
          <p className="tb-sum">{item.summary}</p>
          {item.files.length > 0 && <ul className="tb-files" aria-label={cr('filesLabel', 'Files that went with it')}>{item.files.map(file => <li key={file}>{file}</li>)}</ul>}
          {onOpenTeammate && to && <button type="button" className="tb-open" aria-label={cr('openAria', 'Open {{name}}’s chat', { name: toName })} onClick={event => open(event, to.agent)}>{cr('open', 'Open')}</button>}
        </div>
      </li>;
    })}</ol>}

    <div className="tb-tiles">
      <div className="tb-tile" data-tone="butter" data-digest>
        <h3>{cr('digestTitle', 'Team digest')}</h3>
        {digest ? <p>{cr('digestLine', '{{name}} ({{date}}): {{text}}', { name: digest.name, date: format.date(digest.date, { day: 'numeric', month: 'short' }) || digest.date, text: digest.text })}</p> : <p>{cr('digestEmpty', 'No digest line yet. Employees leave one after a brief or a check.')}</p>}
      </div>
      <div className="tb-tile" data-tone="aqua" data-week>
        <h3>{cr('weekTitle', 'What the team moved this week')}</h3>
        {moved ? <>
          <ul className="tb-stats">{[['completed', 'weekDone', 'Done'], ['blocked', 'weekBlocked', 'Blocked'], ['returned', 'weekReturned', 'Sent back'], ['lessons', 'weekLessons', 'Lessons']].map(([key, copyKey, fallback]) => <li key={key}><b>{format.number(totals[key])}</b>{cr(copyKey, fallback)}</li>)}</ul>
          {week.rows.map(row => <p key={row.name}><b style={{ fontWeight: 500 }}>{row.name}</b>{row.subject ? ` · ${row.subject}` : ''}</p>)}
        </> : <p>{cr('weekEmpty', 'Nothing recorded yet this week.')}</p>}
      </div>
    </div>
  </section>;
}
