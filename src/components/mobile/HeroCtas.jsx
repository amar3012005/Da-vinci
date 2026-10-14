import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getCalApi } from '@calcom/embed-react';
import WaitlistModal from './WaitlistModal';

/*
 * HeroCtas — the two homepage actions.
 *   1. "Talk to founder" → Cal.com booking modal (amar-sai-gadde-eluoct/30min, month view).
 *   2. "Join waitlist"    → the waitlist capture flow.
 * The banner variant deliberately keeps the actions on opposite edges so the
 * promise remains the visual centre of the homepage.
 */
const ease = [0.22, 1, 0.36, 1];

export default function HeroCtas({ delay = 0.85, compact = false, banner = false, invitation = false }) {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const cal = await getCalApi({ namespace: '30min' });
        cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
      } catch { /* embed script blocked — button still renders, just no modal */ }
    })();
  }, []);

  const base = invitation
    ? 'inline-flex h-11 items-center justify-center rounded-[6px] border px-5 text-[11px] font-semibold transition-colors'
    : banner
    ? 'inline-flex h-12 w-full items-center justify-center border text-[10px] font-semibold uppercase tracking-[0.24em] transition-all duration-300 sm:w-auto sm:min-w-[178px] sm:px-6'
    : `inline-flex items-center justify-center font-semibold uppercase tracking-[0.22em] transition-all duration-300 ${compact ? 'h-11 px-5 text-[11px]' : 'h-12 px-7 text-xs'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay, ease }}
      className={banner ? 'contents' : invitation ? 'flex flex-wrap items-center gap-3' : 'flex flex-row items-center justify-center gap-5'}
    >
      <button
        type="button"
        data-cal-namespace="30min"
        data-cal-link="amar-sai-gadde-eluoct/30min"
        data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
        className={`${base} ${banner ? 'sm:order-1 sm:justify-self-start' : ''} ${invitation ? 'order-2 border-[#e3e0db] bg-white text-[#0a0a0a] hover:bg-[#faf9f4]' : 'bg-white text-[#05070f] hover:bg-white/90 active:scale-[0.98]'}`}
      >
        {invitation ? 'Meet our founder' : 'Talk to founder'}
      </button>
      <button
        type="button"
        onClick={() => setWaitlistOpen(true)}
        className={`${base} ${banner ? 'sm:order-3 sm:justify-self-end' : ''} ${invitation ? 'order-1 border-[#117dff] bg-[#117dff] text-white hover:bg-[#006be5]' : 'border-white/35 text-white hover:border-white hover:bg-white/10 active:scale-[0.98]'}`}
      >
        Join waitlist
      </button>
      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </motion.div>
  );
}
