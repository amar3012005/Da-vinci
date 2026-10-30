import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Router } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import Sidebar from '../layout/Sidebar';
import { openDotEmployeePath } from '../shared/open-dot-employee-route';
import { matchingShellIdentity, runtimeNavigation, RUNTIME_ORIGIN } from './navigation';
import i18n from '../../../../i18n';

function Shell({ identity, host, portalContainer }) {
  const auth = useAuth();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  useEffect(() => { host.style.width = collapsed ? '68px' : '300px'; }, [collapsed, host]);
  // The OpenDot room that embeds this sidebar announces its interface language; the sidebar follows it without a reload.
  useEffect(() => {
    const follow = event => { const locale = event?.detail?.locale; if (typeof locale === 'string' && locale && locale !== i18n.language) void i18n.changeLanguage(locale); };
    window.addEventListener('hivemind:set-language', follow);
    return () => window.removeEventListener('hivemind:set-language', follow);
  }, []);
  useEffect(() => {
    const account = () => window.location.assign(`${RUNTIME_ORIGIN}/hivemind/app/profile`);
    const tour = () => window.location.assign(`${RUNTIME_ORIGIN}/hivemind/app/employee/harness`);
    window.addEventListener('hm:open-account-settings', account);
    window.addEventListener('hm:replay-hyperagents-tour', tour);
    return () => { window.removeEventListener('hm:open-account-settings', account); window.removeEventListener('hm:replay-hyperagents-tour', tour); };
  }, []);
  if (auth.loading) return <p role="status">Opening your workspace…</p>;
  if (!auth.isAuthenticated || !matchingShellIdentity(auth, identity)) return <section role="alert"><p>Your workspace could not be verified. Reload to check your current account.</p><button onClick={() => window.location.reload()}>Try again</button></section>;
  const openEmployee = agent => {
    const path = openDotEmployeePath(agent);
    if (path) window.location.assign(runtimeNavigation(path));
    else window.location.assign(runtimeNavigation(`/hivemind/app/employee/harness?employee=${encodeURIComponent(agent.id)}`));
    return true;
  };
  const rawReturn = new URLSearchParams(window.location.search).get('return_to');
  let contextPath;
  try { const target = new URL(rawReturn || '', RUNTIME_ORIGIN); if (target.origin === RUNTIME_ORIGIN && target.pathname.startsWith('/hivemind/app/employee/')) contextPath = target.pathname; } catch {}
  return <Sidebar contextPath={contextPath} activeSection="hyperagents" collapsed={collapsed} onCollapsedChange={setCollapsed} onOpenEmployee={openEmployee} portalContainer={portalContainer} />;
}

// A separate React root owns only the sidebar, never Next's Apps subtree.
export function mount(host, { identity, stylesheet }) {
  if (!['dots.singulancelabs.com', 'runtime-runner.singulancelabs.com'].includes(window.location.hostname) || window.location.pathname !== '/apps') throw new Error('Unsupported shell host');
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = stylesheet;
  const container = document.createElement('div'); const portals = document.createElement('div');
  const fallback = document.createElement('slot');
  shadow.replaceChildren(style, container, portals, fallback);
  const navigate = to => window.location.assign(runtimeNavigation(to));
  const navigator = { createHref: runtimeNavigation, encodeLocation: to => typeof to === 'string' ? new URL(to, RUNTIME_ORIGIN) : to, push: navigate, replace: to => window.location.replace(runtimeNavigation(to)), go: n => window.history.go(n) };
  const root = createRoot(container);
  root.render(<Router location={{ pathname: '/hivemind/app/employee/apps', search: window.location.search, hash: window.location.hash }} navigator={navigator}><AuthProvider><Shell identity={identity} host={host} portalContainer={portals}/></AuthProvider></Router>);
  return () => { root.unmount(); shadow.replaceChildren(fallback); };
}
