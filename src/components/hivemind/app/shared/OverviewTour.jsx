import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { TOUR_STEPS, TOUR_VERSION, welcomeStep } from './tours.config';

/**
 * First-run guided tour.
 *
 * This file RENDERS; it holds no copy. Every stop lives in tours.config.js —
 * read the header there before editing anything.
 *
 * Design contract, deliberately:
 *  - Arrows, arrowheads, the section bracket and the ring on the lifted nav item
 *    are INK, never a coloured glow. Blue stays typographic (eyebrow + checks),
 *    matching how the login onboarding uses it.
 *  - One arrow per step. A step listing several routes draws a single bracket
 *    spanning the section with a stub into each child, so a group reads as one
 *    idea instead of six separate ones.
 *  - The elbow leaves the card horizontally, drops, then approaches flat, so the
 *    head lands against the nav item's right edge instead of cutting diagonally
 *    across the sidebar.
 *
 * Robustness, because a tour that traps someone is worse than no tour:
 *  - A target absent from the DOM (route hidden by plan or role) makes the whole
 *    step drop out, rather than pointing an arrow at nothing.
 *  - Under 1024px there is no sidebar to point at, so the card centres and no
 *    arrows are drawn.
 *  - Esc closes, arrows navigate, and the draw animation is dropped under
 *    prefers-reduced-motion.
 */

const STORAGE_KEY = 'hm.tour.overview';
// Wider than the old tooltip-card (404) to carry the mac-window chrome
// (traffic-light dots + centred label + generous body padding) without
// feeling cramped — matches the width class of the app's other mac-chrome
// surfaces (Meeting Intelligence, the connectors mockup).
const CARD_W = 560;

export function useOverviewTour() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(STORAGE_KEY) !== String(TOUR_VERSION));
    } catch {
      setOpen(true);
    }
  }, []);

  const close = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(TOUR_VERSION));
    } catch {
      /* private mode — best effort */
    }
    setOpen(false);
  }, []);

  const reopen = useCallback(() => setOpen(true), []);
  return { open, close, reopen };
}

const findEl = (routeId) => document.querySelector(`[data-tour-id="${routeId}"]`);

function resolveSteps(narrow) {
  return TOUR_STEPS.filter((s) => {
    if (!s.targets.length) return true;
    if (narrow) return true;
    return s.targets.some((t) => findEl(t));
  });
}

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      className="mt-[3px] flex-none text-[#117dff]">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6 9 12l6 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// The three mac-window traffic lights — decorative, matching the chrome the
// Meeting Intelligence modal and connectors mockup already use elsewhere in
// the product (WelcomeFlow.jsx SlideVisual terminal frame uses the same hex
// triplet). Non-interactive: closing is the X button beside the label.
function TrafficLights() {
  return (
    <div className="flex items-center gap-[7px]" aria-hidden="true">
      <span className="w-[11px] h-[11px] rounded-full bg-[#FF5F57]" />
      <span className="w-[11px] h-[11px] rounded-full bg-[#FEBC2E]" />
      <span className="w-[11px] h-[11px] rounded-full bg-[#28C840]" />
    </div>
  );
}

/**
 * @param {string} [userName] - resolved once by Overview.jsx (HIVEMIND profile
 *   fact, falling back to the signup account) and passed down so this file
 *   stays a pure renderer with no data-fetching of its own. Personalises step 0
 *   only; every other stop is unaffected.
 */
