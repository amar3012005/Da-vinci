import React, { useEffect, useLayoutEffect, useState } from 'react';
import './ascii-workspace-loading.css';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/+*';

export default function AsciiWorkspaceLoading({ label = 'Connecting…', inline = false }) {
  const [display, setDisplay] = useState(label);
  const runtime = !inline && /^\/hivemind\/app\/employee\/harness(?:\/|$)/.test(window.location.pathname);
  const [center, setCenter] = useState({ left: '50vw', top: '50dvh' });
  useLayoutEffect(() => {
    if (!runtime) return undefined;
    const position = () => {
      try {
        const frame = window.frameElement;
        if (frame) { const box = frame.getBoundingClientRect(); setCenter({ left: window.parent.innerWidth / 2 - box.left, top: window.parent.innerHeight / 2 - box.top }); }
      } catch { /* Cross-origin embedding uses its own viewport center. */ }
    };
    position(); window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [runtime]);
  useEffect(() => {
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let timer;
    const start = () => {
      window.clearInterval(timer);
      setDisplay(label);
      if (motion?.matches || document.documentElement.dataset.nativeReduceMotion === 'true') return;
      let frame = 0;
      timer = window.setInterval(() => {
        frame = (frame + 1) % 48;
        const settled = Math.floor((frame / 24) * label.length);
        setDisplay(Array.from(label, (character, index) =>
          frame >= 24 || index < settled || /\s/.test(character)
            ? character : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        ).join(''));
      }, 65);
    };
    start();
    const appearance = new MutationObserver(start);
    appearance.observe(document.documentElement, { attributes: true, attributeFilter: ['data-native-reduce-motion'] });
    motion?.addEventListener?.('change', start);
    return () => {
      window.clearInterval(timer);
      appearance.disconnect();
      motion?.removeEventListener?.('change', start);
    };
  }, [label]);
  const Tag = inline ? 'span' : 'div';
  return <Tag style={runtime ? center : undefined} className={`ascii-workspace-loading${runtime ? ' ascii-workspace-loading--runtime' : ''}${inline ? ' ascii-workspace-loading--inline' : ''}`} role="status" aria-live="polite">
    <span className="ascii-workspace-loading__label">{label}</span>
    <span aria-hidden="true" className="ascii-workspace-loading__visual">{display}</span>
  </Tag>;
}
