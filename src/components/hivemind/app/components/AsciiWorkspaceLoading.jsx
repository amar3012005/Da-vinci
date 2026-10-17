import React, { useEffect, useState } from 'react';
import './ascii-workspace-loading.css';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/+*';

export default function AsciiWorkspaceLoading({ label = 'Connecting…', inline = false }) {
  const [display, setDisplay] = useState(label);
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
  return <Tag className={`ascii-workspace-loading${inline ? ' ascii-workspace-loading--inline' : ''}`} role="status" aria-live="polite">
    <span className="ascii-workspace-loading__label">{label}</span>
    <span aria-hidden="true" className="ascii-workspace-loading__visual">{display}</span>
  </Tag>;
}
