import React, { useEffect, useState } from 'react';
const BASE='/__hivemind/composio-account/';
export default function ComposioAccountCard() {
  const [status,setStatus]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=async()=>{const response=await fetch(BASE+'status',{credentials:'same-origin'});const value=await response.json();if(!response.ok)throw new Error(value.error);setStatus(value);};
  useEffect(()=>{let active=true;fetch(BASE+'status',{credentials:'same-origin'}).then(async response=>{const value=await response.json();if(!response.ok)throw new Error(value.error);if(active)setStatus(value);}).catch(()=>{if(active)setError('The account connection is unavailable. Try again shortly.');});const params=new URLSearchParams(window.location.search);if(params.has('composio_account_error'))setError('The Composio connection could not be confirmed. Please connect again.');if(params.has('composio_account_connected') || params.has('composio_account_error')){params.delete('composio_account_connected');params.delete('composio_account_error');window.history.replaceState({},'',window.location.pathname+(params.size?'?'+params:''));}return()=>{active=false;};},[]);
  const act=async action=>{setBusy(true);setError('');try{const response=await fetch(BASE+action,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({consent:action==='start'})});const value=await response.json();if(!response.ok)throw new Error(value.error);if(action==='start'){const next=new URL(value.url);if(next.origin!=='https://connect.composio.dev')throw new Error('Invalid authorization address');window.location.assign(next.href);}else{await load();setError(value.message||'');}}catch{setError('The account connection could not be completed. Please try again.');}finally{setBusy(false);}};
  const connected=status?.connected && !status?.expired;
  const connect=()=>{if(window.confirm('Connect your Composio account and securely save its authorization for this user and workspace?'))act('start');};
  return <section className="py-3" aria-label="Composio account connection">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-medium text-[#171717]">Composio</h2><p className="mt-1 text-xs text-[#737373]">{connected?'Connected':status?.expired?'Reconnect your account':'Use your own account.'}</p></div>
      <div className="flex items-center gap-4">
        {status?.connected && <button className="text-xs text-[#737373] underline-offset-4 hover:text-black hover:underline disabled:opacity-40" disabled={busy} onClick={connected?connect:()=>act('disconnect')}>{connected?'Reconnect':'Disconnect'}</button>}
        <button className="min-h-[40px] rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-[#262626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-40" disabled={busy || !status} onClick={connected?()=>act('disconnect'):connect}>{busy?'Please wait…':connected?'Disconnect':status?.expired?'Reconnect':'Connect to Composio'}</button>
      </div>
    </div>
    {error && <p role="status" className="mt-3 text-xs text-[#737373]">{error}</p>}
  </section>;
}
