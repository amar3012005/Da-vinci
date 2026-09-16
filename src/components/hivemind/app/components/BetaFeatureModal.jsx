import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Beaker, X } from 'lucide-react';

/**
 * A single honest affordance for product surfaces that are deliberately not
 * generally available yet.  Do not wire an unavailable control to a real API
 * and then explain the failure after the fact.
 */
export default function BetaFeatureModal({ open, feature = 'This feature', onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[10020] flex items-center justify-center bg-[#111214]/35 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
          role="dialog"
          aria-modal="true"
          aria-label={`${feature} beta availability`}
        >
          <motion.section
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#d9d6cf] bg-white shadow-[0_24px_70px_-35px_rgba(0,0,0,0.45)]"
          >
            <header className="flex h-12 items-center justify-between border-b border-[#e3e0db] bg-[#faf9f4] px-4">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b8d94]">Early access</span>
              <button type="button" onClick={onClose} className="rounded-md p-1 text-[#8b8d94] hover:bg-[#efede8] hover:text-[#16171a]" aria-label="Close">
                <X size={15} />
              </button>
            </header>
            <div className="px-6 py-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#cfe0ff] bg-[#edf4ff] text-[#117dff]"><Beaker size={19} /></div>
              <h2 className="mt-4 font-['Space_Grotesk'] text-xl font-semibold tracking-tight text-[#0a0a0a]">{feature} is in beta</h2>
              <p className="mt-2 text-sm leading-6 text-[#525252]">This feature is being tested with beta users. We’ll let you know when it’s available to everyone.</p>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={onClose} className="rounded-[6px] bg-[#0a0a0a] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#262626]">Got it</button>
              </div>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
