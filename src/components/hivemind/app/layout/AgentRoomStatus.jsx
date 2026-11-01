import { aggregateMotion } from '../shared/runtime-motion';
import { mostUrgentTaskStatus } from '../shared/open-dot-room-status';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { fillCopy } from './sidebar-copy';
import { CalendarClock, LoaderCircle, Bell, Phone, CircleAlert } from 'lucide-react';

/** Keep the newest preview while retaining activity in any authorized room. */
export function aggregateAgentRooms(rooms, agentId) {
  const matching = rooms.filter(room => room.id === agentId);
  if (matching.length === 0) return undefined;
  const live = matching.filter(room => room.live === true);
  const activity = live.length ? live : matching.filter(room => !room.scheduleOnly);
  const latest = (activity.length ? activity : matching).reduce((current, room) => room.updatedAt > current.updatedAt ? room : current);
  // The server's agent status row, when present, is the only source of working, waiting, paused, archived and failed.
  const server = matching.find(room => room.serverStatus === true);
  const activeCall = matching.some(room => room.activeCall === true);
  const served = server ? { status: server.status, running: server.running === true, actionRequired: server.actionRequired === true, waitingForAnswer: server.waitingForAnswer === true, error: server.error === true,
    motion: activeCall ? 'listening' : server.motion } : null;
  return {
    ...latest,
    motion: aggregateMotion(activity.length ? activity : matching),
    stale: matching.every(room => room.stale === true),
    error: matching.some(room => room.error === true),
    loading: matching.some(room => room.loading === true),
    activeCall: matching.some(room => room.activeCall === true),
    running: activity.some(room => room.running === true),
    unread: matching.some(room => room.unread === true),
    actionRequired: activity.some(room => room.actionRequired === true || room.status === 'waiting'),
    waitingForAnswer: activity.some(room => room.waitingForAnswer === true),
    scheduled: matching.some(room => room.scheduled === true),
    taskStatus: mostUrgentTaskStatus(matching),
    ...served,
  };
}

/** English defaults; the visible text is read from `sidebar.task.<status>` in the chosen language. */
const TASK_STATUS_LABEL = { assigned: 'Assigned', working: 'Working', blocked: 'Blocked', waiting: 'Waiting on you', submitted: 'Submitted', review: 'Needs review', accepted: 'Accepted', resolved: 'Resolved', failed: 'Failed' };
const TASK_STATUS_TONE = { assigned: 'text-[#525252]', working: 'text-[#117dff]', blocked: 'text-amber-700', waiting: 'text-amber-700', submitted: 'text-violet-700', review: 'text-violet-700', accepted: 'text-green-700', resolved: 'text-green-700', failed: 'text-red-700' };

/** Display only states published by the authenticated native room bridge. */
export default function AgentRoomStatus({ room, collapsed = false, compact = false }) {
  const { t } = useTranslation('dashboard');
  const tt = (key, fallback, vars) => fillCopy(t(`sidebar.${key}`, { ...vars, defaultValue: fallback }), vars);
  const taskLabel = status => tt(`task.${status}`, TASK_STATUS_LABEL[status]);
  if (!room) return null;
  if (room.stale) return <span className={(collapsed || compact) ? 'absolute end-1 top-1 z-20 flex items-center gap-1' : 'relative mt-1 flex items-center gap-1 text-[10px] text-[#737373]'} title={tt('activityUnavailableTitle', 'Activity status unavailable; last update retained.')}>
    <CircleAlert size={13} aria-label={tt('activityUnavailable', 'Activity status unavailable')} role="img" />
    {room.unread && <span className="h-1.5 w-1.5 rounded-full bg-green-500" role="img" aria-label={tt('unreadUpdate', 'Unread update')} />}
  </span>;
  const activeCall = room.activeCall === true;
  const failed = room.error === true;
  const loading = room.loading === true;
  const working = room.running === true || room.status === 'working';
  const workLabel = room.activity || tt('statusWorking', 'Working');
  const paused = room.status === 'paused';
  const archived = room.status === 'archived';
  const idle = room.status === 'idle';
  const unread = room.unread === true;
  const actionRequired = room.actionRequired === true || room.waitingForAnswer === true || room.status === 'waiting';
  const scheduled = room.scheduled === true;
  const attentionLabel = (room.waitingForAnswer || room.status === 'waiting') ? tt('statusWaiting', 'Waiting for you') : tt('statusActionRequired', 'Action required');
  // "Waiting" belongs to the agent status alone; a task state never adds it.
  const taskStatus = room.taskStatus !== 'waiting' && TASK_STATUS_LABEL[room.taskStatus] ? room.taskStatus : undefined;
  if (!failed && !loading && !activeCall && !working && !unread && !actionRequired && !scheduled && !paused && !archived && !idle && !taskStatus) return null;
  return (
    <span className={(collapsed || compact) ? 'absolute end-1 top-1 z-20 flex items-center gap-1' : 'relative z-10 mt-1 flex min-w-0 flex-wrap items-center gap-1.5'}>
      {failed && <CircleAlert size={14} className="text-red-700" role="img" aria-label={tt('statusFailed', 'Work failed')} />}
      {loading && !working && <LoaderCircle size={14} className="text-[#737373] animate-spin motion-reduce:animate-none" role="img" aria-label={tt('openingWorkspace', 'Opening workspace')} />}
      {activeCall && <Phone size={14} className="text-green-700" role="img" aria-label={tt('inCall', 'In call')} />}
      {working && <LoaderCircle size={14} className="text-[#737373] animate-spin motion-reduce:animate-none" role="img" aria-label={workLabel} />}
      {working && !(collapsed || compact) && <span className="text-[10px] text-[#737373]" role="status">{workLabel}</span>}
      {taskStatus && !working && <span className={(collapsed || compact) ? 'sr-only' : `text-[10px] font-medium ${TASK_STATUS_TONE[taskStatus]}`} role="status" title={tt('taskTitle', 'Task {{status}}', { status: taskLabel(taskStatus).toLowerCase() })}>{taskLabel(taskStatus)}</span>}
      {!taskStatus && !working && !actionRequired && !failed && (paused || archived || idle) && <span className={(collapsed || compact) ? 'sr-only' : 'text-[10px] text-[#737373]'} role="status">{archived ? tt('statusArchived', 'Archived') : paused ? tt('statusPaused', 'Paused') : tt('statusReady', 'Ready')}</span>}
      {unread && <span className="h-1.5 w-1.5 rounded-full bg-green-500" role="img" aria-label={tt('unreadUpdate', 'Unread update')} />}
      {scheduled && <CalendarClock size={14} className="text-[#737373]" role="img" aria-label={tt('workScheduled', 'Work scheduled')} />}
      {actionRequired && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700" role="status">
        <Bell size={13} className="animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        {(collapsed || compact) ? <span className="sr-only">{attentionLabel}</span> : attentionLabel}
      </span>}
    </span>
  );
}
