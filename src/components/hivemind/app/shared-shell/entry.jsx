import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Router } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import Sidebar from '../layout/Sidebar';
import { openDotEmployeePath } from '../shared/open-dot-employee-route';
import { matchingShellIdentity, runtimeNavigation, brainNavigation, NEXT_ORIGIN, RUNTIME_ORIGIN } from './navigation';
import { BRAIN_ROOM_PATH, cachedBrainRoomId } from './brain-room';
import i18n from '../../../../i18n';
import { useSidebarCopy } from '../layout/sidebar-copy';

const PHONE = '(max-width: 767.98px)';
const DRAWER_STYLE = { display: 'block', position: 'fixed', inset: '0', width: '100%', height: '100dvh', zIndex: '60' };
// The Company Brain page shows Brain's sidebar: a column beside the room, and on phones a drawer the room's menu button opens.
function usePhone(enabled) {
  const [phone, setPhone] = useState(() => enabled && window.matchMedia(PHONE).matches);
  useEffect(() => {
    if (!enabled) return undefined;
    const query = window.matchMedia(PHONE);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [enabled]);
  return phone;
}

function Shell({ identity, host, portalContainer, mode }) {
  const auth = useAuth();
  const brain = mode === 'brain';
  const copy = useSidebarCopy();
  const phone = usePhone(brain);
  const [collapsed, setCollapsed] = useState(() => !brain && window.innerWidth < 768);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const style = host.style;
    if (brain && phone) {
      if (open) Object.entries(DRAWER_STYLE).forEach(([name, value]) => style.setProperty(name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), value));
      else { style.setProperty('display', 'none'); }
      return undefined;
    }
    ['display', 'position', 'inset', 'height', 'z-index'].forEach(name => style.removeProperty(name));
    style.width = collapsed ? '68px' : '300px';
    return undefined;
  }, [brain, phone, open, collapsed, host]);
  // The room's menu button opens the phone drawer through the same events the sidebar already answers; the room mirrors the state.
  useEffect(() => { if (brain) window.dispatchEvent(new CustomEvent('hivemind:brain-drawer', { detail: { open } })); }, [brain, open]);
  // The OpenDot room that embeds this sidebar announces its interface language; the sidebar follows it without a reload.
  useEffect(() => {
    const follow = event => { const locale = event?.detail?.locale; if (typeof locale === 'string' && locale && locale !== i18n.language) void i18n.changeLanguage(locale); };
    window.addEventListener('hivemind:set-language', follow);
    return () => window.removeEventListener('hivemind:set-language', follow);
  }, []);
  useEffect(() => {
    const account = () => window.location.assign(`${brain ? NEXT_ORIGIN : RUNTIME_ORIGIN}/hivemind/app/profile`);
    const tour = () => window.location.assign(`${RUNTIME_ORIGIN}/hivemind/app/employee/harness`);
    window.addEventListener('hm:open-account-settings', account);
    window.addEventListener('hm:replay-hyperagents-tour', tour);
    return () => { window.removeEventListener('hm:open-account-settings', account); window.removeEventListener('hm:replay-hyperagents-tour', tour); };
  }, [brain]);
  if (auth.loading) return <p role="status">Opening your workspace…</p>;
  if (!auth.isAuthenticated || !matchingShellIdentity(auth, identity)) return <section role="alert"><p>Your workspace could not be verified. Reload to check your current account.</p><button onClick={() => window.location.reload()}>Try again</button></section>;
  if (brain) {
    return <>
      {phone && open && <button type="button" aria-label={copy('closeMenu', 'Close menu')} onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, border: 0, padding: 0, background: 'rgba(0,0,0,.25)' }} />}
      <Sidebar activeSection="hivemind" mobileDrawer={phone} collapsed={phone ? false : collapsed} onCollapsedChange={phone ? value => setOpen(!value) : setCollapsed} portalContainer={portalContainer} />
    </>;
  }
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
// `mode: 'brain'` is the Company Brain page on brain-runner: Brain's sidebar, Chat active, links to the Brain host.
export function mount(host, { identity, stylesheet, mode }) {
  const brain = mode === 'brain';
  const supported = brain
    ? window.location.hostname === 'brain-runner.singulancelabs.com' && window.location.pathname.replace(/\/+$/, '') === BRAIN_ROOM_PATH
    : ['dots.singulancelabs.com', 'runtime-runner.singulancelabs.com'].includes(window.location.hostname) && window.location.pathname === '/apps';
  if (!supported) throw new Error('Unsupported shell host');
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = stylesheet;
  const container = document.createElement('div'); const portals = document.createElement('div');
  const fallback = document.createElement('slot');
  shadow.replaceChildren(style, container, portals, fallback);
  const scope = { tenant: identity?.organizationId, user: identity?.userId };
  const resolve = brain ? to => brainNavigation(to, cachedBrainRoomId(scope)) : runtimeNavigation;
  // Reopening the room that is already showing changes nothing, so Chat in the sidebar does not reload the page.
  // A link to the page already showing (Chat while the room is open) is also a router replace: it must not reload the page either.
  const showing = target => brain && target === window.location.href;
  const navigate = to => { const target = resolve(to); if (!showing(target)) window.location.assign(target); };
  const href = brain ? to => { try { return resolve(to); } catch { return '#'; } } : runtimeNavigation;
  const navigator = { createHref: href, encodeLocation: to => typeof to === 'string' ? new URL(to, brain ? NEXT_ORIGIN : RUNTIME_ORIGIN) : to, push: navigate, replace: to => { const target = resolve(to); if (!showing(target)) window.location.replace(target); }, go: n => window.history.go(n) };
  const routerLocation = brain ? { pathname: '/hivemind/app/overview/new', search: '', hash: '' } : { pathname: '/hivemind/app/employee/apps', search: window.location.search, hash: window.location.hash };
  const root = createRoot(container);
  root.render(<Router location={routerLocation} navigator={navigator}><AuthProvider><Shell identity={identity} host={host} portalContainer={portals} mode={mode}/></AuthProvider></Router>);
  return () => { root.unmount(); shadow.replaceChildren(fallback); };
}
