import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/**
 * SceneBridge — the hand-off between the HorizonScene film and the sections
 * below it.
 *
 * Cutting straight from the film's last frame (a warm, lamp-lit room, avg
 * #332017) to the navy updates carousel (#0a0d1a) read as two unrelated pages
 * stapled together. This closes that seam three ways, all of them quiet:
 *
 *   1. COLOUR — the section's own background is a gradient from the film's
 *      exact end tone into the exact navy the next section starts on, so there
 *      is never a hard edge for the eye to catch.
 *   2. IMAGE — the film's final frame carries over as a backdrop that recedes
 *      (drifts up, scales, blurs, fades) as you scroll, so the room dissolves
 *      rather than disappearing.
 *   3. MEANING — one line resolves on the way through, turning "the room runs
 *      everything" into "here is what it ships", which is what follows.
 *
 * Deliberately not flashy: nothing flies, nothing bounces. Everything is a
 * scrubbed dissolve tied to scroll position, so the motion only ever reports
 * how far the reader has come.
 */

const ROOM_WARM = '#332017'; // sampled: avg of the last frame's lower third
const NAVY = '#0a0d1a';      // LatestUpdates' background — match exactly
const ACCENT = '#ff7a2f';

const SceneBridge = ({
  lastFrameSrc = '/horizon-frames/f_164.webp',
  eyebrow = 'Now running',
  line = 'The work it already ships.',
}) => {
  const wrapRef = useRef(null);
  const backdropRef = useRef(null);
  const copyRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      });
      // The room recedes: lifts, grows, softens, fades out.
      // It starts ALREADY soft and semi-transparent on purpose — while the
      // film above is still pinned, a sharp copy here would read as two rooms
      // stacked. Held as an atmospheric afterimage, it reads as one space.
      tl.fromTo(backdropRef.current,
        { yPercent: -6, scale: 1.04, filter: 'blur(7px)', opacity: 0.5 },
        { yPercent: 4, scale: 1.16, filter: 'blur(18px)', opacity: 0, ease: 'none' }, 0);
      // the line resolves in the middle of the pass, then clears before the
      // carousel's own heading arrives so the two never compete
      tl.fromTo(copyRef.current,
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, ease: 'power2.out', duration: 0.34 }, 0.16);
      tl.to(copyRef.current, { opacity: 0, y: -18, ease: 'power2.in', duration: 0.26 }, 0.68);
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={wrapRef}
      className="relative w-full overflow-hidden"
      style={{
        height: '78vh',
        // warm room → deep transitional → the exact navy of the next section
        background: `linear-gradient(to bottom, ${ROOM_WARM} 0%, #241a1c 26%, #14131f 58%, ${NAVY} 100%)`,
      }}
    >
      {/* the film's last frame, receding */}
      <div ref={backdropRef} className="pointer-events-none absolute inset-x-0 top-0 h-[78%]">
        <img
          src={lastFrameSrc}
          alt=""
          className="h-full w-full object-cover"
          style={{
            // Masked at BOTH ends. The top fade matters most: the pinned film
            // above is crisp, so if the echo were visible right at the section
            // boundary you'd see a hard sharpness step. Fading in below the
            // seam means the join itself lands on flat colour, and the echo
            // only emerges once the film has moved on.
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 46%, transparent 92%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 46%, transparent 92%)',
          }}
        />
      </div>

      {/* warm vignette so the join reads as one lit space, not two panels */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 70% at 50% 8%, rgba(255,150,80,0.10), transparent 60%)' }}
      />

      <div ref={copyRef} className="absolute inset-x-0 bottom-[16%] px-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em]" style={{ color: ACCENT }}>
          {eyebrow}
        </p>
        <p className="mx-auto mt-3 max-w-[22ch] font-['Space_Grotesk'] text-[clamp(22px,3.4vw,38px)] font-semibold leading-tight tracking-tight text-white/92">
          {line}
        </p>
      </div>
    </section>
  );
};

export default SceneBridge;
