import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlignLeft, MessageCircle, Brain, Mic2, Plug, Folder, Gauge,
  X, LogOut, Hexagon, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import SingulanceSplash from './SingulanceSplash';

const SPLASH_FLAG = 'hm_m_splashed';

/**
 * MobileShell — the shared chrome for every /hivemind/m/* page, styled after
 * the Claude mobile app: warm ivory canvas, minimal top bar (hamburger left,
 * one action right), and a slide-in drawer with the app's destinations.
 *
 * Layout contract (no overlaps):
 *   - The shell owns the safe-area top inset + the 56px top bar.
 *   - Children render in a single scrollable main; pages that float a bottom
 *     bar (chat input) pass `noScroll` and manage their own layout.
 */

const NAV = [
  { to: '/hivemind/m/chat', label: 'Chat', icon: MessageCircle },
  { to: '/hivemind/m/memories', label: 'Memories', icon: Brain },
  { to: '/hivemind/m/meeting-notes', label: 'Meeting Notes', icon: Mic2 },
  { to: '/hivemind/m/connectors', label: 'Connectors', icon: Plug },
  { to: '/hivemind/m/projects', label: 'Projects', icon: Folder },
  { to: '/hivemind/m/usage', label: 'Usage', icon: Gauge },
];

export default function MobileShell({ children, rightAction = null, title = null, noScroll = false, extraDrawerActions = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, org, logout } = useAuth() || {};
  const [drawer, setDrawer] = useState(false);

  // SINGULANCE onboarding splash — plays once per device, and again right
  // after a QR scan (?from=dashboard). Decided synchronously on first render so
  // it covers the very first paint; the query param is stripped on finish.
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const fromQR = new URLSearchParams(window.location.search).has('from');
      const seen = window.localStorage.getItem(SPLASH_FLAG) === '1';
      return fromQR || !seen;
    } catch { return false; }
  });
  const finishSplash = () => {
    setShowSplash(false);
    try { window.localStorage.setItem(SPLASH_FLAG, '1'); } catch { /* private mode */ }
    // Strip ?from=... so a refresh/back doesn't replay the splash.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('from')) {
        url.searchParams.delete('from');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
    } catch { /* noop */ }
  };

  // Close the drawer on any route change.
  useEffect(() => { setDrawer(false); }, [location.pathname]);

  const firstName = (user?.name || user?.email || 'there').split(/[\s@]/)[0];

  return (
    <div
      className="fixed inset-0 bg-[#faf9f4] text-[#0a0a0a] flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {showSplash && <SingulanceSplash onDone={finishSplash} />}
      {/* ── Top bar: hamburger · (title) · right action ── */}
      <header className="h-14 px-2.5 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => setDrawer(true)}
          className="w-11 h-11 rounded-full grid place-items-center active:bg-[#ece9e2]"
          aria-label="Menu"
        >
          <AlignLeft size={22} strokeWidth={2} />
        </button>
        {title && (
          <div className="text-[15px] font-semibold font-['Space_Grotesk'] absolute left-1/2 -translate-x-1/2">{title}</div>
        )}
        <div className="w-11 h-11 grid place-items-center">{rightAction}</div>
      </header>

      {/* ── Page body (page-enter transition, one place for all /m/* pages) ── */}
      {noScroll ? (
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      ) : (
        <main className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      )}

      {/* ── Drawer ── */}
      {drawer && (
        <div className="absolute inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawer(false)} />
          <aside
            className="absolute left-0 top-0 bottom-0 w-[300px] max-w-[84vw] bg-[#faf9f4] shadow-2xl flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="h-14 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Hexagon size={16} className="text-[#117dff] flex-shrink-0" />
                <span className="text-[14px] font-semibold font-['Space_Grotesk'] truncate">HIVEMIND</span>
              </div>
              <button onClick={() => setDrawer(false)} className="w-10 h-10 rounded-full grid place-items-center active:bg-[#ece9e2]" aria-label="Close menu">
                <X size={19} />
              </button>
            </div>

            <div className="px-5 pb-3">
              <div className="text-[20px] leading-snug" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {firstName}
              </div>
              {org?.name && <div className="text-[11.5px] text-[#737373] truncate mt-0.5">{org.name}</div>}
            </div>

            <nav className="flex-1 overflow-y-auto px-2.5">
              {NAV.map(({ to, label, icon: Icon }) => {
                const active = location.pathname.startsWith(to);
                return (
                  <button
                    key={to}
                    onClick={() => navigate(to)}
                    className={`w-full h-12 px-3 rounded-[14px] flex items-center gap-3 text-[14.5px] ${
                      active ? 'bg-[#ece9e2] font-semibold' : 'active:bg-[#f1eee7] text-[#3d3d3a]'
                    }`}
                  >
                    <Icon size={19} strokeWidth={1.9} className={active ? 'text-[#0a0a0a]' : 'text-[#6b6b66]'} />
                    <span className="flex-1 text-left">{label}</span>
                    {active && <ChevronRight size={15} className="text-[#a3a3a3]" />}
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#ece9e2]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
              {extraDrawerActions}
              <button
                onClick={() => navigate('/hivemind/app/overview?desktop=1')}
                className="w-full h-11 px-3 rounded-[14px] flex items-center gap-3 text-[13.5px] text-[#3d3d3a] active:bg-[#f1eee7]"
              >
                <Gauge size={17} className="text-[#6b6b66]" /> Open desktop app
              </button>
              {typeof logout === 'function' && (
                <button
                  onClick={logout}
                  className="w-full h-11 px-3 rounded-[14px] flex items-center gap-3 text-[13.5px] text-[#b3261e] active:bg-[#f9e9e7]"
                >
                  <LogOut size={17} /> Sign out
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
