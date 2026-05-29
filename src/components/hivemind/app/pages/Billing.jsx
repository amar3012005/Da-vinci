import React, { useState } from 'react';
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
    description: 'Try everything. 1,000 memories, 1M tokens, 3 Deep Research sessions.',
    accent: false,
    features: [
      // Usage limits
      { label: '1,000 memories', icon: HardDrive },
      { label: '1M LLM tokens/month', icon: Brain },
      { label: '3 Deep Research/month', icon: Zap },
      { label: '5 Web Intel/day', icon: Sparkles },
      { label: '3 connectors', icon: Cable },
      { label: '1 user', icon: Users },
      { label: '10 KB uploads/month', icon: HardDrive },
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
      kbUploads: 10,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€19',
    period: '/month',
    description: 'For daily use. 25K memories, 10M tokens, 20 Deep Research sessions.',
    accent: true,
    popular: true,
    features: [
      // Usage limits
      { label: '25,000 memories', icon: HardDrive },
      { label: '10M LLM tokens/month', icon: Brain },
      { label: '20 Deep Research/month', icon: Zap },
      { label: '50 Web Intel/day', icon: Sparkles },
      { label: '10 connectors', icon: Cable },
      { label: '5 users', icon: Users },
      { label: 'Unlimited KB uploads', icon: HardDrive },
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
      kbUploads: null,
    },
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '€199',
    period: '/month',
    description: 'For teams. 250K memories, 100M tokens, unlimited research.',
    accent: false,
    features: [
      // Usage limits
      { label: '250,000 memories', icon: HardDrive },
      { label: '100M LLM tokens/month', icon: Brain },
      { label: 'Unlimited Deep Research', icon: Zap },
      { label: '500 Web Intel/day', icon: Sparkles },
      { label: 'Unlimited connectors', icon: Cable },
      { label: '25 users', icon: Users },
      { label: 'Unlimited KB uploads', icon: HardDrive },
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
      kbUploads: null,
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
      { label: 'Unlimited memories', icon: HardDrive },
      { label: 'Unlimited LLM tokens', icon: Brain },
      { label: 'Unlimited Deep Research', icon: Zap },
      { label: 'Unlimited Web Intel', icon: Sparkles },
      { label: 'Unlimited connectors', icon: Cable },
      { label: 'Unlimited users', icon: Users },
      { label: 'Unlimited KB uploads', icon: HardDrive },
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
      kbUploads: null,
    },
  },
];

// ─── Usage Meter ─────────────────────────────────────────────────────────────

