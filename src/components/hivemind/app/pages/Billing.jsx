import React, { useEffect, useState } from 'react';
import { isNativeApp } from '../shared/native-app';
import NativePlanSummary from '../shared/NativePlanSummary';
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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import RunwayUpgradePanel from '../components/RunwayUpgradePanel';
import { useApiQuery } from '../shared/hooks';
import apiClient from '../shared/api-client';
import { isEnterpriseBillingWorkspace, orderedPersonalPlans } from '../shared/billing-presentation';

// ─── Plan Definitions ────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: '/month',
    description: 'Build a Brain that remembers your work. 100 pages included.',
    accent: false,
    features: [
      // Usage limits
      { label: '500 monthly credits', icon: Zap },
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
      { label: 'HyperAgents trial access', icon: Check },
      { label: 'Web Intelligence', icon: Check },
      { label: 'Deep Research', icon: Check },
      { label: 'Talk to HIVE', icon: Check },
      { label: 'TARA Voice trial access', icon: Check },
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
    id: 'plus',
    name: 'BRAIN+',
    price: '€39',
    period: '/month',
    description: 'Keep your work history permanently. 1,000 pages included.',
    accent: false,
    features: [
      { label: 'All BRAIN features from Free', icon: Check },
      { label: '1,000 pages/month', icon: HardDrive },
      { label: '10,000 memories', icon: Brain },
      { label: 'Permanent personal history', icon: Check },
      { label: 'More source types and connectors', icon: Cable },
      { label: 'Deeper recall across your own work', icon: Sparkles },
      { label: '2,000 monthly credits', icon: Zap },
      { label: 'Email support', icon: Headphones },
    ],
    limits: {
      tokens: 5_000_000,
      memories: 10_000,
      connections: 10,
      deepResearch: 10,
      webIntel: 20,
      searches: 50_000,
      users: 1,
      kbPages: 1_000,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€79',
    period: '/month',
    description: 'Give your Brain work to carry out with HyperAgents.',
    accent: true,
    popular: true,
    features: [
      // Usage limits
      { label: '5,000 monthly credits', icon: Zap },
      { label: '5,000 pages/month', icon: HardDrive },
      { label: '25,000 memories', icon: HardDrive },
      { label: '10M LLM tokens/month', icon: Brain },
      { label: '20 Deep Research/month', icon: Zap },
      { label: '50 Web Intel/day', icon: Sparkles },
      { label: '10 connectors', icon: Cable },
      { label: '1 user', icon: Users },
      // All-plan features
      { label: 'Memory Graph', icon: Check },
      { label: 'MCP Protocol', icon: Check },
      { label: 'Agent Swarm (CSI)', icon: Check },
      { label: 'Web Intelligence', icon: Check },
      { label: 'Deep Research', icon: Check },
      { label: 'Talk to HIVE', icon: Check },
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
      users: 1,
      kbPages: 5_000,
    },
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '€239',
    period: '/month',
    description: 'Operate with a small AI team. 10,000 pages included for one person.',
    accent: false,
    features: [
      // Usage limits
      { label: '10,000 monthly credits', icon: Zap },
      { label: '10,000 pages/month', icon: HardDrive },
      { label: '250,000 memories', icon: HardDrive },
      { label: '100M LLM tokens/month', icon: Brain },
      { label: 'Unlimited Deep Research', icon: Zap },
      { label: '500 Web Intel/day', icon: Sparkles },
      { label: 'Unlimited connectors', icon: Cable },
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
      users: 1,
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

function CommercialJourney({ billing }) {
  const entitlement = billing?.entitlement;
  const invited = entitlement?.source === 'enterprise_invitation';
  if (!invited) return null;
  const onboarding = entitlement?.phase === 'onboarding' || billing?.plan?.id === 'enterprise_onboarding';
  const endsAt = entitlement?.effective_until
    ? new Date(entitlement.effective_until).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  return (
    <section className="rounded-xl border border-[#bcd5ff] bg-[#f5f9ff] p-5">
      <h2 className="text-sm font-semibold text-[#0a0a0a]">{onboarding ? 'Your invitation access' : 'Your workspace access'}</h2>
      <p className="mt-2 text-sm leading-6 text-[#525252]">{onboarding
        ? `Your invitation includes temporary access${endsAt ? ` through ${endsAt}` : ''}. To continue, configure a paid workspace plan below.`
        : 'Your workspace has moved beyond invitation onboarding. Manage its paid operating plan below.'}</p>
      <p className="mt-2 text-xs text-[#737373]">Invitation access is not a recurring subscription. A paid plan starts only after an owner confirms checkout.</p>
    </section>
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
  const [billingError, setBillingError] = useState('');

  // Pulls from control-plane /v1/billing/plan — single source of truth for
  // Server-authoritative plan, entitlement, and Stripe subscription state.
  const { data: billing, refetch: refetchBilling } = useApiQuery(
    () => apiClient.getBillingPlan().catch(() => null),
    [],
  );
  const { data: invoiceList, refetch: refetchInvoices } = useApiQuery(
    () => apiClient.listInvoices().catch(() => null),
    [],
  );

  const subscription = billing?.subscription || {};
  const currentPlan = billing?.plan?.id || org?.plan || 'free';
  const canManageBilling = Boolean(billing?.can_manage_billing);
  const isEnterpriseWorkspace = isEnterpriseBillingWorkspace({ billing, org, currentPlan });
  const dummyCheckoutId = searchParams.get('dummy_checkout');
  const checkoutState = searchParams.get('checkout');
  const availablePlans = Array.isArray(billing?.all_plans) && billing.all_plans.length
    ? billing.all_plans.map(planFromBackend)
    : PLANS;
  const planOptions = orderedPersonalPlans(availablePlans);

  useEffect(() => {
    if (isNativeApp()) return;
    const requested = String(searchParams.get('upgrade') || '').toLowerCase();
    if (!['plus', 'pro', 'scale'].includes(requested)) return;
    if (!billing) return;
    if (canManageBilling && !isEnterpriseWorkspace && requested !== currentPlan) setUpgradeModal(requested);
    else if (!canManageBilling) setBillingError('Only an organization owner or admin can change the subscription.');
    const next = new URLSearchParams(searchParams);
    next.delete('upgrade');
    setSearchParams(next, { replace: true });
  }, [billing, canManageBilling, currentPlan, isEnterpriseWorkspace, searchParams, setSearchParams]);

  const currentPlanDef = billing?.plan
    ? planFromBackend(billing.plan)
    : planOptions.find((p) => p.id === currentPlan);

  useEffect(() => {
    if (isNativeApp() || checkoutState !== 'success') return undefined;
    let cancelled = false;
    const reconcile = async () => {
      try {
        const result = await apiClient.reconcileBillingCheckout();
        if (cancelled) return;
        await Promise.all([refetchBilling(), refetchInvoices()]);
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
  }, [checkoutState, refetchBilling, refetchInvoices, setSearchParams]);

  const handleUpgrade = async (planId) => {
    if (isNativeApp()) return;
    if (!canManageBilling) { setBillingError('Only an organization owner or admin can change the subscription.'); return; }
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
      setBillingError(`Upgrade failed: ${msg}`);
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
      setBillingError(e?.response?.data?.error || e.message || 'Checkout confirmation failed.');
    } finally {
      setDummyConfirming(false);
    }
  };

  const handleManageSubscription = async () => {
    if (isNativeApp()) return;
    if (!canManageBilling) { setBillingError('Only an organization owner or admin can manage payment details.'); return; }
    try {
      const res = await apiClient.createBillingPortal();
      if (res?.portal_url) window.location.href = res.portal_url;
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      setBillingError(`Could not open billing portal: ${msg}`);
    }
  };

  if (isNativeApp()) return <NativePlanSummary billing={billing} org={org} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <header>
        <h1 className="mt-1 text-2xl font-bold text-[#0a0a0a]">Billing and plans</h1>
        <p className="mt-1 text-sm text-[#525252]">Your plan, payments, and invoices in one place.</p>
      </header>
      {billingError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <span>{billingError}</span><button type="button" onClick={() => setBillingError('')} className="text-xs font-semibold">Dismiss</button>
        </div>
      )}
      {billing && !canManageBilling && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          You can view the workspace plan and billing state. Contact an organization owner or admin for invoices, payment details, or subscription changes.
        </div>
      )}
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
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
              </div>
              <p className="mt-1 text-sm text-[#737373]">{currentPlan === 'enterprise_onboarding' ? 'Temporary invitation access' : `${currentPlanDef?.price || ''}${currentPlanDef?.period || ''}`}</p>
            </div>
            {canManageBilling && !isEnterpriseWorkspace && subscription?.stripe_customer_id && (
              <button
                onClick={handleManageSubscription}
                className="px-4 py-2 rounded-lg border border-[#e3e0db] bg-white hover:bg-[#f3f1ec] text-[#525252] text-sm font-medium font-['Space_Grotesk']"
                title={t('billing.manageSubscriptionTitle', 'Open Stripe Customer Portal')}
              >
                {t('billing.manageSubscription', 'Manage subscription')}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-px border border-[#e3e0db] bg-[#e3e0db] sm:grid-cols-3">
          <div className="bg-[#faf9f4] p-3"><p className="text-xs text-[#737373]">Status</p><p className="mt-1 text-sm font-semibold capitalize text-[#202020]">{({ active: 'Active', trialing: 'Trial', past_due: 'Payment overdue', unpaid: 'Payment needed', canceled: 'Canceled', incomplete: 'Payment pending', incomplete_expired: 'Payment expired', paused: 'Paused' }[subscription.status] || subscription.status || (billing?.entitlement ? 'Access active' : 'No subscription'))}</p></div>
          <div className="bg-[#faf9f4] p-3"><p className="text-xs text-[#737373]">Next renewal</p><p className="mt-1 text-sm font-semibold text-[#202020]">{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'Not scheduled'}</p></div>
          <div className="bg-[#faf9f4] p-3"><p className="text-xs text-[#737373]">Managed by</p><p className="mt-1 text-sm font-semibold text-[#202020]">{canManageBilling ? 'You can manage billing' : 'Workspace owner'}</p></div>
        </div>
      </motion.div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-[#737373]">See your allowances and remaining credits.</span>
        <Link to="/hivemind/app/usage" className="font-medium text-[#117dff] hover:underline">View usage <span aria-hidden="true">→</span></Link>
      </div>
      {!isEnterpriseWorkspace && (
        <details className="rounded-xl border border-[#e3e0db] bg-white">
          <summary className="cursor-pointer p-5 text-sm font-semibold text-[#0a0a0a]">Change plan</summary>
          <section className="space-y-4 px-5 pb-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="mt-1 text-lg font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Choose the capacity that fits your work</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {planOptions.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlan={currentPlan}
                onSelect={(id) => canManageBilling ? setUpgradeModal(id) : setBillingError('Only an organization owner or admin can change the subscription.')}
              />
            ))}
          </div>
          </section>
        </details>
      )}

      <CommercialJourney billing={billing} />
      {isEnterpriseWorkspace && (
        <details className="rounded-xl border border-[#e3e0db] bg-white">
          <summary className="cursor-pointer p-5 text-sm font-semibold text-[#0a0a0a]">Configure your workspace plan</summary>
          <div className="px-4 pb-4"><RunwayUpgradePanel /></div>
        </details>
      )}

      {/* Invoices */}
      {canManageBilling && (
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
          {invoiceList?.invoices?.length ? <div className="overflow-x-auto">
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
          </div> : <div className="border-t border-[#eae7e1] py-8 text-center"><p className="text-sm font-medium text-[#525252]">No invoices yet</p><p className="mt-1 text-xs text-[#a3a3a3]">Invoices will appear here after the first completed payment.</p></div>}
        </motion.div>
      )}


      {/* FAQ Section */}
      <details className="bg-white border border-[#e3e0db] rounded-xl p-5">
        <summary className="cursor-pointer text-sm font-semibold text-[#0a0a0a]">{t('billing.billingHelp', 'Billing help')}</summary>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              q: 'Is invitation onboarding a subscription?',
              a: 'No. An enterprise invitation starts temporary onboarding access. A recurring subscription begins only after an owner accepts a Runway configuration and completes checkout.',
            },
            {
              q: t('billing.faq2q', 'Can I switch plans anytime?'),
              a: t('billing.faq2a', 'Yes. Upgrades take effect immediately. Downgrades apply at the end of your billing cycle.'),
            },
            {
              q: 'Where can I see consumption and limits?',
              a: 'The Usage page is the single place for usage, remaining allowances, and reset dates. Billing contains only commercial and payment information.',
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
      </details>

      {canManageBilling && !isEnterpriseWorkspace && upgradeModal && (
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
