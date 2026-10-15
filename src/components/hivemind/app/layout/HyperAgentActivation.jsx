import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';

// Company pages never provision employees. Native workspace entry does.
export default function HyperAgentActivation() {
  const { pathname } = useLocation();
  const { user, org } = useAuth();
  const entering = /^\/hivemind\/app\/employee\/(harness|dots)(\/|$)/.test(pathname);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!entering || !user?.id || !org?.id) { setMessage(''); return undefined; }
    let alive = true;
    setMessage('Preparing your team…');
    apiClient.activateHyperAgents().then(result => {
      if (!alive) return;
      setMessage(result.status === 'pending' ? 'Your company is ready. Team activation is still pending.' : '');
      if (result.status === 'ready') window.dispatchEvent(new Event('hm:employees-changed'));
    }).catch(() => {
      if (alive) setMessage('Your company setup is saved. Team activation could not finish.');
    });
    return () => { alive = false; };
  }, [entering, user?.id, org?.id, attempt]);
  if (!message) return null;
  return <div role="status" className="px-4 py-2 text-xs text-[#525252] bg-white/90 border-b border-[#e3e0db]">
    {message} {message !== 'Preparing your team…' && <button className="ml-2 underline" onClick={() => setAttempt(n => n + 1)}>Retry</button>}
  </div>;
}
