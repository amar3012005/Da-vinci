import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import apiClient from '../shared/api-client';
import { useOptionalAuth } from '../auth/AuthProvider';
import { syncScope } from '../shared/sync';
import { NEEDS_YOU, NOTIFICATIONS, registerNeedsYou, registerNotifications } from '../shared/sync/entities';
import { answerNeedsYouCard, fetchNeedsYou } from '../shared/needs-you';
import { agentRoster } from '../shared/agent-roster';
import { openFinalLink } from '../shared/open-final-link';
import AgentAvatar from '../hyperagents/AgentAvatar';
import { haptic, playNeedsYouSound } from '../shared/platform-haptics';
import { deriveNotificationItems, markItemRead, normalizeDeepLink, takeArrivals } from '../shared/notifications/model';
import { loadSettings, saveSettings } from '../shared/notifications/settings';
import { bannerAllowed, createBannerQueue } from '../shared/notifications/banner-rules';
import { readCachedAutonomy } from './AutonomyDial';
import { useCopy } from './sidebar-copy';

const REFRESH_MS = 60000;

/** Follow a notification's link in place. Needs you cards open the employee's room at the card through the sidebar. */
export function openNotification(item) {
  if (item.ref?.source === 'needs_you') { window.dispatchEvent(new CustomEvent('hivemind:open-notification-card', { detail: item.ref })); return; }
  const link = normalizeDeepLink(item.deepLink);
  if (!link) return;
  if (link.startsWith('/') && typeof window.__hmNativeNavigate === 'function') window.__hmNativeNavigate(link);
  else openFinalLink(link);
}

/**
 * Top banner for new bell and Needs you items while the app is open, plus the macOS and browser notifications while it is not focused.
 * Reads the same sync entities as the bell and the Needs you panel; it adds no request of its own beyond a refresh of the Needs you list.
 */
