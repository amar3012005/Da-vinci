import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { ArrowDownToLine, Bug, X } from 'lucide-react';
import { useSidebarCopy } from './sidebar-copy';
import { useOptionalAuth } from '../auth/AuthProvider';
import { isDismissed, rememberDismissal, sharedUpdateStore } from '../shared/app-update';
import { buildBugReport, sendBugReport } from '../shared/bug-report';
import { nativePlugin } from '../shared/native-auth';

const iconButton = 'relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#525252] hover:bg-[#f3f1ec] hover:text-[#0a0a0a]';
const pill = 'rounded-full bg-[#0a0a0a] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50';

/** Update state of this document: one shared poll, one subscription per mounted control. */
export function useAppUpdate() {
  const store = sharedUpdateStore();
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}

async function openStore(url) {
  try { (await import('@capacitor/browser')).Browser.open({ url }); }
  catch { window.open(url, '_blank', 'noopener'); }
}

/** Runs the platform's update action for the offered update. */
export function runUpdate(update, win = window) {
  if (update.kind === 'reload') win.location.reload();
  else if (update.kind === 'install') win.electron?.installUpdate?.();
  else if (update.kind === 'store') openStore(update.url);
}

function Card({ anchor, label, onClose, children }) {
  const phone = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;
  const rect = anchor?.getBoundingClientRect?.();
  const style = phone || !rect
    ? { left: 8, right: 8, bottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }
    : { left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)), bottom: Math.max(8, window.innerHeight - rect.top + 8), width: 320 };
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[400]" onClick={onClose}>
      <section role="dialog" aria-label={label} onClick={event => event.stopPropagation()} style={style}
        className="fixed rounded-[24px] bg-white p-5 text-[#0a0a0a] shadow-[0_18px_50px_-12px_rgba(0,0,0,.28)] ring-1 ring-black/5">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-[#737373] hover:bg-[#f3f1ec]"><X size={15}/></button>
        {children}
      </section>
    </div>, document.body);
}

function UpdateCard({ update, anchor, onClose, s }) {
  const title = update.kind === 'download' ? s('updateDownloading', 'Downloading an update')
    : update.kind === 'install' ? s('updateReady', 'Update ready') : s('updateAvailable', 'Update available');
  const body = update.kind === 'download' ? s('updateDownloadingBody', 'HIVEMIND {{v}} is downloading. You can keep working.', { v: update.version })
    : update.kind === 'install' ? s('updateReadyBody', 'HIVEMIND {{v}} is downloaded. Restart to use it.', { v: update.version })
      : update.kind === 'store' ? s('updateStoreBody', 'A newer version of the app ({{v}}) is available.', { v: update.version })
        : s('updateReloadBody', 'A new version of HIVEMIND is ready. Reload to use it.');
  const action = update.kind === 'install' ? s('updateRestart', 'Restart to update')
    : update.kind === 'store' ? s('updateOpenStore', 'Open the store') : s('updateReload', 'Reload to update');
  return <Card anchor={anchor} label={title} onClose={onClose}>
    <h2 className="pr-8 text-[17px] font-semibold">{title}</h2>
    <p className="mt-1.5 text-[14px] leading-snug text-[#525252]">{body}</p>
    {update.kind === 'download'
      ? <div role="progressbar" aria-valuenow={update.percent} aria-valuemin={0} aria-valuemax={100} className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#eeece6]"><div className="h-full rounded-full bg-[#0a0a0a] transition-[width]" style={{ width: `${Math.max(update.percent, 4)}%` }}/></div>
      : <div className="mt-4 flex items-center gap-3"><button type="button" className={pill} onClick={() => runUpdate(update)}>{action}</button><button type="button" className="text-[13px] text-[#737373]" onClick={onClose}>{s('updateLater', 'Later')}</button></div>}
  </Card>;
}

