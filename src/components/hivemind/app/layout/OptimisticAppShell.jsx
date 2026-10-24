import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { isNativeApp } from '../shared/native-app';
import { readBootCache } from '../shared/boot-cache';
import { workspaceModeForPath } from '../shared/workspace-mode';
import { HYPERAGENT_WIDTHS } from './hyperagent-widths';
import './desktop-hyperagents-navigation.css';
import './OptimisticAppShell.css';

// Shown while bootstrap confirms the session. It renders cached display data only and makes no API call.
// Each frame matches the settled desktop shell for the same route, so the swap does not move content.
// Widths below the settled desktop breakpoint keep the loading screen.
const DESKTOP_QUERY = '(min-width: 901px)';
const TEAM_COLUMNS = 3; // AppShell starts with three roster columns.
const TEAM_SIDEBAR_WIDTH = HYPERAGENT_WIDTHS[TEAM_COLUMNS];
const BRAIN_SIDEBAR_WIDTH = 300; // Sidebar's `w-[300px]` for routes outside the team workspace.
const RUNTIME_CHARACTERS = ['capsule', 'pebble', 'prism', 'orbit', 'spark', 'fold', 'classic'];
const SKELETON_TILES = 3; // Matches the settled empty-roster placeholders.
const RUNTIME_AVATAR_SIZE = 82;
const CACHED_TILE_LIMIT = 12;

function desktopViewport() {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY).matches : true;
}

function runtimeAvatarSource(character) {
  const base = `/assets/runtime-characters/${character === 'classic' ? 'v3' : 'v2'}`;
  return `${base}/stills/${character}-ready.webp`;
}

// Team sidebar frame: cached roster, Runtime avatar and grid geometry of the settled DesktopHyperAgentsNavigation.
function TeamFrame({ hint }) {
  const roster = readBootCache(hint.orgId, hint.userId, 'employees')?.value;
  const named = Array.isArray(roster) ? roster.filter(entry => entry && entry.name) : null;
  const character = readBootCache(hint.orgId, hint.userId, 'runtime-appearance')?.value?.character;
  const savedCharacter = RUNTIME_CHARACTERS.includes(character) ? character : null;
  const tiles = named?.length
    ? named.slice(0, CACHED_TILE_LIMIT)
    : Array.from({ length: SKELETON_TILES }, (_, index) => ({ id: `skeleton-${index}` }));

  return (
    <div className="desktop-hyperagents-navigation">
      <div className="ha-team-scroll">
        <div className="ha-team-heading">
          <h2>Your team</h2>
          {named
            ? <span>{named.length} {named.length === 1 ? 'employee' : 'employees'}</span>
            : <span className="ha-placeholder-name" />}
        </div>
        <div className="ha-runtime-card">
          {savedCharacter
            ? <img alt="" src={runtimeAvatarSource(savedCharacter)} width={RUNTIME_AVATAR_SIZE} height={RUNTIME_AVATAR_SIZE} />
            : <span data-runtime-avatar-pending="" style={{ display: 'inline-block', width: RUNTIME_AVATAR_SIZE, height: RUNTIME_AVATAR_SIZE, flexShrink: 0 }} />}
          <span className="ha-runtime-identity"><strong>Runtime</strong><small>AI Chief of Staff</small></span>
        </div>
        <div className="ha-employee-grid" style={{ gridTemplateColumns: `repeat(${TEAM_COLUMNS}, minmax(0, 1fr))` }}>
          {tiles.map(entry => (
            <div key={entry.id} className="ha-employee-tile is-placeholder">
              <span className="ha-avatar-wrap" />
              {entry.name ? <span className="ha-employee-name">{entry.name}</span> : <span className="ha-placeholder-name" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OptimisticAppShell() {
  const { optimisticShell: hint } = useAuth();
  const { pathname } = useLocation();
  if (!hint || isNativeApp() || !desktopViewport()) return <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center"><AsciiWorkspaceLoading /></div>;

  // Only the team workspace shows the roster; the Brain workspace sidebar has no team section.
  const teamRoute = workspaceModeForPath(pathname) === 'hyperagents';
  const sidebarWidth = teamRoute ? TEAM_SIDEBAR_WIDTH : BRAIN_SIDEBAR_WIDTH;

  return (
    <div data-hivemind-app-shell data-optimistic-shell aria-busy="true" className="min-h-screen bg-[#faf9f4] font-[Inter,ui-sans-serif,system-ui,sans-serif]">
      <span role="status" className="sr-only">Loading workspace</span>
      <aside
        className="fixed left-0 top-0 h-[var(--hm-app-viewport-height,100dvh)] bg-[#faf9f4] border-r border-[#e3e0db] flex flex-col z-40"
        style={{ width: sidebarWidth }}
        aria-hidden="true"
      >
        {teamRoute && <TeamFrame hint={hint} />}
      </aside>
      <div className="min-w-0" style={{ marginLeft: sidebarWidth }}>
        <header className="optimistic-shell-header grid grid-cols-[minmax(0,1fr)_auto] items-center px-6">
          <h1 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-[#292929]">
            <span className="truncate">{hint.orgName || 'Workspace'}</span>
          </h1>
        </header>
        <main className="optimistic-shell-main flex flex-col justify-end px-6 pb-6">
          <div className="optimistic-shell-composer" aria-hidden="true" />
        </main>
      </div>
    </div>
  );
}
