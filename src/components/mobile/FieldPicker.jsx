import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Banknote, Compass, Megaphone, Building2, HeartPulse, X } from 'lucide-react';

/**
 * FieldPicker — a thin rail that slides in from the LEFT edge on first visit.
 * The visitor picks the function they run; the choice is persisted and drives
 * the adaptive narration further down the page (AudienceSection).
 *
 * Deliberately NOT a modal: the old centered dialog + blurred backdrop blocked
 * the cover slide and the scroll cinematics on every visit. This rail floats
 * over the left gutter, never traps scroll or clicks, and widens to reveal
 * labels on hover. Same props as before ({ open, onPick, onClose }).
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

const FieldPicker = ({ open, onPick, onClose }) => {
  // The rail belongs to the cover slide only — once the visitor scrolls into
  // the cinematics it slides back out so nothing overlaps the pinned canvases.
  const [pastCover, setPastCover] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onScroll = () => setPastCover(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
  <AnimatePresence>
    {open && !pastCover && (
      // pointer-events-none on the wrapper so the rail never eats page clicks
      <motion.div
        // y:-50% rides the motion transform — a Tailwind -translate-y-1/2 class
        // would be clobbered by framer's own transform and drop the rail low.
        initial={{ x: '-100%', y: '-50%', opacity: 0 }}
        animate={{ x: 0, y: '-50%', opacity: 1 }}
        exit={{ x: '-100%', y: '-50%', opacity: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.05 }}
        className="pointer-events-none fixed left-0 top-1/2 z-[200]"
      >
        <div className="pointer-events-auto group/rail flex flex-col items-stretch overflow-hidden rounded-r-md border-y border-r border-white/12 bg-[#0a0d18]/90 py-2 shadow-[0_24px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md">
          <p
            className="px-3 pb-2 pt-1 font-mono text-[8px] uppercase tracking-[0.3em] text-white/35"
            style={{ writingMode: 'vertical-rl' }}
          >
            What do you run?
          </p>

          {FIELDS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onPick(id)}
              title={label}
              aria-label={label}
              className="group/item flex items-center gap-0 px-3 py-2.5 transition-colors hover:bg-white/[0.07]"
            >
              <Icon size={17} className="flex-shrink-0 text-white/55 transition-colors group-hover/item:text-[#ff7a2f]" />
              {/* label unrolls only when the rail is hovered — keeps the strip thin */}
              <span className="max-w-0 overflow-hidden whitespace-nowrap text-[12.5px] font-medium text-white/85 transition-all duration-300 group-hover/rail:ml-2.5 group-hover/rail:max-w-[130px]">
                {label}
              </span>
            </button>
          ))}

          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="mt-1 flex items-center justify-center border-t border-white/10 px-3 pb-1 pt-2 text-white/30 transition-colors hover:text-white/70"
          >
            <X size={13} />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
  );
};

export default FieldPicker;