export default function NotificationBannerHost() {
  const tx = useCopy('outerApp.notificationBanner');
  const { user, org } = useOptionalAuth() || {};
  const companyId = org?.id; const userId = user?.id;
  const scope = companyId && userId ? `${userId}:${companyId}` : null;
  const [banner, setBanner] = useState(null);
  const settingsRef = useRef(loadSettings(companyId, userId));
  const levelRef = useRef(readCachedAutonomy(companyId)?.level);
  const queue = useMemo(() => createBannerQueue({ onChange: setBanner }), []);
  const feeds = useRef({ bell: [], needs: [] });

  useEffect(() => () => queue.clear(), [queue]);
  useEffect(() => {
    queue.clear();
    settingsRef.current = loadSettings(companyId, userId);
    levelRef.current = readCachedAutonomy(companyId)?.level;
    const desktop = window.singulanceDesktop;
    const pushPrefs = () => {
      settingsRef.current = loadSettings(companyId, userId);
      try { desktop?.setNotificationPrefs?.({ categories: settingsRef.current.categories, quietHours: settingsRef.current.quietHours }); } catch { /* Older app build. */ }
    };
    const pushLevel = () => { levelRef.current = readCachedAutonomy(companyId)?.level; };
    pushPrefs();
    window.addEventListener('hivemind:notification-settings', pushPrefs);
    window.addEventListener('hivemind:autonomy-changed', pushLevel);
    return () => { window.removeEventListener('hivemind:notification-settings', pushPrefs); window.removeEventListener('hivemind:autonomy-changed', pushLevel); };
  }, [companyId, userId, queue]);

  useEffect(() => {
    if (!scope) return undefined;
    const { engine } = syncScope(companyId, userId);
    registerNotifications(engine, apiClient);
    registerNeedsYou(engine, fetchNeedsYou);
    const seen = new Set();
    const seeded = { bell: false, needs: false };
    feeds.current = { bell: [], needs: [] };
    const desktop = window.singulanceDesktop;
    const itemsFor = () => deriveNotificationItems({ companyId, bell: feeds.current.bell, needsYou: feeds.current.needs, roster: agentRoster.peek(scope) || [] });
    const report = (all) => {
      try {
        desktop?.setUnread?.(all.filter(item => !item.read).length);
        const roster = agentRoster.peek(scope) || [];
        desktop?.setTrayStatus?.({ needsYou: all.filter(item => item.category === 'needs_you').length,
          working: roster.filter(agent => agent?.status === 'working').slice(0, 5).map(agent => ({ name: String(agent.name || ''), step: String(agent.currentStep || '') })) });
      } catch { /* Older app build. */ }
    };
    const deliver = (item) => {
      if (!bannerAllowed(item, { level: levelRef.current, settings: settingsRef.current })) return;
      const focused = document.hasFocus?.() !== false && !document.hidden;
      if (!focused && desktop?.notify) {
        const avatarUrl = (agentRoster.peek(scope) || []).find(agent => agent?.id === item.employee?.id)?.avatarUrl;
        Promise.resolve(desktop.notify({ id: item.id, title: item.employee?.name || item.title, body: item.employee?.name ? item.title : item.body, category: item.category,
          employeeName: item.employee?.name || '', avatarUrl, deepLink: item.deepLink,
          actions: item.category === 'needs_you' ? [{ id: 'open', title: tx('open', 'Open') }, { id: 'not_now', title: tx('notNow', 'Not now') }] : undefined })).catch(() => null);
        return;
      }
      if (!focused) {
        if (item.category === 'needs_you' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            const shown = new Notification(item.employee?.name || tx('needsYou', 'Needs you'), { body: item.title, tag: item.id });
            shown.onclick = () => { window.focus(); openNotification(item); shown.close(); };
          } catch { /* Some browsers refuse constructed notifications. */ }
        }
        return;
      }
      if (item.category === 'needs_you') {
        haptic('warning'); playNeedsYouSound();
        if (typeof Notification !== 'undefined' && Notification.permission === 'default' && !settingsRef.current.askedBrowserPermission) {
          settingsRef.current = saveSettings(companyId, userId, { ...settingsRef.current, askedBrowserPermission: true });
          try { Promise.resolve(Notification.requestPermission()).catch(() => null); } catch { /* Permission API unavailable. */ }
        }
      }
      queue.push(item);
    };
    const onSnapshot = (source) => (snapshot) => {
      feeds.current[source] = snapshot?.items || [];
      const all = itemsFor();
      report(all);
      const mine = all.filter(item => (source === 'bell') === item.id.startsWith('bell:'));
      const gone = new Set(mine.map(item => item.id));
      if (source === 'needs') [...seen].filter(id => id.startsWith('needs_you:') && !gone.has(id)).forEach(id => { seen.delete(id); queue.remove(id); });
      if (!seeded[source]) { seeded[source] = true; mine.forEach(item => seen.add(item.id)); return; }
      takeArrivals(mine, seen).forEach(deliver);
    };
    const unsubscribers = [
      engine.subscribe(NOTIFICATIONS, 'bell', onSnapshot('bell')),
      engine.subscribe(NEEDS_YOU, 'open', onSnapshot('needs')),
    ];
    // The local copy marks what the person has already been told about.
    engine.read(NOTIFICATIONS, 'bell').then(snapshot => { if (snapshot && !seeded.bell) onSnapshot('bell')(snapshot); }).catch(() => null);
    engine.read(NEEDS_YOU, 'open').then(snapshot => { if (snapshot && !seeded.needs) onSnapshot('needs')(snapshot); }).catch(() => null);
    const refresh = () => { if (!document.hidden) engine.refresh(NEEDS_YOU, 'open').catch(() => null); };
    const timer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener('hivemind:employee-status-changed', refresh);
    document.addEventListener('visibilitychange', refresh);
    const offAction = desktop?.onNotificationAction?.(({ id, action }) => {
      const cardId = String(id || '').replace(/^needs_you:/, '');
      // The card route re-checks the card's state; a notification button never approves by itself.
      if (action === 'approve' && cardId) answerNeedsYouCard(cardId, 'approve').then(ok => { if (ok) { haptic('success'); window.dispatchEvent(new Event('hivemind:employee-status-changed')); } });
    });
    // The macOS preload announces notification clicks on window.electron.onDeepLink as singulance://app/<path>;
    // routing in place (history + popstate) avoids a reload when the shell has no native navigate hook.
    const onLink = (href) => {
      const path = normalizeDeepLink(href);
      if (!path.startsWith('/')) return;
      if (window.__hmNativeNavigate) { window.__hmNativeNavigate(path); return; }
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    };
    const offLink = (desktop?.onDeepLink || window.electron?.onDeepLink)?.(onLink);
    return () => {
      unsubscribers.forEach(off => off()); window.clearInterval(timer);
      window.removeEventListener('hivemind:employee-status-changed', refresh); document.removeEventListener('visibilitychange', refresh);
      if (typeof offAction === 'function') offAction(); if (typeof offLink === 'function') offLink();
    };
  }, [scope, companyId, userId, queue, tx]);

  const open = useCallback(() => {
    const current = queue.current;
    if (!current) return;
    queue.dismiss();
    openNotification(current.item);
    markItemRead(current.item, apiClient);
  }, [queue]);

  if (!banner || typeof document === 'undefined') return null;
  const { item, count } = banner;
  const name = item.employee?.name || '';
  const line = count > 1 ? tx('several', '{{count}} new updates from {{name}}', { count, name: name || tx('yourTeam', 'your team') }) : (name ? `${name}: ${item.title}` : item.title);
  const roster = agentRoster.peek(scope) || [];
  const agent = roster.find(entry => entry?.id === item.employee?.id) || { id: item.employee?.id, name };
  return createPortal(<div role={item.category === 'needs_you' ? 'alert' : 'status'} data-notification-banner={item.category}
    className="fixed z-[2147483000] flex items-center gap-3 rounded-[16px] border border-[#e3e0db] bg-white/95 py-2.5 pl-3 pr-2 shadow-xl backdrop-blur"
    style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)', right: 12, left: 12, maxWidth: 380, marginLeft: 'auto' }}>
    <button type="button" onClick={open} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={tx('openAria', 'Open: {{title}}', { title: line })}>
      <span className="shrink-0"><AgentAvatar agent={agent} size={32} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[9px] uppercase tracking-wider text-[#a3a3a3]">{item.category === 'needs_you' ? tx('needsYou', 'Needs you') : item.category === 'briefs' ? tx('brief', 'Brief') : tx('result', 'Result')}</span>
        <span className="block truncate text-[13px] text-[#0a0a0a]">{line}</span>
      </span>
    </button>
    <button type="button" onClick={() => queue.dismiss()} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#a3a3a3] hover:bg-[#f3f1ec]" aria-label={tx('dismiss', 'Dismiss')}><X size={14} /></button>
  </div>, document.body);
}
