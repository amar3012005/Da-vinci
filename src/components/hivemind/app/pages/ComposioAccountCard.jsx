import React, { useEffect, useState } from 'react';
import { BRAND_LOGOS } from '../shared/connectors-catalog';
import './ComposioAccountCard.css';
const BASE='/__hivemind/composio-account/';
export default function ComposioAccountCard() {
  const [status,setStatus]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=async()=>{const response=await fetch(BASE+'status',{credentials:'same-origin'});const value=await response.json();if(!response.ok)throw new Error(value.error);setStatus(value);};
  useEffect(()=>{let active=true;fetch(BASE+'status',{credentials:'same-origin'}).then(async response=>{const value=await response.json();if(!response.ok)throw new Error(value.error);if(active)setStatus(value);}).catch(()=>{if(active)setError('The account connection is unavailable. Try again shortly.');});const params=new URLSearchParams(window.location.search);if(params.has('composio_account_error'))setError('The Composio connection could not be confirmed. Please connect again.');if(params.has('composio_account_connected') || params.has('composio_account_error')){params.delete('composio_account_connected');params.delete('composio_account_error');window.history.replaceState({},'',window.location.pathname+(params.size?'?'+params:''));}return()=>{active=false;};},[]);
  const act=async action=>{setBusy(true);setError('');try{const response=await fetch(BASE+action,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({consent:action==='start'})});const value=await response.json();if(!response.ok)throw new Error(value.error);if(action==='start'){const next=new URL(value.url);if(next.origin!=='https://connect.composio.dev')throw new Error('Invalid authorization address');window.location.assign(next.href);}else{await load();setError(value.message||'');}}catch{setError('The account connection could not be completed. Please try again.');}finally{setBusy(false);}};
  const connected=status?.connected && !status?.expired;
  const connect=()=>{if(window.confirm('Connect your Composio account and securely save its authorization for this user and workspace?'))act('start');};
  return <section className={`hm-composio-banner${connected?' hm-composio-banner--connected':''}`} aria-label="Composio account connection">
    <div className="hm-composio-banner-main">
      <div className="hm-composio-apps" aria-hidden="true">
        {[['Gmail',BRAND_LOGOS.gmail],['Calendar','https://api.iconify.design/logos/google-calendar.svg'],['Slack',BRAND_LOGOS.slack],['Notion',BRAND_LOGOS.notion],['GitHub',BRAND_LOGOS.github]].map(([name,src])=><span key={name}><img src={src} alt="" width="26" height="26" /></span>)}
      </div>
      <div className="hm-composio-copy"><h2>Connect your apps for proactive HIVEMIND intelligence</h2><p>{connected?'Your Composio account is connected.':status?.expired?'Reconnect your Composio account.':'Gmail, Calendar, Slack, Notion and more.'}</p></div>
      <div className="hm-composio-actions">
        {status?.connected && <button className="hm-composio-secondary" disabled={busy} onClick={connected?connect:()=>act('disconnect')}>{connected?'Reconnect':'Disconnect'}</button>}
        <button className="hm-composio-connect" disabled={busy || !status} onClick={connected?()=>act('disconnect'):connect}>{busy?'Please wait…':connected?'Disconnect':status?.expired?'Reconnect':'Connect to Composio'}</button>
      </div>
    </div>
    {error && <p role="status" className="hm-composio-error">{error}</p>}
  </section>;
}
