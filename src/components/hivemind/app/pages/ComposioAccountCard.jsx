import React, { useEffect, useState } from 'react';
const BASE='/__hivemind/composio-account/';
export default function ComposioAccountCard() {
  const [status,setStatus]=useState(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=async()=>{const response=await fetch(BASE+'status',{credentials:'same-origin'});const value=await response.json();if(!response.ok)throw new Error(value.error);setStatus(value);};
  useEffect(()=>{let active=true;fetch(BASE+'status',{credentials:'same-origin'}).then(async response=>{const value=await response.json();if(!response.ok)throw new Error(value.error);if(active)setStatus(value);}).catch(()=>{if(active)setError('The account connection is unavailable. Try again shortly.');});const params=new URLSearchParams(window.location.search);if(params.has('composio_account_error'))setError('The Composio connection could not be confirmed. Please connect again.');if(params.has('composio_account_connected') || params.has('composio_account_error')){params.delete('composio_account_connected');params.delete('composio_account_error');window.history.replaceState({},'',window.location.pathname+(params.size?'?'+params:''));}return()=>{active=false;};},[]);
  const act=async action=>{setBusy(true);setError('');try{const response=await fetch(BASE+action,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({consent})});const value=await response.json();if(!response.ok)throw new Error(value.error);if(action==='start'){const next=new URL(value.url);if(next.origin!=='https://connect.composio.dev')throw new Error('Invalid authorization address');window.location.assign(next.href);}else{await load();setConsent(false);setError(value.message||'');}}catch{setError('The account connection could not be completed. Please try again.');}finally{setBusy(false);}};
  const connected=status?.connected && !status?.expired;
  return <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black p-6 text-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] sm:p-8" aria-label="Composio account connection">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.06]" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7"><rect x="5" y="5" width="9" height="9" rx="2" fill="currentColor"/><rect x="18" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="5" y="18" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="18" y="18" width="9" height="9" rx="2" fill="currentColor"/></svg>
        </div>
        <div><h2 className="text-[24px] font-semibold leading-tight tracking-[-0.04em] sm:text-[28px]">Composio</h2><p className="mt-1.5 text-sm text-white/60">Your apps. Your account.</p></div>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80"><span className={`h-1.5 w-1.5 rounded-full ${connected?'bg-emerald-400':'bg-white/40'}`} aria-hidden="true"/>{connected?'Connected':status?.expired?'Reconnect needed':'Not connected'}</span>
    </div>
    <div className="mt-7 flex flex-col gap-5 border-t border-white/15 pt-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl">
        <p className="text-sm leading-6 text-white/70">{connected?'Your Composio account is securely connected to this workspace.':'Bring your own Composio account to HIVEMIND. Sign in once; your authorization stays encrypted.'}</p>
        {connected?<p className="mt-2 text-xs leading-5 text-white/45">Your account connection was verified. Agent access is not enabled in this step.</p>:<label className="mt-4 flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-white/65"><input className="mt-1 h-3.5 w-3.5 shrink-0 accent-white" type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} />Allow HIVEMIND to securely retain my Composio authorization for this user and workspace.</label>}
      </div>
      <button className={`min-h-[44px] shrink-0 rounded-xl px-5 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-35 ${connected?'border border-white/20 bg-transparent text-white/80 hover:bg-white/10':'bg-white text-black hover:bg-white/90'}`} disabled={busy || (!connected && (!status || !consent))} onClick={()=>act(connected?'disconnect':'start')}>{busy?'Connecting…':connected?'Disconnect Composio':'Connect to Composio'}</button>
    </div>
    {error && <p role="status" className="mt-4 border-t border-white/15 pt-4 text-sm leading-6 text-white/75">{error}</p>}
  </section>;
}
