import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowRight } from 'lucide-react';

/**
 * PlanLimitModal — reusable "you've hit your plan limit" upgrade/continue popup.
 *
 * Themed to match the HIVEMIND warm-light console (see shared/theme.js):
 *   accent #117dff / hover #0066e0, cream/white surfaces, #e3e0db borders,
 *   #0a0a0a / #525252 text, Space Grotesk display font.
 *
 * Overlay pattern copied from Billing.jsx (fixed inset-0 z-50 bg-black/40
 * backdrop-blur-sm centered card).
 *
 * Props:
 *   open          {boolean}
 *   resource      {string}  e.g. 'kbPages' | 'uploads' | 'memories' | …
 *   plan          {string}  current plan id ('free'|'pro'|'scale'|'enterprise')
 *   limit         {number}
 *   current       {number}
 *   suggestedPlan {string|null}  next tier id, or null when already top tier
 *   message       {string}  optional human reason string from the backend
 *   onUpgrade     {() => void}   navigate to billing
 *   onContinue    {() => void}   dismiss (soft continue)
 *   onClose       {() => void}   dismiss (backdrop / Esc)
 */

// resource → friendly label (singular noun used in "{current}/{limit} X this month")
const RESOURCE_LABELS = {
  kbPages: 'pages',
  uploads: 'uploads',
  memories: 'memories',
  webIntel: 'Web Intel requests',
  deepResearch: 'Deep Research sessions',
  searches: 'searches',
  tokens: 'LLM tokens',
  connectors: 'connectors',
  users: 'users',
};

// plan id → display name + one headline benefit shown on the upgrade CTA row
const PLAN_META = {
  free: { name: 'Free' },
  pro: { name: 'Pro', headline: '1,000 pages/month · 5 users · Sentinel Agent' },
  scale: { name: 'Scale', headline: '10,000 pages/month · 25 users · unlimited retention' },
  enterprise: { name: 'Enterprise', headline: 'Unlimited everything · dedicated infra · custom SLA' },
};

function resourceLabel(resource) {
  return RESOURCE_LABELS[resource] || 'this resource';
}

function planName(planId) {
  return PLAN_META[planId]?.name || (planId ? planId.charAt(0).toUpperCase() + planId.slice(1) : 'your plan');
}

export default function PlanLimitModal({
  open,
  resource,
  plan,
  limit,
  current,
  suggestedPlan,
  message,
  onUpgrade,
  onContinue,
  onClose,
}) {
  // Esc closes.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const label = resourceLabel(resource);
  const suggestedName = planName(suggestedPlan);
  const suggestedHeadline = suggestedPlan ? PLAN_META[suggestedPlan]?.headline : null;
  const hasUsage = typeof current === 'number' && typeof limit === 'number';

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onMouseDown={(e) => {
            // Click on the backdrop (not the card) closes.
            if (e.target === e.currentTarget) onClose?.();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Plan limit reached"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl border border-[#e3e0db] shadow-2xl p-6 max-w-sm w-full mx-4"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 20px 40px -12px rgba(0,0,0,0.18)' }}
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#117dff]/10 flex items-center justify-center mx-auto mb-3">
                <Zap size={20} className="text-[#117dff]" />
              </div>
              <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk'] mb-1">
                You've hit your {planName(plan)} plan limit
              </h3>
              {hasUsage && (
                <p className="text-[#525252] text-sm font-['Space_Grotesk']">
                  {current}/{limit} {label} this month
                </p>
              )}
              {message && (
                <p className="text-[#a3a3a3] text-[12px] font-['Space_Grotesk'] leading-relaxed mt-2">
                  {message}
                </p>
              )}
            </div>

            {suggestedPlan && (
              <div className="mb-5 rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-3.5">
                <p className="text-[#0a0a0a] text-[13px] font-semibold font-['Space_Grotesk'] mb-0.5">
                  Upgrade to {suggestedName}
                </p>
                {suggestedHeadline && (
                  <p className="text-[#525252] text-[12px] font-['Space_Grotesk'] leading-relaxed">
                    {suggestedHeadline}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onContinue}
                className="flex-1 py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-semibold border border-[#e3e0db] text-[#525252] hover:bg-[#f3f1ec] transition-colors"
              >
                Continue
              </button>
              {suggestedPlan && (
                <button
                  onClick={onUpgrade}
                  className="flex-1 py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-semibold bg-[#117dff] text-white hover:bg-[#0066e0] transition-colors flex items-center justify-center gap-2"
                >
                  Upgrade to {suggestedName}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
