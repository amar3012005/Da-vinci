import React, { Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Gauge, CreditCard, Settings, Cpu, Bell, X } from 'lucide-react';
import { useSidebarCopy } from '../layout/sidebar-copy';
import { useIsPhone } from './useIsPhone';
/** `label` is the English default; the visible text is `sidebar.accountDialog.<copyKey>`. */
const sections = [
  { id: 'profile', copyKey: 'profile', label: 'Profile', icon: User, page: React.lazy(() => import('../pages/Profile')) },
  { id: 'usage', copyKey: 'usage', label: 'Usage', icon: Gauge, page: React.lazy(() => import('../pages/Usage')) },
  { id: 'ai-models', copyKey: 'aiModels', label: 'AI Models', icon: Cpu, page: React.lazy(() => import('../pages/AIModels')) },
  { id: 'billing', copyKey: 'billing', label: 'Billing', icon: CreditCard, page: React.lazy(() => import('../pages/Billing')) },
  { id: 'notifications', copyKey: 'notifications', label: 'Notifications & permissions', icon: Bell, page: React.lazy(() => import('../pages/NotificationSettings')) },
  { id: 'settings', copyKey: 'settings', label: 'Settings', icon: Settings, page: React.lazy(() => import('../pages/Settings')) },
];
export default function AccountSettingsDialog({ onClose }) {
  const s = useSidebarCopy();
  const sectionLabel = section => s(`accountDialog.${section.copyKey}`, section.label);
  const phone = useIsPhone();
  const [selected, setSelected] = useState('profile');
  const [dragY, setDragY] = useState(0);
  const [entered, setEntered] = useState(false);
  const drag = useRef(null);
  const activePill = useRef(null);
  const panel = useRef(null);
  const Page = sections.find(section => section.id === selected).page;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current.querySelector('button')?.focus();
    const keyboard = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = [...panel.current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex="0"]')].filter(item => item.getClientRects().length);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, [onClose]);
  useEffect(() => { if (phone) activePill.current?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }, [phone, selected]);
  useEffect(() => { const frame = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(frame); }, []);
  const sheetTouch = {
    onTouchStart: event => { drag.current = event.touches[0].clientY; },
    onTouchMove: event => { if (drag.current != null) setDragY(Math.max(0, event.touches[0].clientY - drag.current)); },
    onTouchEnd: () => { const far = dragY > 90; drag.current = null; setDragY(0); if (far) onClose(); },
  };
  if (phone) {
    const title = s('accountDialog.title', 'Account & Settings');
    return createPortal(<div className="fixed inset-0 z-[120] flex items-end bg-black/35 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={panel} role="dialog" aria-modal="true" aria-label={title} data-layout="phone" style={{ transform: dragY ? `translateY(${dragY}px)` : entered ? 'none' : 'translateY(100%)', transition: dragY ? 'none' : 'transform 240ms cubic-bezier(.2,.8,.2,1)', height: 'calc(100dvh - max(env(safe-area-inset-top), 12px))' }} className="relative flex w-full flex-col overflow-hidden rounded-t-[28px] bg-[#f7f7f5] shadow-2xl">
        <header {...sheetTouch} className="shrink-0 bg-[#f7f7f5] px-4 pb-3 pt-2">
          <div aria-hidden="true" className="mx-auto mb-1 h-1 w-9 rounded-full bg-[#111]/20"/>
          <div className="flex min-h-[44px] items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-[17px] font-semibold tracking-[-0.01em] text-[#111]">{title}</h2>
            <button type="button" aria-label={s('accountDialog.close', 'Close account settings')} onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#111] shadow-[0_0_0_1px_rgba(17,17,17,.08)] active:bg-[#efefed]"><X size={20}/></button>
          </div>
          <nav aria-label={s('accountDialog.sections', 'Account sections')} data-testid="account-section-pills" className="-mx-4 mt-2 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map(section => { const on = selected === section.id; return <button key={section.id} ref={on ? activePill : null} type="button" aria-current={on ? 'page' : undefined} aria-label={sectionLabel(section)} onClick={() => setSelected(section.id)} className={`inline-flex h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full px-4 text-[15px] font-medium transition-colors duration-200 ${on ? 'bg-[#111] text-white' : 'bg-white text-[#525252] shadow-[0_0_0_1px_rgba(17,17,17,.08)] active:bg-[#efefed]'}`}><section.icon size={18} aria-hidden="true"/>{sectionLabel(section)}</button>; })}
          </nav>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain border-t border-[#111]/[.08] px-4 pb-[max(env(safe-area-inset-bottom),24px)] pt-4"><Suspense fallback={<p role="status">{s('accountDialog.opening', 'Opening {{section}}…', { section: sectionLabel(sections.find(section => section.id === selected)) })}</p>}><Page/></Suspense></div>
      </section>
    </div>, document.body);
  }
  return createPortal(<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-3 backdrop-blur-[2px] sm:p-8" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panel} role="dialog" aria-modal="true" aria-label={s('accountDialog.title', 'Account & Settings')} className="relative flex h-[min(86dvh,900px)] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl border border-[#e3e0db] bg-white shadow-2xl md:flex-row">
      <button type="button" aria-label={s('accountDialog.close', 'Close account settings')} onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg bg-white hover:bg-[#f3f1ec]"><X size={18}/></button>
      <nav aria-label={s('accountDialog.sections', 'Account sections')} className="shrink-0 border-b border-[#e3e0db] bg-[#faf9f7] p-4 md:w-[220px] md:border-b-0 md:border-r">
        <h2 className="mb-4 pr-8 text-sm font-semibold text-[#525252]">{s('accountDialog.title', 'Account & Settings')}</h2>
        <div className="flex gap-1 overflow-x-auto md:flex-col">{sections.map(section => <button key={section.id} type="button" aria-current={selected === section.id ? 'page' : undefined} onClick={() => setSelected(section.id)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${selected === section.id ? 'bg-[#e9e7e3] font-medium text-black' : 'text-[#525252] hover:bg-[#f0eeea]'}`}><section.icon size={18}/>{sectionLabel(section)}</button>)}</div>
      </nav>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-12 sm:px-8"><Suspense fallback={<p role="status">{s('accountDialog.opening', 'Opening {{section}}…', { section: sectionLabel(sections.find(section => section.id === selected)) })}</p>}><Page/></Suspense></div>
    </section>
  </div>, document.body);
}
