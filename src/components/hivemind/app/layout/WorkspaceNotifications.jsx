import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, ChevronRight, Mail, X } from 'lucide-react';
import apiClient from '../shared/api-client';

function GmailMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Gmail" role="img">
      <path fill="#4285f4" d="M3 6.4 12 13l9-6.6V19a2 2 0 0 1-2 2h-2V10.2L12 14 7 10.2V21H5a2 2 0 0 1-2-2Z" />
      <path fill="#34a853" d="M3 6.4V5.8A2.8 2.8 0 0 1 7.4 3.5L12 7l-2.5 1.9Z" />
      <path fill="#fbbc04" d="m12 7 4.6-3.5A2.8 2.8 0 0 1 21 5.8v.6l-7.2 5.3Z" />
      <path fill="#ea4335" d="M3 6.4 7 9.3V21H5a2 2 0 0 1-2-2Zm18 0-4 2.9V21h2a2 2 0 0 0 2-2Z" />
    </svg>
  );
}

function NotificationIcon({ notice, size = 18 }) {
  if (notice?.data?.icon === 'gmail' || notice?.data?.channel === 'email') return <GmailMark size={size} />;
  return <Mail size={size} className="text-[#117dff]" />;
}

function relativeTime(value) {
  const delta = Date.now() - Date.parse(value || '');
  if (!Number.isFinite(delta) || delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export default function WorkspaceNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const initialized = useRef(false);
  const knownIds = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const result = await apiClient.listWorkspaceNotifications({ limit: 30 });
      const next = Array.isArray(result?.items) ? result.items : [];
      const newLifecycle = next.find((notice) => (
        notice.type === 'lifecycle.email.sent'
        && !notice.readAt && !notice.read_at
        && !knownIds.current.has(notice.id)
        && Date.now() - Date.parse(notice.createdAt || notice.created_at || '') < 15 * 60_000
      ));
      next.forEach((notice) => knownIds.current.add(notice.id));
      setItems(next);
      setUnread(Number(result?.unread || 0));
      if (initialized.current && newLifecycle) setToast(newLifecycle);
      initialized.current = true;
    } catch { /* session/bootstrap can still be settling */ }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 5000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const markRead = async (notice) => {
    if (!notice.readAt && !notice.read_at) {
      await apiClient.markWorkspaceNotificationRead(notice.id).catch(() => null);
      setItems((current) => current.map((item) => item.id === notice.id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnread((count) => Math.max(0, count - 1));
    }
    const href = notice?.data?.href;
    if (href) window.location.assign(href);
  };

  return (
    <>
      <div className="relative">
        <button onClick={() => setOpen((value) => !value)} className="relative flex h-8 w-8 items-center justify-center rounded-[6px] text-[#737373] transition-colors hover:bg-[#f3f1ec] hover:text-[#0a0a0a]" aria-label="Notifications">
          <Bell size={15} />
          {unread > 0 ? <span className="absolute right-0.5 top-0.5 min-w-[14px] rounded-full bg-[#117dff] px-1 text-center text-[8px] font-bold leading-[14px] text-white">{unread > 9 ? '9+' : unread}</span> : null}
        </button>
        <AnimatePresence>
          {open ? (
            <motion.section initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-0 top-10 z-50 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden border border-[#e3e0db] bg-white shadow-xl">
              <header className="flex items-center justify-between border-b border-[#eae7e1] px-4 py-3"><div><div className="text-[12px] font-semibold text-[#0a0a0a]">Notifications</div><div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-[#a3a3a3]">Your workspace lifecycle</div></div><button onClick={() => setOpen(false)} className="p-1 text-[#a3a3a3] hover:text-[#0a0a0a]" aria-label="Close notifications"><X size={14} /></button></header>
              <div className="max-h-[420px] overflow-y-auto">
                {items.length ? items.map((notice) => {
                  const isRead = Boolean(notice.readAt || notice.read_at);
                  return <button key={notice.id} onClick={() => markRead(notice)} className="flex w-full items-start gap-3 border-b border-[#eae7e1] px-4 py-3 text-left transition-colors hover:bg-[#faf9f4]"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center border border-[#e3e0db] bg-white"><NotificationIcon notice={notice} /></span><span className="min-w-0 flex-1"><span className="flex items-start gap-2"><span className="flex-1 text-[11px] font-semibold leading-4 text-[#0a0a0a]">{notice.title}</span>{!isRead ? <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#117dff]" /> : <Check size={11} className="mt-0.5 text-[#a3a3a3]" />}</span>{notice.body ? <span className="mt-1 block text-[10px] leading-4 text-[#737373]">{notice.body}</span> : null}<span className="mt-1.5 block font-mono text-[9px] text-[#a3a3a3]">{relativeTime(notice.createdAt || notice.created_at)}</span></span><ChevronRight size={13} className="mt-2 shrink-0 text-[#a3a3a3]" /></button>;
                }) : <div className="px-4 py-10 text-center text-[11px] text-[#a3a3a3]">No notifications yet.</div>}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.aside initial={{ opacity: 0, x: 72 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 72 }} transition={{ type: 'spring', stiffness: 360, damping: 30 }} className="fixed right-3 top-16 z-[70] w-[360px] max-w-[calc(100vw-24px)] border border-[#e3e0db] bg-white shadow-xl">
            <div className="flex items-start gap-3 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center border border-[#e3e0db]"><NotificationIcon notice={toast} size={20} /></span><button onClick={() => markRead(toast)} className="min-w-0 flex-1 text-left"><span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-[#117dff]">Email delivered</span><span className="mt-1 block text-[12px] font-semibold leading-4 text-[#0a0a0a]">{toast.title}</span><span className="mt-1 block text-[10px] leading-4 text-[#737373]">Look in your email inbox for the full report.</span></button><button onClick={() => setToast(null)} className="p-1 text-[#a3a3a3] hover:text-[#0a0a0a]" aria-label="Dismiss"><X size={13} /></button></div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
