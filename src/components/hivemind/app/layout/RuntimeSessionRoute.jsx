import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { agentRoster } from '../shared/agent-roster';
import { RUNTIME_SESSION_PATH, runtimeDisabledDestination, runtimeEnabledFor, runtimeRouteAllowed } from '../shared/runtime-enabled';

/**
 * Renders Runtime's session route only for a company that has Runtime (or a deliberately opened employee room).
 * The route guard in AppShell redirects the rest; this keeps Runtime's room from mounting for even one frame.
 * @param {{ children: React.ReactNode }} props - The Runtime session page.
 * @returns {React.ReactNode} The page, or nothing while the guard redirects.
 */
export function RuntimeSessionRoute({ children }) {
  const { org } = useAuth();
  const location = useLocation();
  return !runtimeEnabledFor(org) && !runtimeRouteAllowed(location) ? null : children;
}

/**
 * The old `/employees` entry: Runtime's room, or the first employee's room when the company has no Runtime.
 * @returns {React.ReactNode} A redirect.
 */
export function EmployeesEntry() {
  const { org, user } = useAuth();
  const scope = user?.id && org?.id ? `${user.id}:${org.id}` : null;
  return <Navigate to={runtimeEnabledFor(org) ? RUNTIME_SESSION_PATH : runtimeDisabledDestination(agentRoster.peek(scope))} replace />;
}
