import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import '../pages/connectors-welcome.css';

// Native modal semantics keep background content inert and contain focus.
export default function ArtworkWelcome({ artwork, title, closeLabel, actionLabel, onAction }) {
  const [open, setOpen] = useState(true);
  const dialog = useRef(null);
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
  return createPortal(<dialog ref={dialog} className="connectors-welcome" aria-label={title} onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
    <div className="connectors-welcome-card">
      <button type="button" className="connectors-welcome-close" aria-label={closeLabel} onClick={() => setOpen(false)} autoFocus><X size={20}/></button>
      <div className="connectors-welcome-artwork"><img src={artwork.image} alt={artwork.alt} width="1050" height="600" /></div>
      <div className="connectors-welcome-action"><button type="button" onClick={() => { dialog.current.close(); setOpen(false); onAction?.(); }}>{actionLabel}</button></div>
    </div>
  </dialog>, document.body);
}
