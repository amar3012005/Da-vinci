import { RuntimeAppearanceProvider } from '../shared/RuntimeAvatar';
import { measureHarnessBoot } from '../shared/harness-boot-timing';
import { scopedCompanyRead, clearCompanyRead } from '../shared/company-read-cache';
import BrainGetStarted from './BrainGetStarted';
import RuntimeGetStarted from './RuntimeGetStarted';
import BrainFeatureWelcome from '../shared/BrainFeatureWelcome';
import NativePaneBridge from './NativePaneBridge';
import { initialNativePane, persistentShellEnabled } from '../shared/native-pane-protocol';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { workspaceModeForPath, employeeAppsPath } from '../shared/workspace-mode';
import { discardParkedNativeHarnessSeat } from '../shared/native-harness-seat';
import { NativeAiConsentGate } from '../mobile/MobileSafetyPanel';
import { useTranslation } from 'react-i18next';
import { mobileBrainUserName, mobileBrainGreeting } from './mobile-brain-identity';
import { mobilePageDestination } from '../shared/mobile-route';
import MobileShell from '../mobile/MobileShell';
import MobileBrainAddSheet from './MobileBrainAddSheet';
import MobileBrainHeaderActions from './MobileBrainHeaderActions';
import NativeMobileAppsSheet from './NativeMobileAppsSheet';
import { bindNativeChatViewport } from './mobile-chat-viewport';
import './mobile-chat-viewport.css';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { useNativeAppearance } from '../shared/useNativeAppearance';
import Sidebar from './Sidebar';
import { HYPERAGENT_WIDTHS } from './DesktopHyperAgentsNavigation';
import AgentWorkspaceOutlet from './AgentWorkspaceOutlet';
import HyperAgentActivation from './HyperAgentActivation';
import EmployeeMobileNavigation from './EmployeeMobileNavigation';
import './product-transition.css';
import TopBar from './TopBar';
import { useAuth } from '../auth/AuthProvider';
import OnboardingFlow from '../pages/Onboarding';
import SelfHostSetup from '../pages/SelfHostSetup';
import apiClient from '../shared/api-client';
import { Brain } from 'lucide-react';
import { TeamProvider } from '../shared/team-context';
import GlobalUploadStrip from './GlobalUploadStrip';
import { QuickRecorderProvider } from '../shared/QuickRecorderProvider';
import { WelcomeSlides, ActivationGate } from '../shared/WelcomeFlow';
import { requiresWorkspaceModeAccess, isCompanyOnboardingPath } from '../shared/workspace-mode-policy.mjs';
import { companyAdmissionStatus } from '../shared/company-admission';
import AccountSettingsDialog from '../shared/AccountSettingsDialog';
const HyperAgentsWelcome = React.lazy(() => import('../shared/HyperAgentsWelcome'));
const HyperOnboarding = React.lazy(() => import('../hyperagents/HyperOnboarding'));
import PlanLimitModal from '../components/PlanLimitModal';
import RunwayEstimatorModal from '../components/RunwayEstimatorModal';
import { PLAN_LIMIT_CODE, PLAN_LIMIT_EVENT } from '../shared/planLimit';
import ServiceErrorToast from '../components/ServiceErrorToast';
import CallContractModal from '../components/CallContractModal';
import ProductAccessModal from '../components/ProductAccessModal';
import ReferralTrialGateModal from '../components/ReferralTrialGateModal';
import EntityProfileModalHost from '../shared/EntityProfileModalHost';
import { RETURNING_USER_LANDING } from '../shared/routes';
import { newWorkspaceLanding } from '../auth/mobile-routing';
import { isNativeApp } from '../shared/native-app';
import { buildOpenDotEmbedTarget } from '../shared/open-dot-embed-target';
const ChatPanel = React.lazy(() => import('../pages/Chat').then(module => ({ default: module.ChatPanel })));

