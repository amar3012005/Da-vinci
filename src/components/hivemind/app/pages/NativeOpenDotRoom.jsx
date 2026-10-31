import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { openDotEmployeeIdFromPath } from '../shared/open-dot-employee-route';
import { closeNativeRoom, onNativeRoomClosed, openNativeRoom } from '../shared/native-room';
import { useSidebarCopy } from '../layout/sidebar-copy';
import { useOptionalAuth } from '../auth/AuthProvider';

/**
 * Employee room in the packaged app. OpenDot refuses to be framed by capacitor://localhost, so the native
 * plugin shows the room full screen; this page keeps the route, opens the team when the person closes the room,
 * and offers to open the same room again.
 */
export default function NativeOpenDotRoom({ route, active = true }) {
  const s = useSidebarCopy();
  const location = useLocation();
  const employeeId = openDotEmployeeIdFromPath((route || location).pathname);
  // Choosing the same employee again after Done is a new navigation of the same path; its key reopens the room.
  const visit = (route || location).key;
  const { user, org } = useOptionalAuth() || {};
  const scope = org?.id && user?.id ? `${org.id}:${user.id}` : undefined;
  const [state, setState] = useState('opening');
  const open = useCallback(() => {
    setState('opening');
    return openNativeRoom(employeeId, { scope }).catch(() => setState('failed'));
  }, [employeeId, scope]);
  useEffect(() => {
    if (!active || !employeeId) return undefined;
    let listener;
    let gone = false;
    onNativeRoomClosed(() => { setState('closed'); window.dispatchEvent(new CustomEvent('hivemind:open-dot-team')); })
      .then(handle => { if (gone) handle.remove(); else listener = handle; });
    open();
    return () => { gone = true; listener?.remove(); closeNativeRoom().catch(() => { /* No room was open. */ }); };
  }, [active, employeeId, open, visit]);
  return <main className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-white p-6 text-center">
    {state === 'opening'
      ? <AsciiWorkspaceLoading label="Opening workspace…" />
      : <button type="button" onClick={open} className="rounded-md border border-[#d4d4d4] px-3 py-2 text-sm text-[#333]">{s('shellStatus.tryAgain', 'Try again')}</button>}
  </main>;
}
