import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../auth/AuthProvider';
import OnboardingFlow from '../pages/Onboarding';
import SelfHostSetup from '../pages/SelfHostSetup';
import apiClient from '../shared/api-client';
import { ChatPanel } from '../pages/Chat';
import { Brain } from 'lucide-react';
import { TeamProvider } from '../shared/team-context';
import GlobalUploadStrip from './GlobalUploadStrip';
import { QuickRecorderProvider, MeetingNotesPromo } from '../shared/QuickRecorderProvider';

/**
 * TalkToHiveFAB — floating chat trigger.
 *   • slides in from right on mount (and after the user closes the panel)
 *   • glass-morphism blue (backdrop blur + translucent gradient + inner ring)
 *   • sharp-ish edges (rounded-xl, not full pill) for that modern, slightly
 *     industrial Linear/Vercel feel
 *   • blinking pulse dot (green = HIVE is awake)
 *   • subtle scale-tap on press, slow ambient sheen behind it
 *   • respects reduced-motion preference
 */
function TalkToHiveFAB({ onOpen, hidden }) {
  return (
    <AnimatePresence>
      {!hidden && (
        <motion.button
          key="talk-to-hive-fab"
          data-tour-id="talk-to-hive"
          onClick={onOpen}
          initial={{ opacity: 0, x: 80, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 80, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 340, damping: 26, delay: 0.15 }}
          whileTap={{ scale: 0.94 }}
          whileHover={{ y: -1 }}
          className="group fixed bottom-6 right-6 z-40 flex items-center gap-2.5 pl-3.5 pr-5 py-3 rounded-xl border border-white/30 text-white font-semibold tracking-tight overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, rgba(17,125,255,0.94) 0%, rgba(8,98,222,0.94) 100%)',
            backdropFilter: 'blur(14px) saturate(160%)',
            WebkitBackdropFilter: 'blur(14px) saturate(160%)',
            boxShadow:
              '0 10px 30px -8px rgba(17,125,255,0.55), 0 4px 14px -4px rgba(0,0,0,0.18), inset 0 1px 0 0 rgba(255,255,255,0.22)',
          }}
        >
          {/* Ambient sheen sweep (continuous, very subtle) */}
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.16) 50%, transparent 65%)',
              backgroundSize: '300% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
          />

          {/* Pulsing live dot */}
          <span className="relative flex items-center justify-center w-2.5 h-2.5">
            <motion.span
              className="absolute inline-flex w-full h-full rounded-full bg-[#34d399]"
              animate={{ scale: [1, 2.2, 2.2], opacity: [0.55, 0, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          </span>

          {/* Brain icon — slight idle wobble */}
          <motion.span
            className="relative flex items-center justify-center"
            animate={{ rotate: [0, -4, 0, 4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
          >
            <Brain size={18} strokeWidth={2.2} />
          </motion.span>

          <span className="relative text-[13.5px] tracking-tight">
            Talk to HIVE
          </span>

          {/* Inner glass ring (highlight on top edge) */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25), inset 0 -1px 0 0 rgba(0,0,0,0.08)',
            }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/**
 * AppShell — layout:
 *   1. needs_org_setup -> show org creation
 *   2. otherwise -> full dashboard (API key generated on-demand when needed)
 */
export default function AppShell() {
  const { needsOnboarding, org } = useAuth();
  const location = useLocation();
  // Self-host gate: a self_host org must connect its agent BEFORE the workspace opens. We poll the
  // server-side connection state (registry + agent /health) — works even if the user closed the tab
  // while running setup.sh on their server; on return it reflects reality. Managed orgs skip this.
  const isSelfHost = org?.hosting_mode === 'self_host';
  // Start FALSE (not seeded from isSelfHost): org is null while bootstrap is in flight, so a
  // useState initializer that read isSelfHost would freeze `true` before the org loads and the
  // self-host gate would never fire. `isSelfHost` is re-derived each render, so once the org loads
  // as self_host the gate engages; the poll flips this to true only when the agent is reachable.
  const [agentConnected, setAgentConnected] = useState(false);
  useEffect(() => {
    if (!isSelfHost || agentConnected) return undefined;
    let alive = true;
    const tick = async () => {
      try { const s = await apiClient.selfHostStatus(); if (alive && s?.reachable) setAgentConnected(true); }
      catch { /* keep waiting */ }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [isSelfHost, agentConnected]);
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const graphFullscreen = location.pathname === '/hivemind/app/graph' || location.pathname === '/hivemind/app/graph-2d';
  // Overview embeds the HIVE chat as the page centerpiece — the floating
  // Talk-to-HIVE button would duplicate it there. Hidden on Overview ONLY;
  // every other page keeps the FAB.
  const onOverview = /\/hivemind\/app(\/overview)?\/?$/.test(location.pathname);

  // Track sidebar state for dynamic margin
  useEffect(() => {
    const handleCollapse = () => setSidebarCollapsed(true);
    const handleExpand = () => setSidebarCollapsed(false);

    // Lets any page (e.g. Overview's auto-greet) slide the Talk-to-HIVE
    // panel out via window.dispatchEvent(new CustomEvent('hivemind:open-chat')).
    const handleOpenChat = () => setChatOpen(true);

    window.addEventListener('hivemind:close-sidebar', handleCollapse);
    window.addEventListener('hivemind:open-sidebar', handleExpand);
    window.addEventListener('hivemind:open-chat', handleOpenChat);

    return () => {
      window.removeEventListener('hivemind:close-sidebar', handleCollapse);
      window.removeEventListener('hivemind:open-sidebar', handleExpand);
      window.removeEventListener('hivemind:open-chat', handleOpenChat);
    };
  }, []);

  if (needsOnboarding) {
    return <OnboardingFlow />;
  }

  // Self-host org whose agent hasn't connected yet → show the connect-your-agent flow, not the
  // workspace. Flips to the dashboard automatically the moment the agent registers + is reachable.
  if (isSelfHost && !agentConnected) {
    return <SelfHostSetup onDone={() => setAgentConnected(true)} />;
  }

  return (
    <QuickRecorderProvider>
    <TeamProvider>
      <div className="min-h-screen bg-[#faf9f4] font-[Inter,ui-sans-serif,system-ui,sans-serif]">
        {!graphFullscreen && <Sidebar />}
        <div
          className={`transition-all duration-300 ${sidebarCollapsed || graphFullscreen ? 'sidebar-content-expanded' : ''}`}
          style={{ marginLeft: graphFullscreen ? '0px' : sidebarCollapsed ? '68px' : '260px' }}
        >
          {!graphFullscreen && <TopBar />}
          {/* New-feature promo — top-right below the navbar; hides while recording */}
          {!graphFullscreen && <MeetingNotesPromo />}
          <main className={graphFullscreen ? "flex-1 overflow-hidden" : "flex-1 p-6 overflow-y-auto"}>
            <Outlet />
          </main>
        </div>

        {/* Chat FAB — glass-morph pill, slides in from right, blinking pulse */}
        <TalkToHiveFAB onOpen={() => setChatOpen(true)} hidden={chatOpen || graphFullscreen || onOverview} />

        {/* Global upload strip — survives KB unmount so users can browse
            other pages while files are still uploading */}
        <GlobalUploadStrip />

        {/* Chat Panel */}
        <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </TeamProvider>
    </QuickRecorderProvider>
  );
}
