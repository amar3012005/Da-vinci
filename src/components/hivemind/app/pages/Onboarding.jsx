import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Hexagon, Lock, Users, Cloud, Server } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useTranslation } from 'react-i18next';
import SelfHostSetup from './SelfHostSetup';

const ORG_MODES = {
  personal: {
    titleKey: 'onboarding.modePersonalTitle',
    titleDefault: 'Personal',
    descriptionKey: 'onboarding.modePersonalDesc',
    descriptionDefault: 'Start with a private workspace for your own memories, connectors, and experiments.',
    icon: Lock,
    plan: 'free',
  },
  enterprise: {
    titleKey: 'onboarding.modeEnterpriseTitle',
    titleDefault: 'Enterprise',
    descriptionKey: 'onboarding.modeEnterpriseDesc',
    descriptionDefault: 'Set up a shared workspace with an org slug, member invites, and team-level memory.',
    icon: Users,
    plan: 'enterprise',
  },
};

function deriveSlug(name) {
  return `${name || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export default function OnboardingFlow() {
  const { t } = useTranslation('dashboard');
  const { user, createOrg } = useAuth();
  // Two-step flow for users who signed in WITHOUT the login-page create-account
  // path (e.g. plain "Continue with Google" as a brand-new user): step 1 asks
  // "How will you use HIVEMIND?" exactly like the login page, step 2 collects
  // the details. Kills the confusing bare org-form landing.
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('personal');
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [deployment, setDeployment] = useState('managed'); // 'managed' (we host) | 'selfhost' (their box)
  const [showSelfHost, setShowSelfHost] = useState(false);
  // The hosting + workspace choice was already made ONCE on the login page (saved to localStorage before
  // OAuth). Consume it here and create the org silently — never re-ask. Only show the form below as a
  // fallback when there's no saved choice (e.g. a direct visit to onboarding).
  const [autoCreating, setAutoCreating] = useState(() => {
    try { return !!localStorage.getItem('hivemind_onboarding'); } catch { return false; }
  });
  const autoRan = useRef(false);

  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('hivemind_onboarding') || 'null'); } catch { /* ignore */ }
    if (!saved) { setAutoCreating(false); return; }
    const isEnt = saved.type === 'enterprise';
    const name = isEnt
      ? (saved.enterprise || saved.hivemind_name || 'My Organization')
      : (saved.name ? `${saved.name}'s Workspace` : (saved.hivemind_name || 'My Workspace'));
    const dep = saved.deployment === 'selfhost' || saved.deployment === 'self_hosted' ? 'selfhost' : 'managed';
    (async () => {
      try {
        await createOrg({
          name,
          slug: isEnt ? deriveSlug(saved.hivemind_name || name) : undefined,
          plan: isEnt ? 'enterprise' : 'free',
          deployment: dep,
        });
        try { localStorage.removeItem('hivemind_onboarding'); } catch { /* ignore */ }
        if (dep === 'selfhost') { setShowSelfHost(true); setAutoCreating(false); return; }
        window.location.href = '/hivemind/app/overview'; // managed → straight to the dashboard (no re-ask)
      } catch (err) {
        // Creation failed → drop to the manual form so the user can retry / adjust.
        try { localStorage.removeItem('hivemind_onboarding'); } catch { /* ignore */ }
        setError(err?.response?.data?.error || err?.message || 'Could not create your workspace — please choose below.');
        setMode(isEnt ? 'enterprise' : 'personal');
        setDeployment(dep);
        setOrgName(name);
        setStep(2); // choice already made on the login page — go straight to details
        setAutoCreating(false);
      }
    })();
  }, [createOrg]);

  const selectedMode = ORG_MODES[mode];
  const derivedSlug = useMemo(() => deriveSlug(orgName), [orgName]);
  const effectiveSlug = mode === 'enterprise' ? deriveSlug(slug || derivedSlug) : '';

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    if (mode === 'enterprise' && !effectiveSlug) return;

    setCreating(true);
    setError(null);
    try {
      await createOrg({
        name: orgName.trim(),
        slug: mode === 'enterprise' ? effectiveSlug : undefined,
        plan: selectedMode.plan,
        deployment, // 'managed' | 'selfhost'
      });
      // Self-host → show the 2-step setup (clone+run, mint key) instead of going straight to dashboard.
      if (deployment === 'selfhost') { setShowSelfHost(true); return; }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  if (showSelfHost) return <SelfHostSetup onDone={() => { window.location.href = '/hivemind/app/overview'; }} />;

  // Auto-creating from the login-page choice — no second prompt.
  if (autoCreating) {
    return (
      <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-[#525252]">
          <div className="w-5 h-5 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-['Space_Grotesk']">{t('onboarding.settingUp', 'Setting up your workspace…')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center px-4 py-10">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full bg-[#117dff]/[0.03] blur-[110px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-3xl"
      >
        <div className="bg-white border border-[#e3e0db] rounded-3xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
              <Hexagon size={22} className="text-[#117dff]" />
            </div>
            <span className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">HIVEMIND</span>
          </div>

          {step === 1 && (
            <>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-2">
                <span className="text-[#a3a3a3]">〉</span> {t('onboarding.newWorkspaceTag', 'NEW WORKSPACE')} <span className="text-[#d4d0ca]">· 01</span>
              </div>
              <h2 className="text-[#0a0a0a] text-[28px] font-medium font-['Space_Grotesk'] tracking-tight mb-2">
                {t('onboarding.howWillYouUse', 'How will you use HIVEMIND?')}
              </h2>
              <p className="text-[#737373] text-sm mb-8 max-w-2xl">
                {t('onboarding.welcomeMsg2', 'Welcome, {{name}}. Choose the workspace that fits you — you can grow into Enterprise anytime.', { name: user?.display_name || user?.email || t('onboarding.there', 'there') })}
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(ORG_MODES).map(([key, option]) => {
                  const Icon = option.icon;
                  const features = key === 'enterprise'
                    ? ['Teams, projects & SSO', 'Cloud or self-hosted', 'EU data sovereignty']
                    : ['Unified personal memory', 'Connect Gmail, Slack, Notion…', 'Free to start'];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setMode(key); setStep(2); }}
                      className="text-left rounded-[10px] border border-[#e3e0db] hover:border-[#117dff] hover:shadow-sm bg-white p-5 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-[8px] bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
                          <Icon size={20} className="text-[#117dff]" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#a3a3a3]">{option.plan}</span>
                      </div>
                      <h3 className="text-[#0a0a0a] text-lg font-semibold font-['Space_Grotesk'] mb-1.5">
                        {t(option.titleKey, option.titleDefault)}
                      </h3>
                      <p className="text-[#525252] text-[13px] leading-relaxed">
                        {t(option.descriptionKey, option.descriptionDefault)}
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-[11px] text-[#737373]">
                            <span className="w-1 h-1 rounded-full bg-[#117dff] shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#117dff] font-['Space_Grotesk'] uppercase tracking-[0.08em]">
                        {t('onboarding.choose', 'Choose')} <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="flex items-center gap-1.5 text-[#737373] hover:text-[#0a0a0a] text-[12px] font-['Space_Grotesk'] mb-4 transition-colors"
              >
                ← {t('onboarding.back', 'Back')}
              </button>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-2">
                <span className="text-[#a3a3a3]">〉</span> {mode === 'enterprise' ? t('onboarding.enterpriseTag', 'ENTERPRISE SETUP') : t('onboarding.secondBrainTag', 'SECOND BRAIN')} <span className="text-[#d4d0ca]">· 02</span>
              </div>
              <h2 className="text-[#0a0a0a] text-[24px] font-medium font-['Space_Grotesk'] tracking-tight mb-6">
                {mode === 'enterprise'
                  ? t('onboarding.setupEnterprise', 'Set up your Enterprise HIVEMIND')
                  : t('onboarding.setupPersonal', 'Set up your Second Brain')}
              </h2>

          <form onSubmit={handleCreate} className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <label className="block text-[#525252] text-xs font-mono mb-2 uppercase tracking-wider">
                {t('onboarding.workspaceName', 'Workspace Name')}
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder={mode === 'enterprise' ? t('onboarding.placeholderEnterprise', 'e.g. Acme Research') : t('onboarding.placeholderPersonal', 'e.g. Amar Workspace')}
                  className="w-full bg-transparent border border-[#e3e0db] rounded-[8px] py-3 pl-10 pr-4 text-[#0a0a0a] text-sm font-['Space_Grotesk'] placeholder:text-[#d4d0ca] focus:outline-none focus:border-[#117dff]/40 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-[#525252] text-xs font-mono mb-2 uppercase tracking-wider">
                {t('onboarding.orgSlug', 'Org Slug')}
              </label>
              <input
                type="text"
                value={mode === 'enterprise' ? slug : derivedSlug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={mode === 'enterprise' ? t('onboarding.placeholderSlugEnterprise', 'e.g. acme-research') : t('onboarding.placeholderSlugAuto', 'Auto-generated')}
                disabled={mode !== 'enterprise'}
                className="w-full bg-transparent border border-[#e3e0db] rounded-[8px] py-3 px-4 text-[#0a0a0a] text-sm font-mono placeholder:text-[#d4d0ca] focus:outline-none focus:border-[#117dff]/40 transition-colors disabled:bg-[#f7f5ef] disabled:text-[#a3a3a3]"
              />
              <p className="text-[#a3a3a3] text-[11px] font-mono mt-2">
                {mode === 'enterprise'
                  ? t('onboarding.joinUrlHint', 'Join URL will use /join/{{slug}}/...', { slug: effectiveSlug || 'your-org' })
                  : t('onboarding.personalSlugHint', 'Personal workspaces use the free plan and do not require a custom join slug.')}
              </p>
            </div>

            {/* Deployment: we host (managed) vs run it on your own server (self-host) — full-width row */}
            <div className="md:col-span-2">
              <p className="text-[11px] font-medium text-[#737373] uppercase tracking-[0.08em] font-mono mb-2">
                {t('onboarding.deployment', 'Deployment')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'managed', icon: Cloud, label: t('onboarding.managed', 'Managed'), desc: t('onboarding.managedDesc', 'We host it on Singulance cloud.') },
                  { id: 'selfhost', icon: Server, label: t('onboarding.selfhost', 'Self-host'), desc: t('onboarding.selfhostDesc', 'Runs on your server — your data stays on your box.') },
                ].map(({ id, icon: Icon, label, desc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDeployment(id)}
                    className={`flex items-start gap-3 text-left rounded-xl border px-4 py-3.5 transition ${deployment === id ? 'border-[#117dff] bg-[#117dff]/[0.05]' : 'border-[#e3e0db] hover:border-[#c9c5bd]'}`}
                  >
                    <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${deployment === id ? 'bg-[#117dff]/10' : 'bg-[#f3f1ec]'}`}>
                      <Icon size={17} className={deployment === id ? 'text-[#117dff]' : 'text-[#737373]'} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{label}</span>
                      <span className="block text-[12px] leading-snug text-[#737373] mt-0.5">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary + create */}
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-[#ece8de] rounded-2xl px-4 py-4 bg-[#fcfbf7]">
              <div className="min-w-0">
                <p className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk']">
                  {t(selectedMode.titleKey, selectedMode.titleDefault)} {t('onboarding.workspace', 'workspace')}
                  {deployment === 'selfhost' && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#117dff] bg-[#117dff]/8 border border-[#117dff]/20 rounded-full px-2 py-0.5 align-middle">
                      <Server size={11} /> {t('onboarding.selfhost', 'Self-host')}
                    </span>
                  )}
                </p>
                <p className="text-[#525252] text-sm">
                  {deployment === 'selfhost'
                    ? t('onboarding.selfhostNext', 'Next: mint a key and run one command on your server.')
                    : mode === 'enterprise'
                    ? t('onboarding.enterpriseSummary', 'Creates an enterprise org with a shareable slug and team-ready memory model.')
                    : t('onboarding.personalSummary', 'Creates a private org on the free plan so you can start immediately.')}
                </p>
              </div>

              <button
                type="submit"
                disabled={!orgName.trim() || creating || (mode === 'enterprise' && !effectiveSlug)}
                className="shrink-0 min-w-[220px] flex items-center justify-center gap-2 bg-[#117dff] hover:bg-[#0e6fe0] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-[8px] transition-all text-sm font-['Space_Grotesk'] group uppercase tracking-[0.075em]"
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {t('onboarding.createBtn', 'Create {{mode}}', { mode: t(selectedMode.titleKey, selectedMode.titleDefault) })}
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="md:col-span-2 text-[#dc2626] text-xs font-mono">
                {error}
              </p>
            )}
          </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
