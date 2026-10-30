import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { isNativeApp } from '../shared/native-app';
import { readBootCache } from '../shared/boot-cache';
import { optimisticIdentityEnabled } from '../shared/optimistic-identity';
import { workspaceModeForPath } from '../shared/workspace-mode';
import { HYPERAGENT_WIDTHS } from './hyperagent-widths';
import { PhoneRoomFrame, phoneChatRoom } from './PhoneRoomFrame';
import { useSidebarCopy } from './sidebar-copy';
import './desktop-hyperagents-navigation.css';
import './OptimisticAppShell.css';

// Restoring frame for the desktop shell, and for the Runtime and Brain chat rooms on phones. Each frame matches the settled shell for its route, so the swap does not move content.
// Identity (organization name, roster names, Runtime avatar) is revealed only when bootstrap has confirmed the same
// organization and user, or when the build sets REACT_APP_OPTIMISTIC_IDENTITY=true. Otherwise neutral skeleton blocks
// fill the same boxes. The frame makes no API call. Widths below the settled desktop breakpoint use `fallback`.
const DESKTOP_QUERY = '(min-width: 901px)';
const TEAM_COLUMNS = 3; // AppShell starts with three roster columns.
const TEAM_SIDEBAR_WIDTH = HYPERAGENT_WIDTHS[TEAM_COLUMNS];
const BRAIN_SIDEBAR_WIDTH = 300; // Sidebar's `w-[300px]` for routes outside the team workspace.
const RUNTIME_CHARACTERS = ['capsule', 'pebble', 'prism', 'orbit', 'spark', 'fold', 'classic'];
const SKELETON_TILES = 3; // One grid row, matching the settled empty-roster placeholders.
const RUNTIME_AVATAR_SIZE = 82;
const CACHED_TILE_LIMIT = 12;
const TITLE_SKELETON = { width: 180, height: 16 };
const COUNT_SKELETON = { width: 64, height: 12 };

function desktopViewport() {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY).matches : true;
}

function runtimeAvatarSource(character) {
  const base = `/assets/runtime-characters/${character === 'classic' ? 'v3' : 'v2'}`;
  return `${base}/stills/${character}-ready.webp`;
}

function Skeleton({ size, className = '' }) {
  return <span aria-hidden="true" className={`optimistic-skeleton ${className}`.trim()} style={{ width: size.width, height: size.height }} />;
}

// Team sidebar frame: grid geometry of the settled DesktopHyperAgentsNavigation. Cached identity is read only when `reveal` is set.
function TeamFrame({ hint, reveal }) {
  const s = useSidebarCopy();
  const roster = reveal ? readBootCache(hint.orgId, hint.userId, 'employees')?.value : undefined;
  const named = reveal && Array.isArray(roster) ? roster.filter(entry => entry && entry.name) : null;
  const character = reveal ? readBootCache(hint.orgId, hint.userId, 'runtime-appearance')?.value?.character : undefined;
  const savedCharacter = RUNTIME_CHARACTERS.includes(character) ? character : null;
  const runtimeHidden = reveal && readBootCache(hint.orgId, hint.userId, 'runtime-enabled')?.value?.enabled === false;
  const tiles = named?.length
    ? named.slice(0, CACHED_TILE_LIMIT)
    : Array.from({ length: SKELETON_TILES }, (_, index) => ({ id: `skeleton-${index}` }));

  return (
    <div className="desktop-hyperagents-navigation">
      <div className="ha-team-scroll">
        <div className="ha-team-heading">
          <h2>{s('yourTeam', 'Your team')}</h2>
          {named
            ? <span>{named.length === 1 ? s('employeeCountOne', '{{count}} employee', { count: named.length }) : s('employeeCountMany', '{{count}} employees', { count: named.length })}</span>
            : <Skeleton size={COUNT_SKELETON} className="ha-placeholder-name" />}
        </div>
        {!runtimeHidden && <div className="ha-runtime-card">
          {savedCharacter
            ? <img alt="" src={runtimeAvatarSource(savedCharacter)} width={RUNTIME_AVATAR_SIZE} height={RUNTIME_AVATAR_SIZE} />
            : <span data-runtime-avatar-pending="" style={{ display: 'inline-block', width: RUNTIME_AVATAR_SIZE, height: RUNTIME_AVATAR_SIZE, flexShrink: 0 }} />}
          <span className="ha-runtime-identity"><strong>Runtime</strong><small>{s('runtimeRole', 'AI Chief of Staff')}</small></span>
        </div>}
        <div className="ha-employee-grid" style={{ gridTemplateColumns: `repeat(${TEAM_COLUMNS}, minmax(0, 1fr))` }}>
          {tiles.map(entry => (
            <div key={entry.id} className="ha-employee-tile is-placeholder">
              <span className="ha-avatar-wrap" />
              {entry.name ? <span className="ha-employee-name">{entry.name}</span> : <Skeleton size={COUNT_SKELETON} className="ha-placeholder-name" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Restoring frame for the desktop shell.
 * @param {object} props
 * @param {React.ReactNode} [props.fallback] - rendered on tablet widths, on phone routes other than the Runtime and Brain chat rooms, without a saved hint, and in native apps.
 * @returns {JSX.Element}
 */
export default function OptimisticAppShell({ fallback = null }) {
  const s = useSidebarCopy();
  const { optimisticShell, restoredShell } = useAuth();
  const { pathname } = useLocation();
  const hint = restoredShell || optimisticShell;
  const phoneRoom = phoneChatRoom(pathname);
  if (phoneRoom) return <PhoneRoomFrame room={phoneRoom} />;
  if (!hint || isNativeApp() || !desktopViewport()) {
    return fallback || <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center"><AsciiWorkspaceLoading /></div>;
  }

  // Confirmed identity may reveal its cache; unconfirmed identity needs the explicit build opt-in.
  const reveal = Boolean(restoredShell) || optimisticIdentityEnabled();
  // Only the team workspace shows the roster; the Brain workspace sidebar has no team section.
  const teamRoute = workspaceModeForPath(pathname) === 'hyperagents';
  const sidebarWidth = teamRoute ? TEAM_SIDEBAR_WIDTH : BRAIN_SIDEBAR_WIDTH;

  return (
    <div data-hivemind-app-shell data-optimistic-shell data-identity-revealed={reveal || undefined} aria-busy="true" className="min-h-screen bg-[#faf9f4] font-[Inter,ui-sans-serif,system-ui,sans-serif]">
      <span role="status" className="sr-only">{s('loadingWorkspace', 'Loading workspace')}</span>
      <aside
        className="fixed left-0 top-0 h-[var(--hm-app-viewport-height,100dvh)] bg-[#faf9f4] border-r border-[#e3e0db] flex flex-col z-40"
        style={{ width: sidebarWidth }}
        aria-hidden="true"
      >
        {teamRoute && <TeamFrame hint={hint} reveal={reveal} />}
      </aside>
      <div className="min-w-0" style={{ marginLeft: sidebarWidth }}>
        <header className="optimistic-shell-header grid grid-cols-[minmax(0,1fr)_auto] items-center px-6">
          <h1 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-[#292929]">
            {reveal
              ? <span className="truncate">{hint.orgName || 'Workspace'}</span>
              : <Skeleton size={TITLE_SKELETON} />}
          </h1>
        </header>
        <main className="optimistic-shell-main flex flex-col justify-end px-6 pb-6">
          <div className="optimistic-shell-composer" aria-hidden="true" />
        </main>
      </div>
    </div>
  );
}
