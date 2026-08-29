import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Brain, Shield, Loader2, WifiOff, Building2, ArrowLeft, ArrowRight, Cloud, Server, Lock, Check, Crown, KeyRound, Mic2, Workflow } from 'lucide-react';
import { useAuth } from './AuthProvider';
import apiClient from '../shared/api-client';
import { clearInvitationContext, loadInvitationContext, saveInvitationContext } from './invitation-session';

/* ─── Provider icons ───────────────────────────────────────────────────── */
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 23 23">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function AppleIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

/* ─── Blueprint background (supermemory-style dot grid on ivory) ───────── */
function DotGrid() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: 'radial-gradient(rgba(17,125,255,0.13) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="absolute -top-48 -left-48 w-[620px] h-[620px] rounded-full bg-[#117dff]/[0.05] blur-[110px]" />
      <div className="absolute -bottom-48 -right-48 w-[620px] h-[620px] rounded-full bg-[#117dff]/[0.05] blur-[110px]" />
    </>
  );
}

/* input recipe — shared by both create-account forms */
const INPUT_CLS = "w-full px-3.5 py-2.5 rounded-[6px] border border-[#e3e0db] bg-white text-[#0a0a0a] text-[13px] focus:outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]/20 transition-all";
const LABEL_CLS = "text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] block mb-1.5";

const PERSONAL_PLANS = [
  {
    id: 'free', name: 'Free', product: 'BRAIN + OS + VOICE', price: '€0', cadence: '/mo',
    eyebrow: 'Explore the complete system', capacity: '100 pages included',
    summary: 'Try the full HIVEMIND experience within the existing free usage limits.',
    features: ['Grounded recall from your own sources', 'Limited HyperAgent and VOICE access', 'PDF, DOCX and XLSX ingestion', 'Up to 3 connected sources'],
  },
  {
    id: 'plus', name: 'Plus', product: 'BRAIN', price: '€39', cadence: '/mo',
    eyebrow: 'Your permanent personal memory', capacity: '1,000 pages included',
    summary: 'Keep your work history permanently and recall it without per-query credits.',
    features: ['Everything in Free for BRAIN', 'Permanent personal history', 'More source types and connectors', 'Deeper recall across your own work'],
  },
  {
    id: 'pro', name: 'Pro', product: 'BRAIN + Operating System', price: '€79', cadence: '/mo',
    eyebrow: 'Give your Brain work to carry out', capacity: 'Higher memory capacity', popular: true,
    summary: 'Turn your memory into an operating system with governed HyperAgents.',
    features: ['Everything in Plus', 'Included HyperAgent runs each month', 'Deep Research and Web Intelligence', 'Connected-app actions with your approval'],
  },
  {
    id: 'scale', name: 'Scale', product: 'BRAIN + OS + VOICE', price: '€239', cadence: '/mo',
    eyebrow: 'Operate with a small AI team', capacity: '10,000 pages included',
    summary: 'Combine memory, autonomous work and TARA voice for a trusted private circle.',
    features: ['Everything in Pro', 'Larger HyperAgent allowance', 'TARA voice with included talk time', 'Up to 3 trusted collaborators'],
  },
];

