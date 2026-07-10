import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Check,
  Zap,
  Sparkles,
  ArrowRight,
  Brain,
  Cable,
  Users,
  Shield,
  Clock,
  HardDrive,
  Headphones,
  Mic,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useApiQuery } from '../shared/hooks';
import apiClient from '../shared/api-client';

// ─── Plan Definitions ────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: '/month',
    description: 'Try HIVEMIND with real documents. 100 pages/month, 1 user seat.',
    accent: false,
    features: [
      // Usage limits
      { label: '100 pages/month', icon: HardDrive },
      { label: '1,000 memories', icon: HardDrive },
      { label: '1M LLM tokens/month', icon: Brain },
      { label: '3 Deep Research/month', icon: Zap },
      { label: '5 Web Intel/day', icon: Sparkles },
      { label: '3 connectors', icon: Cable },
      { label: '1 user', icon: Users },
      // All-plan features
      { label: 'Memory Graph', icon: Check },
      { label: 'MCP Protocol', icon: Check },
      { label: 'Agent Swarm (CSI)', icon: Check },
      { label: 'Web Intelligence', icon: Check },
      { label: 'Deep Research', icon: Check },
      { label: 'Talk to HIVE', icon: Check },
      { label: 'TARA Voice Agent', icon: Check },
      { label: 'LLM Observer', icon: Check },
      // Support
      { label: 'Community support', icon: Headphones },
    ],
    limits: {
      tokens: 1_000_000,
      memories: 1_000,
      connections: 3,
      deepResearch: 3,
      webIntel: 5,
      searches: 10_000,
      users: 1,
      kbPages: 100,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€79',
    period: '/month',
    description: 'Teams building on institutional memory. 1,000 pages/month, 5 seats.',
    accent: true,
    popular: true,
    features: [
      // Usage limits
      { label: '1,000 pages/month', icon: HardDrive },
      { label: '25,000 memories', icon: HardDrive },
      { label: '10M LLM tokens/month', icon: Brain },
      { label: '20 Deep Research/month', icon: Zap },
      { label: '50 Web Intel/day', icon: Sparkles },
      { label: '10 connectors', icon: Cable },
      { label: '5 users', icon: Users },
      // All-plan features
      { label: 'Memory Graph', icon: Check },
      { label: 'MCP Protocol', icon: Check },
      { label: 'Agent Swarm (CSI)', icon: Check },
      { label: 'Web Intelligence', icon: Check },
      { label: 'Deep Research', icon: Check },
      { label: 'Talk to HIVE', icon: Check },
      { label: 'TARA Voice Agent', icon: Check },
      { label: 'LLM Observer', icon: Check },
      // Support
      { label: 'Email support (48h)', icon: Headphones },
      { label: '99.5% SLA', icon: Clock },
    ],
    limits: {
      tokens: 10_000_000,
      memories: 25_000,
      connections: 10,
      deepResearch: 20,
      webIntel: 50,
      searches: 100_000,
      users: 5,
      kbPages: 1_000,
    },
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '€239',
    period: '/month',
    description: 'Mid-size regulated organisations. 10,000 pages/month, 25 seats.',
    accent: false,
    features: [
      // Usage limits
      { label: '10,000 pages/month', icon: HardDrive },
      { label: '250,000 memories', icon: HardDrive },
      { label: '100M LLM tokens/month', icon: Brain },
      { label: 'Unlimited Deep Research', icon: Zap },
      { label: '500 Web Intel/day', icon: Sparkles },
      { label: 'Unlimited connectors', icon: Cable },
      { label: '25 users', icon: Users },
      // All-plan features
      { label: 'Memory Graph', icon: Check },
      { label: 'MCP Protocol', icon: Check },
      { label: 'Agent Swarm (CSI)', icon: Check },
      { label: 'Web Intelligence', icon: Check },
      { label: 'Deep Research', icon: Check },
      { label: 'Talk to HIVE', icon: Check },
      { label: 'TARA Voice Agent', icon: Check },
      { label: 'LLM Observer', icon: Check },
      // Scale+ gated features
      { label: 'SSO / SAML', icon: Shield },
      { label: 'Webhooks', icon: Cable },
      { label: 'Audit Logs', icon: Clock },
      { label: 'Team Workspaces', icon: Users },
      { label: 'DPA Compliance', icon: Shield },
      // Support
      { label: 'Priority support (24h)', icon: Headphones },
      { label: '99.9% SLA', icon: Clock },
    ],
    limits: {
      tokens: 100_000_000,
      memories: 250_000,
      connections: null,
      deepResearch: null,
      webIntel: 500,
      searches: 2_000_000,
      users: 25,
      kbPages: 10_000,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Custom. Unlimited everything + compliance + dedicated support.',
    accent: false,
    features: [
      // Usage limits
      { label: 'Unlimited pages', icon: HardDrive },
      { label: 'Unlimited memories', icon: HardDrive },
      { label: 'Unlimited LLM tokens', icon: Brain },
      { label: 'Unlimited Deep Research', icon: Zap },
      { label: 'Unlimited Web Intel', icon: Sparkles },
      { label: 'Unlimited connectors', icon: Cable },
      { label: 'Unlimited users', icon: Users },
      // All-plan features
      { label: 'Memory Graph', icon: Check },
      { label: 'MCP Protocol', icon: Check },
      { label: 'Agent Swarm (CSI)', icon: Check },
      { label: 'Web Intelligence', icon: Check },
      { label: 'Deep Research', icon: Check },
      { label: 'Talk to HIVE', icon: Check },
      { label: 'TARA Voice Agent', icon: Check },
      { label: 'LLM Observer', icon: Check },
      // Scale+ gated features
      { label: 'SSO / SAML', icon: Shield },
      { label: 'Webhooks', icon: Cable },
      { label: 'Audit Logs', icon: Clock },
      { label: 'Team Workspaces', icon: Users },
      { label: 'DPA Compliance', icon: Shield },
      // Enterprise-only features
      { label: 'HYOK Encryption', icon: Shield },
      { label: 'Dedicated Infra', icon: HardDrive },
      { label: 'Custom SLA', icon: Clock },
      // Support
      { label: 'Dedicated CSM', icon: Headphones },
    ],
    limits: {
      tokens: null,
      memories: null,
      connections: null,
      deepResearch: null,
      webIntel: null,
      searches: null,
      users: null,
      kbPages: null,
    },
  },
];

