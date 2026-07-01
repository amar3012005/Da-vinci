import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { getCalApi } from '@calcom/embed-react';

/*
 * HeroCtas — the two horizontal homepage CTAs.
 *   1. "Talk to us"  → Cal.com booking modal (amar-sai-gadde-eluoct/30min, month view).
 *   2. "Waitlist"    → the HIVEMIND signup funnel (/hivemind/login).
 * Styled for the dark cinematic hero: sharp edges, mono tracking, white-on-dark.
 */
const ease = [0.22, 1, 0.36, 1];

export default function HeroCtas({ delay = 0.85, compact = false }) {
  useEffect(() => {
    (async () => {
      try {
        const cal = await getCalApi({ namespace: '30min' });
        cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
      } catch { /* embed script blocked — button still renders, just no modal */ }
    })();
  }, []);

  const base = `inline-flex items-center justify-center font-semibold uppercase tracking-[0.22em] transition-all duration-300 ${compact ? 'h-11 px-5 text-[11px]' : 'h-12 px-7 text-xs'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay, ease }}
      className="flex flex-row items-center justify-center gap-3"
    >
      <button
        type="button"
        data-cal-namespace="30min"
        data-cal-link="amar-sai-gadde-eluoct/30min"
        data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
        className={`${base} bg-white text-[#05070f] hover:bg-white/90 active:scale-[0.98]`}
      >
        Talk to us
      </button>
      <a
        href="/hivemind/login"
        className={`${base} border border-white/35 text-white hover:border-white hover:bg-white/10 no-underline active:scale-[0.98]`}
      >
        Waitlist
      </a>
    </motion.div>
  );
}
