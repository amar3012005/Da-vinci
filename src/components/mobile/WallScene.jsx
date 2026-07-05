import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/**
 * WallScene — Act II "THE WALL". The answer to the Fall.
 *
 * Same scroll mechanic as FallScene/CinematicScrollScene: a pinned full-screen
 * <canvas> scrubbed by scroll, a right-side narration rail that reveals lines
 * top→bottom, the vertical Act label, cinematic-mode letterbox, and a
 * reduced-motion / mobile fallback. But instead of a pre-rendered webp frame
 * sequence it draws a PROCEDURAL scene — scattered "memory" shards fly in and
 * lock into a solid sovereign wall as you scroll — so it needs no assets.
 *
 * Story: your memory stays inside your walls.
 */

const STEPS = [
  { at: 0.10, label: 'Then we built the wall.' },
  { at: 0.32, label: 'Every memory, captured — and kept.' },
  { at: 0.54, label: 'Your data never leaves your walls.' },
  { at: 0.76, label: 'Sovereign by design. EU-hosted. Yours.' },
  { at: 0.92, label: 'Memory stays inside your walls.', sub: '主権', accent: true },
];

// deterministic pseudo-random (stable across renders/DPR) so shards don't jump.
function rand(i, s) { const x = Math.sin(i * 928.7 + s * 13.1) * 43758.5453; return x - Math.floor(x); }
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const WallScene = () => {
  const wrapRef = useRef(null);
  const pinRef = useRef(null);
  const canvasRef = useRef(null);
  const stepRefs = useRef([]);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(max-width: 767px)').matches;
    setReduced(noMotion);
    if (noMotion) return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const state = { p: 0 };

    // ── Wall layout: a centered grid of bricks (the vault). ──
    const COLS = 9, ROWS = 6;
    const bricks = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        // scatter origin — far out in a random direction, rotated
        const ang = rand(i, 1) * Math.PI * 2;
        const dist = 0.6 + rand(i, 2) * 1.1;
        bricks.push({
          r, c, i,
          ox: Math.cos(ang) * dist, oy: Math.sin(ang) * dist - 0.15,
          orot: (rand(i, 3) - 0.5) * 2.2,
          // assemble order: bottom rows + center first, staggered
          delay: (rand(i, 4) * 0.4) + (1 - r / ROWS) * 0.35,
        });
      }
    }

    const draw = () => {
      const p = state.p;
      const cw = window.innerWidth, ch = window.innerHeight;
      ctx.clearRect(0, 0, cw, ch);

      // background wash — deepens as the wall seals
      const bg = ctx.createLinearGradient(0, 0, 0, ch);
      bg.addColorStop(0, '#070a12');
      bg.addColorStop(1, '#05070f');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);

      // wall geometry, centered
      const wallW = Math.min(cw * 0.52, 720);
      const wallH = wallW * (ROWS / COLS) * 0.62;
      const bw = wallW / COLS, bh = wallH / ROWS;
      const x0 = cw / 2 - wallW / 2, y0 = ch / 2 - wallH / 2;
      const gap = Math.max(2, bw * 0.05);

      // faint target outline (the wall to be filled)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0, y0, wallW, wallH);

      bricks.forEach((b) => {
        // per-brick progress with stagger, over the first ~85% of scroll
        const local = clamp01((p * 1.35 - b.delay) / 0.65);
        const e = easeInOut(local);
        const tx = x0 + b.c * bw + bw / 2;
        const ty = y0 + b.r * bh + bh / 2;
        const sx = tx + b.ox * wallW;
        const sy = ty + b.oy * ch;
        const cx = sx + (tx - sx) * e;
        const cy = sy + (ty - sy) * e;
        const rot = b.orot * (1 - e);
        const alpha = Math.min(1, local * 1.4);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        // brick body
        const settled = local > 0.98;
        ctx.fillStyle = settled ? 'rgba(20,24,33,0.96)' : 'rgba(28,34,46,0.92)';
        const w = bw - gap, h = bh - gap;
        const rr = Math.min(4, w * 0.12);
        roundRect(ctx, -w / 2, -h / 2, w, h, rr);
        ctx.fill();
        // edge — warms to accent as it locks in
        ctx.lineWidth = 1;
        ctx.strokeStyle = settled ? `rgba(255,122,47,${0.10 + 0.14 * p})` : 'rgba(255,255,255,0.08)';
        ctx.stroke();
        // inner memory glyph (a small mote) once mostly settled
        if (local > 0.7) {
          ctx.globalAlpha = (local - 0.7) / 0.3;
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.beginPath(); ctx.arc(0, 0, Math.min(w, h) * 0.10, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });

      // once the wall is essentially built, a seam of light sweeps + seals
      const seal = clamp01((p - 0.8) / 0.2);
      if (seal > 0) {
        ctx.save();
        ctx.globalAlpha = seal * 0.9;
        const grd = ctx.createLinearGradient(x0, 0, x0 + wallW, 0);
        grd.addColorStop(0, 'rgba(255,122,47,0)');
        grd.addColorStop(0.5, `rgba(255,122,47,${0.5 * seal})`);
        grd.addColorStop(1, 'rgba(255,122,47,0)');
        ctx.strokeStyle = grd; ctx.lineWidth = 2;
        ctx.strokeRect(x0 - 2, y0 - 2, wallW + 4, wallH + 4);
        // soft outer glow
        ctx.shadowColor = 'rgba(255,122,47,0.35)'; ctx.shadowBlur = 40 * seal;
        ctx.strokeRect(x0 - 2, y0 - 2, wallW + 4, wallH + 4);
        ctx.restore();
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    window.addEventListener('resize', resize);
    resize();

    const cine = (on) => () => document.documentElement.classList.toggle('cinematic-mode', on);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        pin: pinRef.current,
        invalidateOnRefresh: true,
        onEnter: cine(true), onEnterBack: cine(true),
        onLeave: cine(false), onLeaveBack: cine(false),
      },
    });
    tl.to(state, { p: 1, duration: 1, ease: 'none', onUpdate: draw }, 0);
    stepRefs.current.forEach((el, idx) => {
      if (!el) return;
      tl.fromTo(el, { opacity: 0.12, x: 16 }, { opacity: 1, x: 0, duration: 0.07, ease: 'power2.out' }, Math.min(STEPS[idx].at, 0.93));
    });

    return () => {
      window.removeEventListener('resize', resize);
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
      document.documentElement.classList.remove('cinematic-mode');
    };
  }, []);

  if (reduced) {
    return (
      <section className="relative w-full overflow-hidden bg-[#05070f]">
        <div className="relative flex h-[64svh] w-full items-center justify-center overflow-hidden">
          {/* static "sealed wall" poster (CSS grid of bricks) */}
          <div className="grid gap-1.5 opacity-90" style={{ gridTemplateColumns: 'repeat(9, 1fr)', width: '78%' }}>
            {Array.from({ length: 54 }).map((_, i) => (
              <div key={i} className="aspect-[3/2] rounded-[3px] border border-[#ff7a2f]/15 bg-[#141821]" />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 120px rgba(255,122,47,0.12)' }} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#05070f] to-transparent p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/50">Act II · The Wall</p>
            <h2 className="mt-2 font-['Space_Grotesk'] text-3xl font-semibold leading-tight text-white">Memory stays inside your walls.</h2>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.28em] text-[#ff7a2f]/80">Sovereign by design</p>
          </div>
        </div>
        <ol className="relative mx-6 my-10 border-l border-white/12 pl-6">
          {STEPS.map((s, i) => (
            <li key={i} className="relative mb-7 last:mb-0">
              <span className={`absolute -left-[29px] top-[7px] h-2.5 w-2.5 rounded-full ${s.accent ? 'bg-[#ff7a2f] shadow-[0_0_12px_rgba(255,122,47,0.7)]' : 'bg-white/70'}`} />
              <p className={`font-['Space_Grotesk'] text-[18px] font-medium leading-snug tracking-tight ${s.accent ? 'text-white' : 'text-white/90'}`}>{s.label}</p>
              {s.sub && <p className="mt-1 font-mono text-[11px] tracking-[0.32em] text-[#ff7a2f]/80">{s.sub}</p>}
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section ref={wrapRef} className="relative w-full bg-[#05070f]" style={{ height: '360vh' }}>
      <div ref={pinRef} className="relative h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ display: 'block' }} />

        {/* left vertical Act label */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[280px] bg-gradient-to-r from-[#05070f]/70 via-[#05070f]/20 to-transparent" />
        <div className="pointer-events-none absolute left-8 top-1/2 z-10 -translate-y-1/2 md:left-12 lg:left-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-white/45">Act II</p>
          <h2 className="mt-3 font-['Space_Grotesk'] text-5xl font-bold uppercase leading-none tracking-tight text-white/90"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            THE WALL
          </h2>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-[#ff7a2f]/80">Sovereign by design</p>
        </div>

        {/* right narration rail */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[440px] bg-gradient-to-l from-[#05070f]/80 via-[#05070f]/30 to-transparent" />
        <div className="pointer-events-none absolute right-8 top-1/2 z-10 w-[340px] -translate-y-1/2 md:right-12 lg:right-16">
          <ol className="relative ml-3 border-l border-white/12">
            {STEPS.map((s, i) => (
              <li key={i} ref={(el) => (stepRefs.current[i] = el)} className="relative mb-9 pl-6 last:mb-0" style={{ opacity: 0.12 }}>
                <span className={`absolute -left-[5px] top-[7px] h-2.5 w-2.5 rounded-full ${s.accent ? 'bg-[#ff7a2f] shadow-[0_0_12px_rgba(255,122,47,0.7)]' : 'bg-white/70'}`} />
                <p className={`font-['Space_Grotesk'] text-[17px] font-medium leading-snug tracking-tight ${s.accent ? 'text-white' : 'text-white/90'}`}>{s.label}</p>
                {s.sub && <p className="mt-1 font-mono text-[11px] tracking-[0.32em] text-[#ff7a2f]/80">{s.sub}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default WallScene;
