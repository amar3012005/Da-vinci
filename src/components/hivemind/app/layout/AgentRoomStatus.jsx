import React from 'react';
import { CalendarClock, LoaderCircle, CircleAlert } from 'lucide-react';

/** Display only states published by the authenticated native room bridge. */
export default function AgentRoomStatus({ room, collapsed = false }) {
  if (!room) return null;
  const working = room.running === true;
  const unread = room.unread === true;
  const actionRequired = room.actionRequired === true;
  const scheduled = room.scheduled === true;
  if (!working && !unread && !actionRequired && !scheduled) return null;
  return (
    <span className={collapsed ? 'absolute right-1 top-1 z-20 flex items-center gap-1' : 'relative z-10 ml-auto flex shrink-0 items-center gap-1.5'}>
      {working && <LoaderCircle size={14} className="text-[#737373] animate-spin motion-reduce:animate-none" role="img" aria-label="Working" />}
      {unread && <span className="h-1.5 w-1.5 rounded-full bg-green-500" role="img" aria-label="Unread update" />}
      {scheduled && <CalendarClock size={14} className="text-[#737373]" role="img" aria-label="Work scheduled" />}
      {actionRequired && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700" role="status">
        <CircleAlert size={13} aria-hidden="true" />
        {collapsed ? <span className="sr-only">Action required</span> : 'Action required'}
      </span>}
    </span>
  );
}