function planFromBackend(raw) {
  const fallback = PLANS.find((plan) => plan.id === raw?.id) || {};
  const limits = raw?.limits || {};
  return {
    ...fallback,
    ...raw,
    price: raw?.price == null ? 'Custom' : `€${raw.price}`,
    period: raw?.price == null ? '' : '/month',
    features: fallback.features || [],
    limits: {
      tokens: limits.llmTokensPerMonth ?? null,
      tokensDaily: limits.llmTokensPerDay ?? null,
      memories: limits.maxMemories ?? null,
      connections: limits.maxConnectors ?? null,
      deepResearch: limits.deepResearchPerMonth ?? null,
      deepResearchDaily: limits.deepResearchPerDay ?? null,
      webIntel: limits.webIntelPerDay ?? null,
      searches: limits.searchQueriesPerMonth ?? null,
      searchesDaily: limits.searchQueriesPerDay ?? null,
      users: limits.maxUsers ?? null,
      kbPages: limits.knowledgeBasePagesPerMonth ?? null,
      kbPagesDaily: limits.knowledgeBasePagesPerDay ?? null,
      taraSeconds: limits.taraTalkSecondsPerMonth ?? null,
      hyperAgentRuns: limits.hyperAgentRunsPerMonth ?? null,
    },
  };
}

// ─── Usage Meter ─────────────────────────────────────────────────────────────

