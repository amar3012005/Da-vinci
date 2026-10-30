import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, RefreshCw, Plug } from 'lucide-react';
import ChatGPTSignInHelp from './ChatGPTSignInHelp';
import ProviderConnectionFrame from './ProviderConnectionFrame';
import ProviderModelCatalog from './ProviderModelCatalog';
import { useAuth } from '../auth/AuthProvider';
import { useCopy, useLocaleFormat } from '../layout/sidebar-copy';

export default function ModelConnectionCard({ connectLabel, compact = false }) {
  const tx = useCopy('outerApp.chatgpt');
  const format = useLocaleFormat();
  const number = value => Number.isFinite(value) ? format.number(value) : tx('unavailable', 'Unavailable');
  const connectText = connectLabel || tx('connect', 'Connect ChatGPT');
  const { org, user } = useAuth();
  const [status,setStatus]=useState(null), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const [consent,setConsent]=useState(false), [url,setUrl]=useState(''), [attempt,setAttempt]=useState(null), [prompt,setPrompt]=useState(null), [answer,setAnswer]=useState(''), [notice,setNotice]=useState(null);
  const lifetime=useRef(null);
  async function request(action,body,signal=lifetime.current?.signal) {
    const response=await fetch(`/api/hivemind/model-connection/${action}`, { method:body===undefined?'GET':'POST', credentials:'include',cache:'no-store',headers:body===undefined?{}:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal });
    if (!response.ok) { const value=await response.json().catch(()=>({}));throw new Error(response.status===401?tx('errSignIn','Sign in to your workspace again to manage the connection.'):value.error==='cloud_execution_consent_required'?tx('errConsent','Confirm cloud execution to continue.'):tx('errUnavailable','The model connection is unavailable. Your current provider has not changed.')); }
    return response;
  }
  async function refresh(signal=lifetime.current?.signal) { const value=await (await request('status',undefined,signal)).json();if(!signal?.aborted){setStatus(value);if(value.connected){setNotice(null);setUrl('');}} }
  useEffect(()=>{
    const controller=new AbortController();lifetime.current=controller;
    setNotice(null);setStatus(null);setConsent(false);setUrl('');setPrompt(null);setAttempt(null);setAnswer('');setError('');setBusy(false);
    refresh(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    return()=>{controller.abort();};
    // Each account gets fresh state; OAuth answers never enter shared storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[org?.id,user?.id]);
  async function act(action,body) {
    const controller=lifetime.current;setBusy(true);setError('');
    try {await request(action,body,controller.signal);await refresh(controller.signal);}catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(!controller.signal.aborted)setBusy(false);}
  }
  async function start() {
    if(!consent||busy)return;
    const controller=lifetime.current;setBusy(true);setError('');setUrl('');setNotice(null);setPrompt(null);setAnswer('');
    try {
      const response=await request('start',{consent:true},controller.signal), reader=response.body?.getReader();
      if(!reader)throw Error(tx('errStart','Sign-in could not start.'));
      const decoder=new TextDecoder();let pending='';let settled=false;
      try {for(;;){const part=await reader.read();if(part.done)break;pending+=decoder.decode(part.value,{stream:true});if(pending.length>64000)throw Error(tx('errInvalid','Sign-in response was invalid.'));let end;
        while((end=pending.indexOf('\n\n'))!==-1){const frame=pending.slice(0,end);pending=pending.slice(end+2);for(const line of frame.split('\n').filter(v=>v.startsWith('data:'))){const v=JSON.parse(line.slice(5));
          if(v.type==='attempt')setAttempt(v.attempt_id);
          if(v.type==='notice')setNotice(v.notice);
          if(v.type==='notice'&&v.notice?.url){const link=new URL(v.notice.url);if(link.protocol==='https:'&&['auth.openai.com','chatgpt.com'].includes(link.hostname))setUrl(link.href);}
          if(v.type==='prompt'&&v.prompt_id){setPrompt({id:v.prompt_id,...v.prompt,message:v.prompt?.message||tx('pasteCode','Paste the completed sign-in URL or code.')});setAnswer('');}
          if(v.type==='settled'){settled=true;if(!['completed','authorized'].includes(v.status))setError(tx('errIncomplete','Sign-in did not complete. You can reconnect without changing your current provider.'));}
        }}
      }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
      if(!settled)throw Error(tx('errInterrupted','Sign-in was interrupted. Check the connection before retrying.'));
      await refresh(controller.signal);
    }catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(!controller.signal.aborted){setBusy(false);setAttempt(null);setPrompt(null);setUrl('');setAnswer('');}}
  }
  async function submit(event){event.preventDefault();const controller=lifetime.current;try{await request('answer',{attempt_id:attempt,prompt_id:prompt.id,answer},controller.signal);if(!controller.signal.aborted){setPrompt(null);setAnswer('');}}catch(e){if(!controller.signal.aborted)setError(e.message);}}
  const button='rounded-lg border border-[#dedbd5] px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f7f6f1]';
  return <ProviderConnectionFrame provider="ChatGPT" connected={status?.connected} compact={compact}><section className="mb-5 rounded-2xl border border-[#e3e0db] bg-white p-5" aria-label={tx('title','Your model connection')}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-semibold"><Plug size={18}/>{tx('title','Your model connection')}</h2><p className="mt-1 text-sm text-[#666]">{tx('subtitle','Use your ChatGPT account across Brain, Runtime and your specialists.')}</p></div><span className="flex items-center gap-1.5 text-xs text-[#666]" role="status">{status?.connected&&<CheckCircle2 size={14} className="text-emerald-600"/>}{status?.connected?tx('connected','Connected'):status?.available?tx('notConnected','Not connected'):status?tx('notEnabled','Not enabled for this workspace'):tx('checking','Checking connection…')}</span></div>
    {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {status?.available&&!status.connected&&<div className="mt-4 space-y-3"><label className="flex items-start gap-2 text-sm text-[#555]"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)} className="mt-1"/>{tx('consent','I allow this workspace to use my ChatGPT connection on the server, including while my Mac is closed.')}</label><button type="button" className={button+' bg-[#151515] text-white hover:bg-[#333]'} disabled={!consent||busy} onClick={start}>{busy?tx('connecting','Connecting…'):connectText}</button></div>}
    {status?.available&&<details className="mt-4 text-xs" open={!status.connected}><summary className="cursor-pointer font-medium text-[#555]">{tx('setupGuide','Device sign-in setup guide')}</summary><ChatGPTSignInHelp/></details>}
    {url&&<a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700">{tx('continue','Continue to ChatGPT')} <ArrowUpRight size={15}/></a>}
    {notice?.code&&<p className="mt-3 text-sm">{tx('enterCode','Enter this code on the sign-in page:')} <strong className="select-all font-mono">{notice.code}</strong></p>}
    {prompt&&prompt.kind!=='select'&&url&&!notice?.code&&<p className="mt-3 text-xs leading-5 text-[#666]">{tx('localhostHint','If the sign-in tab ends at localhost and says it cannot connect, copy its complete address and paste it in the field below. Keep it in this connection form, outside chat.')}</p>}
    {prompt&&<form onSubmit={submit} className="mt-3 flex flex-col items-start gap-2"><label className="w-full text-sm">{prompt.message}<>{prompt.kind==='select'?<select value={answer} onChange={e=>setAnswer(e.target.value)} className="mt-1 block w-full rounded-lg border border-[#dedbd5] bg-white p-2"><option value="">{tx('chooseMethod','Choose a sign-in method')}</option>{prompt.options?.map(option=><option key={option.id} value={option.id}>{/device/i.test(option.label)?tx('methodDevice','Device code — recommended for web'):/browser/i.test(option.label)?tx('methodBrowser','Browser sign-in — paste the return address'):option.label}</option>)}</select>:<input type={prompt.kind==='secret'?'password':'text'} autoComplete="off" value={answer} onChange={e=>setAnswer(e.target.value)} className="mt-1 block w-full rounded-lg border border-[#dedbd5] p-2"/>}</></label><button className={button} disabled={!answer.trim()}>{prompt.kind==='select'?tx('next','Continue'):tx('complete','Complete sign-in')}</button></form>}
    {busy&&attempt&&<button type="button" className={button+' mt-3'} onClick={()=>act('cancel',{attempt_id:attempt})}>{tx('cancel','Cancel sign-in')}</button>}
    {status?.connected&&<div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm">{tx('defaultModel','Default ChatGPT model')}<select className="mt-1 block w-full rounded-lg border border-[#dedbd5] bg-white p-2" value={status.selected_model||''} disabled={busy} onChange={e=>act('select',{model:e.target.value||null})}>{status.models?.map(model=><option key={model} value={model}>{model.replace(/^gpt-/, "GPT-").replace(/-luna$/, " Luna")}</option>)}</select></label><div className="text-sm text-[#555]"><p>{tx('inputTokens','Input tokens: {{value}}',{value:number(status.usage?.inputTokens)})}</p><p>{tx('outputTokens','Output tokens: {{value}}',{value:number(status.usage?.outputTokens)})}</p><p className="mt-1 text-xs">{tx('balanceUnavailable','Subscription balance and limits: unavailable')}</p></div></div>}
    {status?.dark_mode?.eligible&&<label className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-[#e3e0db] p-3 text-sm"><span><span className="font-medium">{tx('darkMode','Dark mode')}</span><span className="mt-0.5 block text-xs text-[#666]">{tx('darkModeBody','Runtime and every specialist use GLM 5.3 Flash Uncensored for all work, instead of any other model.')}</span></span><input type="checkbox" role="switch" aria-label={tx('darkMode','Dark mode')} checked={status.dark_mode.enabled} disabled={busy} onChange={e=>act('dark-mode',{enabled:e.target.checked})} className="mt-1 h-4 w-4"/></label>}
    <div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" className={button+' inline-flex items-center gap-1.5'} disabled={busy} onClick={()=>refresh().catch(e=>setError(e.message))}><RefreshCw size={14}/>{tx('refresh','Refresh connection')}</button>{status?.connected&&<button type="button" className={button} disabled={busy} onClick={()=>act('disconnect',{})}>{tx('disconnect','Disconnect')}</button>}</div>
    <p className="mt-3 text-xs text-[#777]">{tx('scope','This connection is scoped to your account in {{workspace}}. Credentials stay on the server. If the selected connection is unavailable, work pauses without switching to a paid provider.',{workspace:org?.name||tx('thisWorkspace','this workspace')})}</p>
    <ProviderModelCatalog provider="ChatGPT" models={status?.models || []}/>
  </section></ProviderConnectionFrame>;
}
