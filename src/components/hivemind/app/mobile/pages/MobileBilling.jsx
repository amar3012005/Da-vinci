// Mobile Billing — desktop Billing.jsx's core flow (current plan, invoices,
// plan cards, upgrade, FAQ) reusing the exact same api-client calls, laid
// out single-column for a phone with the upgrade confirmation as a bottom
// sheet instead of a centered modal. Enterprise-only edge cases
// (CommercialJourney invitation banner, RunwayUpgradePanel) are desktop-only
// for now — narrow audience, rare path.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, Cable, Check, Clock, CreditCard, HardDrive, Headphones, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useApiQuery } from '../../shared/hooks';
import apiClient from '../../shared/api-client';
import MobileShell from '../MobileShell';

const PLANS = [
  {
    id: 'free', name: 'Free', price: '€0', period: '/month',
    description: 'Try HIVEMIND with real documents. 100 pages/month, 1 user seat.',
    features: [
      { label: '100 pages/month', icon: HardDrive }, { label: '1,000 memories', icon: HardDrive },
      { label: '1M LLM tokens/month', icon: Brain }, { label: '3 Deep Research/month', icon: Zap },
      { label: '3 connectors', icon: Cable }, { label: '1 user', icon: Users },
      { label: 'Community support', icon: Headphones },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: '€79', period: '/month', popular: true,
    description: 'Teams building on institutional memory. 1,000 pages/month, 5 seats.',
    features: [
      { label: '1,000 pages/month', icon: HardDrive }, { label: '25,000 memories', icon: HardDrive },
      { label: '10M LLM tokens/month', icon: Brain }, { label: '20 Deep Research/month', icon: Zap },
      { label: '10 connectors', icon: Cable }, { label: '5 users', icon: Users },
      { label: 'Email support (48h)', icon: Headphones }, { label: '99.5% SLA', icon: Clock },
    ],
  },
  {
    id: 'scale', name: 'Scale', price: '€239', period: '/month',
    description: 'Mid-size regulated organisations. 10,000 pages/month, 25 seats.',
    features: [
      { label: '10,000 pages/month', icon: HardDrive }, { label: '250,000 memories', icon: HardDrive },
      { label: '100M LLM tokens/month', icon: Brain }, { label: 'Unlimited Deep Research', icon: Zap },
      { label: 'Unlimited connectors', icon: Cable }, { label: '25 users', icon: Users },
      { label: 'SSO / SAML', icon: Shield }, { label: 'Priority support (24h)', icon: Headphones }, { label: '99.9% SLA', icon: Clock },
    ],
  },
];

function planFromBackend(raw) {
  const fallback = PLANS.find((plan) => plan.id === raw?.id) || {};
  return {
    ...fallback, ...raw,
    price: raw?.price == null ? 'Custom' : `€${raw.price}`,
    period: raw?.price == null ? '' : '/month',
    features: fallback.features || [],
  };
}

function PlanCard({ plan, isCurrent, onSelect }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-[16px] border p-4 ${plan.popular ? 'bg-[#117dff]/[0.04] border-[#117dff]/25' : 'bg-white border-[#e3e0db]'}`}>
      {plan.popular && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#117dff] text-white uppercase tracking-wider">
          <Sparkles size={9} /> Popular
        </span>
      )}
      <div className="mb-1"><h3 className="text-[14.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{plan.name}</h3></div>
      <p className="text-[11px] text-[#a3a3a3] mb-3">{plan.description}</p>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-[24px] font-bold text-[#0a0a0a] font-mono">{plan.price}</span>
        {plan.period && <span className="text-[11px] text-[#a3a3a3]">{plan.period}</span>}
      </div>
      <div className="space-y-1.5 mb-4">
        {plan.features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2">
            <Check size={12} className={plan.popular ? 'text-[#117dff]' : 'text-[#a3a3a3]'} />
            <span className="text-[#525252] text-[11.5px]">{feature.label}</span>
          </div>
        ))}
      </div>
      {isCurrent ? (
        <div className="text-center h-10 rounded-full bg-[#f3f1ec] border border-[#e3e0db] text-[#525252] text-[12px] font-semibold flex items-center justify-center">Current plan</div>
      ) : (
        <button onClick={() => onSelect(plan.id)}
          className={`w-full h-10 rounded-full text-[12.5px] font-semibold flex items-center justify-center gap-1.5 ${plan.popular ? 'bg-[#117dff] text-white' : 'bg-[#f3f1ec] border border-[#d4d0ca] text-[#0a0a0a]'}`}>
          Upgrade to {plan.name} <ArrowRight size={12} />
        </button>
      )}
    </motion.div>
  );
}

const FAQ = [
  { q: 'Can I switch plans anytime?', a: 'Yes. Upgrades take effect immediately. Downgrades apply at the end of your billing cycle.' },
  { q: 'Where can I see consumption and limits?', a: 'The Usage page is the single place for usage, remaining allowances, and reset dates.' },
  { q: 'Do you offer refunds?', a: 'We offer a 14-day money-back guarantee on all paid plans. No questions asked.' },
];

export default function MobileBilling() {
  const { org } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [upgradeModal, setUpgradeModal] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const [billingError, setBillingError] = useState('');

  const { data: billing, refetch: refetchBilling } = useApiQuery(() => apiClient.getBillingPlan().catch(() => null), []);
  const { data: invoiceList } = useApiQuery(() => apiClient.listInvoices().catch(() => null), []);

  const subscription = billing?.subscription || {};
  const currentPlan = billing?.plan?.id || org?.plan || 'free';
  const canManageBilling = Boolean(billing?.can_manage_billing);
  const isEnterpriseWorkspace = billing?.billing_model === 'enterprise_contract' || currentPlan === 'enterprise';
  const checkoutState = searchParams.get('checkout');
  const planOptions = Array.isArray(billing?.all_plans) && billing.all_plans.length
    ? billing.all_plans.map(planFromBackend).filter((p) => p.id !== 'enterprise')
    : PLANS;
  const currentPlanDef = billing?.plan ? planFromBackend(billing.plan) : planOptions.find((p) => p.id === currentPlan);

  useEffect(() => {
    if (checkoutState !== 'success') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const result = await apiClient.reconcileBillingCheckout();
        if (cancelled) return;
        await refetchBilling();
        setCheckoutNotice(result?.reconciled ? `Payment confirmed. Your ${String(result.plan || '').toUpperCase()} plan is active.` : 'Payment received. Your subscription is still being confirmed.');
      } catch { if (!cancelled) setCheckoutNotice('Payment received. Refresh in a moment while we confirm your subscription.'); }
      finally { if (!cancelled) setSearchParams({}, { replace: true }); }
    })();
    return () => { cancelled = true; };
  }, [checkoutState, refetchBilling, setSearchParams]);

  const handleUpgrade = async (planId) => {
    if (!canManageBilling) { setBillingError('Only an organization owner or admin can change the subscription.'); return; }
    if (isEnterpriseWorkspace) return;
    setUpgrading(true);
    try {
      const res = await apiClient.createBillingCheckout(planId, referralCode.trim());
      if (res?.checkout_url) { window.location.href = res.checkout_url; return; }
      throw new Error('Self-serve checkout is not available for this plan. Contact support to change plans.');
    } catch (e) {
      setBillingError(`Upgrade failed: ${e?.response?.data?.error || e.message || 'Upgrade failed.'}`);
    } finally { setUpgrading(false); }
  };

  const handleManageSubscription = async () => {
    if (!canManageBilling) { setBillingError('Only an organization owner or admin can manage payment details.'); return; }
    try { const res = await apiClient.createBillingPortal(); if (res?.portal_url) window.location.href = res.portal_url; }
    catch (e) { setBillingError(`Could not open billing portal: ${e?.response?.data?.error || e.message}`); }
  };

  return (
    <MobileShell title="Billing">
      <div className="px-4 pt-2 pb-10 space-y-3">
        <div>
          <h1 className="text-[19px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">Billing and plans</h1>
          <p className="mt-1 text-[12px] text-[#525252]">Subscriptions, payment methods, invoices, plan changes.</p>
        </div>

        {billingError && (
          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-900">
            <span>{billingError}</span><button onClick={() => setBillingError('')} className="text-[11px] font-semibold flex-shrink-0">Dismiss</button>
          </div>
        )}
        {billing && !canManageBilling && (
          <div className="rounded-[12px] border border-sky-200 bg-sky-50 p-3 text-[12px] text-sky-950">
            You can view the workspace plan. Contact an owner or admin for invoices, payment, or subscription changes.
          </div>
        )}
        {checkoutNotice && (
          <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 p-3 text-[12px] font-medium text-emerald-900">{checkoutNotice}</div>
        )}

        {/* Current plan */}
        <div className="rounded-[16px] border border-[#e3e0db] bg-white p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-[10px] bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center flex-shrink-0">
              <CreditCard size={16} className="text-[#117dff]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Current plan</div>
              <div className="text-[11px] text-[#a3a3a3] truncate">{org?.name || 'Your workspace'}</div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[15px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">{currentPlanDef?.name}</span>
              <span className="text-[9px] font-mono bg-[#f3f1ec] text-[#525252] px-1.5 py-0.5 rounded uppercase">{currentPlan}</span>
            </div>
          </div>
          {subscription?.status && (
            <div className="flex items-center gap-2 mb-3 text-[10.5px]">
              <span className={`px-1.5 py-0.5 rounded font-mono uppercase ${subscription.status === 'active' || subscription.status === 'trialing' ? 'bg-[#dcfce7] text-[#15803d]' : subscription.status === 'past_due' || subscription.status === 'unpaid' ? 'bg-[#fef2f2] text-[#b91c1c]' : 'bg-[#f3f1ec] text-[#525252]'}`}>{subscription.status}</span>
              {subscription.current_period_end && <span className="text-[#a3a3a3]">renews {new Date(subscription.current_period_end).toLocaleDateString()}</span>}
            </div>
          )}
          <div className="grid grid-cols-1 gap-1.5 mb-3">
            <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-[8px] p-2.5 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase text-[#a3a3a3]">Billing status</span>
              <span className="text-[11.5px] font-semibold capitalize text-[#202020]">{subscription.status || (billing?.entitlement ? 'Entitlement active' : 'No subscription')}</span>
            </div>
            <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-[8px] p-2.5 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase text-[#a3a3a3]">Payment mgmt</span>
              <span className="text-[11.5px] font-semibold text-[#202020]">{canManageBilling ? 'Owner / admin' : 'Contact owner'}</span>
            </div>
          </div>
          {canManageBilling && !isEnterpriseWorkspace && subscription?.stripe_customer_id && (
            <button onClick={handleManageSubscription} className="w-full h-10 rounded-full border border-[#e3e0db] bg-white text-[#525252] text-[12.5px] font-medium">Manage subscription</button>
          )}
        </div>

        {/* Invoices */}
        {canManageBilling && (
          <div className="rounded-[16px] border border-[#e3e0db] bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Invoices</span>
              <a href={apiClient.invoiceCsvUrl()} className="text-[#117dff] text-[11px] font-medium">CSV</a>
            </div>
            {invoiceList?.invoices?.length ? (
              <div className="space-y-1.5">
                {invoiceList.invoices.slice(0, 12).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-[10px] border border-[#e3e0db] bg-[#faf9f4]">
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-mono text-[#525252]">{inv.number || inv.id.slice(-8)}</div>
                      <div className="text-[10px] text-[#a3a3a3]">{inv.period_start ? new Date(inv.period_start).toLocaleDateString() : '-'}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11.5px] font-semibold text-[#0a0a0a]">{(inv.amount_paid / 100).toFixed(2)} {inv.currency}</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono uppercase text-[9px] ${inv.status === 'paid' ? 'bg-[#dcfce7] text-[#15803d]' : inv.status === 'open' ? 'bg-[#fef3c7] text-[#a16207]' : 'bg-[#f3f1ec] text-[#525252]'}`}>{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center"><p className="text-[12px] font-medium text-[#525252]">No invoices yet</p></div>
            )}
          </div>
        )}

        {/* Plans */}
        {!isEnterpriseWorkspace && (
          <div className="space-y-3 pt-2">
            {planOptions.map((plan) => (
              <PlanCard key={plan.id} plan={plan} isCurrent={currentPlan === plan.id}
                onSelect={(id) => canManageBilling ? setUpgradeModal(id) : setBillingError('Only an organization owner or admin can change the subscription.')} />
            ))}
          </div>
        )}

        {/* FAQ */}
        <div className="rounded-[16px] border border-[#e3e0db] bg-white p-4">
          <h3 className="text-[13.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mb-3">FAQ</h3>
          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <div key={i}>
                <p className="text-[12px] font-semibold text-[#525252]">{faq.q}</p>
                <p className="text-[11px] text-[#a3a3a3] leading-relaxed mt-0.5">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {canManageBilling && !isEnterpriseWorkspace && upgradeModal && (
        <motion.div className="fixed inset-0 z-50 bg-[#0a0a0a]/25 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => !upgrading && setUpgradeModal(null)}>
          <motion.section initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            onClick={(e) => e.stopPropagation()} className="w-full bg-white rounded-t-[28px] border-t border-[#ece9e2] p-5">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#dfdad1]" />
            <div className="text-center mb-4">
              <div className="w-11 h-11 rounded-[12px] bg-[#117dff]/10 flex items-center justify-center mx-auto mb-2"><Zap size={19} className="text-[#117dff]" /></div>
              <h3 className="text-[16px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">Upgrade to {planOptions.find((p) => p.id === upgradeModal)?.name}</h3>
              <p className="text-[13px] text-[#525252]">{planOptions.find((p) => p.id === upgradeModal)?.price}{planOptions.find((p) => p.id === upgradeModal)?.period}</p>
            </div>
            <label className="block mb-4">
              <span className="mb-1 block text-[11px] font-medium text-[#525252]">Referral code (optional)</span>
              <input value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} maxLength={64} placeholder="GTM2026"
                className="w-full h-11 rounded-[10px] border border-[#d4d0ca] px-3 text-[13px] uppercase outline-none focus:border-[#117dff]" />
            </label>
            <div className="flex gap-2">
              <button onClick={() => setUpgradeModal(null)} disabled={upgrading} className="flex-1 h-11 rounded-full border border-[#e3e0db] text-[13px] font-semibold text-[#525252] disabled:opacity-50">Cancel</button>
              <button onClick={() => handleUpgrade(upgradeModal)} disabled={upgrading} className="flex-1 h-11 rounded-full bg-[#117dff] text-white text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {upgrading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {upgrading ? 'Processing…' : 'Confirm upgrade'}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </MobileShell>
  );
}
