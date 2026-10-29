import { useEffect } from 'react';
import { agentRoster } from '../shared/agent-roster';
import { isRuntimeSessionPath, runtimeDisabledDestination, runtimeRouteAllowed, setEmployeeRoomOpen } from '../shared/runtime-enabled';

/**
 * Keeps a company without Runtime out of Runtime's session route.
 * A direct link, a stale tab or a switch-off while the room is open goes to the first employee's room,
 * or to the team page when the roster has no ready employee.
 * @param {{ enabled: boolean, location: { pathname: string, search?: string }, navigate: Function, scope: string | null }} options - Whether Runtime is on, the router location and navigation, and the roster scope.
 * @returns {void}
 */
export function useRuntimeRouteGuard({ enabled, location, navigate, scope }) {
  const { pathname, search } = location;
  useEffect(() => {
    if (!isRuntimeSessionPath(pathname)) setEmployeeRoomOpen(false);
    if (enabled || runtimeRouteAllowed({ pathname, search })) return undefined;
    let active = true;
    const go = roster => { if (active) navigate(runtimeDisabledDestination(roster), { replace: true }); };
    const cached = agentRoster.peek(scope);
    if (cached?.length) go(cached);
    else if (!scope) go(undefined);
    else agentRoster.load(scope).then(go, () => go(undefined));
    return () => { active = false; };
  }, [enabled, pathname, search, scope, navigate]);
}

