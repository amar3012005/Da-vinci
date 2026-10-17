import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { proactiveIntelligenceArtwork } from '../shared/proactive-intelligence';
import './connectors-welcome.css';

// Each entry to the Connectors page gets its own dismissible introduction.
export default function ConnectorsWelcome() {
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
  return createPortal(<dialog ref={dialog} className="connectors-welcome" aria-label="Unlock ProActive Intelligence" onCancel={event => { event.preventDefault(); setOpen(false); }} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
    <div className="connectors-welcome-card">
      <button type="button" className="connectors-welcome-close" aria-label="Close connectors introduction" onClick={() => setOpen(false)} autoFocus><X size={20}/></button>
      <img src={proactiveIntelligenceArtwork.image} alt={proactiveIntelligenceArtwork.alt} width="1050" height="600" />
      <div className="connectors-welcome-action"><button type="button" onClick={() => setOpen(false)}>Connect apps</button></div>
    </div>
  </dialog>, document.body);
}