function BugCard({ anchor, onClose, s }) {
  const { user, org } = useOptionalAuth() || {};
  const location = useLocation();
  const [text, setText] = useState('');
  const [state, setState] = useState({ phase: 'idle', id: '', error: '' });
  const send = async () => {
    setState({ phase: 'sending', id: '', error: '' });
    try {
      const report = buildBugReport({ text, route: location.pathname, orgId: org?.id, userId: user?.id, appVersion: process.env.REACT_APP_APP_VERSION });
      const { id } = await sendBugReport(report, { plugin: nativePlugin });
      setState({ phase: 'sent', id, error: '' });
    } catch (error) {
      const code = error.code || 'unavailable';
      setState({ phase: 'idle', id: '', error: code === 'sign_in_required' ? s('bugSignIn', 'Sign in again to send a report.')
        : code === 'unavailable' ? s('bugUnavailable', 'Could not send the report right now. Try again in a moment.')
          : s('bugInvalid', 'Describe what went wrong in a few words.') });
    }
  };
  return <Card anchor={anchor} label={s('bugTitle', 'Report a problem')} onClose={onClose}>
    {state.phase === 'sent'
      ? <><h2 className="pr-8 text-[17px] font-semibold">{s('bugThanks', 'Thank you')}</h2>
        <p className="mt-1.5 text-[14px] text-[#525252]">{s('bugSent', 'Report sent. Reference {{id}}.', { id: state.id })}</p>
        <button type="button" className={`${pill} mt-4`} onClick={onClose}>{s('bugDone', 'Done')}</button></>
      : <><h2 className="pr-8 text-[17px] font-semibold">{s('bugTitle', 'Report a problem')}</h2>
        <textarea autoFocus value={text} maxLength={4000} onChange={event => setText(event.target.value)} rows={4}
          aria-label={s('bugTitle', 'Report a problem')} placeholder={s('bugPlaceholder', 'What went wrong?')}
          className="mt-3 w-full resize-none rounded-2xl bg-[#f3f1ec] p-3 text-[14px] outline-none placeholder:text-[#a3a3a3]"/>
        <p className="mt-2 text-[12px] text-[#737373]">{s('bugNote', 'Includes the page you are on and your app version. Screenshots are not attached; describe what you saw.')}</p>
        {state.error && <p role="alert" className="mt-2 text-[13px] text-[#b42318]">{state.error}</p>}
        <div className="mt-3"><button type="button" className={pill} disabled={state.phase === 'sending' || text.trim().length < 3} onClick={send}>{state.phase === 'sending' ? s('bugSending', 'Sending…') : s('bugSend', 'Send')}</button></div></>}
  </Card>;
}

/**
 * Update and bug-report icons for the account row, with their popup cards.
 * The update icon shows only while the platform has something newer; its card also opens once per version after load.
 */
export default function AccountRowTools({ className = '', vertical = false }) {
  const s = useSidebarCopy();
  const { update } = useAppUpdate();
  const root = useRef(null);
  const [panel, setPanel] = useState(null);
  const version = update ? `${update.kind}:${update.version}` : '';
  useEffect(() => {
    // Hidden twins (the legacy footer under the phone roster) must not open a second card.
    if (!update || update.kind === 'download' || isDismissed(version) || !root.current?.offsetParent) return;
    setPanel('update');
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { if (panel === 'update' && update) rememberDismissal(version); setPanel(null); };
  return <div ref={root} data-account-row-tools className={`flex items-center gap-0.5 ${vertical ? 'flex-col' : ''} ${className}`}>
    {update && <button type="button" data-update-button aria-label={s('updateAvailable', 'Update available')} title={s('updateAvailable', 'Update available')} className={iconButton} onClick={() => setPanel('update')}>
      <ArrowDownToLine size={16}/><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#117dff] ring-2 ring-[#faf9f4]"/></button>}
    <button type="button" data-bug-button aria-label={s('bugTitle', 'Report a problem')} title={s('bugTitle', 'Report a problem')} className={iconButton} onClick={() => setPanel('bug')}><Bug size={16}/></button>
    {panel === 'update' && update && <UpdateCard update={update} anchor={root.current} onClose={close} s={s}/>}
    {panel === 'bug' && <BugCard anchor={root.current} onClose={close} s={s}/>}
  </div>;
}
