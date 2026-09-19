import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, X } from 'lucide-react';
import { getCalApi } from '@calcom/embed-react';

const CAL_LINK = 'amar-sai-gadde-eluoct/30min';

export default function ReferralTrialGateModal({ open, reason, onClose }) {
  useEffect(() => {
    if (!open) return;
    (async () => {
      const cal = await getCalApi({ namespace: '30min' });
      cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
    })();
  }, [open]);

  return (
    <AnimatePresence>
      {open && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Referral trial ended">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="relative w-full max-w-md rounded-2xl border border-[#e3e0db] bg-white p-7 text-center shadow-2xl">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 text-[#737373]" aria-label="Close"><X size={18} /></button>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#117dff]/10 text-[#117dff]"><CalendarDays size={22} /></div>
          <h2 className="font-['Space_Grotesk'] text-xl font-bold text-[#0a0a0a]">Continue with SINGULANCE</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#525252]">{reason || 'Your referral trial is complete. Talk to the founder to continue using your workspace.'}</p>
          <button type="button" data-cal-namespace="30min" data-cal-link={CAL_LINK} data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}' className="mt-6 w-full rounded-xl bg-[#117dff] px-4 py-3 font-['Space_Grotesk'] text-sm font-semibold text-white hover:bg-[#0066e0]">Talk to the founder</button>
        </motion.div>
      </div>}
    </AnimatePresence>
  );
}
