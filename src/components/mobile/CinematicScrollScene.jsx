import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/**
 * CinematicScrollScene — reusable scroll-scrubbed cinematic (Apple-style).
 * A pinned full-screen <canvas> plays a preloaded webp frame sequence on scroll.
 * A sleek right-side narration rail reveals script lines top→bottom as you scrub.
 * Reduced-motion / mobile → a single static frame with a headline.
 * Auto-applies the global "cinematic-mode" look (nav hide + letterbox) while in view.
 *
 * Props:
 *   frameDir      — public dir holding f_001.webp … (no leading slash)
 *   frameCount    — number of frames
 *   steps         — [{ at: 0..1, label, sub?, accent? }] narration beats
 *   staticFrame   — frame index shown in the reduced-motion fallback
 *   staticHeadline— headline shown in the reduced-motion fallback
 *   heightVh      — scroll length of the section (default 260)
 */
const CinematicScrollScene = ({
  frameDir,
  frameCount,
  steps = [],
  staticFrame = 0,
  staticHeadline = '',
  heightVh = 260,
  title = '',
  subtitle = '',
}) => {
  const wrapRef = useRef(null);
  const pinRef = useRef(null);
  const canvasRef = useRef(null);
  const stepRefs = useRef([]);
  const [reduced, setReduced] = useState(false);

  const framePath = (i) => `/${frameDir}/f_${String(i + 1).padStart(3, '0')}.webp`;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(max-width: 767px)').matches;
    setReduced(noMotion);
    if (noMotion) return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const images = [];
    let loaded = 0;
    const state = { frame: 0 };

    const draw = () => {
      const img = images[Math.round(state.frame)];
      if (!img || !img.complete) return;
      const cw = window.innerWidth, ch = window.innerHeight;
      const ir = img.width / img.height, cr = cw / ch;
      let w, h, x, y;
      if (cr > ir) { w = cw; h = cw / ir; x = 0; y = (ch - h) / 2; }
      else { h = ch; w = ch * ir; x = (cw - w) / 2; y = 0; }
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, x, y, w, h);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const makeOnLoad = (i) => () => { loaded++; if (loaded === 1 || Math.round(state.frame) === i) draw(); };
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = makeOnLoad(i);
      images[i] = img;
    }

    window.addEventListener('resize', resize);
    resize();

    const cine = (onState) => () => document.documentElement.classList.toggle('cinematic-mode', onState);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        pin: pinRef.current,
        invalidateOnRefresh: true,
        onEnter: cine(true),
        onEnterBack: cine(true),
        onLeave: cine(false),
        onLeaveBack: cine(false),
      },
    });
    // frame scrub spans the whole timeline (duration 1) so step reveals can be
    // positioned by their `at` fraction and all complete before the pin releases.
    tl.to(state, { frame: frameCount - 1, duration: 1, ease: 'none', onUpdate: draw }, 0);

    // narration reveals ride the SAME scrubbed timeline (fade/slide IN, then stay)
    stepRefs.current.forEach((el, idx) => {
      if (!el) return;
      tl.fromTo(
        el,
        { opacity: 0.12, x: 16 },
        { opacity: 1, x: 0, duration: 0.07, ease: 'power2.out' },
        Math.min(steps[idx].at, 0.93),
      );
    });

    return () => {
      window.removeEventListener('resize', resize);
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
      document.documentElement.classList.remove('cinematic-mode');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced) {
    // mobile / reduced-motion: a tall poster header + the full narration stacked
    // below, so the story (and the per-field pain) survives without scrubbing.
    return (
      <section className="relative w-full overflow-hidden bg-[#05070f]">
        <div className="relative h-[72svh] w-full overflow-hidden">
          <img src={framePath(staticFrame)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-[#05070f]/20 to-[#05070f]/30" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            {title && <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/50">Act I · {title}</p>}
            <h2 className="mt-2 font-['Space_Grotesk'] text-3xl font-semibold leading-tight text-white">{staticHeadline}</h2>
            {subtitle && <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.28em] text-[#ff7a2f]/80">{subtitle}</p>}
          </div>
        </div>

        {steps.length > 0 && (
          <ol className="relative mx-6 my-10 border-l border-white/12 pl-6">
            {steps.map((s, i) => (
              <li key={i} className="relative mb-7 last:mb-0">
                <span className={`absolute -left-[29px] top-[7px] h-2.5 w-2.5 rounded-full ${s.accent ? 'bg-[#ff7a2f] shadow-[0_0_12px_rgba(255,122,47,0.7)]' : 'bg-white/70'}`} />
                <p className={`font-['Space_Grotesk'] text-[18px] font-medium leading-snug tracking-tight ${s.accent ? 'text-white' : 'text-white/90'}`}>{s.label}</p>
                {s.sub && <p className="mt-1 font-mono text-[11px] tracking-[0.32em] text-[#ff7a2f]/80">{s.sub}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }

  return (
    <section ref={wrapRef} className="relative w-full bg-[#05070f]" style={{ height: `${heightVh}vh` }}>
      <div ref={pinRef} className="relative h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ display: 'block' }} />
        {/* scrim on the right so the rail reads over any frame */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[440px] bg-gradient-to-l from-[#05070f]/80 via-[#05070f]/30 to-transparent" />

        {/* left act label — vertical "THE FALL" stage marker */}
        {title && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[280px] bg-gradient-to-r from-[#05070f]/70 via-[#05070f]/20 to-transparent" />
            <div className="pointer-events-none absolute left-8 top-1/2 z-10 -translate-y-1/2 md:left-12 lg:left-16">
              <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/45">Act I</p>
              <h2
                className="mt-3 font-['Space_Grotesk'] text-5xl font-bold uppercase leading-none tracking-tight text-white/90"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-[#ff7a2f]/80">{subtitle}</p>
              )}
            </div>
          </>
        )}

        {/* right-side narration rail — script lines reveal top→bottom */}
        <div className="pointer-events-none absolute right-8 top-1/2 z-10 w-[340px] -translate-y-1/2 md:right-12 lg:right-16">
          <ol className="relative ml-3 border-l border-white/12">
            {steps.map((s, i) => (
              <li
                key={i}
                ref={(el) => (stepRefs.current[i] = el)}
                className="relative mb-9 pl-6 last:mb-0"
                style={{ opacity: 0.12 }}
              >
                <span
                  className={`absolute -left-[5px] top-[7px] h-2.5 w-2.5 rounded-full ${
                    s.accent ? 'bg-[#ff7a2f] shadow-[0_0_12px_rgba(255,122,47,0.7)]' : 'bg-white/70'
                  }`}
                />
                <p
                  className={`font-['Space_Grotesk'] text-[17px] font-medium leading-snug tracking-tight ${
                    s.accent ? 'text-white' : 'text-white/90'
                  }`}
                >
                  {s.label}
                </p>
                {s.sub && (
                  <p className="mt-1 font-mono text-[11px] tracking-[0.32em] text-[#ff7a2f]/80">{s.sub}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default CinematicScrollScene;
