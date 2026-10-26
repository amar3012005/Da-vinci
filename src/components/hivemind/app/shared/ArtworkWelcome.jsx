import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import '../pages/connectors-welcome.css';
import { isIntroDismissed, markIntroDismissed } from './intro-dismissal';

// Native modal semantics keep background content inert and contain focus.
// A dismissKey from introDismissalKey persists every close, so the intro stays closed on later visits.
export default function ArtworkWelcome({ artwork, title, closeLabel, actionLabel, onAction, children, cardClassName = '', dismissKey = null }) {
  const [open, setOpen] = useState(() => !isIntroDismissed(dismissKey));
  const dialog = useRef(null);
  const close = () => { markIntroDismissed(dismissKey); setOpen(false); };
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const element = dialog.current;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<dialog ref={dialog} className="connectors-welcome" aria-label={title} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className={`connectors-welcome-card ${cardClassName}`}>
      <header className="feature-welcome-chrome"><span className="feature-window-dots" aria-hidden="true"><i/><i/><i/></span></header>
      <button type="button" className="connectors-welcome-close" aria-label={closeLabel} onClick={close} autoFocus><X size={20}/></button>
      {children || <div className="connectors-welcome-artwork"><img src={artwork.image} alt={artwork.alt} width="1672" height="941" style={{ transform: `scale(${artwork.zoom ?? 1.45})` }} /></div>}
      <div className="connectors-welcome-action"><button type="button" onClick={() => { dialog.current.close(); close(); onAction?.(); }}>{actionLabel}</button></div>
    </div>
  </dialog>, document.body);
}
