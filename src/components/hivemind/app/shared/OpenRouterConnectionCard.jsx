import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Plug, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

const money = v => typeof v === 'number' && Number.isFinite(v) ? `$${v.toFixed(4)}` : 'Unavailable';
const messages = {
  openrouter_sign_in_expired: 'This sign-in expired or was already used. Connect again.',
  openrouter_sign_in_failed: 'OpenRouter could not complete sign-in. Connect again.',
  openrouter_reconnect_required: 'Reconnect your OpenRouter account to continue.',
};
export default function OpenRouterConnectionCard() {
  const { org, user } = useAuth();
  const [status, setStatus] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [consent, setConsent] = useState(false);
  const lifetime = useRef(null), callback = useRef(null);
  async function request(action, body, signal) {
    const response = await fetch(`/api/hivemind/model-connection/openrouter/${action}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'include', cache: 'no-store', signal,
      ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const value = await response.json();
    if (!response.ok) throw Error(response.status === 401 ? 'Sign in to your workspace again.' : messages[value.error] || 'OpenRouter is unavailable. Your current provider has not changed.');
    return value;
  }
  useEffect(() => {
    const controller = new AbortController(); lifetime.current = controller;
    setStatus(null); setError(''); setBusy(false); setConsent(false);
    // Capture once, remove the single-use code from browser history before other requests.
    const url = new URL(window.location.href);
    if (url.searchParams.has('openrouter_error')) setError('Sign-in could not be confirmed. Refresh the connection before trying again.');
    if (url.searchParams.has('openrouter_connected') || url.searchParams.has('openrouter_error')) {
      ['openrouter_connected', 'openrouter_error'].forEach(key => url.searchParams.delete(key));
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    if (url.searchParams.get('model_connection') === 'openrouter') {
      callback.current = { code: url.searchParams.get('code'), state: url.searchParams.get('state'), owner: `${org?.id}:${user?.id}` };
      ['code', 'state', 'model_connection'].forEach(key => url.searchParams.delete(key));
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    async function load() {
      const result = callback.current;
      if (result?.code && result?.state && result.owner === `${org?.id}:${user?.id}`) {
        // OAuth is bound server-side to this exact signed-in user and workspace.
        // Keep one mutation promise across React StrictMode's effect replay. A lost
        // browser response must not trigger a second code exchange.
        result.promise ||= request('callback', { code: result.code, state: result.state });
        await result.promise;
      }
      const next = await request('status', undefined, controller.signal);
      if (!controller.signal.aborted) setStatus(next);
    }
    load().catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, user?.id]);
  async function act(action, body) {
    const controller = lifetime.current; setBusy(true); setError('');
    try {
      const value = await request(action, body, controller.signal);
      if (controller.signal.aborted) return;
      if (action === 'start') {
        const url = new URL(value.url);
        if (url.origin !== 'https://openrouter.ai' || url.pathname !== '/auth') throw Error('Invalid OpenRouter sign-in link.');
        window.location.assign(url.href); return;
      }
      const next = action === 'status' ? value : await request('status', undefined, controller.signal);
      if (!controller.signal.aborted) setStatus(next);
    } catch (e) { if (!controller.signal.aborted) setError(e.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  const button = 'rounded-lg border border-[#dedbd5] px-3 py-2 text-sm font-medium disabled:opacity-50 hover:bg-[#f7f6f1]';
  return <section aria-label="OpenRouter connection" className="mb-5 rounded-2xl border border-[#e3e0db] bg-white p-5">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-semibold"><Plug size={18}/>OpenRouter</h2><p className="mt-1 text-sm text-[#666]">Connect your own account and use free models.</p></div><span role="status" className="flex items-center gap-1.5 text-xs text-[#666]">{status?.connected && <CheckCircle2 size={14} className="text-emerald-600"/>}{status?.connected ? status.selected_model ? 'Free mode active' : 'Connected' : status?.available === false ? 'Not enabled for this workspace' : status ? 'Not connected' : 'Checking connection…'}</span></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {status?.available && !status.connected && <div className="mt-4 space-y-3"><label className="flex items-start gap-2 text-sm text-[#555]"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy} className="mt-1"/>Allow this workspace to use my OpenRouter connection on the server, including while my computer is closed.</label><button className={button} disabled={!consent || busy} onClick={() => act('start', { consent: true })}>Connect OpenRouter</button></div>}
    {status?.connected && <div className="mt-4 space-y-3"><p className="text-sm">Free only · OpenRouter automatically selects a compatible free model.</p><p className="text-sm text-[#666]">Account usage today: {money(status.usage?.usage_daily)} · Key limit remaining: {money(status.usage?.limit_remaining)}</p>{!status.selected_model && <button className={button} disabled={busy} onClick={() => act('select', { mode: 'free' })}>Use free models</button>}<button className={button+' ml-2'} disabled={busy} onClick={() => act('disconnect', {})}>Disconnect</button></div>}
    <p className="mt-3 text-xs text-[#777]">Free models have account-wide rate limits. Temporary model failures can retry within free models; an exhausted account pauses work. No automatic paid fallback. Credentials stay encrypted on the server for your account in {org?.name || 'this workspace'}. Disconnect removes our stored key; you can also revoke it in <a className="underline" href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">OpenRouter settings</a>.</p>
    <button className={button+' mt-3 inline-flex items-center gap-1.5'} disabled={busy} onClick={() => act('status', undefined)}><RefreshCw size={14}/>Refresh</button>
  </section>;
}
