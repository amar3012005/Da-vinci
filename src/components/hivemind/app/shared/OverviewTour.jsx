import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
const CARD_W = 404;

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
          className="absolute z-[10001] flex flex-col rounded-2xl border border-[#e3e0db] bg-white px-6 pt-5 pb-4 min-h-[300px]"
          style={{
            ...cardStyle,
            width: CARD_W,
            maxHeight: '70vh',
            overflowY: 'auto',
            boxShadow: '0 1px 3px rgba(10,10,11,0.04), 0 20px 60px rgba(10,10,11,0.18)',
          }}
        >
          <p className="flex items-center gap-2 mb-3 font-mono text-[11px] tracking-[0.18em] text-[#117dff]">
            <span className="text-[#a3a3a3]">{'\u27E9'}</span>
            <span>{step.eyebrow}</span>
            <span className="text-[#d4d0ca] tracking-[0.14em]">· {String(i + 1).padStart(2, '0')}</span>
          </p>

          <h3 className="text-[26px] leading-[1.08] font-semibold font-['Space_Grotesk'] tracking-[-0.02em] text-[#0a0a0a] mb-2.5">
            {step.title}
          </h3>
          <p className="text-[13px] leading-[1.62] text-[#525252] m-0">{step.body}</p>

          {step.checks && step.checks.length > 0 && (
            <ul className="list-none mt-3.5 mb-0 p-0 flex flex-col gap-[7px]">
              {step.checks.map((c) => (
                <li key={c} className="flex gap-2.5 text-[12.5px] leading-[1.45] text-[#0a0a0a]">
                  <Check />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2 mt-auto pt-3.5 border-t border-[#eae7e1]">
            <button type="button" onClick={() => go(i + 1)}
              className="rounded-[6px] px-4 py-2 text-[12.5px] font-semibold tracking-[-0.01em] bg-[#117dff] text-white hover:bg-[#0066e0] transition-colors">
              {i === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
            <button type="button" onClick={() => go(i - 1)} disabled={i === 0}
              className="rounded-[6px] px-3 py-2 text-[12.5px] border border-[#e3e0db] text-[#525252] hover:border-[#d4d0ca] disabled:opacity-30 transition-colors">
              Back
            </button>
            <span className="ml-auto font-mono text-[11px] tracking-[0.1em] text-[#a3a3a3] tabular-nums">
              {String(i + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </span>
            <button type="button" onClick={onClose}
              className="text-[12px] text-[#a3a3a3] hover:text-[#0a0a0a] underline underline-offset-2 p-1 transition-colors">
              Skip
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
