import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import { useSidebarCopy } from './sidebar-copy';
import { runtimeHostLink } from '../shared/workspace-mode';
import './employee-mobile-roster.css';

/** Same authenticated team projection, presented as a dismissible touch drawer. */
export default function EmployeeMobileNavigation({ activeSection, onClose }) {
  const root = useRef(null);
  const s = useSidebarCopy();
  const [phone, setPhone] = useState(() => window.matchMedia?.('(max-width:600px)').matches ?? true);
  useEffect(() => {
    const query = window.matchMedia?.('(max-width:600px)');
    if (!query) return undefined;
    const changed = () => setPhone(query.matches);
    query.addEventListener?.('change', changed);
    return () => query.removeEventListener?.('change', changed);
  }, []);
  // A Get Started step that opens another page closes the drawer first.
  useEffect(() => {
    window.addEventListener('hm:onboarding-navigate', onClose);
    return () => window.removeEventListener('hm:onboarding-navigate', onClose);
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const focusable = () => [...(document.querySelector('.ha-autonomy-confirm') || root.current.querySelector('[data-mobile-roster-profile]') || root.current).querySelectorAll('button, a[href], input, select, [tabindex="0"]')].filter(node => !node.disabled && !node.closest('[hidden]') && !(phone && node.closest('.mobile-roster-legacy')));
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
  }, [onClose, phone]);
  return <div ref={root} role="dialog" aria-modal="true" aria-label={s('yourTeam', 'Your team')} className="fixed inset-0 z-[70]" data-mobile-employee-navigation style={{ bottom: 'auto', height: 'var(--hm-app-viewport-height, 100dvh)' }}>
    <button type="button" aria-label={s('closeYourTeam', 'Close your team')} onClick={onClose} className="absolute inset-0 bg-black/30" />
    <div className="employee-mobile-roster-frame absolute inset-y-0 left-0 w-[min(300px,85vw)] overflow-hidden bg-[#faf9f4]" onClickCapture={event => {
      const link = event.target.closest('a[href]');
      const destination = link && runtimeHostLink(link.href, window.location.origin);
      if (!destination) return;
      event.preventDefault(); event.stopPropagation(); onClose();
      window.location.assign(destination);
    }} onClick={event => {
      if (event.target.closest('a[href], button[data-agent-room-link], button[data-brain-chat-link]')) onClose();
    }}>
      <Sidebar activeSection={activeSection} collapsed={false} mobileDrawer mobileRoster={phone} />
      <button type="button" aria-label={s('closeTeamNavigation', 'Close team navigation')} onClick={onClose} style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)', fontSize: 24 }} className="employee-mobile-roster-close absolute right-2 z-50 min-w-[44px] min-h-[44px] rounded-full bg-[#faf9f4] text-[#525252]">×</button>
    </div>
  </div>;
}
