import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../auth/AuthProvider';
import OnboardingFlow from '../pages/Onboarding';
import { ChatPanel } from '../pages/Chat';
import { Brain } from 'lucide-react';
import { TeamProvider } from '../shared/team-context';
import GlobalUploadStrip from './GlobalUploadStrip';

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
  const { needsOnboarding } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Track sidebar state for dynamic margin
  useEffect(() => {
    const handleCollapse = () => setSidebarCollapsed(true);
    const handleExpand = () => setSidebarCollapsed(false);

    window.addEventListener('hivemind:close-sidebar', handleCollapse);
    window.addEventListener('hivemind:open-sidebar', handleExpand);

    return () => {
      window.removeEventListener('hivemind:close-sidebar', handleCollapse);
      window.removeEventListener('hivemind:open-sidebar', handleExpand);
    };
  }, []);

  if (needsOnboarding) {
    return <OnboardingFlow />;
  }

  return (
    <TeamProvider>
      <div className="min-h-screen bg-[#faf9f4] font-[Inter,ui-sans-serif,system-ui,sans-serif]">
        <Sidebar />
        <div className={`ml-[260px] transition-all duration-300 ${sidebarCollapsed ? 'sidebar-content-expanded' : ''}`} style={{ marginLeft: sidebarCollapsed ? '0px' : '260px' }}>
          <TopBar />
          <main className="flex-1 p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        {/* Chat FAB — glass-morph pill, slides in from right, blinking pulse */}
        <TalkToHiveFAB onOpen={() => setChatOpen(true)} hidden={chatOpen} />

        {/* Global upload strip — survives KB unmount so users can browse
            other pages while files are still uploading */}
        <GlobalUploadStrip />

        {/* Chat Panel */}
        <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </TeamProvider>
  );
}