export default function LoginPage() {
  const { isAuthenticated, isUnreachable, loading, login, org, needsOnboarding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const localPreviewAuth = process.env.REACT_APP_LOCAL_AUTH_BYPASS === 'true';

  // If the user landed on /login via ProtectedRoute (e.g. clicked an invite link
  // /hivemind/join/<slug>/<token> while signed out), preserve that path as the
  // post-OAuth returnTo so they land on the invite-acceptance screen instead of
  // /overview (which would trigger Onboarding and create a duplicate personal org).
  //
  // Also honours ?cli_return_to=<abs-url> when the user was bounced here from
  // the CLI browser-auth flow (control plane's /auth/cli/start). In that case
  // we want OAuth to return to the control-plane URL (not the FE) so it can
  // mint the API key and complete the localhost handoff.
  const returnToFromState = useMemo(() => {
    // CLI flow takes priority — URL param wins over location.state.
    const urlParams = new URLSearchParams(location.search);
    const cliReturnTo = urlParams.get('cli_return_to');
    if (cliReturnTo) {
      // Already a fully-qualified URL (control-plane host with the cli/start
      // params encoded inside). Pass through verbatim.
      return cliReturnTo;
    }
    const from = location.state && location.state.from;
    if (!from || !from.pathname) return null;
    // Don't bounce back to /login itself.
    if (from.pathname.startsWith('/hivemind/login')) return null;
    const search = from.search || '';
    const sep = search ? (search.includes('auth=callback') ? '' : '&') : '?';
    const authParam = search.includes('auth=callback') ? '' : `${sep}auth=callback`;
    return `${window.location.origin}${from.pathname}${search}${authParam}`;
  }, [location.state, location.search]);

  // CLI flow: show a banner so the user knows why we asked them to sign in.
  const isCliFlow = useMemo(
    () => new URLSearchParams(location.search).has('cli_return_to'),
    [location.search]
  );

  // Persist cli_return_to into sessionStorage the moment the user lands
  // here. The OAuth round-trip (Google/Zitadel) can drop URL params on
  // some flows, so the AuthProvider checks sessionStorage on bootstrap
  // completion to recover the CLI handoff.
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(location.search);
      const cliReturnTo = urlParams.get('cli_return_to');
      if (cliReturnTo) {
        sessionStorage.setItem('hivemind_cli_return_to', cliReturnTo);
      }
    } catch (e) {}
  }, [location.search]);

  // ?create=1 — a signed-in but org-less new user was sent here by Onboarding.
  // The create-account UX lives in ONE place (this page), so open the
  // create-account view directly and suppress the signed-in redirect below —
  // otherwise we'd bounce them straight back to /app in a loop.
  const wantsCreate = useMemo(
    () => new URLSearchParams(location.search).get('create') === '1',
    [location.search]
  );
  const enterpriseInvitationToken = useMemo(
    () => new URLSearchParams(location.search).get('enterprise_invite') || '',
    [location.search]
  );
  const personalInvitationToken = useMemo(
    () => new URLSearchParams(location.search).get('personal_invite') || '',
    [location.search]
  );

  const [showOnboarding, setShowOnboarding] = useState(wantsCreate);
  const [localPreviewEmail, setLocalPreviewEmail] = useState('');
  const [localPreviewMessage, setLocalPreviewMessage] = useState('');
  const [localPreviewSubmitting, setLocalPreviewSubmitting] = useState(false);
  const [loadArtwork, setLoadArtwork] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [accountType, setAccountType] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [hostingChoice, setHostingChoice] = useState(null); // 'managed' | 'self_hosted'
  const [userName, setUserName] = useState('');
  const [enterpriseName, setEnterpriseName] = useState('');
  const [hivemindName, setHivemindName] = useState('');
  const [enterpriseAccessCode, setEnterpriseAccessCode] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return params.get('enterprise_code') || new URLSearchParams(window.location.search).get('enterprise_code') || '';
  });
  const [enterpriseInvitation, setEnterpriseInvitation] = useState(null);
  // The URL bearer token is removed after preview so it cannot leak through
  // history, OAuth redirects, or copied links. Keep it only in component
  // memory until the server exchanges it for a signed signup admission.
  const [appliedEnterpriseInvitationToken, setAppliedEnterpriseInvitationToken] = useState(null);
  const [appliedPersonalInvitationToken, setAppliedPersonalInvitationToken] = useState(null);
  const [invitationLockedKind, setInvitationLockedKind] = useState(null);
  const [loadingEnterpriseInvitation, setLoadingEnterpriseInvitation] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [personalInvitationCode, setPersonalInvitationCode] = useState('');
  const [createError, setCreateError] = useState('');
  const onboardingError = useMemo(
    () => new URLSearchParams(location.search).get('onboarding_error'),
    [location.search]
  );

  // The poster is decorative. Give the sign-in controls and auth bootstrap the
  // first network slot, then hydrate the visual once the page is usable.
  useEffect(() => {
    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(() => setLoadArtwork(true), { timeout: 1500 })
      : window.setTimeout(() => setLoadArtwork(true), 900);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(schedule);
      else window.clearTimeout(schedule);
    };
  }, []);

  // Restore an interrupted OAuth signup on the login surface. This keeps
  // enterprise setup out of /app while avoiding a second round of questions.
  useEffect(() => {
    if (!wantsCreate) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('hivemind_onboarding') || 'null'); } catch { /* noop */ }
    if (!saved?.type) return;
    setShowOnboarding(true);
    setAccountType(saved.type);
    setUserName(saved.name || '');
    setEnterpriseName(saved.enterprise || '');
    setHivemindName(saved.hivemind_name || '');
    setHostingChoice(saved.deployment === 'selfhost' ? 'self_hosted' : (saved.deployment || 'managed'));
    setSelectedPlan(saved.selected_plan || null);
    setEnterpriseInvitation(saved.enterprise_invitation || null);
    setOnboardingStep(saved.type === 'enterprise' ? 3 : (saved.selected_plan ? 3 : 2));
  }, [wantsCreate]);

  // Restore a validated invitation after reloads and between onboarding
  // steps. Credentials live only in tab-scoped sessionStorage.
  useEffect(() => {
    if (!wantsCreate) return;
    const context = loadInvitationContext();
    if (!context) return;
    setShowOnboarding(true);
    setInvitationLockedKind(context.kind);
    setAccountType(context.kind);
    setOnboardingStep(1);
    if (context.kind === 'enterprise') {
      setAppliedEnterpriseInvitationToken(context.credential);
      setEnterpriseInvitation(context.preview || null);
      setHostingChoice(context.preview?.hosting_mode === 'self_host' ? 'self_hosted' : 'managed');
      setEnterpriseName((value) => value || context.preview?.workspace_name || context.preview?.company_name || '');
    } else {
      setAppliedPersonalInvitationToken(context.credential);
    }
  }, [wantsCreate]);

  // Direct links remain compatible with older emails. Validate, move the
  // credential to tab-scoped storage, and remove it from the address bar.
  useEffect(() => {
    const directKind = enterpriseInvitationToken ? 'enterprise' : personalInvitationToken ? 'personal' : null;
    const directToken = enterpriseInvitationToken || personalInvitationToken;
    if (!wantsCreate || !directKind || !directToken) return;
    let cancelled = false;
    setLoadingEnterpriseInvitation(true);
    const previewRequest = directKind === 'enterprise'
      ? apiClient.previewEnterpriseInvitation(directToken)
      : apiClient.previewPersonalInvitation(directToken);
    previewRequest
      .then(({ invitation }) => {
        if (cancelled) return;
        saveInvitationContext({ kind: directKind, credential: directToken, preview: invitation });
        setInvitationLockedKind(directKind);
        setAccountType(directKind);
        setOnboardingStep(1);
        setShowOnboarding(true);
        if (directKind === 'enterprise') {
          setEnterpriseInvitation(invitation);
          setAppliedEnterpriseInvitationToken(directToken);
          setHostingChoice(invitation.hosting_mode === 'self_host' ? 'self_hosted' : 'managed');
          setEnterpriseName((value) => value || invitation.workspace_name || invitation.company_name || '');
        } else {
          setAppliedPersonalInvitationToken(directToken);
        }
        const params = new URLSearchParams(location.search);
        params.delete('enterprise_invite');
        params.delete('personal_invite');
        window.history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}`);
      })
      .catch(() => { if (!cancelled) setCreateError('This invitation is unavailable.'); })
      .finally(() => { if (!cancelled) setLoadingEnterpriseInvitation(false); });
    return () => { cancelled = true; };
  }, [wantsCreate, enterpriseInvitationToken, personalInvitationToken, location.pathname, location.search]);

  // Already signed in → go to dashboard (or original deep link, e.g. invite path)
  useEffect(() => {
    if (isAuthenticated) {
      if (wantsCreate && needsOnboarding) return; // org-less new user finishing create-account — stay here
      if (org?.id) {
        try { localStorage.removeItem('hivemind_onboarding'); } catch { /* ignore */ }
        clearInvitationContext();
      }
      // CLI flow: jump to the cross-origin control-plane URL so it can
      // mint the API key and 302 to the verified page.
      const urlParams = new URLSearchParams(location.search);
      const cliReturnTo = urlParams.get('cli_return_to');
      if (cliReturnTo) {
        window.location.href = cliReturnTo;
        return;
      }
      const from = location.state && location.state.from;
      const dest = from && from.pathname && !from.pathname.startsWith('/hivemind/login')
        ? `${from.pathname}${from.search || ''}`
        : '/hivemind/app/overview';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state, location.search, wantsCreate, needsOnboarding, org?.id]);

  // Auto-update hivemindName based on account type
  useEffect(() => {
    if (accountType === 'personal' && userName) {
      setHivemindName(`${userName.toLowerCase().replace(/\s+/g, '_')}_secondbrain`);
    } else if (accountType === 'enterprise' && enterpriseName) {
      setHivemindName(`${enterpriseName.toLowerCase().replace(/\s+/g, '')}_hivemind`);
    }
  }, [userName, enterpriseName, accountType]);

  const handleCreateAccount = async (provider = 'google') => {
    setCreateError('');
    const accessCode = accountType === 'personal' ? personalInvitationCode.trim() : enterpriseAccessCode.trim();
    const invitationTokenReady = accountType === 'enterprise' ? appliedEnterpriseInvitationToken : appliedPersonalInvitationToken;
    if (!accessCode && !invitationTokenReady) {
      setCreateError(accountType === 'personal' ? 'Enter the invitation code to continue.' : 'Enter the Enterprise access code to continue.');
      return;
    }
    let admission;
    try {
      admission = await apiClient.requestSignupAdmission({
        accountType,
        invitationCode: accessCode,
        enterpriseInvitationToken: appliedEnterpriseInvitationToken,
        personalInvitationToken: appliedPersonalInvitationToken,
      });
    } catch {
      setCreateError('This invitation is unavailable.');
      return;
    }
    const onboardingIntent = {
      type: accountType,
      name: userName,
      hivemind_name: hivemindName,
      enterprise: enterpriseName || null,
      deployment: accountType === 'enterprise' ? (hostingChoice || 'managed') : 'managed',
      ...(accountType === 'personal' ? { selected_plan: selectedPlan || 'free' } : {}),
      ...(accountType === 'personal' ? { referral_code: referralCode.trim() || null } : {}),
      ...(admission.invitation ? { enterprise_invitation: admission.invitation } : {}),
      signup_ticket: admission.signup_ticket,
    };
    // Save onboarding data for post-auth pickup
    try {
      localStorage.setItem('hivemind_onboarding', JSON.stringify(onboardingIntent));
      if (accountType === 'personal' && selectedPlan && selectedPlan !== 'free') {
        sessionStorage.setItem('hivemind_post_signup_upgrade', selectedPlan);
      } else {
        sessionStorage.removeItem('hivemind_post_signup_upgrade');
      }
    } catch (e) {}
    // If the user came via an invite link, send them back there after OAuth so
    // they land on the invite-acceptance screen instead of the personal-org
    // Onboarding flow.
    // The fragment is not sent to the API, OAuth provider, proxies, or server
    // logs. It gives the callback a storage-independent fallback for browsers
    // that block localStorage in the OAuth return context.
    const intentFragment = encodeURIComponent(JSON.stringify(onboardingIntent));
    const returnTo = returnToFromState
      || `${window.location.origin}/hivemind/app/overview?auth=callback&onboarding=true#onboarding=${intentFragment}`;
    if (provider === 'zitadel') {
      // Zitadel with prompt=create → shows registration screen
      window.location.href = apiClient.getRegisterUrl(returnTo, undefined, admission.signup_ticket);
    } else if (provider === 'microsoft' || provider === 'apple') {
      // Federated registration through ZITADEL's matching IdP
      window.location.href = apiClient.getRegisterUrl(returnTo, provider, admission.signup_ticket);
    } else {
      // Google OAuth auto-creates accounts
      window.location.href = apiClient.getGoogleLoginUrl(returnTo, admission.signup_ticket);
    }
  };

  const enterpriseAdmissionReady = Boolean(appliedEnterpriseInvitationToken || enterpriseAccessCode.trim());
  const personalAdmissionReady = Boolean(appliedPersonalInvitationToken || personalInvitationCode.trim());

  const resetOnboarding = () => {
    setShowOnboarding(false);
    setOnboardingStep(1);
    setAccountType(null);
    setSelectedPlan(null);
    setHostingChoice(null);
    setUserName('');
    setEnterpriseName('');
    setHivemindName('');
    setEnterpriseAccessCode('');
    setAppliedEnterpriseInvitationToken(null);
    setAppliedPersonalInvitationToken(null);
    setInvitationLockedKind(null);
    setEnterpriseInvitation(null);
    setPersonalInvitationCode('');
    setCreateError('');
    setReferralCode('');
    clearInvitationContext();
  };

  /* Non-Google identity providers are intentionally visible but not live yet.
     Keeping these as disabled native buttons prevents accidental OAuth redirects. */
  const ComingSoonProvider = ({ label, children }) => (
    <button
      type="button"
      disabled
      aria-label={`${label} — coming soon`}
      className="flex-1 h-11 flex items-center justify-center gap-2 rounded-[6px] border border-[#e3e0db] bg-[#faf9f4] text-[#737373] cursor-not-allowed"
    >
      {children}
      <span className="text-[9px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3]">Coming soon</span>
    </button>
  );

  return (
    <div className={`min-h-screen bg-[#faf9f4] relative flex flex-col items-center justify-center ${showOnboarding ? 'h-screen overflow-hidden p-0' : 'overflow-hidden py-10'}`}>
      <DotGrid />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 w-full transition-[max-width] duration-300 ${showOnboarding ? 'h-full max-w-none m-0' : 'mx-4 max-w-md md:max-w-3xl'}`}
      >
        {/* mono eyebrow above the card — supermemory-style section tag */}
        <div className={`${showOnboarding ? 'hidden' : 'flex'} items-center justify-center gap-2 mb-4 text-[10px] font-mono uppercase tracking-[0.28em] text-[#a3a3a3]`}>
          <span className="text-[#117dff]">〉</span> The sovereign memory engine
          <span className="hidden sm:inline text-[#d4d0ca]">· EU-hosted</span>
        </div>

        <div className={`flex flex-col md:flex-row items-stretch bg-white overflow-hidden ${showOnboarding ? 'h-full w-full border-0 rounded-none shadow-none' : 'border border-[#e3e0db] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'}`}>
          {/* Left: Login form */}
          <div className={`transition-[width] duration-300 w-full shrink-0 ${showOnboarding ? 'h-full overflow-y-auto p-7 md:w-1/2 md:border-r md:border-[#e3e0db] lg:p-10 xl:p-12' : 'p-8 md:w-[448px]'}`}>
            <div className={showOnboarding ? 'mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center py-8 lg:py-12' : ''}>
            {/* Logo */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <img
                  src="/images/singulance-orbit.png"
                  alt="Singulance"
                  className="h-10 w-14 shrink-0 object-contain"
                />
                <div>
                  <h1 className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk'] tracking-tight">SINGULANCE</h1>
                  <p className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-[0.18em]">HIVEMIND · MEMORY ENGINE</p>
                </div>
              </div>
              <span className="hidden sm:inline text-[10px] font-mono text-[#d4d0ca] tabular-nums">[v2]</span>
            </div>

            {/* CLI flow banner */}
            {isCliFlow && (
              <div className="mb-6 p-3 rounded-[8px] bg-[#117dff]/8 border border-[#117dff]/20">
                <div className="flex items-start gap-2">
                  <Zap size={14} className="text-[#117dff] mt-0.5 shrink-0" />
                  <div className="text-[12px] leading-relaxed text-[#0a5fcc]">
                    <span className="font-semibold">Signing you in to wire HIVEMIND into your CLI.</span>
                    <br />
                    <span className="text-[#3b6da3]">After this you'll see a confirmation screen, then control returns to your terminal.</span>
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {!showOnboarding ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Headline */}
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-2">
                    <span className="text-[#a3a3a3]">〉</span> {isCliFlow ? 'CLI HANDSHAKE' : 'SIGN IN'}
                  </div>
                  <h2 className="text-[#0a0a0a] text-[26px] leading-tight font-medium font-['Space_Grotesk'] mb-2 tracking-tight">
                    {isCliFlow ? 'Authorize HIVEMIND CLI' : 'Your memory is waiting'}
                  </h2>
                  <p className="text-[#737373] text-[13px] mb-7 leading-relaxed">
                    One workspace that remembers everything — chat, agents, meetings, connectors.
                  </p>

                  {/* State: control_plane_unreachable */}
                  {isUnreachable && (
                    <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-[8px] bg-red-50 border border-red-200">
                      <WifiOff size={14} className="text-[#dc2626] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[#dc2626] text-xs font-semibold font-['Space_Grotesk']">Control plane unavailable</p>
                        <p className="text-[#dc2626]/60 text-[11px] mt-0.5">Unable to reach the authentication service. Please try again in a moment.</p>
                      </div>
                      {enterpriseInvitation && (
                        <div className="border border-[#117dff]/20 bg-[#117dff]/[0.05] rounded-[8px] px-3 py-2.5 text-[12px] text-[#255d9f]">
                          <strong className="text-[#0a5fcc]">Enterprise invitation confirmed</strong>
                          <span className="ml-1">{enterpriseInvitation.company_name} · {enterpriseInvitation.hosting_mode === 'self_host' ? 'Self-hosted infrastructure' : 'Managed infrastructure'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {localPreviewAuth && <div className="mb-3"><label className="block text-[11px] font-medium text-[#525252] mb-1.5" htmlFor="local-preview-email">Email address</label><input id="local-preview-email" type="email" autoComplete="email" value={localPreviewEmail} onChange={(event) => setLocalPreviewEmail(event.target.value)} placeholder="you@company.com" className="w-full h-11 px-3 rounded-[6px] border border-[#d9d7d0] text-[13px] outline-none focus:border-[#117dff]" />{localPreviewMessage && <p className="mt-2 text-[11px] text-[#525252]">{localPreviewMessage}</p>}</div>}
                  {/* Preview-only email sign-in or the normal Google flow. */}
                  <button
                    onClick={async () => {
                      if (localPreviewAuth) {
                        const returnTo = returnToFromState || `${window.location.origin}/hivemind/app/overview?auth=callback`;
                        setLocalPreviewSubmitting(true); setLocalPreviewMessage('');
                        try {
                          const response = await fetch(`${process.env.REACT_APP_CONTROL_PLANE_URL.replace(/\/$/, '')}/auth/local-preview/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email: localPreviewEmail, return_to: returnTo }) });
                          const payload = await response.json().catch(() => ({}));
                          setLocalPreviewMessage(response.ok ? (payload.message || 'Check your email for a sign-in link.') : (payload.error || 'Unable to send the sign-in link.'));
                        } finally { setLocalPreviewSubmitting(false); }
                        return;
                      }
                      login({ provider: 'google', returnTo: returnToFromState || undefined });
                    }}
                    disabled={loading || localPreviewSubmitting || (localPreviewAuth && !localPreviewEmail.trim())}
                    className="w-full h-12 flex items-center justify-center gap-3 bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-60 text-white font-semibold rounded-[6px] transition-all text-[13px] font-['Space_Grotesk'] cursor-pointer border-none uppercase tracking-[0.08em]"
                  >
                    {(loading || localPreviewSubmitting) ? <Loader2 size={16} className="animate-spin text-white/60" /> : (
                      <span className="w-6 h-6 rounded-[4px] bg-white flex items-center justify-center"><GoogleIcon size={14} /></span>
                    )}
                    {localPreviewAuth ? 'Email me a preview sign-in link' : 'Continue with Google'}
                  </button>
                  {/* Visible provider roadmap — Google is the only live identity path. */}
                  <div className="flex items-center gap-2 mt-2.5">
                    <ComingSoonProvider label="Microsoft">
                      <MicrosoftIcon size={15} />
                      <span className="text-[12px] font-medium">Microsoft</span>
                    </ComingSoonProvider>
                    <ComingSoonProvider label="Apple">
                      <AppleIcon size={16} />
                      <span className="text-[12px] font-medium">Apple</span>
                    </ComingSoonProvider>
                  </div>

                  {/* Enterprise SSO stays visible without allowing an unavailable redirect. */}
                  <button
                    type="button"
                    disabled
                    aria-label="Enterprise SSO — coming soon"
                    className="mt-2.5 w-full h-11 flex items-center justify-center gap-2.5 bg-[#faf9f4] text-[#737373] font-medium rounded-[6px] text-[12px] font-['Space_Grotesk'] cursor-not-allowed border border-[#e3e0db] uppercase tracking-[0.075em]"
                  >
                    <Shield size={14} className="text-[#a3a3a3]" />
                    Enterprise SSO · EU Sovereign
                    <span className="text-[9px] font-mono normal-case tracking-normal text-[#a3a3a3]">Coming soon</span>
                  </button>

                  {/* trust line */}
                  <div className="flex items-center justify-center gap-2 mt-4 px-3 py-2 rounded-[6px] bg-[#f0fdf4] border border-[#bbf7d0]">
                    <Shield size={11} className="text-[#16a34a]" />
                    <p className="text-[#16a34a] text-[10px] font-mono">EU-hosted (Frankfurt) · GDPR · no US data transfer</p>
                  </div>

                  {/* Create New Account */}
                  <div className="text-center mt-5">
                    <p className="text-[13px] text-[#737373]">
                      New here?{' '}
                      <button onClick={() => setShowOnboarding(true)} className="text-[#117dff] font-semibold hover:underline">
                        Create your HIVEMIND
                      </button>
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-[#e3e0db]" />
                    <span className="text-[#d4d0ca] text-[10px] font-mono">or</span>
                    <div className="flex-1 h-px bg-[#e3e0db]" />
                  </div>

                  <a
                    href="/hivemind"
                    className="block w-full text-center text-[#a3a3a3] hover:text-[#0a0a0a] text-[12px] py-2.5 rounded-[6px] border border-[#e3e0db] hover:border-[#d4d0ca] transition-all font-['Space_Grotesk']"
                  >
                    Learn more about HIVEMIND
                  </a>
                </motion.div>
              ) : (
                <motion.div
                  key={`onboarding-${onboardingStep}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Back button */}
                  <button
                    onClick={() => {
                      if (onboardingStep === 1) {
                        resetOnboarding();
                      } else if (onboardingStep === 3) {
                        setOnboardingStep(2);
                      } else {
                        setOnboardingStep(1);
                        setAccountType(null);
                        setHostingChoice(null);
                      }
                    }}
                    className="flex items-center gap-1.5 text-[#737373] hover:text-[#0a0a0a] text-[12px] font-['Space_Grotesk'] mb-6 transition-colors"
                  >
                    <ArrowLeft size={13} />
                    {onboardingStep === 1 ? 'Back to sign in' : 'Back'}
                  </button>

                  {onboardingError && (
                    <div className="mb-4 rounded-[7px] border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
                      {onboardingError === 'invalid_enterprise_code'
                        ? 'That Enterprise access code is invalid or no longer active. Check the code and try again.'
                        : onboardingError === 'missing_enterprise_code'
                          ? 'Enter the Enterprise access code supplied with your onboarding invitation.'
                          : 'Workspace creation did not complete. Review the details and try again.'}
                    </div>
                  )}

                  {/* Step 1: Choose path */}
                  {onboardingStep === 1 && (
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-2">
                          <span className="text-[#a3a3a3]">〉</span> NEW WORKSPACE <span className="text-[#d4d0ca]">· 01</span>
                        </div>
                        <h2 className="text-[24px] font-medium text-[#0a0a0a] font-['Space_Grotesk'] tracking-tight">How will you use HIVEMIND?</h2>
                        <p className="text-[13px] text-[#737373] mt-1.5">Choose the workspace that fits you. You can grow into Enterprise anytime.</p>
                        {invitationLockedKind && <p className="mt-3 rounded-[6px] border border-[#117dff]/20 bg-[#117dff]/[0.05] px-3 py-2 text-[11px] text-[#3b6da3]">Your verified invitation has reserved the {invitationLockedKind === 'enterprise' ? 'Enterprise' : 'Personal'} path. The other account type is unavailable for this setup.</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          disabled={invitationLockedKind === 'enterprise'}
                          onClick={() => { if (invitationLockedKind !== 'enterprise') { setAccountType('personal'); setOnboardingStep(2); } }}
                          className={`p-4 rounded-[10px] border transition-all text-left group flex flex-col bg-white ${invitationLockedKind === 'enterprise' ? 'cursor-not-allowed border-[#eceae6] opacity-35' : accountType === 'personal' ? 'border-[#117dff] ring-1 ring-[#117dff]/20' : 'border-[#e3e0db] hover:border-[#117dff] hover:shadow-sm'}`}
                        >
                          <div className="w-10 h-10 rounded-[8px] bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
                            <Brain size={20} className="text-[#117dff]" />
                          </div>
                          <h3 className="text-[15px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">Personal</h3>
                          <p className="text-[12px] text-[#525252] mt-1 leading-snug">Your Second Brain — connect all your platforms</p>
                          <ul className="mt-3 space-y-1.5">
                            {['Unified personal memory', 'Connect Gmail, Slack, Notion…', 'Free to start'].map((f) => (
                              <li key={f} className="flex items-center gap-1.5 text-[11px] text-[#737373]">
                                <Check size={11} className="text-[#117dff] shrink-0" /> {f}
                              </li>
                            ))}
                          </ul>
                        </button>

                        <button
                          disabled={invitationLockedKind === 'personal'}
                          onClick={() => { if (invitationLockedKind !== 'personal') { setAccountType('enterprise'); if (!enterpriseInvitation) setHostingChoice(null); setOnboardingStep(2); } }}
                          className={`relative p-4 rounded-[10px] border transition-all text-left group flex flex-col bg-white ${invitationLockedKind === 'personal' ? 'cursor-not-allowed border-[#eceae6] opacity-35' : accountType === 'enterprise' ? 'border-[#0a0a0a] ring-1 ring-[#0a0a0a]/10' : 'border-[#e3e0db] hover:border-[#0a0a0a] hover:shadow-sm'}`}
                        >
                          <div className="w-10 h-10 rounded-[8px] bg-[#f3f1ec] border border-[#e3e0db] flex items-center justify-center mb-3">
                            <Building2 size={20} className="text-[#0a0a0a]" />
                          </div>
                          <h3 className="text-[15px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">Enterprise</h3>
                          <p className="text-[12px] text-[#525252] mt-1 leading-snug">Sovereign Memory Engine for your team</p>
                          <ul className="mt-3 space-y-1.5">
                            {['Teams, projects & SSO', 'Cloud or self-hosted', 'EU data sovereignty'].map((f) => (
                              <li key={f} className="flex items-center gap-1.5 text-[11px] text-[#737373]">
                                <Check size={11} className="text-[#0a0a0a] shrink-0" /> {f}
                              </li>
                            ))}
                          </ul>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2a: Personal plan selection. Selection is intent only;
                      paid access is activated by the billing lifecycle. */}
                  {onboardingStep === 2 && accountType === 'personal' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-2">
                          <span className="text-[#a3a3a3]">〉</span> PERSONAL PLAN <span className="text-[#d4d0ca]">· 02</span>
                        </div>
                        <h2 className="text-[22px] font-medium text-[#0a0a0a] font-['Space_Grotesk'] tracking-tight">Choose how your Brain grows</h2>
                        <p className="text-[12px] text-[#737373] mt-1">Start free or choose the product layer you already need.</p>
                      </div>

                      <div className="divide-y divide-[#e3e0db] overflow-hidden rounded-[9px] border border-[#e3e0db] bg-white">
                        {PERSONAL_PLANS.map((plan) => {
                          const active = selectedPlan === plan.id;
                          return (
                            <button
                              key={plan.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setSelectedPlan(plan.id)}
                              className={`group relative flex w-full items-center gap-4 px-4 py-3 text-left transition-colors ${active ? 'bg-[#117dff]/[0.06]' : 'hover:bg-[#faf9f4]'}`}
                            >
                              {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#117dff]" />}
                              <div className="w-[92px] shrink-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[14px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">{plan.name}</span>
                                  {plan.popular && <span className="rounded-full bg-[#117dff] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white">Popular</span>}
                                </div>
                                <span className="mt-0.5 block text-[12px] font-semibold text-[#0a0a0a]">{plan.price}<span className="text-[9px] font-normal text-[#a3a3a3]">{plan.cadence}</span></span>
                              </div>
                              <div className="min-w-0 flex-1 border-l border-[#eceae6] pl-4">
                                <p className="text-[11px] font-semibold text-[#0a0a0a]">{plan.product}</p>
                                <p className="mt-0.5 truncate text-[10px] text-[#737373]">{plan.capacity} · {plan.eyebrow}</p>
                              </div>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? 'border-[#117dff] bg-[#117dff] text-white' : 'border-[#d4d0ca] text-transparent group-hover:border-[#117dff]'}`}>
                                <Check size={11} strokeWidth={3} />
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        disabled={!selectedPlan}
                        onClick={() => selectedPlan && setOnboardingStep(3)}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-[6px] border-none bg-[#117dff] text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[#0066e0] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {selectedPlan ? 'Proceed' : 'Choose one'} <ArrowRight size={14} />
                      </button>
                      <p className="text-center text-[10px] leading-relaxed text-[#a3a3a3]">Paid access begins only after secure checkout. You can change plans later.</p>
                    </div>
                  )}

                  {/* Step 3a: Personal details */}
                  {onboardingStep === 3 && accountType === 'personal' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-2">
                          <span className="text-[#a3a3a3]">〉</span> SECOND BRAIN <span className="text-[#d4d0ca]">· 03</span>
                        </div>
                        <h2 className="text-[20px] font-medium text-[#0a0a0a] font-['Space_Grotesk'] tracking-tight">Set up your Second Brain</h2>
                        <p className="mt-1 text-[11px] text-[#737373]">{PERSONAL_PLANS.find((plan) => plan.id === selectedPlan)?.name || 'Free'} selected</p>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Your name</label>
                        <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Amar" className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Name your HIVEMIND</label>
                        <input value={hivemindName} onChange={e => setHivemindName(e.target.value)} placeholder={`${userName || 'your'}_secondbrain`} className={INPUT_CLS} />
                        <p className="text-[11px] text-[#a3a3a3] mt-1">This is your memory workspace name</p>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Invitation code</label>
                        <input
                          value={appliedPersonalInvitationToken ? 'Secure invitation applied' : personalInvitationCode}
                          onChange={e => setPersonalInvitationCode(e.target.value)}
                          placeholder="Enter your invitation code"
                          maxLength={128}
                          autoComplete="off"
                          readOnly={Boolean(appliedPersonalInvitationToken)}
                          className={`${INPUT_CLS} font-mono ${appliedPersonalInvitationToken ? 'bg-[#f3f8ff] text-[#117dff]' : ''}`}
                        />
                        <p className="text-[11px] text-[#a3a3a3] mt-1">Personal workspaces are currently available by invitation.</p>
                      </div>
                      {(createError || onboardingError) && <p role="alert" className="text-[12px] text-red-600">{createError || 'Your invitation could not be verified. Please try again.'}</p>}
                      <button
                        onClick={() => handleCreateAccount('google')}
                        disabled={!userName.trim() || !personalAdmissionReady}
                        className="w-full h-11 rounded-[6px] bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-40 text-white font-semibold text-[12px] font-['Space_Grotesk'] uppercase tracking-[0.08em] transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                      >
                        <span className="w-5 h-5 rounded-[4px] bg-white flex items-center justify-center"><GoogleIcon size={12} /></span>
                        Continue with Google
                      </button>
                      <div className="flex items-center gap-2">
                        <ComingSoonProvider label="Microsoft">
                          <MicrosoftIcon size={14} /><span className="text-[12px] font-medium">Microsoft</span>
                        </ComingSoonProvider>
                        <ComingSoonProvider label="Apple">
                          <AppleIcon size={15} /><span className="text-[12px] font-medium">Apple</span>
                        </ComingSoonProvider>
                      </div>
                      <button
                        type="button"
                        disabled
                        aria-label="Enterprise SSO — coming soon"
                        className="w-full h-10 rounded-[6px] bg-[#faf9f4] text-[#737373] font-medium text-[12px] font-['Space_Grotesk'] cursor-not-allowed border border-[#e3e0db] flex items-center justify-center gap-2"
                      >
                        <Shield size={13} className="text-[#a3a3a3]" /> Enterprise SSO (EU Sovereign) · <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#a3a3a3]">Coming soon</span>
                      </button>
                    </div>
                  )}

                  {/* Step 2b: Enterprise hosting choice */}
                  {onboardingStep === 2 && accountType === 'enterprise' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-2">
                          <span className="text-[#a3a3a3]">〉</span> DATA RESIDENCY <span className="text-[#d4d0ca]">· 02</span>
                        </div>
                        <h2 className="text-[22px] font-medium text-[#0a0a0a] font-['Space_Grotesk'] tracking-tight">Where should your memory live?</h2>
                        <p className="text-[13px] text-[#737373] mt-1.5">Your organization's memory is your most valuable asset. Choose who holds it.</p>
                      </div>

                      {/* Managed cloud */}
                      <button
                        disabled={Boolean(enterpriseInvitation && enterpriseInvitation.hosting_mode === 'self_host')}
                        onClick={() => { if (!enterpriseInvitation || enterpriseInvitation.hosting_mode !== 'self_host') { setHostingChoice('managed'); setOnboardingStep(3); } }}
                        className={`w-full text-left p-4 rounded-[10px] border transition-all group bg-white ${
                          enterpriseInvitation?.hosting_mode === 'self_host' ? 'cursor-not-allowed border-[#eceae6] opacity-35' : hostingChoice === 'managed' ? 'border-[#117dff] bg-[#117dff]/[0.03]' : 'border-[#e3e0db] hover:border-[#117dff] hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-[8px] bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                            <Cloud size={19} className="text-[#117dff]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-[14px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">Managed Cloud</h3>
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">Included</span>
                            </div>
                            <p className="text-[12px] text-[#525252] mt-1 leading-snug">We host & operate it for you on EU-sovereign infrastructure (Frankfurt). Live in seconds, zero ops.</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                              {['Instant setup', 'Auto-scaling & backups', 'GDPR · EU-only'].map((f) => (
                                <span key={f} className="flex items-center gap-1 text-[11px] text-[#737373]"><Check size={11} className="text-[#117dff]" /> {f}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Self-hosted sovereign */}
                      <button
                        disabled={Boolean(enterpriseInvitation && enterpriseInvitation.hosting_mode !== 'self_host')}
                        onClick={() => { if (!enterpriseInvitation || enterpriseInvitation.hosting_mode === 'self_host') { setHostingChoice('self_hosted'); setOnboardingStep(3); } }}
                        className={`relative w-full text-left p-4 rounded-[10px] transition-all group overflow-hidden ${
                          enterpriseInvitation && enterpriseInvitation.hosting_mode !== 'self_host' ? 'cursor-not-allowed opacity-35' : hostingChoice === 'self_hosted' ? 'ring-2 ring-amber-400' : ''
                        }`}
                        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #18181b 100%)' }}
                      >
                        <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
                        <div className="absolute top-3 right-3">
                          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
                            <Crown size={10} /> Sovereign
                          </span>
                        </div>
                        <div className="relative flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-[8px] bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                            <Server size={19} className="text-amber-300" />
                          </div>
                          <div className="flex-1 min-w-0 pr-14">
                            <h3 className="text-[14px] font-bold text-white font-['Space_Grotesk']">Self-Hosted Sovereign</h3>
                            <p className="text-[12px] text-white/60 mt-1 leading-snug">
                              Your servers. Your keys. Your data never leaves your walls. The ultimate tier for organizations where data <span className="text-amber-300/90 font-medium">is</span> the business.
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                              {[
                                { icon: Lock, t: 'Air-gapped / VPC deploy' },
                                { icon: KeyRound, t: 'Customer-held encryption keys' },
                                { icon: Shield, t: 'Full data residency control' },
                              ].map((f) => (
                                <span key={f.t} className="flex items-center gap-1 text-[11px] text-white/50"><f.icon size={11} className="text-amber-300/80" /> {f.t}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                              <span className="text-[11px] font-semibold text-amber-300 font-['Space_Grotesk']">Custom pricing</span>
                              <span className="text-[11px] text-white/40">·</span>
                              <span className="text-[11px] text-white/50">White-glove onboarding & dedicated SLA</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      <p className="text-[11px] text-[#a3a3a3] text-center leading-relaxed">
                        Not sure? Start on Managed Cloud — you can migrate to a sovereign self-hosted instance at any time without losing a single memory.
                      </p>
                    </div>
                  )}

                  {/* Step 3: Enterprise details */}
                  {onboardingStep === 3 && accountType === 'enterprise' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-2">
                          <span className="text-[#a3a3a3]">〉</span> ENTERPRISE SETUP <span className="text-[#d4d0ca]">· 03</span>
                        </div>
                        <h2 className="text-[20px] font-medium text-[#0a0a0a] font-['Space_Grotesk'] tracking-tight">Set up your Enterprise HIVEMIND</h2>
                        {hostingChoice === 'self_hosted' ? (
                          <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Crown size={11} /> Self-Hosted Sovereign · our team will reach out to provision
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#117dff] bg-[#117dff]/[0.06] border border-[#117dff]/20 px-2 py-0.5 rounded-full">
                            <Cloud size={11} /> Managed Cloud · EU-sovereign (Frankfurt)
                          </span>
                        )}
                      </div>
                      {enterpriseInvitation && (
                        <div className="rounded-[8px] border border-[#117dff]/25 bg-[#117dff]/[0.05] px-4 py-3">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#117dff]">Enterprise invitation applied</p>
                          <p className="mt-1 text-[13px] font-medium text-[#0a0a0a]">{enterpriseInvitation.company_name} · {enterpriseInvitation.hosting_mode === 'self_host' ? 'Self-hosted infrastructure' : 'Managed infrastructure'}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#3b6da3]">Your secure invitation has already selected this setup. Complete the details below to create your company AI Operating System.</p>
                        </div>
                      )}
                      <div>
                        <label className={LABEL_CLS}>Admin name</label>
                        <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Amar" className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Enterprise name</label>
                        <input value={enterpriseName} onChange={e => setEnterpriseName(e.target.value)} placeholder="DaVinci AI" className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Your Enterprise HIVEMIND</label>
                        <input value={hivemindName} onChange={e => setHivemindName(e.target.value)} placeholder={`${(enterpriseName || 'company').toLowerCase().replace(/\s+/g, '')}_hivemind`} className={INPUT_CLS} />
                      </div>
                      {!enterpriseInvitation && <div>
                        <label className={LABEL_CLS}>Enterprise access code</label>
                        <input
                          value={enterpriseAccessCode}
                          onChange={e => setEnterpriseAccessCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                          placeholder="Provided in your onboarding invitation"
                          maxLength={64}
                          autoComplete="off"
                          className={`${INPUT_CLS} font-mono uppercase`}
                        />
                        <p className="text-[11px] text-[#a3a3a3] mt-1">Use the one-time recovery code in your enterprise invitation.</p>
                      </div>}
                      {hostingChoice === 'self_hosted' ? (
                        <div className="rounded-[8px] p-4 border border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                          <p className="text-[13px] text-amber-800 font-semibold flex items-center gap-1.5"><Crown size={14} className="text-amber-500" /> Sovereign deployment — concierge setup</p>
                          <p className="text-[11px] text-amber-600/90 mt-1">Reserve your workspace now. Our solutions team contacts you within one business day to provision your private instance, encryption keys and SLA.</p>
                        </div>
                      ) : (
                        <div className="bg-[#117dff]/[0.04] border border-[#117dff]/15 rounded-[8px] p-4">
                          <p className="text-[13px] text-[#0a5fcc] font-medium">Your invitation configuration is applied server-side</p>
                          <p className="text-[11px] text-[#3b6da3] mt-1">HIVEMIND becomes your company AI Operating System: an AI workforce working from your company brain, with your approved onboarding access applied after sign-in.</p>
                        </div>
                      )}
                      <button
                        onClick={() => handleCreateAccount('google')}
                        disabled={loadingEnterpriseInvitation || !userName.trim() || !enterpriseName.trim() || !enterpriseAdmissionReady}
                        className="w-full h-12 rounded-[6px] bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-40 text-white font-semibold text-[12px] font-['Space_Grotesk'] uppercase tracking-[0.08em] transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                      >
                        <span className="w-5 h-5 rounded-[4px] bg-white flex items-center justify-center"><GoogleIcon size={12} /></span>
                        Continue with Google
                      </button>
                      <div className="flex items-center gap-2">
                        <ComingSoonProvider label="Microsoft">
                          <MicrosoftIcon size={14} /><span className="text-[12px] font-medium">Microsoft</span>
                        </ComingSoonProvider>
                        <ComingSoonProvider label="Apple">
                          <AppleIcon size={15} /><span className="text-[12px] font-medium">Apple</span>
                        </ComingSoonProvider>
                      </div>
                      <button
                        type="button"
                        disabled
                        aria-label="Enterprise SSO — coming soon"
                        className="w-full h-10 rounded-[6px] bg-[#faf9f4] text-[#737373] font-medium text-[12px] font-['Space_Grotesk'] cursor-not-allowed border border-[#e3e0db] flex items-center justify-center gap-2"
                      >
                        <Shield size={13} className="text-[#a3a3a3]" /> Enterprise SSO (EU Sovereign) · <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#a3a3a3]">Coming soon</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>

          {/* Right pane — artwork until a personal plan is selected, then a
              useful plan summary in the same half of the onboarding card. */}
          <div className={`hidden md:flex bg-[#f8f7f2] overflow-hidden relative flex-col ${showOnboarding ? 'h-full md:w-1/2' : 'md:w-[448px]'}`}>
            {showOnboarding && accountType === 'personal' && onboardingStep === 2 ? (() => {
              const plan = PERSONAL_PLANS.find((candidate) => candidate.id === selectedPlan);
              if (!plan) {
                return (
                  <div className="flex h-full flex-col justify-between p-10 lg:p-14 xl:p-16">
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#117dff]">HIVEMIND PRODUCT LAYERS</p>
                      <h3 className="mt-4 max-w-md text-[38px] font-semibold leading-[1.04] tracking-tight text-[#0a0a0a] font-['Space_Grotesk']">Choose the way your Brain grows.</h3>
                      <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#525252]">Every plan begins with your memory. Add governed work and voice only when they belong in your workflow.</p>
                    </div>

                    <div className="my-10 space-y-3">
                      {[
                        { icon: Brain, title: 'BRAIN', body: 'Grounded memory that remains yours.' },
                        { icon: Workflow, title: 'OPERATING SYSTEM', body: 'Approved agents that carry work forward.' },
                        { icon: Mic2, title: 'VOICE', body: 'TARA for conversations that become memory.' },
                      ].map(({ icon: Icon, title, body }, index) => (
                        <div key={title} className="flex items-center gap-4 rounded-[10px] border border-[#e3e0db] bg-white px-4 py-4">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-[#117dff]/[0.07] text-[#117dff]"><Icon size={17} /></span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono font-bold tracking-[0.15em] text-[#0a0a0a]">0{index + 1} · {title}</p>
                            <p className="mt-1 text-[12px] text-[#737373]">{body}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[#e3e0db] pt-5">
                      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#a3a3a3]">Select a plan to preview your access</p>
                      <p className="mt-2 max-w-md text-[11px] leading-relaxed text-[#737373]">You can change plans later. Your Brain is never metered per recall.</p>
                    </div>
                  </div>
                );
              }
              const layers = [
                { label: 'BRAIN', enabled: true, icon: Brain },
                { label: 'OPERATING SYSTEM', enabled: ['free', 'pro', 'scale'].includes(plan.id), icon: Workflow },
                { label: 'VOICE', enabled: ['free', 'scale'].includes(plan.id), icon: Mic2 },
              ];
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex h-full flex-col p-10 lg:p-14 xl:p-16"
                >
                  <div className="flex items-center justify-between border-b border-[#e3e0db] pb-5">
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#117dff]">{plan.eyebrow}</p>
                      <h3 className="mt-2 text-[32px] font-semibold tracking-tight text-[#0a0a0a] font-['Space_Grotesk']">{plan.name}</h3>
                    </div>
                    <p className="text-right text-[28px] font-semibold text-[#0a0a0a]">{plan.price}<span className="text-[11px] font-normal text-[#737373]">{plan.cadence}</span></p>
                  </div>
                  <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#525252]">{plan.summary}</p>
                  <div className="mt-6 grid grid-cols-3 gap-2">
                    {layers.map(({ label, enabled, icon: Icon }) => (
                      <div key={label} className={`rounded-[8px] border px-3 py-3 ${enabled ? 'border-[#117dff]/25 bg-white text-[#0a0a0a]' : 'border-[#e3e0db] bg-[#f3f1ec] text-[#b0ada7]'}`}>
                        <Icon size={15} className={enabled ? 'text-[#117dff]' : 'text-[#c8c5bf]'} />
                        <p className="mt-2 text-[8px] font-mono font-bold tracking-[0.12em]">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-7 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5 text-[13px] text-[#525252]">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#117dff]/10 text-[#117dff]"><Check size={10} strokeWidth={3} /></span>
                        {feature}
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto border-t border-[#e3e0db] pt-5">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#a3a3a3]">{plan.capacity}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-[#737373]">Your Brain remains yours. Upgrades expand capacity and product access; they never turn recall into a pay-per-query meter.</p>
                  </div>
                </motion.div>
              );
            })() : (
              <>
                {loadArtwork && (
                  <img
                    src="/images/hivemind-login-art.webp"
                    alt="HIVEMIND memory system"
                    decoding="async"
                    className="h-full w-full object-cover object-top block"
                  />
                )}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <span className="px-2.5 py-1 rounded-[4px] bg-black/35 backdrop-blur-sm text-white/85 text-[9px] font-mono uppercase tracking-[0.26em]">
                    memory · running inside everything
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Feature pills — benchmark-style mono footer */}
        <div className={`${showOnboarding ? 'hidden' : 'flex'} items-center justify-center gap-5 mt-5`}>
          {[
            { icon: Brain, label: 'Persistent Memory' },
            { icon: Zap, label: '<50ms Recall' },
            { icon: Shield, label: 'EU Sovereign' },
          ].map((feat) => (
            <div key={feat.label} className="flex items-center gap-1.5 text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider">
              <feat.icon size={11} className="text-[#117dff]/60" />
              <span>{feat.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
