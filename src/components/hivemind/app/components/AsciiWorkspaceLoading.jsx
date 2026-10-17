import React, { useEffect, useState } from 'react';
import './ascii-workspace-loading.css';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/+*';

export default function AsciiWorkspaceLoading({ label = 'Connecting…' }) {
  const [display, setDisplay] = useState(label);
  useEffect(() => {
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let timer;
    const start = () => {
      window.clearInterval(timer);
      setDisplay(label);
      if (motion?.matches) return;
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
    motion?.addEventListener?.('change', start);
    return () => {
      window.clearInterval(timer);
      motion?.removeEventListener?.('change', start);
    };
  }, [label]);
  return <div className="ascii-workspace-loading" role="status" aria-live="polite">
    <span className="ascii-workspace-loading__label">{label}</span>
    <span aria-hidden="true" className="ascii-workspace-loading__visual">{display}</span>
  </div>;
}
