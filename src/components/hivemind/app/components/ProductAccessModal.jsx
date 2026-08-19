import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Brain, Mic2, Workflow, X } from 'lucide-react';
import { normalizePlanId } from '../shared/product-access';

const PLAN_NAMES = { free: 'BRAIN Free', plus: 'BRAIN+', pro: 'Pro', scale: 'Scale', enterprise: 'Enterprise' };

export default function ProductAccessModal({ open, product, currentPlan, onClose, onUpgrade }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const isVoice = product === 'voice';
  const Icon = isVoice ? Mic2 : Workflow;
  const planName = PLAN_NAMES[normalizePlanId(currentPlan)] || 'BRAIN';

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[10020] flex items-center justify-center bg-[#111214]/35 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
          role="dialog"
          aria-modal="true"
          aria-label={`Upgrade to use ${isVoice ? 'VOICE' : 'Operating System'}`}
        >
          <motion.section
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#d9d6cf] bg-white font-['Space_Grotesk'] shadow-[0_24px_70px_-35px_rgba(0,0,0,0.45)]"
          >
            <header className="flex h-12 items-center justify-between border-b border-[#e3e0db] bg-[#faf9f4] px-4">
              <div className="flex items-center gap-[7px]" aria-hidden="true">
                <span className="h-[11px] w-[11px] rounded-full bg-[#FF5F57]" />
                <span className="h-[11px] w-[11px] rounded-full bg-[#FEBC2E]" />
                <span className="h-[11px] w-[11px] rounded-full bg-[#28C840]" />
              </div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b8d94]">Subscription access</span>
              <button type="button" onClick={onClose} className="rounded-md p-1 text-[#8b8d94] hover:bg-[#efede8] hover:text-[#16171a]" aria-label="Close">
                <X size={15} />
              </button>
            </header>

            <div className="px-6 py-7 sm:px-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#cfe0ff] bg-[#edf4ff] text-[#117dff]"><Icon size={19} /></div>
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#117dff]">{isVoice ? 'BRAIN + OS + VOICE' : 'BRAIN + OPERATING SYSTEM'}</p>
                  <h2 className="mt-0.5 text-xl font-bold tracking-tight text-[#0a0a0a]">Unlock {isVoice ? 'VOICE' : 'Operating System'}</h2>
                </div>
              </div>

              <p className="text-sm leading-6 text-[#525252]">
                Your {planName} subscription includes HIVE-MIND BRAIN. {isVoice
                  ? 'Upgrade to Scale to add TARA voice and operate with a small AI team.'
                  : 'Upgrade to Pro or Scale to give your Brain work to carry out with HyperAgents.'}
              </p>

              <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-[#e3e0db] bg-[#e3e0db] sm:grid-cols-3">
                <div className="bg-[#faf9f4] p-3.5"><Brain size={15} className="text-[#117dff]" /><p className="mt-2 text-xs font-semibold text-[#0a0a0a]">BRAIN</p><p className="mt-0.5 text-[11px] text-[#737373]">Included now</p></div>
                <div className="bg-white p-3.5"><Workflow size={15} className="text-[#117dff]" /><p className="mt-2 text-xs font-semibold text-[#0a0a0a]">Operating System</p><p className="mt-0.5 text-[11px] text-[#737373]">Pro and above</p></div>
                <div className="bg-white p-3.5"><Mic2 size={15} className="text-[#117dff]" /><p className="mt-2 text-xs font-semibold text-[#0a0a0a]">VOICE</p><p className="mt-0.5 text-[11px] text-[#737373]">Scale and above</p></div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="rounded-lg border border-[#d9d6cf] bg-white px-4 py-2.5 text-xs font-semibold text-[#525252] hover:bg-[#f3f1ec]">Continue with BRAIN</button>
                {!isVoice && <button type="button" onClick={() => onUpgrade?.('pro')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#b9d2ff] bg-[#edf4ff] px-4 py-2.5 text-xs font-semibold text-[#0b63ce] hover:bg-[#e2edff]">View Pro <ArrowRight size={13} /></button>}
                <button type="button" onClick={() => onUpgrade?.('scale')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#117dff] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0066e0]">View Scale <ArrowRight size={13} /></button>
              </div>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
