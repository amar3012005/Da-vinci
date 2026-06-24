import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Banknote, Compass, Megaphone, Building2, HeartPulse, X } from 'lucide-react';

/**
 * FieldPicker — a small board shown on first visit. The visitor picks the
 * function they run; the choice is persisted and drives the adaptive narration
 * section further down the page (AudienceSection). Cinematic dark, sharp edges.
 */

export const FIELDS = [
  { id: 'legal', label: 'Legal', icon: Scale },
  { id: 'finance', label: 'Finance', icon: Banknote },
  { id: 'planning', label: 'Planning', icon: Compass },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'public', label: 'Public Sector', icon: Building2 },
  { id: 'health', label: 'Healthcare', icon: HeartPulse },
];

const ease = [0.16, 1, 0.3, 1];

const FieldPicker = ({ open, onPick, onClose }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-5"
        style={{ background: 'rgba(5,7,15,0.72)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.5, ease }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg overflow-hidden rounded-xl border border-white/12 bg-[#0a0d18] p-7 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
        >
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-white/40 transition-colors hover:text-white">
            <X size={18} />
          </button>

          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">Tailor your view</p>
          <h2 className="font-['Space_Grotesk'] mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            What do you run?
          </h2>
          <p className="mt-2 text-sm font-light leading-relaxed text-white/55">
            Pick your function — we’ll show how SINGULANCE runs it as an AI workforce.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIELDS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onPick(id)}
                className="group flex flex-col items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-[#ff7a2f]/50 hover:bg-white/[0.06]"
              >
                <Icon size={20} className="text-white/60 transition-colors group-hover:text-[#ff7a2f]" />
                <span className="text-[13px] font-medium text-white/85">{label}</span>
              </button>
            ))}
          </div>

          <button onClick={onClose} className="mt-6 text-[12px] font-medium text-white/45 transition-colors hover:text-white/80">
            Or explore everything →
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default FieldPicker;
