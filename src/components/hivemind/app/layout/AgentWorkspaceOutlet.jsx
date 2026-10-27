import PersistentHarnessPanes from './PersistentHarnessPanes';
import { directRuntimeHost, paneForPath, persistentShellEnabled } from '../shared/native-pane-protocol';
import { isNativeApp } from '../shared/native-app';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import React, { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { agentRoster } from '../shared/agent-roster';
import { openDotPreloadRoute, preloadAllowed, rememberOpenDotRoute, whenIdle } from '../shared/open-dot-preload';
const Apps = React.lazy(() => import('../pages/OpenDotAppsNavigation'));
const OpenDotEntry = React.lazy(() => import('../pages/OpenDotEntry'));

// Retain the employee application while the outer sidebar changes routes.
export default function AgentWorkspaceOutlet() {
  const location = useLocation();
  const persistent = persistentShellEnabled() && !isNativeApp();
  const [desktop, setDesktop] = useState(() => window.matchMedia?.('(min-width: 768px)').matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.('(min-width: 768px)');
    const changed = () => setDesktop(media?.matches ?? false);
    changed(); media?.addEventListener?.('change', changed);
    return () => media?.removeEventListener?.('change', changed);
  }, []);
  // Brain already has a native HarnessSurface seat in this same document.
  // A second authenticated SPA inside an iframe duplicates its boot and puts
  // a UI handshake in front of the working chat. Runtime keeps its own origin;
  // mobile keeps the existing embedded presentation.
  const mode = paneForPath(location.pathname);
  // Runtime is already on its canonical runner origin. A second same-origin
  // iframe reboots auth, admission and the entire native client, adding a
  // second workspace import before the real chat can become visible.
  const directRuntime = directRuntimeHost(mode, window.location.origin);
  const nativeChat = persistent && Boolean(mode) && !directRuntime && !(desktop && mode === 'brain');
  const dot = /^\/hivemind\/app\/employee\/dots(?:\/|$)/.test(location.pathname);
  const apps = location.pathname === '/hivemind/app/employee/apps';
  const [appsVisited, setAppsVisited] = useState(apps);
  useLayoutEffect(() => { if (apps) setAppsVisited(true); }, [apps]);
  // One retained Next.js application; employee changes use its native router.
  const [dotEntry, setDotEntry] = useState(dot ? { pathname: location.pathname, search: location.search } : null);
  useLayoutEffect(() => {
    if (dot && !dotEntry) setDotEntry({ pathname: location.pathname, search: location.search });
  }, [dot, dotEntry, location.pathname, location.search]);
  // Warm the single retained OpenDot document while the viewer is in Runtime, so the first switch to an
  // employee finds a booted workspace instead of loading it. Reads cached state only; one document, kept.
  const { user, org } = useAuth();
  const scope = `${user?.id || ''}:${org?.id || ''}`;
  useEffect(() => { if (dot) rememberOpenDotRoute(scope, location.pathname); }, [dot, scope, location.pathname]);
  const [rosterSeen, setRosterSeen] = useState(0);
  useEffect(() => {
    const seen = () => setRosterSeen(value => value + 1);
    window.addEventListener('hivemind:runtime-roster', seen);
    const retry = window.setTimeout(seen, 8000);
    return () => { window.removeEventListener('hivemind:runtime-roster', seen); window.clearTimeout(retry); };
  }, []);
  useEffect(() => {
    if (mode !== 'runtime' || dotEntry || !preloadAllowed()) return undefined;
    return whenIdle(() => {
      const pathname = openDotPreloadRoute(scope, agentRoster.peek(scope));
      if (pathname) setDotEntry(current => current || { pathname, search: '' });
    }, 5000);
  }, [mode, dotEntry, scope, rosterSeen]);
  return <>
    {!dot && !apps && !nativeChat && <Outlet />}
    {persistent && <PersistentHarnessPanes retainBrain={!desktop} />}
    {appsVisited && <div hidden={!apps} className="h-full min-h-0" style={{ display: apps ? 'block' : 'none' }}>
      <Suspense fallback={<AsciiWorkspaceLoading label="Opening Apps…" />}><Apps /></Suspense>
    </div>}
    {dotEntry && <div hidden={!dot} className="h-full min-h-0" style={{ display: dot ? 'block' : 'none' }}>
      <Suspense fallback={<AsciiWorkspaceLoading label="Opening workspace…" />}><OpenDotEntry initialRoute={dotEntry} route={dot ? location : dotEntry} active={dot} /></Suspense>
    </div>}
  </>;
}
