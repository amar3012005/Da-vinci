import React from 'react';
import { CalendarClock, LoaderCircle, Bell, Phone, CircleAlert } from 'lucide-react';

/** Keep the newest preview while retaining activity in any authorized room. */
export function aggregateAgentRooms(rooms, agentId) {
  const matching = rooms.filter(room => room.id === agentId);
  if (matching.length === 0) return undefined;
  const latest = matching.reduce((current, room) => room.updatedAt > current.updatedAt ? room : current);
  return {
    ...latest,
    error: matching.some(room => room.error === true),
    loading: matching.some(room => room.loading === true),
    activeCall: matching.some(room => room.activeCall === true),
    running: matching.some(room => room.running === true),
    unread: matching.some(room => room.unread === true),
    actionRequired: matching.some(room => room.actionRequired === true),
    waitingForAnswer: matching.some(room => room.waitingForAnswer === true),
    scheduled: matching.some(room => room.scheduled === true),
  };
}

/** Display only states published by the authenticated native room bridge. */
export default function AgentRoomStatus({ room, collapsed = false, compact = false }) {
  if (!room) return null;
  const activeCall = room.activeCall === true;
  const failed = room.error === true;
  const loading = room.loading === true;
  const working = room.running === true || room.status === 'working';
  const paused = room.status === 'paused';
  const idle = room.status === 'idle';
  const unread = room.unread === true;
  const actionRequired = room.actionRequired === true || room.waitingForAnswer === true || room.status === 'waiting';
  const scheduled = room.scheduled === true;
  const attentionLabel = (room.waitingForAnswer || room.status === 'waiting') ? 'Waiting for you' : 'Action required';
  if (!failed && !loading && !activeCall && !working && !unread && !actionRequired && !scheduled && !paused && !idle) return null;
  return (
    <span className={(collapsed || compact) ? 'absolute right-1 top-1 z-20 flex items-center gap-1' : 'relative z-10 mt-1 flex min-w-0 flex-wrap items-center gap-1.5'}>
      {failed && <CircleAlert size={14} className="text-red-700" role="img" aria-label="Work failed" />}
      {loading && !working && <LoaderCircle size={14} className="text-[#737373] animate-spin motion-reduce:animate-none" role="img" aria-label="Opening workspace" />}
      {activeCall && <Phone size={14} className="text-green-700" role="img" aria-label="In call" />}
      {working && <LoaderCircle size={14} className="text-[#737373] animate-spin motion-reduce:animate-none" role="img" aria-label="Working" />}
      {!working && !actionRequired && !failed && (paused || idle) && <span className={(collapsed || compact) ? 'sr-only' : 'text-[10px] text-[#737373]'} role="status">{paused ? 'Paused' : 'Idle'}</span>}
      {unread && <span className="h-1.5 w-1.5 rounded-full bg-green-500" role="img" aria-label="Unread update" />}
      {scheduled && <CalendarClock size={14} className="text-[#737373]" role="img" aria-label="Work scheduled" />}
      {actionRequired && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700" role="status">
        <Bell size={13} className="animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        {(collapsed || compact) ? <span className="sr-only">{attentionLabel}</span> : attentionLabel}
      </span>}
    </span>
  );
}
