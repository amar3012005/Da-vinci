import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import AsciiBannerTransition from './AsciiBannerTransition';

export default function BrainUpdateBanner({ slides }) {
  const [position, setPosition] = useState(0);
  const items = useMemo(() => (Array.isArray(slides) ? slides : [slides]).filter(slide => slide?.image), [slides]);
  const [transition, setTransition] = useState(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true);
  const finish = useCallback(() => setTransition(null), []);
  const change = useCallback(next => {
    if (!items.length || transition) return;
    const index = position % items.length;
    const target = (next + items.length) % items.length;
    if (target === index) return;
    if (!reducedMotion) setTransition({ from: items[index].image, to: items[target].image });
    setPosition(target);
  }, [items, position, transition, reducedMotion]);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => { setReducedMotion(media?.matches ?? true); if (media?.matches) setTransition(null); };
    const visibility = () => { setHidden(document.hidden); if (document.hidden) setTransition(null); };
    media?.addEventListener?.('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { media?.removeEventListener?.('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (items.length < 2 || paused || hovered || focused || hidden || reducedMotion || transition) return undefined;
    const timer = window.setInterval(() => change(position + 1), 7000);
    return () => window.clearInterval(timer);
  }, [items.length, paused, hovered, focused, hidden, reducedMotion, transition, change, position]);
  if (!items.length) return <div className="brain-update-banner brain-update-banner-empty" role="img" aria-label="Reserved space for workspace updates" />;
  const index = position % items.length;
  const slide = items[index];
  return <div className="brain-banner-slideshow" role="region" aria-label="Workspace updates" aria-roledescription={items.length > 1 ? 'carousel' : undefined} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <NavLink className={`brain-update-banner${transition ? ' is-diffusing' : ''}`} to={slide.href} aria-label={slide.label}>
      <img src={transition?.from || slide.image} alt="" width="1050" height="600" loading="lazy" />
      {transition && <AsciiBannerTransition {...transition} onFinish={finish}/>}
      {slide.title && <div><strong>{slide.title}</strong><span>{slide.label}</span></div>}
    </NavLink>
    {items.length > 1 && <div className="brain-banner-controls">
      <button type="button" aria-label="Previous banner" disabled={!!transition} onClick={() => change(index - 1)}><ChevronLeft size={14}/></button>
      <span aria-live={paused || hovered || focused || reducedMotion ? 'polite' : 'off'}>{index + 1} / {items.length}</span>
      <button type="button" aria-label="Next banner" disabled={!!transition} onClick={() => change(index + 1)}><ChevronRight size={14}/></button>
      {!reducedMotion && <button type="button" aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={12}/> : <Pause size={12}/>}</button>}
    </div>}
  </div>;
}