export default function OverviewTour({ onClose, userName }) {
  const narrow = typeof window !== 'undefined' && window.innerWidth < 1024;
  const [steps] = useState(() => {
    const resolved = resolveSteps(narrow);
    if (resolved[0]?.eyebrow === 'WELCOME') resolved[0] = welcomeStep(userName);
    return resolved;
  });
  const [i, setI] = useState(0);
  const [geom, setGeom] = useState(null);
  const cardRef = useRef(null);
  const step = steps[Math.min(i, steps.length - 1)];

  const go = useCallback((n) => {
    if (n < 0) return;
    if (n >= steps.length) { onClose?.(); return; }
    setI(n);
  }, [steps.length, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowRight') go(i + 1);
      else if (e.key === 'ArrowLeft') go(i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go, onClose]);

  // Lift the active nav item(s) above the scrim and ring them in ink.
  useEffect(() => {
    if (narrow) return undefined;
    const els = step.targets.map(findEl).filter(Boolean);
    els.forEach((el) => {
      el.style.position = 'relative';
      el.style.zIndex = '10000';
      el.style.boxShadow = '0 0 0 1.5px var(--hm-tour-ink, #16171a)';
      el.style.borderRadius = '8px';
      el.style.background = 'var(--hm-tour-panel, #ffffff)';
    });
    return () => els.forEach((el) => {
      el.style.zIndex = '';
      el.style.boxShadow = '';
      el.style.background = '';
    });
  }, [step, narrow]);

  // Measure AFTER the card has its real height, so the arrow starts at its centre.
  useLayoutEffect(() => {
    if (narrow) { setGeom(null); return undefined; }
    const measure = () => {
      const els = step.targets.map(findEl).filter(Boolean);
      if (!els.length || !cardRef.current) { setGeom(null); return; }
      const rs = els.map((el) => el.getBoundingClientRect());
      const top = Math.min(...rs.map((r) => r.top));
      const bottom = Math.max(...rs.map((r) => r.bottom));
      // The card is ANCHORED DEAD CENTRE and does not move between steps. It
      // used to track the target vertically, which made the whole panel jump on
      // every Next — the arrow is what should move, not the thing you are reading.
      const cardH = cardRef.current.offsetHeight;
      setGeom({
        rs, top, bottom, cardH,
        cardTop: Math.round((window.innerHeight - cardH) / 2),
        cardLeft: Math.round((window.innerWidth - CARD_W) / 2),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, narrow]);

  const cardStyle = (narrow || !geom)
    ? { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }
    : { left: geom.cardLeft, top: geom.cardTop };

  const paths = [];
  let head = null;
  if (geom && !narrow) {
    const fromX = geom.cardLeft;
    const fromY = geom.cardTop + geom.cardH / 2;
    if (step.brace && geom.rs.length > 1) {
      const x = Math.max(...geom.rs.map((r) => r.right)) + 10;
      const y1 = geom.top + 3;
      const y2 = geom.bottom - 3;
      paths.push(`M ${x - 6} ${y1} H ${x} V ${y2} H ${x - 6}`);
      geom.rs.forEach((r) => paths.push(`M ${r.right + 2} ${r.top + r.height / 2} H ${x}`));
      const toY = (y1 + y2) / 2;
      paths.push(`M ${fromX} ${fromY} H ${(fromX + x) / 2} V ${toY} H ${x + 4}`);
      head = { x: x + 4, y: toY };
    } else {
      const r = geom.rs[0];
      const toX = r.right + 9;
      const toY = r.top + r.height / 2;
      paths.push(`M ${fromX} ${fromY} H ${(fromX + toX) / 2} V ${toY} H ${toX}`);
      head = { x: toX, y: toY };
    }
  }

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[9998]" role="presentation">
      <style>{`
        :root { --hm-tour-ink:#16171a; --hm-tour-panel:#ffffff; }
        @media (prefers-color-scheme: dark) {
          :root { --hm-tour-ink:#eceef0; --hm-tour-panel:#17191a; }
        }
        @keyframes hmTourDraw { to { stroke-dashoffset: 0; } }
        .hm-tour-line { stroke-dasharray: 1600; stroke-dashoffset: 1600;
          animation: hmTourDraw .55s ease forwards; }
        @media (prefers-reduced-motion: reduce) {
          .hm-tour-line { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="absolute inset-0 bg-[#121412]/40" onClick={onClose} aria-hidden="true" />

      {paths.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[9999]" aria-hidden="true">
          {paths.map((d, k) => (
            <path key={d} d={d} fill="none" stroke="var(--hm-tour-ink)" strokeWidth="1.5"
              strokeLinecap="round"
              className={k === paths.length - 1 ? 'hm-tour-line' : undefined}
              opacity={k === paths.length - 1 ? 1 : 0.85} />
          ))}
          {head && (
            <polygon
              points={`${head.x},${head.y} ${head.x + 7.5},${head.y - 4} ${head.x + 7.5},${head.y + 4}`}
              fill="var(--hm-tour-ink)" />
          )}
        </svg>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step.eyebrow}
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label={step.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.2, 0.7, 0.3, 1] }}
          className="absolute z-[10001] flex flex-col rounded-[20px] border border-[#e3e0db] bg-white overflow-hidden"
          style={{
            ...cardStyle,
            width: CARD_W,
            maxHeight: '80vh',
            boxShadow: '0 1px 3px rgba(10,10,11,0.04), 0 24px 64px rgba(10,10,11,0.18)',
          }}
        >
          {/* Mac-window chrome header — traffic lights, centred category label, close */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 border-b border-[#e3e0db] bg-white shrink-0">
            <TrafficLights />
            <span className="text-center font-mono text-[12px] tracking-[0.24em] uppercase text-[#a3a3a3]">
              {step.eyebrow} <span className="text-[#d4d0ca]">·</span> GUIDE
            </span>
            <button type="button" onClick={onClose} aria-label="Close"
              className="w-6 h-6 flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Ivory body — matches the app's card-on-ivory surface pairing */}
          <div className="flex flex-col flex-1 min-h-[300px] bg-[#faf9f4] px-8 pt-7 pb-6 overflow-y-auto">
            <h3 className="text-[30px] leading-[1.08] font-semibold font-['Space_Grotesk'] tracking-[-0.02em] text-[#0a0a0a] mb-3">
              {step.title}
            </h3>

            {/* Progress — a continuous track scales to any step count (9 here),
                unlike a fixed 3-segment bar. Fill = (i+1)/total. */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex-1 h-[3px] rounded-full bg-[#e3e0db] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#117dff] transition-[width] duration-300 ease-out"
                  style={{ width: `${((i + 1) / steps.length) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[10.5px] tracking-[0.08em] text-[#a3a3a3] tabular-nums shrink-0">
                {String(i + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
              </span>
            </div>

            <p className="text-[13.5px] leading-[1.62] text-[#525252] m-0">{step.body}</p>

            {step.checks && step.checks.length > 0 && (
              <ul className="list-none mt-4 mb-0 p-0 flex flex-col gap-[8px]">
                {step.checks.map((c) => (
                  <li key={c} className="flex gap-2.5 text-[12.5px] leading-[1.45] text-[#0a0a0a]">
                    <Check />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-3 mt-auto pt-6">
              <button type="button" onClick={() => go(i - 1)} disabled={i === 0}
                className="flex items-center gap-1 text-[12.5px] font-medium text-[#525252] hover:text-[#0a0a0a] disabled:opacity-30 disabled:hover:text-[#525252] transition-colors">
                <ChevronLeft /> Back
              </button>
              <button type="button" onClick={onClose}
                className="text-[12px] text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors">
                Skip
              </button>
              <button type="button" onClick={() => go(i + 1)}
                className="ml-auto flex items-center gap-1.5 rounded-full pl-4 pr-3.5 py-2 text-[12.5px] font-semibold bg-[#0a0a0a] text-white hover:bg-[#262626] transition-colors">
                {i === steps.length - 1 ? 'Finish' : 'Next'} <ChevronRight />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
