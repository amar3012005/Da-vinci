import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';
import { useSidebarCopy } from './sidebar-copy';

// Company pages never provision employees. Native workspace entry does.
// Activation runs silently; only a pending or failed result needs the user,
// and that notice floats over the workspace so the chat never shifts.
export default function HyperAgentActivation() {
  const s = useSidebarCopy();
  const { pathname } = useLocation();
  const { user, org } = useAuth();
  const entering = /^\/hivemind\/app\/employee\/(harness|dots)(\/|$)/.test(pathname);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!entering || !user?.id || !org?.id) { setMessage(''); return undefined; }
    const readyKey = `hivemind.team-active:${user.id}:${org.id}`;
    try { if (attempt === 0 && sessionStorage.getItem(readyKey) === '1') return undefined; } catch { /* Storage-blocked tabs activate on every entry. */ }
    let alive = true;
    let retryTimer;
    apiClient.activateHyperAgents().then(result => {
      if (!alive) return;
      setMessage(result.status === 'pending' ? s('activationPending', 'Your company is ready. Team activation is still pending.') : '');
      if (result.status === 'ready') {
        try { sessionStorage.setItem(readyKey, '1'); } catch { /* The next entry activates again. */ }
        window.dispatchEvent(new Event('hm:employees-changed'));
      } else if (attempt < 3) retryTimer = window.setTimeout(() => setAttempt(value => value + 1), 2000 * (2 ** attempt));
    }).catch(() => {
      if (alive) setMessage(s('activationFailed', 'Your company setup is saved. Team activation could not finish.'));
    });
    return () => { alive = false; window.clearTimeout(retryTimer); };
  }, [entering, user?.id, org?.id, attempt]);
  if (!message) return null;
  return <div role="status" className="pointer-events-auto absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-[#e3e0db] bg-white/95 px-4 py-1.5 text-xs text-[#525252] shadow-sm">
    {message} <button type="button" className="ms-2 underline" onClick={() => setAttempt(n => n + 1)}>{s('retry', 'Retry')}</button>
  </div>;
}
