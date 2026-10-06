import React, { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';

/** Same authenticated team projection, presented as a dismissible touch drawer. */
export default function EmployeeMobileNavigation({ activeSection, onClose }) {
  const root = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const focusable = () => [...root.current.querySelectorAll('button, a[href], input, select, [tabindex="0"]')].filter(node => !node.disabled && !node.closest('[hidden]'));
    focusable()[0]?.focus();
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const nodes = focusable(); const first = nodes[0]; const last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus?.(); };
  }, [onClose]);
  return <div ref={root} role="dialog" aria-modal="true" aria-label="Your team" className="fixed inset-0 z-[70]" data-mobile-employee-navigation>
    <button type="button" aria-label="Close your team" onClick={onClose} className="absolute inset-0 bg-black/30" />
    <div className="absolute inset-y-0 left-0 w-[min(300px,85vw)] overflow-hidden bg-[#faf9f4]" onClick={event => {
      if (event.target.closest('a[href], button[data-agent-room-link]')) onClose();
    }}>
      <Sidebar activeSection={activeSection} collapsed={false} mobileDrawer />
      <button type="button" aria-label="Close team navigation" onClick={onClose} className="absolute top-2 right-2 z-50 min-w-[44px] min-h-[44px] rounded-full bg-[#faf9f4] text-[#525252]" style={{ fontSize: 24 }}>×</button>
    </div>
  </div>;
}
