import React from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import StoryScreen from './StoryScreen';
import { buildStoryTimeline, STORY_LENGTH } from './storyTimeline';
import { STORY_CHAPTERS, STORY_CTA, STORY_INTRO } from './storyCopy';
import './ProactiveStory.css';

gsap.registerPlugin(ScrollTrigger);

const PHONE_QUERY = '(max-width: 900px)';
const SCROLL_SCREENS = 7.5;

/** Mounts the story when it is about a screen away, so it never delays the first paint. */
export function LazyProactiveStory(props) {
  const ref = React.useRef(null);
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setNear(true); return undefined; }
    const check = () => { if (el.getBoundingClientRect().top < window.innerHeight * 2.5) setNear(true); };
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setNear(true); }, { rootMargin: '1200px 0px' });
    observer.observe(el);
    // Scroll fallback: some embedded views deliver no intersection callbacks.
    window.addEventListener('scroll', check, { passive: true });
    check();
    return () => { observer.disconnect(); window.removeEventListener('scroll', check); };
  }, []);
  return <div ref={ref}>{near ? <ProactiveStory {...props} /> : <div style={{ minHeight: '100vh' }} />}</div>;
}

function useMedia(query) {
  const [matches, setMatches] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  React.useEffect(() => {
    const media = window.matchMedia(query); const sync = () => setMatches(media.matches);
    media.addEventListener('change', sync); return () => media.removeEventListener('change', sync);
  }, [query]);
  return matches;
}

/** Scales the app canvas to the device screen it sits in. */
function useFitCanvas(screenRef, canvasRef, width) {
  React.useLayoutEffect(() => {
    const screen = screenRef.current; const canvas = canvasRef.current;
    if (!screen || !canvas) return undefined;
    const fit = () => { canvas.style.transform = `scale(${screen.clientWidth / width})`; };
    fit();
    const observer = new ResizeObserver(fit); observer.observe(screen);
    return () => observer.disconnect();
  }, [screenRef, canvasRef, width]);
}

function Device({ phone, screenRef, canvasRef, lidRef, glowRef, deviceRef, staticFrame = false }) {
  const screen = <div className="ps-screen" ref={screenRef}><div className="ps-canvas" ref={canvasRef}><StoryScreen phone={phone} /></div>{!staticFrame && <div className="ps-glow" ref={glowRef} />}</div>;
  if (phone) return <div className="ps-iphone" ref={deviceRef}><span className="ps-island" />{screen}</div>;
  return <div className="ps-mac" ref={deviceRef}>
    <div className="ps-lid" ref={lidRef}>
      <div className="ps-lid-back" data-mac-back aria-hidden="true" />
      <div className="ps-bezel"><span className="ps-notch" aria-hidden="true"><i /></span>{screen}{!staticFrame && <span className="ps-sheen" data-mac-sheen aria-hidden="true" />}</div>
    </div>
    <div className="ps-hinge" aria-hidden="true" />
    <div className="ps-base" aria-hidden="true"><span className="ps-scoop" /><span className="ps-foot is-left" /><span className="ps-foot is-right" /></div>
    <span className="ps-shadow" data-mac-shadow aria-hidden="true" />
  </div>;
}

/** Reduced motion: each chapter as text with the screen frozen at the end of that chapter. */
function StaticChapter({ chapter, index, phone }) {
  const screenRef = React.useRef(null); const canvasRef = React.useRef(null); const rootRef = React.useRef(null);
  useFitCanvas(screenRef, canvasRef, phone ? 402 : 1440);
  React.useLayoutEffect(() => {
    const tl = buildStoryTimeline(rootRef.current, { canvas: canvasRef.current, chapterTitles: [], chapterMarks: [], cta: null, lid: null, glow: null, device: null, phone, colors: [] });
    tl.progress(Math.min(1, (index + 1.97) / STORY_LENGTH));
    return () => tl.kill();
  }, [index, phone]);
  return <div className="ps-static-step" ref={rootRef}>
    <div><p className="ps-eyebrow">{String(index + 1).padStart(2, '0')}</p><h2>{chapter.title}</h2><p>{chapter.text}</p></div>
    <div className="ps-device"><Device phone={phone} screenRef={screenRef} canvasRef={canvasRef} staticFrame /></div>
  </div>;
}

/**
 * Homepage product story: a pinned MacBook (an iPhone on narrow screens) plays the real HyperAgents interface
 * chapter by chapter as the visitor scrolls, telling the North Star promise from hiring to the nightly report.
 */
