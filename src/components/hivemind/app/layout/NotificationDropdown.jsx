import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import './notification-dropdown.css';

export default function NotificationDropdown({ items, anchorRef, onClose, onSelect, renderIcon, relativeTime }) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: 80, right: 12 });
  useLayoutEffect(() => {
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      const height = window.visualViewport?.height || window.innerHeight;
      setPosition({ top: Math.max(12, Math.min((rect?.bottom || 72) + 8, height - 180)), right: window.innerWidth <= 600 ? 12 : Math.max(12, window.innerWidth - (rect?.right || window.innerWidth - 12)) });
    };
    place();
    window.addEventListener('resize', place);
    window.visualViewport?.addEventListener('resize', place);
    return () => { window.removeEventListener('resize', place); window.visualViewport?.removeEventListener('resize', place); };
  }, [anchorRef]);
  useEffect(() => {
    const opener = anchorRef.current;
    panelRef.current?.querySelector('button')?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, [anchorRef]);
  const handleKey = (event) => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const controls = panelRef.current?.querySelectorAll('button:not(:disabled)');
    if (!controls?.length) return;
    const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return createPortal(<div className="hm-notification-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panelRef} role="dialog" aria-modal="true" aria-label="Notifications" className="hm-notification-panel" style={{ '--notice-top': `${position.top}px`, right: position.right }} onKeyDown={handleKey}>
      <header className="hm-notification-header"><div><h2>Notifications</h2><p>Your workspace</p></div><button type="button" className="hm-notification-close" aria-label="Close notifications" onClick={onClose}><X size={20} /></button></header>
      <div className="hm-notification-list">{items.length ? items.map((notice) => <button type="button" key={notice.id} className="hm-notification-row" onClick={() => onSelect(notice)}>
        <span className="hm-notification-icon" aria-hidden="true">{renderIcon(notice)}</span>
        <span className="hm-notification-copy"><strong>{notice.title}</strong>{notice.body ? <span className="hm-notification-body">{notice.body}</span> : null}<time className="hm-notification-time" dateTime={notice.createdAt || notice.created_at}>{relativeTime(notice.createdAt || notice.created_at)}</time></span>
        <span className="hm-notification-status">{!(notice.readAt || notice.read_at) ? <><span className="hm-notification-dot" /><span className="sr-only">Unread</span></> : null}<ChevronRight size={14} aria-hidden="true" /></span>
      </button>) : <p className="hm-notification-empty">You’re all caught up.<span>Workspace updates will appear here.</span></p>}</div>
    </section>
  </div>, document.body);
}
