import PersistentHarnessPanes from './PersistentHarnessPanes';
import { directRuntimeHost, paneForPath, persistentShellEnabled } from '../shared/native-pane-protocol';
import { useHasNativeRooms } from '../shared/native-room';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import React, { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { agentRoster } from '../shared/agent-roster';
import { useTranslation } from 'react-i18next';
import { isBrainChatLinkClick, isCompanyBrainRoute, navigateToCompanyBrain } from '../shared/company-brain-room';
import { openDotPreloadRoute, preloadAllowed, rememberOpenDotRoute, whenIdle } from '../shared/open-dot-preload';
const Apps = React.lazy(() => import('../pages/OpenDotAppsNavigation'));
const OpenDotEntry = React.lazy(() => import('../pages/OpenDotEntry'));
const CompanyBrainWarmup = React.lazy(() => import('../pages/CompanyBrainWarmup'));
const NativeOpenDotRoom = React.lazy(() => import('../pages/NativeOpenDotRoom'));

// Retain the employee application while the outer sidebar changes routes.
export default function AgentWorkspaceOutlet() {
  const location = useLocation();
  const nativeRooms = useHasNativeRooms();
  const persistent = persistentShellEnabled() && !nativeRooms;
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
  // Brain chat is the Company Brain OpenDot room, a top-level page on the brain-runner origin (the Worker redirects the
  // address too). The packaged apps keep the harness chat. Links leave on click so the shell never paints first.
  const { i18n } = useTranslation('dashboard');
  const languageRef = React.useRef(i18n.language);
  languageRef.current = i18n.language;
  const brainRoute = isCompanyBrainRoute(location.pathname);
  const brainEligible = !nativeRooms && Boolean(user?.id && org?.id);
  const brainLeaving = brainEligible && brainRoute;
  useEffect(() => {
    if (!brainEligible) return undefined;
    const onClick = event => {
      if (!isBrainChatLinkClick(event)) return;
      event.preventDefault(); event.stopPropagation();
      navigateToCompanyBrain(languageRef.current);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [brainEligible]);
  useEffect(() => { if (brainLeaving) navigateToCompanyBrain(languageRef.current); }, [brainLeaving]);
  return <>
    {!dot && !apps && !nativeChat && !brainLeaving && <Outlet />}
    {persistent && <PersistentHarnessPanes retainBrain={!desktop} suppressBrain={brainLeaving} />}
    {brainEligible && <Suspense fallback={null}><CompanyBrainWarmup language={i18n.language} /></Suspense>}
    {appsVisited && <div hidden={!apps} className="h-full min-h-0" style={{ display: apps ? 'block' : 'none' }}>
      <Suspense fallback={<AsciiWorkspaceLoading label="Opening Apps…" />}><Apps /></Suspense>
    </div>}
    {dotEntry && <div hidden={!dot} className="h-full min-h-0" style={{ display: dot ? 'block' : 'none' }}>
      <Suspense fallback={<AsciiWorkspaceLoading label="Opening workspace…" />}>{nativeRooms
        ? <NativeOpenDotRoom route={dot ? location : dotEntry} active={dot} />
        : <OpenDotEntry initialRoute={dotEntry} route={dot ? location : dotEntry} active={dot} />}</Suspense>
    </div>}
  </>;
}
