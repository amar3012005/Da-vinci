import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

/**
 * CinematicMode — a floating "Cinematic" toggle (desktop only).
 * Enters real browser fullscreen and adds `cinematic-mode` to <html>, which
 * (via index.css) hides the nav and drops in animated letterbox bars for an
 * IMAX-style frame. Toggling off restores everything. Fully additive/reversible.
 */
const CinematicMode = () => {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => {
      const fs = !!document.fullscreenElement;
      setOn(fs);
      document.documentElement.classList.toggle('cinematic-mode', fs);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.documentElement.classList.remove('cinematic-mode');
    };
  }, []);

  const toggle = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) { /* fullscreen blocked — ignore */ }
  };

  return (
    <button
      onClick={toggle}
      aria-label={on ? 'Exit cinematic mode' : 'Cinematic mode'}
      className="fixed bottom-6 left-6 z-[130] hidden items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white md:inline-flex"
    >
      {on ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      {on ? 'Exit' : 'Cinematic'}
    </button>
  );
};

export default CinematicMode;
