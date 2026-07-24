import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

/**
 * RunwayEstimatorModal — the "your onboarding has ended" prompt shown to an
 * enterprise org once its 2-week onboarding is over and it hits a plan limit.
 *
 * Deliberately simple: it does NOT run checkout in the popup (that caused a
 * confusing in-modal failure). It just tells the user what happened and sends
 * them to Billing, where the Sovereign Scope Estimator, payment management, and
 * invoices all live together.
 */
export default function RunwayEstimatorModal({ open, onClose, reason }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const goToBilling = () => { onClose?.(); navigate('/hivemind/app/billing'); };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
          role="dialog" aria-modal="true" aria-label="Onboarding ended">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl border border-[#e3e0db] shadow-2xl p-6 max-w-sm w-full mx-4"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 20px 40px -12px rgba(0,0,0,0.18)' }}>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#117dff]/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={20} className="text-[#117dff]" />
              </div>
              <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk'] mb-1">
                Your onboarding weeks have come to an end
              </h3>
              <p className="text-[#525252] text-sm font-['Space_Grotesk'] leading-relaxed">
                Upgrade to Runway to keep using HIVEMIND — configure your organization's usage and continue on a
                plan that fits.
              </p>
              {reason && (
                <p className="text-[#a3a3a3] text-[12px] font-['Space_Grotesk'] leading-relaxed mt-2">{reason}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-semibold border border-[#e3e0db] text-[#525252] hover:bg-[#f3f1ec] transition-colors">
                Later
              </button>
              <button onClick={goToBilling}
                className="flex-1 py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-semibold bg-[#117dff] text-white hover:bg-[#0066e0] transition-colors flex items-center justify-center gap-2">
                Upgrade to Runway
                <ArrowRight size={15} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
