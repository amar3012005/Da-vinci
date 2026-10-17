import PersistentHarnessPanes from './PersistentHarnessPanes';
import { paneForPath, persistentShellEnabled } from '../shared/native-pane-protocol';
import { isNativeApp } from '../shared/native-app';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import React, { Suspense, useLayoutEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
const Apps = React.lazy(() => import('../pages/OpenDotAppsNavigation'));
const OpenDotEntry = React.lazy(() => import('../pages/OpenDotEntry'));

// Retain the employee application while the outer sidebar changes routes.
export default function AgentWorkspaceOutlet() {
  const location = useLocation();
  const persistent = persistentShellEnabled() && !isNativeApp();
  const nativeChat = persistent && Boolean(paneForPath(location.pathname));
  const dot = /^\/hivemind\/app\/employee\/dots(?:\/|$)/.test(location.pathname);
  const apps = location.pathname === '/hivemind/app/employee/apps';
  const [appsVisited, setAppsVisited] = useState(apps);
  useLayoutEffect(() => { if (apps) setAppsVisited(true); }, [apps]);
  // One retained Next.js application; employee changes use its native router.
  const [dotEntry, setDotEntry] = useState(dot ? { pathname: location.pathname, search: location.search } : null);
  useLayoutEffect(() => {
    if (dot && !dotEntry) setDotEntry({ pathname: location.pathname, search: location.search });
  }, [dot, dotEntry, location.pathname, location.search]);
  return <>
    {!dot && !apps && !nativeChat && <Outlet />}
    {persistent && <PersistentHarnessPanes />}
    {appsVisited && <div hidden={!apps} className="h-full min-h-0" style={{ display: apps ? 'block' : 'none' }}>
      <Suspense fallback={<AsciiWorkspaceLoading label="Opening Apps…" />}><Apps /></Suspense>
    </div>}
    {dotEntry && <div hidden={!dot} className="h-full min-h-0" style={{ display: dot ? 'block' : 'none' }}>
      <Suspense fallback={<AsciiWorkspaceLoading label="Opening workspace…" />}><OpenDotEntry initialRoute={dotEntry} route={dot ? location : dotEntry} active={dot} /></Suspense>
    </div>}
  </>;
}
