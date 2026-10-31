import React, { useEffect, useState } from 'react';
import { useOptionalAuth } from '../auth/AuthProvider';
import { useCopy } from '../layout/sidebar-copy';
import { loadSettings, saveSettings } from '../shared/notifications/settings';
import { haptic, hapticPlatform } from '../shared/platform-haptics';
import { nativePlugin } from '../shared/native-auth';

const CATEGORY_COPY = [
  ['needs_you', 'Needs you', 'Approvals, questions and sign-ins an employee is waiting on. May interrupt.'],
  ['results', 'Results', 'Finished work and real blockers. Quiet and grouped.'],
  ['briefs', 'Briefs', 'Your morning brief and team digest.'],
];

function Toggle({ label, hint, checked, onChange, id }) {
  return <label htmlFor={id} className="flex items-start justify-between gap-4 border-t border-[#eae7e1] py-3 first:border-t-0">
    <span><span className="block text-[14px] font-medium text-[#0a0a0a]">{label}</span>{hint ? <span className="mt-0.5 block text-[12px] text-[#737373]">{hint}</span> : null}</span>
    <input id={id} type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#117dff]" />
  </label>;
}

/** Notifications & permissions: per-category toggles, quiet hours, haptics, sound and each device permission's state. */
export default function NotificationSettings() {
  const tx = useCopy('outerApp.notificationSettings');
  const { user, org } = useOptionalAuth() || {};
  const [settings, setSettings] = useState(() => loadSettings(org?.id, user?.id));
  const [permission, setPermission] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const [loginItem, setLoginItem] = useState(null);
  const desktop = typeof window === 'undefined' ? null : window.singulanceDesktop;
  const platform = typeof window === 'undefined' ? 'web' : window.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : desktop ? 'macos' : 'web';
  useEffect(() => { setSettings(loadSettings(org?.id, user?.id)); }, [org?.id, user?.id]);
  useEffect(() => { Promise.resolve(desktop?.getLoginItem?.()).then(value => { if (value) setLoginItem(Boolean(value.enabled)); }).catch(() => null); }, [desktop]);
  const update = patch => setSettings(current => saveSettings(org?.id, user?.id, { ...current, ...patch }));
  const stateText = { granted: tx('granted', 'Allowed'), denied: tx('denied', 'Blocked in browser settings'), default: tx('notAsked', 'Not asked yet'), unsupported: tx('unsupported', 'Not supported here') }[permission];
  const ask = async () => { try { setPermission(await Notification.requestPermission()); } catch { /* Permission API unavailable. */ } };
  const openSettings = () => { Promise.resolve(nativePlugin?.openSettings?.() ?? desktop?.openSettings?.()).catch(() => null); };
  const quiet = settings.quietHours;
  return <div className="mx-auto max-w-[640px] space-y-8" data-notification-settings>
    <header><h2 className="text-[20px] font-semibold tracking-tight text-[#0a0a0a]">{tx('title', 'Notifications & permissions')}</h2>
      <p className="mt-1 text-[13px] text-[#737373]">{tx('lede', 'Choose what reaches you and when. These choices apply to you in this company on this device.')}</p></header>
    <section aria-label={tx('categories', 'What to tell me')}>
      <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[#a3a3a3]">{tx('categories', 'What to tell me')}</h3>
      {CATEGORY_COPY.map(([id, label, hint]) => <Toggle key={id} id={`notify-${id}`} label={tx(`cat_${id}`, label)} hint={tx(`cat_${id}_hint`, hint)} checked={settings.categories[id]} onChange={value => update({ categories: { ...settings.categories, [id]: value } })} />)}
    </section>
    <section aria-label={tx('quiet', 'Quiet hours')}>
      <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[#a3a3a3]">{tx('quiet', 'Quiet hours')}</h3>
      <Toggle id="notify-quiet" label={tx('quietOn', 'Pause banners at night')} hint={tx('quietHint', 'Local time. Needs you can still reach you.')} checked={quiet.enabled} onChange={value => update({ quietHours: { ...quiet, enabled: value } })} />
      {quiet.enabled ? <div className="flex items-center gap-3 py-2 text-[13px]">
        <label>{tx('from', 'From')} <input type="time" value={quiet.start} onChange={event => event.target.value && update({ quietHours: { ...quiet, start: event.target.value } })} className="ml-1 rounded border border-[#e3e0db] px-2 py-1" /></label>
        <label>{tx('to', 'To')} <input type="time" value={quiet.end} onChange={event => event.target.value && update({ quietHours: { ...quiet, end: event.target.value } })} className="ml-1 rounded border border-[#e3e0db] px-2 py-1" /></label>
      </div> : null}
    </section>
    <section aria-label={tx('feedback', 'Feedback')}>
      <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[#a3a3a3]">{tx('feedback', 'Feedback')}</h3>
      <Toggle id="notify-haptics" label={tx('haptics', 'Haptics')} hint={tx('hapticsHint', 'Light taps for sending, approvals and the autonomy dial. Off when Reduce Motion is on.')} checked={settings.haptics} onChange={value => { update({ haptics: value }); if (value) haptic('selection', { enabled: true }); }} />
      <Toggle id="notify-sound" label={tx('sound', 'Sound for Needs you')} hint={tx('soundHint', 'A short chime when something needs you while the app is open.')} checked={settings.sound} onChange={value => update({ sound: value })} />
    </section>
    <section aria-label={tx('permissions', 'Device permissions')}>
      <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[#a3a3a3]">{tx('permissions', 'Device permissions')}</h3>
      <div className="border-t border-[#eae7e1] py-3 text-[13px]" data-permission="notifications">
        <div className="flex items-center justify-between gap-3"><span className="font-medium text-[#0a0a0a]">{tx('permNotifications', 'Notifications')}</span>
          <span className="text-[#737373]">{platform === 'web' ? stateText : tx('managed', 'Managed by the app')}</span></div>
        {platform === 'web' && permission === 'default' ? <button type="button" onClick={ask} className="mt-2 rounded-full border border-[#e3e0db] px-3 py-1.5 text-[12px] hover:bg-[#f3f1ec]">{tx('allow', 'Allow notifications')}</button> : null}
        {platform !== 'web' ? <button type="button" onClick={openSettings} className="mt-2 rounded-full border border-[#e3e0db] px-3 py-1.5 text-[12px] hover:bg-[#f3f1ec]">{tx('openSettings', 'Open system settings')}</button> : null}
      </div>
      <div className="border-t border-[#eae7e1] py-3 text-[13px]" data-permission="haptics"><div className="flex items-center justify-between gap-3"><span className="font-medium text-[#0a0a0a]">{tx('permHaptics', 'Haptics')}</span>
        <span className="text-[#737373]">{hapticPlatform() === 'none' ? tx('unsupported', 'Not supported here') : tx('available', 'Available')}</span></div></div>
      {loginItem !== null ? <Toggle id="notify-login" label={tx('openAtLogin', 'Open at login')} hint={tx('openAtLoginHint', 'Keeps your team in the menu bar so notifications arrive.')} checked={loginItem} onChange={value => { setLoginItem(value); Promise.resolve(desktop.setLoginItem(value)).then(result => { if (result && typeof result.enabled === 'boolean') setLoginItem(result.enabled); }).catch(() => setLoginItem(!value)); }} /> : null}
    </section>
  </div>;
}