/**
 * PlanLimitGate — listens for the global 'hm:plan-limit' window event
 * (dispatched by the axios interceptors in shared/api-client.js on any
 * plan_limit_exceeded response) and surfaces one <PlanLimitModal> app-wide.
 * onUpgrade routes to the billing page.
 */
function PlanLimitGate() {
  const navigate = useNavigate();
  const { org } = useAuth() || {};
  const [state, setState] = useState(null); // null | { resource, plan, limit, current, suggestedPlan, message, upgradeUrl }

  useEffect(() => {
    const onLimit = (e) => setState(e.detail || {});
    // Native Harness owns its own turn renderer. It forwards only the stable
    // plan-limit category to the host shell, which already owns the common
    // upgrade modal used by every other product surface.
    const onHarnessTurnError = (e) => {
      const detail = e?.detail;
      if (![PLAN_LIMIT_CODE, 'credits_exhausted'].includes(detail?.code)) return;
      setState({
        resource: 'credits',
        plan: org?.plan || 'free',
        message: typeof detail.message === 'string' ? detail.message : null,
        suggestedPlan: 'pro',
        upgradeUrl: '/hivemind/app/billing',
        referralTrial: detail?.referral_trial === true || detail?.referralTrial === true || detail?.commercial_action === 'talk_to_founder',
      });
    };
    window.addEventListener(PLAN_LIMIT_EVENT, onLimit);
    window.addEventListener('dsh:turn-error', onHarnessTurnError);
    return () => {
      window.removeEventListener(PLAN_LIMIT_EVENT, onLimit);
      window.removeEventListener('dsh:turn-error', onHarnessTurnError);
    };
  }, [org?.plan]);

  const close = () => setState(null);
  const upgrade = () => {
    const url = state?.upgradeUrl || '/hivemind/app/billing';
    close();
    navigate(url);
  };

  // An org that ONBOARDED enterprise but hits a plan limit is in the post-onboarding
  // "runway" phase (real enterprise limits are effectively unlimited, so a true paid
  // enterprise org never trips this). Route it to the Sovereign Scope Estimator
  // ("Upgrade to Runway") to configure + self-serve subscribe — NOT the generic
  // "upgrade to Pro" wall.
  const isEnterpriseRunway = String(org?.plan || '').toLowerCase() === 'enterprise';

  if (state?.referralTrial) {
    return <ReferralTrialGateModal open reason={state?.message || null} onClose={close} />;
  }

  if (isEnterpriseRunway) {
    return (
      <RunwayEstimatorModal
        open={state !== null}
        reason={state?.message || null}
        onClose={close}
      />
    );
  }

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
// The floating "Talk to HIVE" button is intentionally not shown on any page.
const SHOW_TALK_TO_HIVE_FAB = false;

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

function sectionForPath(pathname) { return workspaceModeForPath(pathname); }

/**
 * AppShell — layout:
 *   1. needs_org_setup -> show org creation
 *   2. otherwise -> full dashboard (API key generated on-demand when needed)
 */
function AppShellContent() {
  const { needsOnboarding, org, logout, user, workspaceModesEnabled, workspaceModesReady, workspaceModesError } = useAuth();
  const { t } = useTranslation('dashboard');
  const location = useLocation();
  useEffect(() => { discardParkedNativeHarnessSeat(location.pathname); }, [location.pathname]);
  useEffect(() => () => { discardParkedNativeHarnessSeat('/signed-out'); }, [user?.id, org?.id]);
  const navigate = useNavigate();
  useEffect(() => {
    const destination = mobilePageDestination(location, window.matchMedia('(max-width: 600px)').matches);
    if (destination) navigate(destination, { replace:true });
  }, [location, navigate]);

  useEffect(() => {
    if (org?.billing_action_required && location.pathname !== '/hivemind/app/billing') {
      navigate(`/hivemind/app/billing?phase=${org.billing_phase || 'runway'}`, { replace: true });
    }
  }, [org?.billing_action_required, org?.billing_phase, location.pathname, navigate]);

  // ── Post-sign-in reveal sequence ─────────────────────────────────────
  //   new user  → capability slides → activation checklist → workspace
  //   returning → activation checklist (auth=callback) → workspace
  // gate: null (undecided) | 'slides' | 'activation' | 'done'
  const [gate, setGate] = useState(null);
  const welcomeProgressKey = `hm_welcome:${user?.id || 'user'}:${org?.id || org?.org_id || 'workspace'}`;
  useEffect(() => {
    if (needsOnboarding || gate !== null) return; // decide once, after onboarding clears
    let isNew = false;
    try { isNew = sessionStorage.getItem('hm_new_user') === '1'; } catch { /* noop */ }
    const fromCallback = new URLSearchParams(location.search).get('auth') === 'callback';
    let savedStage;
    try { savedStage = sessionStorage.getItem(welcomeProgressKey); } catch { /* best effort */ }
    setGate(['slides', 'activation', 'done'].includes(savedStage)
      ? savedStage : isNew ? 'slides' : fromCallback ? 'activation' : 'done');
  }, [needsOnboarding, gate, location.search, welcomeProgressKey]);
  useEffect(() => {
    if (gate !== null) {
      try { sessionStorage.setItem(welcomeProgressKey, gate); } catch { /* best effort */ }
    }
  }, [gate, welcomeProgressKey]);
  const finishSlides = useCallback(() => {
    try { sessionStorage.setItem(welcomeProgressKey, 'activation'); } catch { /* best effort */ }
    setGate('activation');
  }, [welcomeProgressKey]);

  const finishGate = useCallback(() => {
    let isNew = false;
    try { isNew = sessionStorage.getItem('hm_new_user') === '1'; } catch { /* noop */ }
    try { sessionStorage.setItem(welcomeProgressKey, 'done'); sessionStorage.removeItem('hm_new_user'); } catch { /* noop */ }
    // New workspaces start in mobile chat on phones; desktop keeps the company
    // onboarding landing. Returning users keep the stable BRAIN overview.
    navigate(isNew ? newWorkspaceLanding() : RETURNING_USER_LANDING, { replace: true });
    setGate('done');
  }, [navigate, welcomeProgressKey]);
  // Self-host gate: the workspace opens only after the control plane confirms
  // authenticated reachability. Registered-but-offline organizations see the
  // recovery state instead of entering a workspace whose storage cannot serve.
  //   'checking' → first /v1/selfhost/status in flight (sub-second + 2.5s ping budget)
  //   'setup'    → install, recover, or update → show SelfHostSetup
  //   'ok'       → registered and reachable → workspace
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
        if (s?.registered && s?.reachable) setShGate('ok');
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
  const [accountOpen, setAccountOpen] = useState(false);
  const closeAccount = useCallback(() => setAccountOpen(false), []);
  useEffect(() => {
    const open = () => setAccountOpen(true);
    window.addEventListener('hm:open-account-settings', open);
    return () => window.removeEventListener('hm:open-account-settings', open);
  }, []);
  const companyEntry = location.pathname === '/hivemind/app/employees/mycompany';
  const [companyAdmission, setCompanyAdmission] = useState({ scope: null, status: 'checking' });
  const [companyRetry, setCompanyRetry] = useState(0);
  useEffect(() => {
    if (!org?.id || needsOnboarding) return;
    let alive = true;
    setCompanyAdmission({ scope: org.id, status: 'checking' });
    measureHarnessBoot('company-setup-read', () => scopedCompanyRead(`${user?.id}:${org.id}`, () => apiClient.hyperCompany())).then(data => {
      if (alive) setCompanyAdmission({ scope: org.id, status: companyAdmissionStatus(data), company: data.company });
    }).catch(() => {
      if (alive) setCompanyAdmission({ scope: org.id, status: 'error' });
    });
    return () => { alive = false; };
  }, [user?.id, org?.id, needsOnboarding, companyRetry]);
  const completeCompany = useCallback(() => {
    clearCompanyRead(`${user?.id}:${org?.id}`);
    setCompanyAdmission({ scope: org?.id, status: 'ready' });
    navigate('/hivemind/app/overview/new', { replace: true });
  }, [navigate, user?.id, org?.id]);
  const [chatOpen, setChatOpen] = useState(false);
  // Load the optional chat panel only after first use, then retain its state.
  const [chatLoaded, setChatLoaded] = useState(false);
  useEffect(() => { if (chatOpen) setChatLoaded(true); }, [chatOpen]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [desktopRosterColumns, setDesktopRosterColumns] = useState(3);
  const [mobileAppsOpen, setMobileAppsOpen] = useState(() => new URLSearchParams(window.location.search).get('native_apps') === '1');
  const [mobileBrainAddOpen, setMobileBrainAddOpen] = useState(false);
  const closeMobileBrainAdd = useCallback(() => setMobileBrainAddOpen(false), []);
  const closeMobileApps = useCallback(() => setMobileAppsOpen(false), []);
  const [mobileTeamOpen, setMobileTeamOpen] = useState(() => (
    isNativeApp() && window.matchMedia('(max-width: 600px)').matches
  ));
  const employeeRoom = location.pathname.startsWith('/hivemind/app/employee/harness');
  const nativeChatRoom = employeeRoom || /^\/hivemind\/app(?:\/overview(?:\/(?:new|session\/[^/]+))?)?\/?$/u.test(location.pathname);
  const brainChat = /^\/hivemind\/app\/overview(?:\/(?:new|session\/[^/]+))?\/?$/.test(location.pathname);
  const [brainPhone, setBrainPhone] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const update = () => { setBrainPhone(query.matches); setMobileBrainAddOpen(false); };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { setMobileBrainAddOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!nativeChatRoom || !brainPhone) return undefined;
    const openAdd = () => setMobileBrainAddOpen(true);
    window.addEventListener('hivemind:mobile-brain-add', openAdd);
    return () => window.removeEventListener('hivemind:mobile-brain-add', openAdd);
  }, [nativeChatRoom, brainPhone]);
  const [employeeCompact, setEmployeeCompact] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => { setEmployeeCompact(query.matches); setMobileTeamOpen(false); };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  // The drawer closes through an intentional destination tap or close button.
  // Automatic room restoration may change the URL while booting; it must not
  // dismiss the requested first-open team view.
  const [compactViewport, setCompactViewport] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  ));
  const overlayNavigation = compactViewport || (nativeChatRoom && employeeCompact);
  const desktopTeamNavigation = !employeeCompact && workspaceModeForPath(location.pathname) === 'hyperagents';
  const desktopTeamWidth = sidebarCollapsed ? 68 : HYPERAGENT_WIDTHS[desktopRosterColumns];
  useEffect(() => {
    if (!(nativeChatRoom && employeeCompact) && !(chatOpen && compactViewport)) return undefined;
    return bindNativeChatViewport(window, document.documentElement.style);
  }, [nativeChatRoom, employeeCompact, chatOpen, compactViewport]);
  useEffect(() => {
    if (!nativeChatRoom) return undefined;
    const openApps = () => {
      if (workspaceModeForPath(location.pathname) === 'hyperagents') { navigate(employeeAppsPath(location)); return; }
      setMobileAppsOpen(true);
    };
    window.addEventListener('hivemind:mobile-connectors', openApps);
    return () => window.removeEventListener('hivemind:mobile-connectors', openApps);
  }, [nativeChatRoom, location.pathname, location.search, navigate]);
  const [activeSection, setActiveSection] = useState(() => sectionForPath(location.pathname));
  const [productUpgrade, setProductUpgrade] = useState(null);
  useEffect(() => {
    const section = sectionForPath(location.pathname);
    setActiveSection(section);
    try { localStorage.setItem('hm_active_section', section); } catch { /* noop */ }
  }, [location.pathname]);
  const handleSectionChange = (s) => {
    if (s === sectionForPath(location.pathname)) return;
    setActiveSection(s);
    try { localStorage.setItem('hm_active_section', s); } catch { /* noop */ }
    const landing = { hivemind: '/hivemind/app/overview/new', hyperagents: '/hivemind/app/employee/harness', tara: '/hivemind/app/tara' };
    if (!landing[s]) return;

    // BRAIN embeds the native Harness, which owns an independent React root.
    // Cross its boundary with one clean document handoff so React Router never
    // tries to dismantle or revive that root in place. Resume the exact cached
    // session directly—do not stop at Overview and redirect a second time.
    const crossingHarnessBoundary = s === 'hivemind' || /^\/hivemind\/app\/(?:overview|employee\/harness)\/(?:new|session\/)/u.test(window.location.pathname);
    if (crossingHarnessBoundary) {
      let target = landing[s];
      // Native Harness owns history updates inside its independent router.
      // Capture its current URL, not the host router's older /new location.
      const currentPath = window.location.pathname;
      const sessionMatch = currentPath.match(/^\/hivemind\/app\/overview\/session\/([^/]+)$/u);
      if (sessionMatch) {
        try { sessionStorage.setItem('hm.lastHarnessSession', `/hivemind/app/overview/session/${sessionMatch[1]}`); } catch { /* storage may be unavailable */ }
      }
      if (s === 'hivemind') {
        try {
          const cached = sessionStorage.getItem('hm.lastHarnessSession') || '';
          const match = cached.match(/^\/hivemind\/app\/overview\/session\/([^/]+)$/u);
          if (match) target = `/hivemind/app/overview/session/${match[1]}`;
        } catch { /* storage may be unavailable */ }
      }
      window.location.assign(target);
      return;
    }
    navigate(landing[s]);
  };
  useEffect(() => {
    apiClient.setProductAccessPlan(org?.plan);
    const onRestrictedAction = (event) => setProductUpgrade(event.detail || null);
    window.addEventListener('hm:product-access-required', onRestrictedAction);
    return () => window.removeEventListener('hm:product-access-required', onRestrictedAction);
  }, [org?.plan]);
  const graphFullscreen = location.pathname === '/hivemind/app/graph' || location.pathname === '/hivemind/app/graph-2d';
  const crmFullscreen = location.pathname === '/hivemind/app/crm' && new URLSearchParams(location.search).get('fullscreen') === 'true';
  // HyperAgents runs its own left rail (rooms + account) — the app sidebar is
  // hidden entirely there so the workspace reads as one dedicated surface.
  const hyperFullscreen = location.pathname.startsWith('/hivemind/app/employees');
  // Overview embeds the HIVE chat as the page centerpiece — the floating
  // Talk-to-HIVE button would duplicate it there. Hidden on Overview ONLY;
  // every other page keeps the FAB.
  const onMemories = location.pathname === '/hivemind/app/memories';
  const onOverview = /\/hivemind\/app(?:\/(?:overview|employee\/harness)(?:\/.*)?)?\/?$/.test(location.pathname);
  const openDotPrefix = '/hivemind/app/employee/dots';
  const onOpenDotWorkspace = location.pathname.replace(/\/+$/, '') === '/hivemind/app/employee/apps'
    || ((location.pathname === openDotPrefix || location.pathname.startsWith(`${openDotPrefix}/`))
      && buildOpenDotEmbedTarget(location.pathname.slice(openDotPrefix.length), location.search) !== null);
  const onMeetingNotes = /\/hivemind\/app\/meeting-notes\/?$/.test(location.pathname);

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

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const handleChange = (event) => setCompactViewport(event.matches);
    setCompactViewport(media.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);


  if (needsOnboarding) {
    return <div data-hivemind-app-shell><OnboardingFlow /></div>;
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
    return <SelfHostSetup onDone={() => setShGate('ok')} onBackToLogin={logout} />;
  }

  // New-user capability deck → activation checklist → workspace reveal.
  if (gate === 'slides') {
    return <WelcomeSlides onDone={finishSlides} progressKey={welcomeProgressKey} />;
  }
  if (gate === 'activation') {
    return <ActivationGate onDone={finishGate} />;
  }

  // Company setup is an admission stage, not a dismissible page walkthrough.
  // Consult the saved company record; never trust a local 'skipped' marker.
  const companyStatus = companyAdmission.scope === org?.id ? companyAdmission.status : 'checking';
  const modelAccountSettings = ['/hivemind/app/usage', '/hivemind/m/usage', '/hivemind/app/connectors', '/hivemind/m/connectors'].includes(location.pathname);
  if (companyStatus !== 'ready' && !modelAccountSettings) return <div data-hivemind-app-shell className="min-h-[var(--hm-app-viewport-height,100dvh)] bg-[#faf9f4] p-4 sm:p-8">
    {companyStatus === 'checking' ? <AsciiWorkspaceLoading label="Connecting…" />
      : companyStatus === 'error' ? <div role="alert" className="mx-auto max-w-lg p-8"><p>We couldn’t check your company setup. Your progress is saved.</p><button type="button" onClick={() => (clearCompanyRead(`${user?.id}:${org?.id}`), setCompanyRetry(value => value + 1))} className="mt-4 text-[#117dff] underline">Try again</button></div>
      : <React.Suspense fallback={<p role="status">Opening company onboarding…</p>}><HyperOnboarding onComplete={completeCompany} /></React.Suspense>}
    {companyStatus !== 'required' && <button type="button" onClick={() => setAccountOpen(true)} className="fixed bottom-6 right-6 rounded-lg border bg-white px-4 py-2 text-sm">Account & Settings</button>}
    {accountOpen && <AccountSettingsDialog onClose={closeAccount} />}
  </div>;

  if (!workspaceModesReady && requiresWorkspaceModeAccess(location.pathname)) return <AsciiWorkspaceLoading label="Connecting…" />;
  if (workspaceModesReady && !workspaceModesEnabled && !workspaceModesError && requiresWorkspaceModeAccess(location.pathname)) return <Navigate to="/hivemind/app/overview/new" replace />;
  if (!workspaceModesEnabled && requiresWorkspaceModeAccess(location.pathname)) return (
    <section role="alert" className="grid min-h-screen place-content-center gap-4 p-6 text-center">
      <p>{workspaceModesError || 'Workspace access is not enabled for this account. Your saved conversations are unchanged.'}</p>
      <button type="button" onClick={() => window.location.reload()}>Retry this workspace</button>
    </section>
  );

  if (isCompanyOnboardingPath(location.pathname) && workspaceModesReady && !workspaceModesEnabled) return <Navigate to="/hivemind/app/overview/new" replace />;

  if (initialNativePane) return <div data-native-chat-shell className="h-[100dvh] min-h-0 overflow-hidden bg-[#faf9f4]">
    <NativePaneBridge scope={`${user?.id || ""}:${org?.id || ""}`} /><Outlet />
    <PlanLimitGate /><ServiceErrorToast /><CallContractModal /><EntityProfileModalHost />
    {accountOpen && <AccountSettingsDialog onClose={closeAccount} />}
    <ProductAccessModal open={Boolean(productUpgrade)} product={productUpgrade?.product} currentPlan={org?.plan} onClose={() => setProductUpgrade(null)} onUpgrade={plan => { setProductUpgrade(null); navigate(`/hivemind/app/billing?upgrade=${plan}`); }} />
  </div>;

  if (brainChat && brainPhone && !(persistentShellEnabled() && !isNativeApp())) return (
    <QuickRecorderProvider>
      <TeamProvider>
        <div data-hivemind-app-shell data-native-chat-shell data-mobile-brain-user-name={mobileBrainUserName(user, brainChat && brainPhone)} data-mobile-brain-greeting={mobileBrainGreeting(user, brainChat && brainPhone, t)} className="font-[Inter,ui-sans-serif,system-ui,sans-serif]" style={{ '--hm-harness-center-offset': '0px' }}>
          <MobileShell noScroll bareHeader showBareLogo={false} nativeChatViewport activeNavPath="/hivemind/m/chat">
            <MobileBrainHeaderActions />
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden"><HyperAgentActivation /><AgentWorkspaceOutlet key={`${user?.id || ""}:${org?.id || ""}`} /></main>
            {mobileAppsOpen && <NativeMobileAppsSheet onClose={closeMobileApps} legacy />}
            <MobileBrainAddSheet open={mobileBrainAddOpen} onClose={closeMobileBrainAdd} onConnectors={() => { setMobileBrainAddOpen(false); setMobileAppsOpen(true); }} />
            <GlobalUploadStrip />
            <PlanLimitGate />
            <ServiceErrorToast />
            <CallContractModal />
            <ProductAccessModal open={Boolean(productUpgrade)} product={productUpgrade?.product} currentPlan={org?.plan} onClose={() => setProductUpgrade(null)} onUpgrade={plan => { setProductUpgrade(null); navigate(`/hivemind/m/billing?upgrade=${plan}`); }} />
            <EntityProfileModalHost />
            {accountOpen && <AccountSettingsDialog onClose={closeAccount} />}
          </MobileShell>
        </div>
      </TeamProvider>
    </QuickRecorderProvider>
  );

  return (
    <QuickRecorderProvider>
    <TeamProvider>
      <div data-hivemind-app-shell data-mobile-agent-overlay={(employeeRoom && brainPhone) || undefined} data-native-chat-shell={nativeChatRoom || undefined} data-native-compact-chat={(nativeChatRoom && employeeCompact) || undefined} className="min-h-screen bg-[#faf9f4] font-[Inter,ui-sans-serif,system-ui,sans-serif]">
        {!overlayNavigation && !graphFullscreen && !hyperFullscreen && !crmFullscreen && (
          <Sidebar
            activeSection={activeSection}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            desktopColumns={desktopRosterColumns}
            onDesktopColumnsChange={setDesktopRosterColumns}
          />
        )}
        <div
          data-native-chat-frame={nativeChatRoom || undefined}
          className={`min-w-0 transition-all duration-300 ${sidebarCollapsed || graphFullscreen || hyperFullscreen || crmFullscreen ? 'sidebar-content-expanded' : ''}`}
          style={{
            marginLeft: (overlayNavigation || graphFullscreen || hyperFullscreen || crmFullscreen) ? '0px' : desktopTeamNavigation ? `${desktopTeamWidth}px` : sidebarCollapsed ? '68px' : '300px',
            ...(nativeChatRoom && employeeCompact ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : {}),
            '--hm-harness-center-offset': `${-((overlayNavigation || graphFullscreen || hyperFullscreen || crmFullscreen) ? 0 : desktopTeamNavigation ? desktopTeamWidth / 2 : sidebarCollapsed ? 34 : 150)}px`,
          }}
        >
          {!companyEntry && !crmFullscreen && <TopBar floatingMobile={employeeRoom && brainPhone} activeSection={activeSection} onSectionChange={handleSectionChange} mobileTeamToggle={nativeChatRoom && overlayNavigation ? () => setMobileTeamOpen(true) : null} />}
          {nativeChatRoom && overlayNavigation && mobileTeamOpen && <EmployeeMobileNavigation activeSection={activeSection} onClose={() => setMobileTeamOpen(false)} />}
          {nativeChatRoom && overlayNavigation && mobileAppsOpen && <NativeMobileAppsSheet onClose={closeMobileApps} legacy={brainPhone} />}
          {nativeChatRoom && brainPhone && <MobileBrainAddSheet open={mobileBrainAddOpen} onClose={closeMobileBrainAdd} onConnectors={() => { setMobileBrainAddOpen(false); setMobileAppsOpen(true); }} />}
          <div className={!initialNativePane && !hyperFullscreen && !crmFullscreen && !graphFullscreen && (workspaceModeForPath(location.pathname) === 'hyperagents' || onOverview) ? 'hm-runtime-workspace' : 'contents'}>
          {workspaceModeForPath(location.pathname) === 'hyperagents' && !initialNativePane && !hyperFullscreen && !crmFullscreen && <RuntimeGetStarted key={`${user?.id}:${org?.id}`} scope={`${user?.id}:${org?.id}`} />}
          {workspaceModeForPath(location.pathname) === 'hivemind' && !initialNativePane && !graphFullscreen && !crmFullscreen && <BrainGetStarted key={`brain:${user?.id}:${org?.id}`} scope={`${user?.id}:${org?.id}`} />}
          <main data-native-chat-main={nativeChatRoom || undefined} className={companyEntry ? 'min-h-screen p-4 sm:p-8' : graphFullscreen ? "h-[calc(var(--hm-app-viewport-height,100dvh)-56px)] overflow-hidden" : onOverview || onOpenDotWorkspace ? "h-[calc(var(--hm-app-viewport-height,100dvh)-56px)] min-h-0 min-w-0 overflow-hidden" : onMemories ? "memory-page-scroll h-[calc(var(--hm-app-viewport-height,100dvh)-56px)] min-h-0 overflow-y-auto overscroll-contain" : "flex-1 p-4 md:p-6 overflow-y-auto"}>
            <BrainFeatureWelcome key={`features-${user?.id || ""}:${org?.id || ""}`} />
            <HyperAgentActivation /><AgentWorkspaceOutlet key={`${user?.id || ""}:${org?.id || ""}`} />
          </main>
          </div>
        </div>

        {employeeRoom && <React.Suspense fallback={null}><HyperAgentsWelcome key={`${user?.id}:${org?.id}`} company={companyAdmission.company} /></React.Suspense>}
        {accountOpen && <AccountSettingsDialog onClose={closeAccount} />}
        {/* Chat FAB — glass-morph pill, slides in from right, blinking pulse */}
        {SHOW_TALK_TO_HIVE_FAB && <TalkToHiveFAB onOpen={() => setChatOpen(true)} hidden={chatOpen || graphFullscreen || crmFullscreen || onOverview || onMeetingNotes || activeSection === 'hyperagents' || activeSection === 'tara'} />}

        {/* Global upload strip — survives KB unmount so users can browse
            other pages while files are still uploading */}
        <GlobalUploadStrip />

        {/* Chat Panel */}
        {(chatOpen || chatLoaded) && <React.Suspense fallback={<AsciiWorkspaceLoading label="Connecting…" />}><ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} /></React.Suspense>}

        {/* Global plan-limit upgrade prompt — reacts to 'hm:plan-limit' */}
        <PlanLimitGate />

        {/* Global 5xx / network outage notice — reacts to 'hm:service-error'
            so a service failure never fails silently (e.g. mycompany 503). */}
        <ServiceErrorToast />

        {/* First-contact HITL popup for an autonomous TARA call — reacts to
            'hm:call-contract'. Approve → dial; nothing calls without it. */}
        <CallContractModal />

        <ProductAccessModal
          open={Boolean(productUpgrade)}
          product={productUpgrade?.product}
          currentPlan={org?.plan}
          onClose={() => setProductUpgrade(null)}
          onUpgrade={(plan) => {
            setProductUpgrade(null);
            navigate(mobilePageDestination({pathname:'/hivemind/app/billing',search:`?upgrade=${plan}${new URLSearchParams(location.search).get('desktop') === '1' ? '&desktop=1' : ''}`,hash:location.hash}, brainPhone) || `/hivemind/app/billing?upgrade=${plan}${new URLSearchParams(location.search).get('desktop') === '1' ? '&desktop=1' : ''}${location.hash}`);
          }}
        />
        <EntityProfileModalHost />
      </div>
    </TeamProvider>
    </QuickRecorderProvider>
  );
}

export default function AppShell() {
  const appearance = useNativeAppearance();
  return <NativeAiConsentGate><MotionConfig reducedMotion={appearance.reduceMotion ? 'always' : 'user'}><RuntimeAppearanceProvider><AppShellContent /></RuntimeAppearanceProvider></MotionConfig></NativeAiConsentGate>;
}
