import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import CompanyDashboard from '../hyperagents/CompanyDashboard';
import WorkspacePopupSurface from './WorkspacePopupSurface';

/** Keep the current room mounted beneath a large company-context reader. */
export default function CompanyWorkspaceOverlay({ onClose }) {
  const container = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    container.current?.querySelector('button')?.focus();
    const keyboard = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = [...container.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]')].filter(item => item.getClientRects().length);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, [onClose]);
  return createPortal(<div className="fixed inset-0 z-[110] grid place-items-center bg-black/35 p-3 sm:p-6 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={container} className="w-full max-w-[1440px] max-h-[calc(100dvh-48px)] overflow-y-auto">
      <WorkspacePopupSurface variant="reader" label="hivemind — company workspace" ariaLabel="Company workspace" onClose={onClose}>
        <div className="flex h-[min(82dvh,960px)] min-h-[320px] flex-col"><CompanyDashboard showTasks={false} showRuntimeInvite={false} allowOnboarding={false} /></div>
      </WorkspacePopupSurface>
    </div>
  </div>, document.body);
}
