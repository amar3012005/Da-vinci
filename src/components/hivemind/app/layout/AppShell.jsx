import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
import { QuickRecorderProvider } from '../shared/QuickRecorderProvider';
import { WelcomeSlides, ActivationGate } from '../shared/WelcomeFlow';
import PlanLimitModal from '../components/PlanLimitModal';
import { PLAN_LIMIT_EVENT } from '../shared/planLimit';

/**
 * PlanLimitGate — listens for the global 'hm:plan-limit' window event
 * (dispatched by the axios interceptors in shared/api-client.js on any
 * plan_limit_exceeded response) and surfaces one <PlanLimitModal> app-wide.
 * onUpgrade routes to the billing page.
 */
function PlanLimitGate() {
  const navigate = useNavigate();
  const [state, setState] = useState(null); // null | { resource, plan, limit, current, suggestedPlan, message, upgradeUrl }

  useEffect(() => {
    const onLimit = (e) => setState(e.detail || {});
    window.addEventListener(PLAN_LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, onLimit);
  }, []);

  const close = () => setState(null);
  const upgrade = () => {
    const url = state?.upgradeUrl || '/hivemind/app/billing';
    close();
    navigate(url);
  };

  return (
    <PlanLimitModal
      open={state !== null}
      resource={state?.resource}
      plan={state?.plan}
      limit={state?.limit}
      current={state?.current}
      suggestedPlan={state?.suggestedPlan}
      message={state?.message}
      onUpgrade={upgrade}
      onContinue={close}
      onClose={close}
    />
  );
}

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
  const navigate = useNavigate();

  // ── Post-sign-in reveal sequence ─────────────────────────────────────
  //   new user  → capability slides → activation checklist → workspace
  //   returning → activation checklist (auth=callback) → workspace
  // gate: null (undecided) | 'slides' | 'activation' | 'done'
  const [gate, setGate] = useState(null);
  useEffect(() => {
    if (needsOnboarding || gate !== null) return; // decide once, after onboarding clears
    let isNew = false;
    try { isNew = sessionStorage.getItem('hm_new_user') === '1'; } catch { /* noop */ }
    const fromCallback = new URLSearchParams(location.search).get('auth') === 'callback';
    setGate(isNew ? 'slides' : fromCallback ? 'activation' : 'done');
  }, [needsOnboarding, gate, location.search]);

  const finishGate = () => {
    try { sessionStorage.removeItem('hm_new_user'); } catch { /* noop */ }
    // Strip auth params so refresh doesn't replay the sequence.
    const params = new URLSearchParams(location.search);
    if (params.get('auth') === 'callback' || params.get('onboarding')) {
      params.delete('auth'); params.delete('onboarding');
      const qs = params.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
    }
    setGate('done');
  };
  // Self-host gate: only an org whose agent was NEVER registered gets the
  // connect-your-agent setup screen (it mints + reveals the self-host key, so
  // it must not reappear on every visit). An org that completed setup before
  // (registered in the agent registry) goes straight to the dashboard even if
  // the agent is momentarily unreachable — data calls surface their own errors.
  //   'checking' → first /v1/selfhost/status in flight (sub-second + 2.5s ping budget)
  //   'setup'    → never registered → show SelfHostSetup
  //   'ok'       → registered → workspace
  const isSelfHost = org?.hosting_mode === 'self_host';
  const [shGate, setShGate] = useState('checking');
  // Count consecutive status-call failures so a single blip never walls a
  // registered org. The 401 that fires on the first load right after a
  // cross-domain connector OAuth redirect (api.singulancelabs.com → the
  // app domain, before the session cookie is readable) was dropping a fully
  // registered+reachable self-host org straight into the setup wall.
  const shFailsRef = useRef(0);
  useEffect(() => {
    if (!isSelfHost || shGate === 'ok') return undefined;
    let alive = true;
    const tick = async () => {
      try {
        const s = await apiClient.selfHostStatus();
        if (!alive) return;
        shFailsRef.current = 0;
        // Only an EXPLICIT not-registered answer opens the setup flow.
        if (s?.registered) setShGate('ok');
        else setShGate('setup');
      } catch {
        if (!alive) return;
        // Transient status failure: keep showing the spinner and retry.
        // Fall to the setup screen only after several consecutive failures
        // (control-plane genuinely unreachable), and never yank an
        // already-open workspace away.
        shFailsRef.current += 1;
        if (shFailsRef.current >= 3) {
          setShGate((g) => (g === 'checking' ? 'setup' : g));
        }
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [isSelfHost, shGate]);
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    try { return localStorage.getItem('hm_active_section') || 'hivemind'; } catch { return 'hivemind'; }
  });
  const handleSectionChange = (s) => {
    setActiveSection(s);
    try { localStorage.setItem('hm_active_section', s); } catch { /* noop */ }
    const landing = { hivemind: '/hivemind/app/overview', hyperagents: '/hivemind/app/employees', tara: '/hivemind/app/tara' };
    if (landing[s]) navigate(landing[s]);
  };
  const graphFullscreen = location.pathname === '/hivemind/app/graph' || location.pathname === '/hivemind/app/graph-2d';
  // HyperAgents runs its own left rail (rooms + account) — the app sidebar is
  // hidden entirely there so the workspace reads as one dedicated surface.
  const hyperFullscreen = location.pathname === '/hivemind/app/employees';
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

  // Self-host org: brief status check, then either the workspace (agent was
  // registered before — even if currently offline) or the one-time setup flow.
  if (isSelfHost && shGate === 'checking') {
    return (
      <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (isSelfHost && shGate === 'setup') {
    return <SelfHostSetup onDone={() => setShGate('ok')} />;
  }

  // New-user capability deck → activation checklist → workspace reveal.
  if (gate === 'slides') {
    return <WelcomeSlides onDone={() => setGate('activation')} />;
  }
  if (gate === 'activation') {
    return <ActivationGate onDone={finishGate} />;
  }

  return (
    <QuickRecorderProvider>
    <TeamProvider>
      <div className="min-h-screen bg-[#faf9f4] font-[Inter,ui-sans-serif,system-ui,sans-serif]">
        {!graphFullscreen && !hyperFullscreen && <Sidebar activeSection={activeSection} />}
        <div
          className={`transition-all duration-300 ${sidebarCollapsed || graphFullscreen || hyperFullscreen ? 'sidebar-content-expanded' : ''}`}
          style={{ marginLeft: (graphFullscreen || hyperFullscreen) ? '0px' : sidebarCollapsed ? '68px' : '260px' }}
        >
          {!graphFullscreen && <TopBar activeSection={activeSection} onSectionChange={handleSectionChange} />}
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

        {/* Global plan-limit upgrade prompt — reacts to 'hm:plan-limit' */}
        <PlanLimitGate />
      </div>
    </TeamProvider>
    </QuickRecorderProvider>
  );
}
