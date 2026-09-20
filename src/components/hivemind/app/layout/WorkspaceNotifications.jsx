import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, ChevronRight, Mail, X } from 'lucide-react';
import apiClient from '../shared/api-client';
import WorkspacePopupSurface from '../shared/WorkspacePopupSurface';
import AgentAvatar from '../hyperagents/AgentAvatar';

export function GmailMark({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Gmail" role="img">
    <path fill="#4285f4" d="M3 6.4 12 13l9-6.6V19a2 2 0 0 1-2 2h-2V10.2L12 14 7 10.2V21H5a2 2 0 0 1-2-2Z" />
    <path fill="#34a853" d="M3 6.4V5.8A2.8 2.8 0 0 1 7.4 3.5L12 7l-2.5 1.9Z" />
    <path fill="#fbbc04" d="m12 7 4.6-3.5A2.8 2.8 0 0 1 21 5.8v.6l-7.2 5.3Z" />
    <path fill="#ea4335" d="M3 6.4 7 9.3V21H5a2 2 0 0 1-2-2Zm18 0-4 2.9V21h2a2 2 0 0 0 2-2Z" />
  </svg>;
}

function NotificationIcon({ notice, size = 18 }) {
  if (notice?.data?.icon === 'gmail' || notice?.data?.channel === 'email' || notice?.type === 'lifecycle.email.sent') return <GmailMark size={size} />;
  return <Mail size={size} className="text-[#117dff]" />;
}

function relativeTime(value) {
  const delta = Date.now() - Date.parse(value || '');
  if (!Number.isFinite(delta) || delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export function lifecycleDay(notice) {
  const day = Number(notice?.data?.lifecycle_day);
  return Number.isFinite(day) ? day : null;
}

function noticeSeenKey(notice) { return `hm_lifecycle_notice_seen:${notice.id}`; }

function LifecycleVisual({ notice }) {
  const day = lifecycleDay(notice);
  return <div className="flex items-center gap-3">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#deddd7] bg-white"><GmailMark size={23} /></span>
    <span className="min-w-0"><strong className="block text-[14px] text-[#181918]">{day === null ? 'Workspace update' : `Day ${day} is ready`}</strong><span className="mt-0.5 block text-[11px] text-[#777]">Delivered to your inbox and notification center</span></span>
  </div>;
}

function DayZeroCompanyBrief({ context }) {
  const company = context?.company || {};
  const employees = Array.isArray(context?.employees) ? context.employees.slice(0, 4) : [];
  const names = employees.map((employee) => employee.name).filter(Boolean);
  const facts = [
    { label: 'Mission', value: company.mission },
    { label: 'Ideal customer', value: company.icp },
    { label: 'Positioning', value: company.positioning },
  ].filter((fact) => fact.value);
  return <>
    <div className="flex items-center gap-4">
      {employees.length ? <div className="flex shrink-0 -space-x-3">{employees.map((employee) => <span key={employee.id || employee.name} className="rounded-full border-2 border-white bg-white shadow-sm"><AgentAvatar agent={employee} size={48} /></span>)}</div> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#deddd7] bg-white"><GmailMark size={25} /></span>}
      <div className="min-w-0"><strong className="block truncate text-[15px] text-[#181918]">{names.length ? names.join(', ') : 'Your HyperAgents'}</strong><span className="mt-1 block text-[11px] leading-4 text-[#777]">completed your company setup</span></div>
    </div>
    {facts.length ? <div className="mt-6 space-y-4 border-t border-[#deddd7] pt-5">{facts.map((fact) => <div key={fact.label}><div className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#347df4]">{fact.label}</div><p className="mt-1.5 line-clamp-3 text-[12px] leading-5 text-[#555750]">{fact.value}</p></div>)}</div> : null}
    <div className="mt-5 flex items-center gap-2 rounded-[10px] bg-white px-3 py-2.5 text-[10.5px] text-[#686a64]"><GmailMark size={17} /><span>Your Day 0 report was delivered to your inbox.</span></div>
  </>;
}

function AnnouncementBrief({ announcement, context }) {
  const content = announcement?.content || {};
  const requestedAgents = Array.isArray(content.agent_ids) ? content.agent_ids : [];
  const employees = (context?.employees || []).filter((employee) => !requestedAgents.length || requestedAgents.includes(employee.id)).slice(0, 4);
  const facts = Array.isArray(content.facts) ? content.facts : [];
  return <>
    {employees.length ? <div className="flex items-center gap-3"><div className="flex -space-x-3">{employees.map((employee) => <span key={employee.id} className="rounded-full border-2 border-white bg-white shadow-sm"><AgentAvatar agent={employee} size={46} /></span>)}</div><div><strong className="block text-[14px] text-[#181918]">{employees.map((employee) => employee.name).filter(Boolean).join(', ')}</strong><span className="mt-1 block text-[11px] text-[#777]">Your Humation team contributed to this update</span></div></div> : null}
    {facts.length ? <div className="mt-5 space-y-3 border-t border-[#deddd7] pt-4">{facts.map((fact, index) => <div key={`${fact.label}-${index}`}><div className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#347df4]">{fact.label}</div><p className="mt-1 text-[12px] leading-5 text-[#555750]">{fact.value}</p></div>)}</div> : null}
  </>;
}

export default function WorkspaceNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null);
  const [lifecycleContext, setLifecycleContext] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [announcementContext, setAnnouncementContext] = useState(null);
  const initialized = useRef(false);
  const knownIds = useRef(new Set());
  const announcementId = useRef(null);

  const unseenLifecycle = useCallback((notices) => notices.find((notice) => {
    if (notice.type !== 'lifecycle.email.sent' || notice.readAt || notice.read_at) return false;
    try { return window.localStorage.getItem(noticeSeenKey(notice)) !== 'seen'; }
    catch { return true; }
  }), []);

  const load = useCallback(async () => {
    try {
      const result = await apiClient.listWorkspaceNotifications({ limit: 30 });
      const next = Array.isArray(result?.items) ? result.items : [];
      const persistedLifecycle = unseenLifecycle(next);
      const newlyPersisted = next.find((notice) => !knownIds.current.has(notice.id));
      next.forEach((notice) => knownIds.current.add(notice.id));
      setItems(next);
      setUnread(Number(result?.unread || 0));
      // The popup can only originate from a row returned by the durable
      // notification API. On a fresh app entry, surface the newest unread row;
      // during polling, surface only a newly inserted lifecycle row.
      const lifecycleToast = !initialized.current ? persistedLifecycle : newlyPersisted?.type === 'lifecycle.email.sent' ? newlyPersisted : null;
      if (lifecycleToast) setToast(lifecycleToast);
      initialized.current = true;
      if (!lifecycleToast && !announcementId.current) {
        const nextAnnouncement = await apiClient.nextWorkspaceAnnouncement().catch(() => null);
        if (nextAnnouncement?.announcement) {
          announcementId.current = nextAnnouncement.announcement.id;
          setAnnouncement(nextAnnouncement.announcement);
        }
      }
    } catch { /* session/bootstrap can still be settling */ }
  }, [unseenLifecycle]);

  useEffect(() => { load(); const interval = window.setInterval(load, 5000); return () => window.clearInterval(interval); }, [load]);
  useEffect(() => {
    if (!toast || lifecycleDay(toast) !== 0) { setLifecycleContext(null); return undefined; }
    let active = true;
    apiClient.hyperCompany().then((result) => { if (active) setLifecycleContext(result); }).catch(() => null);
    return () => { active = false; };
  }, [toast]);
  useEffect(() => {
    if (!announcement || !announcement?.content?.agent_ids?.length) { setAnnouncementContext(null); return undefined; }
    let active = true;
    apiClient.hyperCompany().then((result) => { if (active) setAnnouncementContext(result); }).catch(() => null);
    return () => { active = false; };
  }, [announcement]);

  const rememberShown = (notice) => {
    if (!notice) return;
    try { window.localStorage.setItem(noticeSeenKey(notice), 'seen'); } catch { /* storage can be unavailable */ }
  };
  const markRead = async (notice, { navigate = false } = {}) => {
    rememberShown(notice);
    if (!notice.readAt && !notice.read_at) {
      await apiClient.markWorkspaceNotificationRead(notice.id).catch(() => null);
      setItems((current) => current.map((item) => item.id === notice.id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnread((count) => Math.max(0, count - 1));
    }
    if (navigate && notice?.data?.href) window.location.assign(notice.data.href);
    else if (navigate && notice?.href) window.location.assign(notice.href);
  };

  const dismissToast = async () => {
    const notice = toast;
    if (!notice) return;
    await markRead(notice);
    setToast(null);
  };

  const openDetail = (notice) => { setToast(null); setOpen(false); setDetail(notice); markRead(notice); };
  const dismissAnnouncement = async () => {
    const current = announcement;
    if (!current) return;
    announcementId.current = current.id;
    await apiClient.recordWorkspaceAnnouncementEvent(current.id, 'dismiss').catch(() => null);
    setAnnouncement(null);
  };
  const actOnAnnouncement = async () => {
    const current = announcement;
    if (!current) return;
    announcementId.current = current.id;
    await apiClient.recordWorkspaceAnnouncementEvent(current.id, 'action').catch(() => null);
    const href = current?.content?.cta?.href;
    setAnnouncement(null);
    if (href) window.location.assign(href);
  };

  return <>
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className="relative flex h-8 w-8 items-center justify-center rounded-[6px] text-[#737373] transition-colors hover:bg-[#f3f1ec] hover:text-[#0a0a0a]" aria-label="Notifications"><Bell size={15} />{unread > 0 ? <span className="absolute right-0.5 top-0.5 min-w-[14px] rounded-full bg-[#117dff] px-1 text-center text-[8px] font-bold leading-[14px] text-white">{unread > 9 ? '9+' : unread}</span> : null}</button>
      <AnimatePresence>{open ? <motion.section initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-0 top-10 z-50 w-[390px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[14px] border border-[#e3e0db] bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-[#eae7e1] px-5 py-4"><div><div className="text-[14px] font-semibold text-[#0a0a0a]">Notifications</div><div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#a3a3a3]">Your workspace lifecycle</div></div><button onClick={() => setOpen(false)} className="p-1 text-[#a3a3a3] hover:text-[#0a0a0a]" aria-label="Close notifications"><X size={16} /></button></header>
        <div className="max-h-[480px] overflow-y-auto">{items.length ? items.map((notice) => { const isRead = Boolean(notice.readAt || notice.read_at); return <button key={notice.id} onClick={() => openDetail(notice)} className="flex w-full items-start gap-3 border-b border-[#eae7e1] px-5 py-4 text-left transition-colors hover:bg-[#faf9f4]"><span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center border border-[#e3e0db] bg-white"><NotificationIcon notice={notice} size={21} /></span><span className="min-w-0 flex-1"><span className="flex items-start gap-2"><span className="flex-1 text-[12px] font-semibold leading-5 text-[#0a0a0a]">{notice.title}</span>{!isRead ? <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#117dff]" /> : <Check size={12} className="mt-1 text-[#a3a3a3]" />}</span>{notice.body ? <span className="mt-1 block text-[11px] leading-4 text-[#737373]">{notice.body}</span> : null}<span className="mt-2 block font-mono text-[9px] text-[#a3a3a3]">{relativeTime(notice.createdAt || notice.created_at)}</span></span><ChevronRight size={14} className="mt-3 shrink-0 text-[#a3a3a3]" /></button>; }) : <div className="px-4 py-10 text-center text-[11px] text-[#a3a3a3]">No notifications yet.</div>}</div>
      </motion.section> : null}</AnimatePresence>
    </div>

    {typeof document !== 'undefined' ? createPortal(<AnimatePresence>{toast ? <motion.div className="fixed -bottom-3 left-4 z-[2147483647] w-[min(420px,calc(100vw-28px))] sm:left-6" initial={{ opacity: 1, y: 'calc(100% - 34px)' }} animate={{ y: 0 }} exit={{ opacity: 0, y: 'calc(100% - 34px)' }} transition={{ type: 'spring', stiffness: 190, damping: 25, mass: 0.9 }}>
      <WorkspacePopupSurface variant="toast" label={`hivemind — day ${lifecycleDay(toast) ?? 'update'}`} title={lifecycleDay(toast) === 0 ? 'DAY 0 TASK FINISHED.' : 'Your team moved the company forward.'} description={lifecycleDay(toast) === 0 ? 'Your company is ready. Your brief, first research and new HyperAgents are filed in HIVEMIND.' : (toast.body || 'Your report is ready.')} visual={lifecycleDay(toast) === 0 ? null : <LifecycleVisual notice={toast} />} onClose={dismissToast} secondaryAction={{ label: 'Later', onClick: dismissToast }} primaryAction={{ label: lifecycleDay(toast) === 0 ? 'See Day 0 report' : 'Review update', onClick: () => openDetail(toast) }}>
        {lifecycleDay(toast) === 0 ? <DayZeroCompanyBrief context={lifecycleContext} /> : null}
      </WorkspacePopupSurface>
    </motion.div> : null}</AnimatePresence>, document.body) : null}

    {typeof document !== 'undefined' ? createPortal(<AnimatePresence>{announcement ? <motion.div className={announcement.placement === 'toast' ? 'fixed -bottom-3 left-4 z-[2147483646] w-[min(420px,calc(100vw-28px))] sm:left-6' : announcement.placement === 'banner' ? 'fixed left-1/2 top-5 z-[2147483646] w-[min(680px,calc(100vw-28px))] -translate-x-1/2' : 'fixed inset-0 z-[2147483646] grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]'} initial={{ opacity: 0, y: announcement.placement === 'toast' ? 'calc(100% - 34px)' : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 190, damping: 25, mass: 0.9 }}>
      <div className={announcement.placement === 'toast' ? 'w-full' : 'w-full max-w-[700px]'}><WorkspacePopupSurface variant={announcement.placement === 'toast' ? 'toast' : 'dialog'} label={announcement?.content?.eyebrow || 'hivemind — workspace update'} title={announcement.title} description={announcement.body} onClose={dismissAnnouncement} meta="Saved in notifications" secondaryAction={{ label: 'Later', onClick: dismissAnnouncement }} primaryAction={announcement?.content?.cta ? { label: announcement.content.cta.label, onClick: actOnAnnouncement } : null}>
        <AnnouncementBrief announcement={announcement} context={announcementContext} />
      </WorkspacePopupSurface></div>
    </motion.div> : null}</AnimatePresence>, document.body) : null}

    {typeof document !== 'undefined' ? createPortal(<AnimatePresence>{detail ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2147483647] grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
      <div className="w-full max-w-[700px]"><WorkspacePopupSurface label="hivemind — workspace lifecycle" title={detail.title} description={detail.body} visual={<LifecycleVisual notice={detail} />} onClose={() => setDetail(null)} meta={`${relativeTime(detail.createdAt || detail.created_at)} · saved in notifications`} secondaryAction={{ label: 'Close', onClick: () => setDetail(null) }} primaryAction={(detail.href || detail?.data?.href) ? { label: 'Open workspace', onClick: () => markRead(detail, { navigate: true }) } : null}>
        <div className="mt-6 border-t border-[#deddd7] pt-4 text-[12px] leading-5 text-[#666861]">The in-app notification is the durable record for this update. Email delivery and the popup both refer to this same lifecycle event.</div>
      </WorkspacePopupSurface></div>
    </motion.div> : null}</AnimatePresence>, document.body) : null}
  </>;
}
