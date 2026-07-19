import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/**
 * CinematicScrollScene — reusable scroll-scrubbed cinematic (Apple-style).
 * A pinned full-screen <canvas> plays a preloaded webp frame sequence on scroll,
 * or a muted video can be scrubbed by scroll via `videoSrc`.
 * A sleek right-side narration rail reveals script lines top→bottom as you scrub.
 * Reduced-motion / mobile → a single static frame with a headline.
 * Auto-applies the global "cinematic-mode" look (nav hide + letterbox) while in view.
 *
 * Props:
 *   frameDir      — public dir holding f_001.webp … (no leading slash)
 *   frameCount    — number of frames
 *   videoSrc      — optional public video URL for scroll-scrubbing
 *   posterSrc     — optional fallback poster for reduced-motion/mobile
 *   steps         — [{ at: 0..1, label, sub?, accent? }] narration beats
 *   staticFrame   — frame index shown in the reduced-motion fallback
 *   staticHeadline— headline shown in the reduced-motion fallback
 *   heightVh      — scroll length of the section (default 260)
 *   theme         — 'dark' (default, original look) | 'light' (day-mode paper/ink,
 *                    no cinematic-mode nav-hide/letterbox toggle)
 */
const CinematicScrollScene = ({
  frameDir,
  frameCount,
  videoSrc = '',
  posterSrc = '',
  steps = [],
  staticFrame = 0,
  staticHeadline = '',
  heightVh = 260,
  title = '',
  subtitle = '',
  actLabel = 'Act I',
  accentColor = '#ff7a2f',
  theme = 'dark',
  children = null,
}) => {
  const isLight = theme === 'light';
  const bg = isLight ? '#FBFBF8' : '#05070f';
  const inkStrong = isLight ? 'text-[#0a0a0a]/90' : 'text-white/90';
  const inkFull = isLight ? 'text-[#0a0a0a]' : 'text-white';
  const inkMuted = isLight ? 'text-[#52525b]/70' : 'text-white/45';
  const dotDefault = isLight ? 'rgba(10,10,10,0.35)' : 'rgba(255,255,255,0.7)';
  const railBorder = isLight ? 'border-[#e0dbd0]' : 'border-white/12';
  const wrapRef = useRef(null);
  const pinRef = useRef(null);
  const canvasRef = useRef(null);
  const stepRefs = useRef([]);
  const [reduced, setReduced] = useState(false);
  const [activated, setActivated] = useState(false);

  const framePath = (i) => `/${frameDir}/f_${String(i + 1).padStart(3, '0')}.webp`;
  const hasVideo = Boolean(videoSrc);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(max-width: 767px)').matches;
    setReduced(noMotion);
    if (noMotion) return undefined;

    // A frame sequence can be tens of megabytes. Do not compete with the
    // initial application bundle for bandwidth or main-thread work.
    const target = wrapRef.current;
    if (!target || !('IntersectionObserver' in window)) {
      setActivated(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setActivated(true);
        observer.disconnect();
      },
      { rootMargin: '900px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activated || reduced) return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = hasVideo ? document.createElement('video') : null;
    const images = [];
    let loaded = 0;
    const state = { frame: 0 };

    const draw = () => {
      if (video) {
        const cw = window.innerWidth, ch = window.innerHeight;
        const vw = video.videoWidth || 1920;
        const vh = video.videoHeight || 1080;
        const ir = vw / vh, cr = cw / ch;
        let w, h, x, y;
        if (cr > ir) { w = cw; h = cw / ir; x = 0; y = (ch - h) / 2; }
        else { h = ch; w = ch * ir; x = (cw - w) / 2; y = 0; }
        ctx.clearRect(0, 0, cw, ch);
        try { ctx.drawImage(video, x, y, w, h); } catch { /* wait for decodable frame */ }
        return;
      }
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

    if (video) {
      video.src = videoSrc;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      video.addEventListener('loadedmetadata', draw, { once: true });
      video.addEventListener('loadeddata', draw, { once: true });
      video.load();
    } else {
      const makeOnLoad = (i) => () => { loaded++; if (loaded === 1 || Math.round(state.frame) === i) draw(); };
      for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.src = framePath(i);
        img.onload = makeOnLoad(i);
        images[i] = img;
      }
    }

    window.addEventListener('resize', resize);
    resize();

    const cine = (onState) => () => document.documentElement.classList.toggle('cinematic-mode', onState);
    const noop = () => {};

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        pin: pinRef.current,
        invalidateOnRefresh: true,
        onEnter: isLight ? noop : cine(true),
        onEnterBack: isLight ? noop : cine(true),
        onLeave: isLight ? noop : cine(false),
        onLeaveBack: isLight ? noop : cine(false),
      },
    });
    // frame scrub spans the whole timeline (duration 1) so step reveals can be
    // positioned by their `at` fraction and all complete before the pin releases.
    if (video) {
      tl.to(state, {
        frame: 1,
        duration: 1,
        ease: 'none',
        onUpdate: () => {
          const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
          if (duration) {
            const target = Math.min(duration - 0.04, Math.max(0, state.frame * duration));
            if (Math.abs(video.currentTime - target) > 0.035) video.currentTime = target;
          }
          draw();
        },
      }, 0);
    } else {
      tl.to(state, { frame: frameCount - 1, duration: 1, ease: 'none', onUpdate: draw }, 0);
    }

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
      if (!isLight) document.documentElement.classList.remove('cinematic-mode');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activated, hasVideo, videoSrc, isLight, reduced]);

  if (reduced) {
    // mobile / reduced-motion: a tall poster header + the full narration stacked
    // below, so the story (and the per-field pain) survives without scrubbing.
    return (
      <section className="relative w-full overflow-hidden" style={{ background: bg }}>
        <div className="relative h-[72svh] w-full overflow-hidden">
          {hasVideo ? (
            <video src={videoSrc} poster={posterSrc} className="absolute inset-0 h-full w-full object-cover" muted playsInline autoPlay loop preload="metadata" />
          ) : (
            <img src={framePath(staticFrame)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: isLight
                ? 'linear-gradient(to top, #FBFBF8, rgba(251,251,248,0.2), rgba(251,251,248,0.3))'
                : 'linear-gradient(to top, #05070f, rgba(5,7,15,0.2), rgba(5,7,15,0.3))',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 p-6">
            {title && <p className={`font-mono text-[10px] uppercase tracking-[0.42em] ${inkMuted}`}>{actLabel} · {title}</p>}
            <h2 className={`mt-2 font-['Space_Grotesk'] text-3xl font-semibold leading-tight ${inkFull}`}>{staticHeadline}</h2>
            {subtitle && <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: `${accentColor}cc` }}>{subtitle}</p>}
          </div>
        </div>

        {steps.length > 0 && (
          <ol className={`relative mx-6 my-10 border-l pl-6 ${railBorder}`}>
            {steps.map((s, i) => (
              <li key={i} className="relative mb-7 last:mb-0">
                <span
                  className="absolute -left-[29px] top-[7px] h-2.5 w-2.5 rounded-full"
                  style={s.accent ? { background: accentColor, boxShadow: `0 0 12px ${accentColor}b3` } : { background: dotDefault }}
                />
                <p className={`font-['Space_Grotesk'] text-[18px] font-medium leading-snug tracking-tight ${s.accent ? inkFull : inkStrong}`}>{s.label}</p>
                {s.sub && <p className="mt-1 font-mono text-[11px] tracking-[0.32em]" style={{ color: `${accentColor}cc` }}>{s.sub}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }

  return (
    <section ref={wrapRef} className="relative w-full" style={{ height: `${heightVh}vh`, background: bg }}>
      <div ref={pinRef} className="relative h-screen w-full overflow-hidden">
        {activated ? (
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ display: 'block' }} />
        ) : (
          <div className="absolute inset-0" style={{ background: isLight ? 'linear-gradient(135deg, #f7f5ef, #e9eef8)' : 'linear-gradient(135deg, #05070f, #101a34)' }} />
        )}
        {/* scrim on the right so the rail reads over any frame */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[440px]"
          style={{
            background: isLight
              ? 'linear-gradient(to left, rgba(251,251,248,0.85), rgba(251,251,248,0.3), transparent)'
              : 'linear-gradient(to left, rgba(5,7,15,0.8), rgba(5,7,15,0.3), transparent)',
          }}
        />

        {/* left act label — vertical "THE FALL" stage marker */}
        {title && (
          <>
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[280px]"
              style={{
                background: isLight
                  ? 'linear-gradient(to right, rgba(251,251,248,0.7), rgba(251,251,248,0.2), transparent)'
                  : 'linear-gradient(to right, rgba(5,7,15,0.7), rgba(5,7,15,0.2), transparent)',
              }}
            />
            <div className="pointer-events-none absolute left-8 top-1/2 z-10 -translate-y-1/2 md:left-12 lg:left-16">
              <p className={`font-mono text-[10px] uppercase tracking-[0.42em] ${inkMuted}`}>{actLabel}</p>
              <h2
                className={`mt-3 font-['Space_Grotesk'] text-5xl font-bold uppercase leading-none tracking-tight ${inkStrong}`}
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: `${accentColor}cc` }}>{subtitle}</p>
              )}
            </div>
          </>
        )}

        {/* right-side narration rail — script lines reveal top→bottom */}
        <div className="pointer-events-none absolute right-8 top-1/2 z-10 w-[340px] -translate-y-1/2 md:right-12 lg:right-16">
          <ol className={`relative ml-3 border-l ${railBorder}`}>
            {steps.map((s, i) => (
              <li
                key={i}
                ref={(el) => (stepRefs.current[i] = el)}
                className="relative mb-9 pl-6 last:mb-0"
                style={{ opacity: 0.12 }}
              >
                <span
                  className="absolute -left-[5px] top-[7px] h-2.5 w-2.5 rounded-full"
                  style={s.accent ? { background: accentColor, boxShadow: `0 0 12px ${accentColor}b3` } : { background: dotDefault }}
                />
                <p
                  className={`font-['Space_Grotesk'] text-[17px] font-medium leading-snug tracking-tight ${
                    s.accent ? inkFull : inkStrong
                  }`}
                >
                  {s.label}
                </p>
                {s.sub && (
                  <p className="mt-1 font-mono text-[11px] tracking-[0.32em]" style={{ color: `${accentColor}cc` }}>{s.sub}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
        {children}
      </div>
    </section>
  );
};

export default CinematicScrollScene;
