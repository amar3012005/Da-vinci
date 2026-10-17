import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function BrainUpdateBanner({ slides }) {
  const [position, setPosition] = useState(0);
  const items = (Array.isArray(slides) ? slides : [slides]).filter(slide => slide?.image);
  if (!items.length) return <div className="brain-update-banner brain-update-banner-empty" role="img" aria-label="Reserved space for workspace updates" />;
  const index = position % items.length;
  const slide = items[index];
  return <div className="brain-banner-slideshow" role="region" aria-label="Workspace updates" aria-roledescription={items.length > 1 ? 'carousel' : undefined}>
    <NavLink className="brain-update-banner" to={slide.href} aria-label={slide.label}>
      <img src={slide.image} alt="" width="1050" height="600" loading="lazy" />
      {slide.title && <div><strong>{slide.title}</strong><span>{slide.label}</span></div>}
    </NavLink>
    {items.length > 1 && <div className="brain-banner-controls">
      <button type="button" aria-label="Previous banner" onClick={() => setPosition((index + items.length - 1) % items.length)}><ChevronLeft size={14}/></button>
      <span aria-live="polite">{index + 1} / {items.length}</span>
      <button type="button" aria-label="Next banner" onClick={() => setPosition((index + 1) % items.length)}><ChevronRight size={14}/></button>
    </div>}
  </div>;
}
