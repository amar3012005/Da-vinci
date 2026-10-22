import { aggregateMotion } from '../shared/runtime-motion';
import { mostUrgentTaskStatus } from '../shared/open-dot-room-status';
import React from 'react';
import { CalendarClock, LoaderCircle, Bell, Phone, CircleAlert } from 'lucide-react';

/** Keep the newest preview while retaining activity in any authorized room. */
export function aggregateAgentRooms(rooms, agentId) {
  const matching = rooms.filter(room => room.id === agentId);
  if (matching.length === 0) return undefined;
  const live = matching.filter(room => room.live === true);
  const activity = live.length ? live : matching.filter(room => !room.scheduleOnly);
  const latest = (activity.length ? activity : matching).reduce((current, room) => room.updatedAt > current.updatedAt ? room : current);
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
  };
}

const TASK_STATUS_LABEL = { assigned: 'Assigned', working: 'Working', blocked: 'Blocked', submitted: 'Submitted', accepted: 'Accepted', failed: 'Failed' };
const TASK_STATUS_TONE = { assigned: 'text-[#525252]', working: 'text-[#117dff]', blocked: 'text-amber-700', submitted: 'text-violet-700', accepted: 'text-green-700', failed: 'text-red-700' };

/** Display only states published by the authenticated native room bridge. */
export default function AgentRoomStatus({ room, collapsed = false, compact = false }) {
  if (!room) return null;
  if (room.stale) return <span className={(collapsed || compact) ? 'absolute right-1 top-1 z-20 flex items-center gap-1' : 'relative mt-1 flex items-center gap-1 text-[10px] text-[#737373]'} title="Activity status unavailable; last update retained.">
    <CircleAlert size={13} aria-label="Activity status unavailable" role="img" />
    {room.unread && <span className="h-1.5 w-1.5 rounded-full bg-green-500" role="img" aria-label="Unread update" />}
  </span>;
  const activeCall = room.activeCall === true;
  const failed = room.error === true;
  const loading = room.loading === true;
  const working = room.running === true || room.status === 'working';
  const workLabel = room.activity || 'Working';
  const paused = room.status === 'paused';
  const idle = room.status === 'idle';
  const unread = room.unread === true;
  const actionRequired = room.actionRequired === true || room.waitingForAnswer === true || room.status === 'waiting';
  const scheduled = room.scheduled === true;
  const attentionLabel = (room.waitingForAnswer || room.status === 'waiting') ? 'Waiting for you' : 'Action required';
  const taskStatus = TASK_STATUS_LABEL[room.taskStatus] ? room.taskStatus : undefined;
  if (!failed && !loading && !activeCall && !working && !unread && !actionRequired && !scheduled && !paused && !idle && !taskStatus) return null;
  return (
    <span className={(collapsed || compact) ? 'absolute right-1 top-1 z-20 flex items-center gap-1' : 'relative z-10 mt-1 flex min-w-0 flex-wrap items-center gap-1.5'}>
      {failed && <CircleAlert size={14} className="text-red-700" role="img" aria-label="Work failed" />}
      {loading && !working && <LoaderCircle size={14} className="text-[#737373] animate-spin motion-reduce:animate-none" role="img" aria-label="Opening workspace" />}
      {activeCall && <Phone size={14} className="text-green-700" role="img" aria-label="In call" />}
      {working && <LoaderCircle size={14} className="text-[#737373] animate-spin motion-reduce:animate-none" role="img" aria-label={workLabel} />}
      {working && !(collapsed || compact) && <span className="text-[10px] text-[#737373]" role="status">{workLabel}</span>}
      {taskStatus && !working && <span className={(collapsed || compact) ? 'sr-only' : `text-[10px] font-medium ${TASK_STATUS_TONE[taskStatus]}`} role="status" title={`Task ${TASK_STATUS_LABEL[taskStatus].toLowerCase()}`}>{TASK_STATUS_LABEL[taskStatus]}</span>}
      {!taskStatus && !working && !actionRequired && !failed && (paused || idle) && <span className={(collapsed || compact) ? 'sr-only' : 'text-[10px] text-[#737373]'} role="status">{paused ? 'Paused' : 'Ready'}</span>}
      {unread && <span className="h-1.5 w-1.5 rounded-full bg-green-500" role="img" aria-label="Unread update" />}
      {scheduled && !taskStatus && <CalendarClock size={14} className="text-[#737373]" role="img" aria-label="Work scheduled" />}
      {actionRequired && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700" role="status">
        <Bell size={13} className="animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        {(collapsed || compact) ? <span className="sr-only">{attentionLabel}</span> : attentionLabel}
      </span>}
    </span>
  );
}