export default function ProactiveStory({ centered = false }) {
  const phone = useMedia(PHONE_QUERY);
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const rootRef = React.useRef(null); const pinRef = React.useRef(null);
  const screenRef = React.useRef(null); const canvasRef = React.useRef(null);
  const lidRef = React.useRef(null); const glowRef = React.useRef(null); const deviceRef = React.useRef(null);
  const titleRefs = React.useRef([]); const markRefs = React.useRef([]); const ctaRef = React.useRef(null);
  useFitCanvas(screenRef, canvasRef, phone ? 402 : 1440);

  React.useLayoutEffect(() => {
    if (reduced || !pinRef.current) return undefined;
    let trigger; let tl;
    const build = () => {
      tl = buildStoryTimeline(rootRef.current, {
        canvas: canvasRef.current, chapterTitles: titleRefs.current.filter(Boolean), chapterMarks: markRefs.current.filter(Boolean),
        cta: ctaRef.current, lid: lidRef.current, glow: glowRef.current, device: deviceRef.current, phone,
        colors: STORY_CHAPTERS.map(chapter => chapter.bg),
      });
      trigger = ScrollTrigger.create({
        trigger: pinRef.current, start: 'top top', end: () => `+=${window.innerHeight * SCROLL_SCREENS}`,
        pin: true, scrub: 0.7, animation: tl, invalidateOnRefresh: false, anticipatePin: 1,
      });
    };
    // Wait for the web fonts so every measured cursor target matches what is drawn.
    let cancelled = false;
    (document.fonts?.ready || Promise.resolve()).then(() => { if (!cancelled) { build(); ScrollTrigger.refresh(); } });
    return () => { cancelled = true; trigger?.kill(); tl?.kill(); };
  }, [phone, reduced]);

  if (reduced) {
    return <section className="ps" aria-labelledby="ps-title" id="how-it-works">
      <div className="ps-static">
        <div><p className="ps-eyebrow">{STORY_INTRO.eyebrow}</p><h2 id="ps-title" className="ps-static-title">{STORY_INTRO.title}</h2><p>{STORY_INTRO.text}</p></div>
        {STORY_CHAPTERS.map((chapter, i) => <StaticChapter key={chapter.id} chapter={chapter} index={i} phone={phone} />)}
        <div className="ps-cta" style={{ opacity: 1, transform: 'none' }}><a className="is-primary" href={STORY_CTA.primary.href}>{STORY_CTA.primary.label}</a><a className="is-secondary" href={STORY_CTA.secondary.href}>{STORY_CTA.secondary.label} ↗</a></div>
      </div>
    </section>;
  }

  return <section className={`ps${centered ? ' is-centered' : ''}`} ref={rootRef} aria-labelledby="ps-title" id="how-it-works">
    <div className="ps-pin" ref={pinRef}>
      <div className="ps-copy">
        <p className="ps-eyebrow">{STORY_INTRO.eyebrow}</p>
        <div className="ps-titles">
          <div className="ps-title" ref={el => { titleRefs.current[0] = el; }}><h2 id="ps-title">{STORY_INTRO.title}</h2><p>{STORY_INTRO.text}</p></div>
          {STORY_CHAPTERS.map((chapter, i) => <div key={chapter.id} className="ps-title" ref={el => { titleRefs.current[i + 1] = el; }}><h2>{chapter.title}</h2><p>{chapter.text}</p></div>)}
        </div>
        <ol className="ps-chapters" aria-label="Chapters">{STORY_CHAPTERS.map((chapter, i) => <li key={chapter.id} ref={el => { markRefs.current[i] = el; }}><i />{chapter.title}</li>)}</ol>
        <div className="ps-cta" ref={ctaRef}><a className="is-primary" href={STORY_CTA.primary.href}>{STORY_CTA.primary.label}</a><a className="is-secondary" href={STORY_CTA.secondary.href}>{STORY_CTA.secondary.label} ↗</a></div>
        <p className="ps-note">{STORY_CTA.note}</p>
      </div>
      <div className="ps-device">
        <div className={phone ? 'ps-phonewrap' : 'ps-macwrap'}><Device phone={phone} screenRef={screenRef} canvasRef={canvasRef} lidRef={lidRef} glowRef={glowRef} deviceRef={deviceRef} /></div>
      </div>
    </div>
  </section>;
}
