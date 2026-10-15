import React, { Suspense, useLayoutEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
const Apps = React.lazy(() => import('../pages/OpenDotAppsNavigation'));
const OpenDotEntry = React.lazy(() => import('../pages/OpenDotEntry'));

// Keep a bounded working set of visited Dot documents mounted. Browser HTTP
// caching alone does not preserve an iframe's session, draft or scroll position.
export default function AgentWorkspaceOutlet() {
  const location = useLocation();
  const dot = /^\/hivemind\/app\/employee\/dots(?:\/|$)/.test(location.pathname);
  const apps = location.pathname === '/hivemind/app/employee/apps';
  const [appsVisited, setAppsVisited] = useState(apps);
  useLayoutEffect(() => { if (apps) setAppsVisited(true); }, [apps]);
  const key = dot ? `${location.pathname}${location.search}` : null;
  const [visited, setVisited] = useState([]);
  useLayoutEffect(() => {
    if (!key) return;
    setVisited(previous => [...previous.filter(row => row.key !== key), { key, route: { pathname: location.pathname, search: location.search } }].slice(-6));
  }, [key, location.pathname, location.search]);
  return <>
    {!dot && !apps && <Outlet />}
    {appsVisited && <div hidden={!apps} className="h-full min-h-0" style={{ display: apps ? 'block' : 'none' }}>
      <Suspense fallback={<div role="status">Opening Apps…</div>}><Apps /></Suspense>
    </div>
    {visited.map(row => <div key={row.key} hidden={row.key !== key} className="h-full min-h-0" style={{ display: row.key === key ? 'block' : 'none' }}>
      <Suspense fallback={<div role="status">Opening workspace…</div>}><OpenDotEntry route={row.route} active={row.key === key} /></Suspense>
    </div>)}
  </>;
}
