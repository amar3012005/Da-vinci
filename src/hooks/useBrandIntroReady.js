import { useEffect } from 'react';

/**
 * The opening intro is an inline overlay in public/index.html (window.__sgIntro).
 * It dismisses itself at the end of its timeline; this hook only tells it the
 * app's first screen has mounted and the page has loaded, so the dissolve may
 * start. The intro never delays data: it holds at most until 4 s, ready or not.
 */
export function useBrandIntroReady() {
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    const signal = () => { try { window.__sgIntro?.ready?.(); } catch { /* the overlay owns its own timeout */ } };
    const afterPaint = () => {
      raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(signal); });
    };
    if (document.readyState === 'complete') afterPaint();
    else window.addEventListener('load', afterPaint, { once: true });
    return () => {
      window.removeEventListener('load', afterPaint);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
}

/** Turns the optional synthesised "ta-dum" on or off (off by default; browsers may still block audio). */
export function setBrandIntroSound(on) {
  try { window.__sgIntro?.setSound?.(!!on); } catch { /* storage unavailable */ }
}