function UsageMeter({ label, used, limit, icon: Icon }) {
  const { t } = useTranslation('dashboard');
  const isUnlimited = limit == null || limit === -1;
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = pct > 80;

  return (
    <div className="bg-white border border-[#e3e0db] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[#a3a3a3]" />
          <span className="text-[#525252] text-[11px] font-['Space_Grotesk'] uppercase tracking-wider">
            {label}
          </span>
        </div>
        <span className="text-[#0a0a0a] text-sm font-mono font-semibold">
          {used?.toLocaleString() || 0}
          <span className="text-[#d4d0ca]">
            {isUnlimited ? ` / ${t('billing.unlimited', 'Unlimited')}` : ` / ${limit?.toLocaleString()}`}
          </span>
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#e3e0db] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isUnlimited ? '0%' : `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            isNearLimit ? 'bg-amber-400' : 'bg-[#117dff]'
          }`}
        />
      </div>
      {isNearLimit && (
        <p className="text-amber-400/70 text-[10px] font-['Space_Grotesk'] mt-1.5">
          {pct >= 100 ? t('billing.limitReached', 'Limit reached \u2014 upgrade to continue') : t('billing.approachingLimit', 'Approaching limit')}
        </p>
      )}
    </div>
  );
}

// ─── Plan Card ───────────────────────────────────────────────────────────────

function PlanCard({ plan, currentPlan, onSelect }) {
  const { t } = useTranslation('dashboard');
  const isCurrent = currentPlan === plan.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border p-5 flex flex-col transition-all ${
        plan.accent
          ? 'bg-[#117dff]/[0.04] border-[#117dff]/20 shadow-[0_0_30px_rgba(17,125,255,0.06)]'
          : 'bg-white border-[#e3e0db] hover:border-[#d4d0ca] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
      }`}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-semibold font-['Space_Grotesk'] bg-[#117dff] text-white uppercase tracking-wider">
            <Sparkles size={10} />
            {t('billing.mostPopular', 'Most Popular')}
          </span>
        </div>
      )}

      {/* Plan Name */}
      <div className="mb-4">
        <h3 className="text-[#0a0a0a] text-base font-semibold font-['Space_Grotesk'] mb-1">
          {plan.name}
        </h3>
        <p className="text-[#a3a3a3] text-[12px] font-['Space_Grotesk']">
          {plan.description}
        </p>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-5">
        <span className="text-[#0a0a0a] text-3xl font-bold font-mono">
          {plan.price}
        </span>
        {plan.period && (
          <span className="text-[#a3a3a3] text-sm font-['Space_Grotesk']">
            {plan.period}
          </span>
        )}
      </div>

      {/* Features */}
      <div className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <Check size={14} className={plan.accent ? 'text-[#117dff]' : 'text-[#a3a3a3]'} />
            <span className="text-[#525252] text-[12px] font-['Space_Grotesk']">
              {feature.label}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isCurrent ? (
        <div className="text-center py-2.5 rounded-lg bg-[#f3f1ec] border border-[#e3e0db] text-[#525252] text-[12px] font-semibold font-['Space_Grotesk']">
          {t('billing.currentPlan', 'Current Plan')}
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan.id)}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-semibold font-['Space_Grotesk'] transition-all ${
            plan.accent
              ? 'bg-[#117dff] text-white hover:bg-[#0066e0]'
              : 'bg-[#f3f1ec] border border-[#d4d0ca] text-[#0a0a0a] hover:bg-[#eae7e1]'
          }`}
        >
          {t('billing.upgradeTo', 'Upgrade to {{name}}', { name: plan.name })}
          <ArrowRight size={13} />
        </button>
      )}
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Billing() {
  const { t } = useTranslation('dashboard');
  const { org } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [upgradeModal, setUpgradeModal] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [dummyConfirming, setDummyConfirming] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState('');

  const { data: profile } = useApiQuery(
    () => apiClient.getProfile().catch(() => null),
    [],
  );

  const { data: connectors } = useApiQuery(
    () => apiClient.getConnectorStatus().catch(() => null),
    [],
  );

  // Pulls from control-plane /v1/billing/plan — single source of truth for
  // plan + usage + Stripe subscription state.
  const { data: billing, refetch: refetchBilling } = useApiQuery(
    () => apiClient.getBillingPlan().catch(() => null),
    [],
  );
  const { data: usageSummary, refetch: refetchUsage } = useApiQuery(
    () => apiClient.getUsage().catch(() => null),
    [],
  );
  const { data: invoiceList, refetch: refetchInvoices } = useApiQuery(
    () => apiClient.listInvoices().catch(() => null),
    [],
  );

  const usage = usageSummary || billing?.usage_summary || (billing
    ? {
        plan: billing.plan?.id,
        tokens:        { used: billing.usage?.tokensProcessed || 0 },
        memories:      { used: billing.usage?.memoriesIngested || 0 },
        deepResearch:  { used: billing.usage?.deepResearchJobs || 0 },
        webIntel:      { used: billing.usage?.webIntelJobs || 0 },
        searches:      { used: billing.usage?.searchQueries || 0 },
        uploads:       { used: billing.usage?.knowledgeBaseUploads || 0 },
        graphQueries:  { used: billing.usage?.graphQueries || 0 },
      }
    : null);

  const subscription = billing?.subscription || {};
  const currentPlan = billing?.plan?.id || profile?.plan || org?.plan || 'free';
  const isEnterpriseWorkspace = billing?.billing_model === 'enterprise_contract' || currentPlan === 'enterprise';
  const enterpriseEngagement = billing?.enterprise_engagement || null;
  const dummyCheckoutId = searchParams.get('dummy_checkout');
  const checkoutState = searchParams.get('checkout');
  const planOptions = Array.isArray(billing?.all_plans) && billing.all_plans.length
    ? billing.all_plans.map(planFromBackend)
    : PLANS.filter((plan) => plan.id !== 'enterprise');

  const activeConnections = Array.isArray(connectors?.connectors)
    ? connectors.connectors.filter(c => c.status === 'connected' || c.status === 'healthy').length
    : (connectors?.activeCount || 0);

  // Use usage API data if available, fallback to profile data
  const tokensUsed = usage?.tokens?.used ?? profile?.tokens_used ?? 0;
  const memoriesUsed = usage?.memories?.used ?? 0;
  const deepResearchUsed = usage?.deepResearch?.used ?? 0;
  const webIntelUsed = usage?.webIntel?.used ?? 0;
  const searchesUsed = usage?.searches?.used ?? profile?.searches_this_month ?? 0;
  const kbPagesUsed = usage?.kbPages?.used ?? usage?.uploads?.used ?? 0;
  const graphQueriesUsed = usage?.graphQueries?.used ?? 0;
  const taraSecondsUsed = usage?.taraSeconds?.used ?? 0;
  const hyperAgentRunsUsed = usage?.hyperAgentRuns?.used ?? 0;

  const currentPlanDef = billing?.plan
    ? planFromBackend(billing.plan)
    : planOptions.find((p) => p.id === currentPlan);

  useEffect(() => {
    if (checkoutState !== 'success') return undefined;
    let cancelled = false;
    const reconcile = async () => {
      try {
        const result = await apiClient.reconcileBillingCheckout();
        if (cancelled) return;
        await Promise.all([refetchBilling(), refetchUsage(), refetchInvoices()]);
        setCheckoutNotice(result?.reconciled
          ? `Payment confirmed. Your ${String(result.plan || '').toUpperCase()} plan is active.`
          : 'Payment received. Your subscription is still being confirmed.');
      } catch (error) {
        if (!cancelled) setCheckoutNotice('Payment received. Refresh in a moment while we confirm your subscription.');
      } finally {
        if (!cancelled) setSearchParams({}, { replace: true });
      }
    };
    reconcile();
    return () => { cancelled = true; };
  }, [checkoutState, refetchBilling, refetchInvoices, refetchUsage, setSearchParams]);

  const handleUpgrade = async (planId) => {
    if (isEnterpriseWorkspace) return;
    setUpgrading(true);
    try {
      const res = await apiClient.createBillingCheckout(planId, referralCode.trim());
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }
      throw new Error('Self-serve checkout is not available for this plan. Contact support to change plans.');
    } catch (e) {
      console.error('Upgrade failed:', e);
      const msg = e?.response?.data?.error || e.message || 'Upgrade failed.';
      alert(`Upgrade failed: ${msg}`);
    } finally {
      setUpgrading(false);
    }
  };

  const confirmDummyCheckout = async () => {
    setDummyConfirming(true);
    try {
      await apiClient.confirmDummyBillingCheckout(dummyCheckoutId);
      setSearchParams({}, { replace: true });
      await refetchBilling();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Checkout confirmation failed.');
    } finally {
      setDummyConfirming(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await apiClient.createBillingPortal();
      if (res?.portal_url) window.location.href = res.portal_url;
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      alert(`Could not open billing portal: ${msg}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {dummyCheckoutId && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-950">Test payment awaiting confirmation</p>
            <p className="text-xs text-amber-800">This only works for organizations allow-listed by the backend.</p>
          </div>
          <button
            onClick={confirmDummyCheckout}
            disabled={dummyConfirming}
            className="rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {dummyConfirming ? 'Confirming…' : 'Confirm test payment'}
          </button>
        </div>
      )}
      {checkoutNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {checkoutNotice}
        </div>
      )}
      {/* Current Plan Overview */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
              <CreditCard size={18} className="text-[#117dff]" />
            </div>
            <div>
              <h2 className="text-[#0a0a0a] text-base font-semibold font-['Space_Grotesk']">
                {t('billing.currentPlanHeading', 'Current Plan')}
              </h2>
              <p className="text-[#a3a3a3] text-[12px] font-['Space_Grotesk']">
                {org?.name || t('billing.yourWorkspace', 'Your workspace')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">
                  {currentPlanDef?.name}
                </span>
                <span className="text-[10px] font-mono bg-[#f3f1ec] text-[#525252] px-2 py-0.5 rounded uppercase">
                  {currentPlan}
                </span>
              </div>
              {subscription?.status && (
                <div className="mt-1 flex items-center gap-2 justify-end text-[10px] font-['Space_Grotesk']">
                  <span className={`px-1.5 py-0.5 rounded font-mono uppercase ${
                    subscription.status === 'active' || subscription.status === 'trialing'
                      ? 'bg-[#dcfce7] text-[#15803d]'
                      : subscription.status === 'past_due' || subscription.status === 'unpaid'
                      ? 'bg-[#fef2f2] text-[#b91c1c]'
                      : 'bg-[#f3f1ec] text-[#525252]'
                  }`}>
                    {subscription.status}
                  </span>
                  {subscription.current_period_end && (
                    <span className="text-[#a3a3a3]">
                      {t('billing.renews', 'renews {{date}}', { date: new Date(subscription.current_period_end).toLocaleDateString() })}
                    </span>
                  )}
                </div>
              )}
            </div>
            {!isEnterpriseWorkspace && subscription?.stripe_customer_id && (
              <button
                onClick={handleManageSubscription}
                className="px-3 py-1.5 rounded-lg border border-[#e3e0db] bg-white hover:bg-[#f3f1ec] text-[#525252] text-[11px] font-medium font-['Space_Grotesk']"
                title={t('billing.manageSubscriptionTitle', 'Open Stripe Customer Portal')}
              >
                {t('billing.manage', 'Manage')}
              </button>
            )}
          </div>
        </div>

        {/* Usage Meters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <UsageMeter
            label={t('billing.tokensThisMonth', 'Tokens This Month')}
            used={tokensUsed}
            limit={currentPlanDef?.limits.tokens}
            icon={Brain}
          />
          <UsageMeter
            label={t('billing.tokensToday', 'Tokens Today')}
            used={usage?.daily?.tokens?.used || 0}
            limit={usage?.daily?.tokens?.limit}
            icon={Brain}
          />
          <UsageMeter
            label={t('billing.memories', 'Memories')}
            used={memoriesUsed}
            limit={currentPlanDef?.limits.memories}
            icon={HardDrive}
          />
          <UsageMeter
            label={t('billing.deepResearch', 'Deep Research')}
            used={deepResearchUsed}
            limit={currentPlanDef?.limits.deepResearch}
            icon={Zap}
          />
          <UsageMeter
            label={t('billing.webIntelDaily', 'Web Intel (Daily)')}
            used={webIntelUsed}
            limit={currentPlanDef?.limits.webIntel}
            icon={Sparkles}
          />
          <UsageMeter
            label={t('billing.searchesThisMonth', 'Searches This Month')}
            used={searchesUsed}
            limit={currentPlanDef?.limits.searches}
            icon={Zap}
          />
          <UsageMeter
            label={t('billing.kbPages', 'KB Pages This Month')}
            used={kbPagesUsed}
            limit={currentPlanDef?.limits.kbPages}
            icon={HardDrive}
          />
          <UsageMeter
            label={t('billing.graphQueries', 'Graph Queries')}
            used={graphQueriesUsed}
            limit={currentPlanDef?.limits.searches}
            icon={Brain}
          />
          <UsageMeter
            label={t('billing.connections', 'Connections')}
            used={activeConnections}
            limit={currentPlanDef?.limits.connections}
            icon={Cable}
          />
          <UsageMeter
            label="TARA Talk Time (seconds)"
            used={taraSecondsUsed}
            limit={currentPlanDef?.limits.taraSeconds}
            icon={Mic}
          />
          <UsageMeter
            label="HyperAgents Runs"
            used={hyperAgentRunsUsed}
            limit={currentPlanDef?.limits.hyperAgentRuns}
            icon={Zap}
          />
        </div>
      </motion.div>

      {/* Invoices */}
      {invoiceList?.invoices?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#0a0a0a] text-[14px] font-semibold font-['Space_Grotesk']">
              {t('billing.invoices', 'Invoices')}
            </h3>
            <a
              href={apiClient.invoiceCsvUrl()}
              className="text-[#117dff] text-[11px] font-medium font-['Space_Grotesk'] hover:underline"
            >
              {t('billing.downloadCsv', 'Download CSV')}
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-['Space_Grotesk']">
              <thead>
                <tr className="text-left text-[#a3a3a3] border-b border-[#eae7e1]">
                  <th className="py-2 pr-3 font-medium">{t('billing.colInvoice', 'Invoice')}</th>
                  <th className="py-2 pr-3 font-medium">{t('billing.colPeriod', 'Period')}</th>
                  <th className="py-2 pr-3 font-medium">{t('billing.colAmount', 'Amount')}</th>
                  <th className="py-2 pr-3 font-medium">{t('billing.colStatus', 'Status')}</th>
                  <th className="py-2 pr-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invoiceList.invoices.slice(0, 12).map(inv => (
                  <tr key={inv.id} className="border-b border-[#f3f1ec] last:border-0">
                    <td className="py-2 pr-3 font-mono text-[#525252]">{inv.number || inv.id.slice(-8)}</td>
                    <td className="py-2 pr-3 text-[#525252]">
                      {inv.period_start ? new Date(inv.period_start).toLocaleDateString() : '-'} →{' '}
                      {inv.period_end ? new Date(inv.period_end).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-2 pr-3 text-[#0a0a0a]">
                      {(inv.amount_paid / 100).toFixed(2)} {inv.currency}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-1.5 py-0.5 rounded font-mono uppercase text-[10px] ${
                        inv.status === 'paid' ? 'bg-[#dcfce7] text-[#15803d]'
                        : inv.status === 'open' ? 'bg-[#fef3c7] text-[#a16207]'
                        : 'bg-[#f3f1ec] text-[#525252]'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {inv.invoice_pdf && (
                        <a href={inv.invoice_pdf} target="_blank" rel="noreferrer"
                           className="text-[#117dff] text-[11px] hover:underline">PDF</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {isEnterpriseWorkspace ? (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#117dff]/20 bg-[#117dff]/[0.04] p-6"
        >
          <div className="flex items-start gap-3">
            <Shield size={20} className="mt-0.5 text-[#117dff]" />
            <div>
              <h3 className="font-['Space_Grotesk'] text-base font-semibold text-[#0a0a0a]">
                Enterprise {enterpriseEngagement?.phase === 'onboarding' ? 'onboarding' : 'runway'}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#525252] font-['Space_Grotesk']">
                Your {enterpriseEngagement?.hosting_mode === 'self_host' ? 'self-hosted' : 'managed'} enterprise agreement is administered outside self-serve billing. Usage remains visible above; plan, seats, and commercial changes are handled through your account team.
              </p>
              {enterpriseEngagement?.phase === 'onboarding' && enterpriseEngagement?.onboarding_ends_at && (
                <p className="mt-3 text-[12px] font-medium text-[#117dff] font-['Space_Grotesk']">
                  Onboarding access ends {new Date(enterpriseEngagement.onboarding_ends_at).toLocaleDateString()}.
                </p>
              )}
            </div>
          </div>
        </motion.section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {planOptions.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan}
              onSelect={(id) => setUpgradeModal(id)}
            />
          ))}
        </div>
      )}

      {/* FAQ Section */}
      <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] mb-4">
          {t('billing.faqTitle', 'Frequently Asked Questions')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              q: t('billing.faq1q', 'What are tokens?'),
              a: t('billing.faq1a', 'Tokens are units of text processed by HIVEMIND. Every piece of information ingested, stored, or retrieved consumes tokens from your monthly quota.'),
            },
            {
              q: t('billing.faq2q', 'Can I switch plans anytime?'),
              a: t('billing.faq2a', 'Yes. Upgrades take effect immediately. Downgrades apply at the end of your billing cycle.'),
            },
            {
              q: t('billing.faq3q', 'What happens when I hit my limit?'),
              a: t('billing.faq3a', 'New ingestion will be paused until the next billing cycle. Existing data remains accessible. Upgrade or wait for your quota to reset.'),
            },
            {
              q: t('billing.faq4q', 'Do you offer refunds?'),
              a: t('billing.faq4a', 'We offer a 14-day money-back guarantee on all paid plans. No questions asked.'),
            },
          ].map((faq, i) => (
            <div key={i}>
              <p className="text-[#525252] text-[13px] font-semibold font-['Space_Grotesk'] mb-1">
                {faq.q}
              </p>
              <p className="text-[#a3a3a3] text-[12px] font-['Space_Grotesk'] leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {!isEnterpriseWorkspace && upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-[#e3e0db] shadow-2xl p-6 max-w-sm w-full mx-4"
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#117dff]/10 flex items-center justify-center mx-auto mb-3">
                <Zap size={20} className="text-[#117dff]" />
              </div>
              <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk'] mb-1">
                {t('billing.upgradeModalTitle', 'Upgrade to {{name}}', { name: planOptions.find(p => p.id === upgradeModal)?.name })}
              </h3>
              <p className="text-[#525252] text-sm font-['Space_Grotesk']">
                {planOptions.find(p => p.id === upgradeModal)?.price}{planOptions.find(p => p.id === upgradeModal)?.period}
              </p>
            </div>
            <label className="mb-5 block text-left">
              <span className="mb-1.5 block text-xs font-medium text-[#525252]">Referral code (optional)</span>
              <input
                value={referralCode}
                onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                maxLength={64}
                autoComplete="off"
                placeholder="GTM2026"
                className="w-full rounded-lg border border-[#d4d0ca] px-3 py-2 text-sm uppercase outline-none focus:border-[#117dff]"
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setUpgradeModal(null)}
                disabled={upgrading}
                className="flex-1 py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-semibold border border-[#e3e0db] text-[#525252] hover:bg-[#f3f1ec] transition-colors disabled:opacity-50"
              >
                {t('billing.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => handleUpgrade(upgradeModal)}
                disabled={upgrading}
                className="flex-1 py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-semibold bg-[#117dff] text-white hover:bg-[#0066e0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {upgrading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('billing.processing', 'Processing…')}
                  </>
                ) : (
                  t('billing.confirmUpgrade', 'Confirm Upgrade')
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
