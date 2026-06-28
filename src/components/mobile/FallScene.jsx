import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * FallScene — scroll-scrubbed cinematic ("The Fall"), Apple-style.
 * A pinned full-screen <canvas> plays a preloaded webp frame sequence as the
 * user scrolls (scroll progress → frame index), with text "moments" fading in
 * across the scroll. Sits right below the hero. Reduced-motion / mobile → a
 * static first frame, no pin. Fully additive + reversible.
 */
const FRAME_COUNT = 193;
const framePath = (i) => `/fall-frames/f_${String(i).padStart(3, '0')}.webp`;

const MOMENTS = [
  { at: 0.10, text: 'What if intelligence never forgot?' },
  { at: 0.45, text: 'It falls — into memory.' },
  { at: 0.80, text: 'SINGULANCE' },
];

const FallScene = () => {
  const wrapRef = useRef(null);
  const pinRef = useRef(null);
  const canvasRef = useRef(null);
  const momentRefs = useRef([]);
  const [reduced, setReduced] = useState(false);

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

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
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

    const makeOnLoad = (i) => () => { loaded++; if (loaded === 1 || Math.round(state.frame) === i) draw(); };
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = makeOnLoad(i);
      images[i] = img;
    }

    window.addEventListener('resize', resize);
    resize();

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        pin: pinRef.current,
        invalidateOnRefresh: true,
      },
    });
    tl.to(state, { frame: FRAME_COUNT - 1, ease: 'none', onUpdate: draw }, 0);

    // text moments — fade each in/out around its scroll position
    const ctxGsap = gsap.context(() => {
      momentRefs.current.forEach((el, idx) => {
        if (!el) return;
        const at = MOMENTS[idx].at;
        gsap.fromTo(el, { opacity: 0, y: 24 }, {
          opacity: 1, y: 0, ease: 'power2.out',
          scrollTrigger: { trigger: wrapRef.current, start: `${at * 100 - 12}% top`, end: `${at * 100}% top`, scrub: true },
        });
        gsap.to(el, {
          opacity: 0, y: -24, ease: 'power2.in',
          scrollTrigger: { trigger: wrapRef.current, start: `${at * 100 + 8}% top`, end: `${at * 100 + 22}% top`, scrub: true },
        });
      });
    });

    return () => {
      window.removeEventListener('resize', resize);
      tl.scrollTrigger && tl.scrollTrigger.kill();
      tl.kill();
      ctxGsap.revert();
    };
  }, []);

  if (reduced) {
    return (
      <section className="relative h-[80vh] w-full overflow-hidden bg-[#05070f]">
        <img src={framePath(0)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#05070f] via-transparent to-transparent p-6">
          <h2 className="font-['Space_Grotesk'] text-3xl font-semibold text-white">It falls — into memory.</h2>
        </div>
      </section>
    );
  }

  return (
    <section ref={wrapRef} className="relative h-[360vh] w-full bg-[#05070f]">
      <div ref={pinRef} className="relative h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ display: 'block' }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05070f]/30 via-transparent to-[#05070f]/70" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {MOMENTS.map((m, i) => (
            <h2
              key={i}
              ref={(el) => (momentRefs.current[i] = el)}
              className="font-['Space_Grotesk'] absolute max-w-4xl px-6 text-center text-4xl font-semibold leading-tight tracking-tight text-white opacity-0 [text-shadow:0_4px_40px_rgba(0,0,0,0.8)] md:text-6xl"
            >
              {m.text}
            </h2>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FallScene;
