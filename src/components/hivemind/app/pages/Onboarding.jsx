import React, { useMemo, useState } from 'react';
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
  const [mode, setMode] = useState('personal');
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [deployment, setDeployment] = useState('managed'); // 'managed' (we host) | 'selfhost' (their box)
  const [showSelfHost, setShowSelfHost] = useState(false);

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

  if (showSelfHost) return <SelfHostSetup onDone={() => { window.location.href = '/app'; }} />;

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

          <h2 className="text-[#0a0a0a] text-3xl font-bold font-['Space_Grotesk'] mb-2">
            {t('onboarding.chooseWorkspace', 'Choose your workspace')}
          </h2>
          <p className="text-[#525252] text-sm mb-8 max-w-2xl">
            {t('onboarding.welcomeMsg', 'Welcome, {{name}}. Start with a private workspace or create an enterprise org for shared memory and team connectors.', { name: user?.display_name || user?.email || t('onboarding.there', 'there') })}
          </p>

          <div className="grid gap-4 md:grid-cols-2 mb-8">
            {Object.entries(ORG_MODES).map(([key, option]) => {
              const Icon = option.icon;
              const active = key === mode;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`text-left rounded-2xl border p-5 transition-all ${
                    active
                      ? 'border-[#117dff] bg-[#117dff]/[0.04] shadow-[0_8px_30px_rgba(17,125,255,0.08)]'
                      : 'border-[#e3e0db] hover:border-[#cfdaf0] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
                      <Icon size={20} className="text-[#117dff]" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#a3a3a3]">
                      {option.plan}
                    </span>
                  </div>
                  <h3 className="text-[#0a0a0a] text-lg font-semibold font-['Space_Grotesk'] mb-2">
                    {t(option.titleKey, option.titleDefault)}
                  </h3>
                  <p className="text-[#525252] text-sm leading-relaxed">
                    {t(option.descriptionKey, option.descriptionDefault)}
                  </p>
                </button>
              );
            })}
          </div>

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

            <div className="md:col-span-2 flex items-center justify-between gap-4 border border-[#ece8de] rounded-2xl px-4 py-4 bg-[#fcfbf7]">
              <div>
                <p className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk']">
                  {t(selectedMode.titleKey, selectedMode.titleDefault)} {t('onboarding.workspace', 'workspace')}
                </p>
                <p className="text-[#525252] text-sm">
                  {mode === 'enterprise'
                    ? t('onboarding.enterpriseSummary', 'Creates an enterprise org with a shareable slug and team-ready memory model.')
                    : t('onboarding.personalSummary', 'Creates a private org on the free plan so you can start immediately.')}
                </p>
              </div>

              {/* Deployment: we host (managed) vs run it on your own server (self-host) */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'managed', icon: Cloud, label: t('onboarding.managed', 'Managed'), desc: t('onboarding.managedDesc', 'We host it') },
                  { id: 'selfhost', icon: Server, label: t('onboarding.selfhost', 'Self-host'), desc: t('onboarding.selfhostDesc', 'Your server') },
                ].map(({ id, icon: Icon, label, desc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDeployment(id)}
                    className={`text-left rounded-xl border px-3 py-2.5 transition ${deployment === id ? 'border-[#117dff] bg-[#117dff]/[0.05]' : 'border-[#e3e0db] hover:border-[#c9c5bd]'}`}
                  >
                    <Icon size={16} className={deployment === id ? 'text-[#117dff]' : 'text-[#737373]'} />
                    <div className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mt-1">{label}</div>
                    <div className="text-[11px] text-[#737373]">{desc}</div>
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!orgName.trim() || creating || (mode === 'enterprise' && !effectiveSlug)}
                className="min-w-[220px] flex items-center justify-center gap-2 bg-[#117dff] hover:bg-[#0e6fe0] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-[8px] transition-all text-sm font-['Space_Grotesk'] group uppercase tracking-[0.075em]"
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
        </div>
      </motion.div>
    </div>
  );
}
