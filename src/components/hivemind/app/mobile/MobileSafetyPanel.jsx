import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../shared/api-client';
import { isNativeApp } from '../shared/native-app';
import { useAuth } from '../auth/AuthProvider';
const CONSENT_PATH = '/v1/mobile/privacy/ai-consent';
const CHANGED = 'hm:mobile-ai-consent-changed';
export function AiConsentPanel({ onGranted }) {
  const [status,setStatus] = useState(null); const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
  const load = useCallback(async()=>{setError('');try{const {data}=await apiClient.controlPlane.get(CONSENT_PATH);setStatus(data);}catch{setError('Privacy preferences could not be loaded. Please retry.');}},[]);
  useEffect(()=>{load();},[load]);
  async function save(granted){setBusy(true);setError('');try{const {data}=await apiClient.controlPlane.post(CONSENT_PATH,{version:status.version,granted});setStatus(s=>({...s,...data}));window.dispatchEvent(new CustomEvent(CHANGED));if(data.granted===true)onGranted?.();}catch{setError('Your choice was not saved. Please retry.');}finally{setBusy(false);}}
  return <section className="rounded-xl border border-[#e3e0db] bg-white p-5" aria-labelledby="mobile-ai-privacy-title"><h2 id="mobile-ai-privacy-title" className="text-lg font-semibold">Your AI privacy choice</h2>{status?<><p className="mt-3 text-sm leading-6 text-[#555]">{status.disclosure}</p><a href="https://singulancelabs.com/privacy" target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center text-sm text-[#117dff]">Read the privacy policy ↗</a><p className="mb-3 text-sm">{status.granted?'Permission granted.':'Permission has not been granted.'}</p><button type="button" disabled={busy} onClick={()=>save(!status.granted)} className="min-h-[44px] rounded-lg bg-[#117dff] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy?'Saving…':status.granted?'Withdraw permission':'Allow AI processing'}</button></>:!error?<p className="mt-3 text-sm" role="status">Loading privacy preferences…</p>:null}{error&&<div className="mt-3"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={load} className="min-h-[44px] text-sm text-[#117dff]">Retry</button></div>}</section>;
}
const consentCacheKey = (userId, orgId) => `hm:ai-consent:v1:${userId}:${orgId || ''}`;
/** Last consent answer the server gave for this person and company: true, false, or null when unknown. */
export function readCachedAiConsent(userId, orgId) {
  if (!userId) return null;
  try { const value = window.localStorage.getItem(consentCacheKey(userId, orgId)); return value === 'granted' ? true : value === 'denied' ? false : null; } catch { return null; /* Storage blocked: ask the server. */ }
}
function writeCachedAiConsent(userId, orgId, granted) {
  try { window.localStorage.setItem(consentCacheKey(userId, orgId), granted ? 'granted' : 'denied'); } catch { /* Storage blocked: the cache is optional. */ }
}
export function NativeAiConsentGate({children}){
 const {user,org,logout}=useAuth();const location=useLocation();const native=isNativeApp();const orgId=org?.id;const [allowedUser,setAllowedUser]=useState(null);const [loading,setLoading]=useState(true);
 // A cached positive answer renders the app at once; the server answer below only takes it away when consent is missing.
 const [cached,setCached]=useState(()=>readCachedAiConsent(user?.id,orgId));
 useEffect(()=>{setCached(readCachedAiConsent(user?.id,orgId));},[user?.id,orgId]);
 useEffect(()=>{let active=true;const reload=async()=>{if(!native||!user?.id){if(active)setLoading(false);return;}setLoading(true);setAllowedUser(null);try{const {data}=await apiClient.controlPlane.get(CONSENT_PATH);const granted=data.granted===true;writeCachedAiConsent(user.id,orgId,granted);if(active){setCached(granted);setAllowedUser(granted?user.id:null);}}catch{if(active)setAllowedUser(null);}finally{if(active)setLoading(false);}};reload();window.addEventListener(CHANGED,reload);return()=>{active=false;window.removeEventListener(CHANGED,reload);};},[native,user?.id,orgId]);
 if(!native||!user?.id||allowedUser===user.id||cached===true||/\/hivemind\/(?:m\/(?:settings|profile)|app\/(?:settings|profile))\/?$/.test(location.pathname))return children;
 return <main className="min-h-[100dvh] overflow-y-auto bg-[#faf9f4] px-5 py-8" style={{paddingTop:'max(32px, env(safe-area-inset-top))',paddingBottom:'max(32px, env(safe-area-inset-bottom))'}}><div className="mx-auto max-w-lg"><h1 className="mb-5 text-2xl font-semibold">Before using AI</h1>{loading?<p role="status">Checking your privacy choice…</p>:<AiConsentPanel onGranted={()=>{writeCachedAiConsent(user.id,orgId,true);setCached(true);setAllowedUser(user.id);}}/>}<div className="mt-4 flex flex-wrap gap-4"><a href="/hivemind/m/settings" className="inline-flex min-h-[44px] items-center text-sm text-[#117dff]">Settings</a><button type="button" onClick={logout} className="min-h-[44px] text-sm">Sign out</button></div></div></main>;
}
export default function MobileSafetyPanel(){
 const [category,setCategory]=useState('harmful');const [description,setDescription]=useState('');const [busy,setBusy]=useState(false);const [receipt,setReceipt]=useState('');const [error,setError]=useState('');
 async function report(e){e.preventDefault();setBusy(true);setError('');setReceipt('');try{const {data}=await apiClient.controlPlane.post('/v1/mobile/safety-reports',{category,description});setReceipt(data.receipt_id);setDescription('');}catch{setError('Your report was not saved. Please retry.');}finally{setBusy(false);}}
 return <div className="space-y-5"><AiConsentPanel/><section className="rounded-xl border border-[#e3e0db] bg-white p-5"><h2 className="text-lg font-semibold">Report unsafe AI content</h2><p className="mt-2 text-sm leading-6 text-[#555]">Tell us about harmful or inappropriate generated content. Include only the details you want to send for review; your full conversation is not attached automatically.</p><form onSubmit={report} className="mt-4 space-y-3"><label className="block text-sm">Issue type<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border p-2 text-base">{[['harmful','Harmful content'],['sexual','Sexual content'],['hate','Hate or harassment'],['violence','Violence'],['self_harm','Self-harm'],['illegal','Illegal activity'],['privacy','Privacy'],['misleading','Misleading content'],['other','Other']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="block text-sm">What happened?<textarea value={description} onChange={e=>setDescription(e.target.value)} minLength={10} maxLength={4000} required rows={5} className="mt-1 w-full rounded-lg border p-3 text-base"/></label><button disabled={busy||description.trim().length<10} className="min-h-[44px] rounded-lg bg-[#117dff] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy?'Sending…':'Send report'}</button>{receipt&&<p role="status" className="break-all text-sm text-emerald-800">Report received. Reference: {receipt}</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}</form></section></div>;
}