function UsageMeter({ label, used, limit, icon: Icon }) {
  const { t } = useTranslation('dashboard');
  const isUnlimited = !limit;
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
  const isEnterprise = plan.id === 'enterprise';

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
      ) : isEnterprise ? (
        <button className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#f3f1ec] border border-[#d4d0ca] text-[#0a0a0a] text-[12px] font-semibold font-['Space_Grotesk'] hover:bg-[#eae7e1] transition-all">
          {t('billing.contactSales', 'Contact Sales')}
          <ArrowRight size={13} />
        </button>
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
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [upgradeModal, setUpgradeModal] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  const { data: profile, refetch: refetchProfile } = useApiQuery(
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
  const { data: invoiceList } = useApiQuery(
    () => apiClient.listInvoices().catch(() => null),
    [],
  );

  // Legacy /api/billing/usage shim kept so the meter sub-component (which
  // still reads from `usage`) renders without a rewrite below.
  const usage = billing
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
    : null;

  const subscription = billing?.subscription || {};
  const stripeEnabled = Boolean(billing?.stripe_enabled);

  const currentPlan = billing?.plan?.id || profile?.plan || org?.plan || 'free';

  const activeConnections = Array.isArray(connectors?.connectors)
    ? connectors.connectors.filter(c => c.status === 'connected' || c.status === 'healthy').length
    : (connectors?.activeCount || 0);

  // Use usage API data if available, fallback to profile data
  const tokensUsed = usage?.tokens?.used ?? profile?.tokens_used ?? 0;
  const memoriesUsed = usage?.memories?.used ?? 0;
  const deepResearchUsed = usage?.deepResearch?.used ?? 0;
  const webIntelUsed = usage?.webIntel?.used ?? 0;
  const searchesUsed = usage?.searches?.used ?? profile?.searches_this_month ?? 0;
  const kbUploadsUsed = usage?.uploads?.used ?? 0;
  const graphQueriesUsed = usage?.graphQueries?.used ?? 0;

  const currentPlanDef = PLANS.find((p) => p.id === currentPlan);

  const handleUpgrade = async (planId) => {
    setUpgrading(true);
    try {
      // Self-serve checkout — opens Stripe-hosted checkout in same tab.
      // Stripe webhook flips plan + subscription_status on success.
      if (stripeEnabled) {
        const res = await apiClient.createBillingCheckout(planId);
        if (res?.checkout_url) {
          window.location.href = res.checkout_url;
          return;
        }
      }
      // Legacy fallback: direct plan flip on deployments without Stripe.
      await apiClient.core.post('/api/billing/upgrade', { plan: planId });
      setUpgraded(true);
      setUpgradeModal(null);
      await refetchProfile();
      await refetchBilling();
    } catch (e) {
      console.error('Upgrade failed:', e);
      const msg = e?.response?.data?.error || e.message || 'Upgrade failed.';
      alert(`Upgrade failed: ${msg}`);
    } finally {
      setUpgrading(false);
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
            {subscription?.stripe_customer_id && (
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
            label={t('billing.kbUploads', 'KB Uploads')}
            used={kbUploadsUsed}
            limit={currentPlanDef?.limits.kbUploads}
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

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-1 bg-white border border-[#e3e0db] rounded-lg p-1 w-fit mx-auto">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-4 py-1.5 rounded-md text-[12px] font-medium font-['Space_Grotesk'] transition-all ${
            billingCycle === 'monthly'
              ? 'bg-[#f3f1ec] text-[#0a0a0a]'
              : 'text-[#525252] hover:text-[#525252]'
          }`}
        >
          {t('billing.monthly', 'Monthly')}
        </button>
        <button
          onClick={() => setBillingCycle('annual')}
          className={`px-4 py-1.5 rounded-md text-[12px] font-medium font-['Space_Grotesk'] transition-all flex items-center gap-1.5 ${
            billingCycle === 'annual'
              ? 'bg-[#f3f1ec] text-[#0a0a0a]'
              : 'text-[#525252] hover:text-[#525252]'
          }`}
        >
          {t('billing.annual', 'Annual')}
          <span className="text-[9px] font-mono bg-[#117dff]/10 text-[#117dff] px-1.5 py-0.5 rounded">
            -20%
          </span>
        </button>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan, i) => (
          <PlanCard
            key={plan.id}
            plan={{
              ...plan,
              price: billingCycle === 'annual' && plan.price !== '€0' && plan.price !== 'Custom'
                ? `€${Math.round(parseInt(plan.price.replace('€', '')) * 0.8)}`
                : plan.price,
            }}
            currentPlan={currentPlan}
            onSelect={(id) => setUpgradeModal(id)}
          />
        ))}
      </div>

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

      {upgradeModal && (
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
                {t('billing.upgradeModalTitle', 'Upgrade to {{name}}', { name: PLANS.find(p => p.id === upgradeModal)?.name })}
              </h3>
              <p className="text-[#525252] text-sm font-['Space_Grotesk']">
                {PLANS.find(p => p.id === upgradeModal)?.price}{PLANS.find(p => p.id === upgradeModal)?.period}
              </p>
            </div>
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

      {upgraded && (
        <div className="fixed bottom-6 right-6 z-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 font-['Space_Grotesk'] text-sm font-semibold"
          >
            <Check size={16} />
            {t('billing.upgradeSuccess', 'Plan upgraded successfully!')}
          </motion.div>
        </div>
      )}
    </div>
  );
}
