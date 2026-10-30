import React, { Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Gauge, CreditCard, Settings, Cpu, X } from 'lucide-react';
import { useSidebarCopy } from '../layout/sidebar-copy';
/** `label` is the English default; the visible text is `sidebar.accountDialog.<copyKey>`. */
const sections = [
  { id: 'profile', copyKey: 'profile', label: 'Profile', icon: User, page: React.lazy(() => import('../pages/Profile')) },
  { id: 'usage', copyKey: 'usage', label: 'Usage', icon: Gauge, page: React.lazy(() => import('../pages/Usage')) },
  { id: 'ai-models', copyKey: 'aiModels', label: 'AI Models', icon: Cpu, page: React.lazy(() => import('../pages/AIModels')) },
  { id: 'billing', copyKey: 'billing', label: 'Billing', icon: CreditCard, page: React.lazy(() => import('../pages/Billing')) },
  { id: 'settings', copyKey: 'settings', label: 'Settings', icon: Settings, page: React.lazy(() => import('../pages/Settings')) },
];
export default function AccountSettingsDialog({ onClose }) {
  const s = useSidebarCopy();
  const sectionLabel = section => s(`accountDialog.${section.copyKey}`, section.label);
  const [selected, setSelected] = useState('profile');
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
