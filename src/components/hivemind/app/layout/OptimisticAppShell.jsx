import React from 'react';
import { useAuth } from '../auth/AuthProvider';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { isNativeApp } from '../shared/native-app';
import { readBootCache } from '../shared/boot-cache';
import './desktop-hyperagents-navigation.css';
import './OptimisticAppShell.css';

// Shown while bootstrap confirms the session. It renders cached display data only and makes no API call.
// Its layout matches the settled desktop shell so the swap does not move content. Phone widths keep the loading screen.
const SIDEBAR_WIDTH = 300;
const RUNTIME_CHARACTERS = ['capsule', 'pebble', 'prism', 'orbit', 'spark', 'fold', 'classic'];
const SKELETON_TILES = 3;
const RUNTIME_AVATAR_SIZE = 82;

function desktopViewport() {
  return typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 768px)').matches : true;
}

function runtimeAvatarSource(character) {
  const base = `/assets/runtime-characters/${character === 'classic' ? 'v3' : 'v2'}`;
  return `${base}/stills/${character}-ready.webp`;
}

export default function OptimisticAppShell() {
  const { optimisticShell: hint } = useAuth();
  if (!hint || isNativeApp() || !desktopViewport()) return <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center"><AsciiWorkspaceLoading /></div>;

  const roster = readBootCache(hint.orgId, hint.userId, 'employees')?.value;
  const employees = Array.isArray(roster) ? roster.filter(entry => entry && entry.name).slice(0, 12) : [];
  const character = readBootCache(hint.orgId, hint.userId, 'runtime-appearance')?.value?.character;
  const savedCharacter = RUNTIME_CHARACTERS.includes(character) ? character : null;
  const tiles = employees.length ? employees : Array.from({ length: SKELETON_TILES }, (_, index) => ({ id: `skeleton-${index}` }));

  return (
    <div data-hivemind-app-shell data-optimistic-shell aria-busy="true" className="min-h-screen bg-[#faf9f4] font-[Inter,ui-sans-serif,system-ui,sans-serif]">
      <span role="status" className="sr-only">Loading workspace</span>
      <aside
        className="fixed left-0 top-0 h-[var(--hm-app-viewport-height,100dvh)] bg-[#faf9f4] border-r border-[#e3e0db] flex flex-col z-40"
        style={{ width: SIDEBAR_WIDTH }}
        aria-hidden="true"
      >
        <div className="desktop-hyperagents-navigation">
          <div className="ha-team-scroll">
            <div className="ha-team-heading"><h2>Your team</h2></div>
            <div className="ha-runtime-card">
              {savedCharacter
                ? <img alt="" src={runtimeAvatarSource(savedCharacter)} width={RUNTIME_AVATAR_SIZE} height={RUNTIME_AVATAR_SIZE} />
                : <span data-runtime-avatar-pending="" style={{ display: 'inline-block', width: RUNTIME_AVATAR_SIZE, height: RUNTIME_AVATAR_SIZE, flexShrink: 0 }} />}
              <span className="ha-runtime-identity"><strong>Runtime</strong><small>AI Chief of Staff</small></span>
            </div>
            <div className="ha-employee-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {tiles.map(entry => (
                <div key={entry.id} className="ha-employee-tile is-placeholder">
                  <span className="ha-avatar-wrap" />
                  {entry.name ? <span className="ha-employee-name">{entry.name}</span> : <span className="ha-placeholder-name" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0" style={{ marginLeft: SIDEBAR_WIDTH }}>
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
