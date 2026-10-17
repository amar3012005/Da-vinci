import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, RefreshCw, Plug } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

const number = value => Number.isFinite(value) ? value.toLocaleString() : 'Unavailable';
export default function ModelConnectionCard() {
  const { org, user } = useAuth();
  const [status,setStatus]=useState(null), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const [consent,setConsent]=useState(false), [url,setUrl]=useState(''), [attempt,setAttempt]=useState(null), [prompt,setPrompt]=useState(null), [answer,setAnswer]=useState('');
  const lifetime=useRef(null);
  async function request(action,body,signal=lifetime.current?.signal) {
    const response=await fetch(`/api/hivemind/model-connection/${action}`, { method:body===undefined?'GET':'POST', credentials:'include',cache:'no-store',headers:body===undefined?{}:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal });
    if (!response.ok) { const value=await response.json().catch(()=>({}));throw new Error(response.status===401?'Sign in to your workspace again to manage the connection.':value.error==='cloud_execution_consent_required'?'Confirm cloud execution to continue.':'The model connection is unavailable. Your current provider has not changed.'); }
    return response;
  }
  async function refresh(signal=lifetime.current?.signal) { const value=await (await request('status',undefined,signal)).json();if(!signal?.aborted)setStatus(value); }
  useEffect(()=>{
    const controller=new AbortController();lifetime.current=controller;
    setStatus(null);setConsent(false);setUrl('');setPrompt(null);setAttempt(null);setAnswer('');setError('');setBusy(false);
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
    const controller=lifetime.current;setBusy(true);setError('');setUrl('');
    try {
      const response=await request('start',{consent:true},controller.signal), reader=response.body?.getReader();
      if(!reader)throw Error('Sign-in could not start.');
      const decoder=new TextDecoder();let pending='';let settled=false;
      try {for(;;){const part=await reader.read();if(part.done)break;pending+=decoder.decode(part.value,{stream:true});if(pending.length>64000)throw Error('Sign-in response was invalid.');let end;
        while((end=pending.indexOf('\n\n'))!==-1){const frame=pending.slice(0,end);pending=pending.slice(end+2);for(const line of frame.split('\n').filter(v=>v.startsWith('data:'))){const v=JSON.parse(line.slice(5));
          if(v.type==='attempt')setAttempt(v.attempt_id);
          if(v.type==='notice'&&v.notice?.url){const link=new URL(v.notice.url);if(link.protocol==='https:'&&['auth.openai.com','chatgpt.com'].includes(link.hostname))setUrl(link.href);}
          if(v.type==='prompt'&&v.prompt_id)setPrompt({id:v.prompt_id,message:v.prompt?.message||'Paste the completed sign-in URL or code.'});
          if(v.type==='settled'){settled=true;if(!['completed','authorized'].includes(v.status))setError('Sign-in did not complete. You can reconnect without changing your current provider.');}
        }}
      }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
      if(!settled)throw Error('Sign-in was interrupted. Check the connection before retrying.');
      await refresh(controller.signal);
    }catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(!controller.signal.aborted){setBusy(false);setAttempt(null);setPrompt(null);setUrl('');setAnswer('');}}
  }
  async function submit(event){event.preventDefault();const controller=lifetime.current;try{await request('answer',{attempt_id:attempt,prompt_id:prompt.id,answer},controller.signal);if(!controller.signal.aborted){setPrompt(null);setAnswer('');}}catch(e){if(!controller.signal.aborted)setError(e.message);}}
  const button='rounded-lg border border-[#dedbd5] px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f7f6f1]';
  return <section className="mb-5 rounded-2xl border border-[#e3e0db] bg-white p-5" aria-label="Your model connection">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-semibold"><Plug size={18}/>Your model connection</h2><p className="mt-1 text-sm text-[#666]">Use your ChatGPT account across Runtime and your specialists.</p></div><span className="flex items-center gap-1.5 text-xs text-[#666]" role="status">{status?.connected&&<CheckCircle2 size={14} className="text-emerald-600"/>}{status?.connected?'Connected':status?.available?'Not connected':status?'Not enabled for this workspace':'Checking connection…'}</span></div>
    {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {status?.available&&!status.connected&&<div className="mt-4 space-y-3"><label className="flex items-start gap-2 text-sm text-[#555]"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)} className="mt-1"/>I allow this workspace to use my ChatGPT connection on the server, including while my Mac is closed.</label><button type="button" className={button+' bg-[#151515] text-white hover:bg-[#333]'} disabled={!consent||busy} onClick={start}>{busy?'Connecting…':'Connect ChatGPT'}</button></div>}
    {url&&<a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700">Continue to ChatGPT <ArrowUpRight size={15}/></a>}
    {prompt&&<form onSubmit={submit} className="mt-3 flex flex-col items-start gap-2"><label className="w-full text-sm">{prompt.message}<input type="text" autoComplete="off" value={answer} onChange={e=>setAnswer(e.target.value)} className="mt-1 block w-full rounded-lg border border-[#dedbd5] p-2"/></label><button className={button} disabled={!answer.trim()}>Complete sign-in</button></form>}
    {busy&&attempt&&<button type="button" className={button+' mt-3'} onClick={()=>act('cancel',{attempt_id:attempt})}>Cancel sign-in</button>}
    {status?.connected&&<div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm">Model<select className="mt-1 block w-full rounded-lg border border-[#dedbd5] bg-white p-2" value={status.selected_model||''} disabled={busy} onChange={e=>act('select',{model:e.target.value||null})}><option value="">Use workspace provider</option>{status.models?.map(model=><option key={model} value={model}>{model}</option>)}</select></label><div className="text-sm text-[#555]"><p>Input tokens: {number(status.usage?.inputTokens)}</p><p>Output tokens: {number(status.usage?.outputTokens)}</p><p className="mt-1 text-xs">Subscription balance and limits: unavailable</p></div></div>}
    <div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" className={button+' inline-flex items-center gap-1.5'} disabled={busy} onClick={()=>refresh().catch(e=>setError(e.message))}><RefreshCw size={14}/>Refresh connection</button>{status?.connected&&<button type="button" className={button} disabled={busy} onClick={()=>act('disconnect',{})}>Disconnect</button>}</div>
    <p className="mt-3 text-xs text-[#777]">This connection is scoped to your account in {org?.name||'this workspace'}. Credentials stay on the server. If the selected connection is unavailable, work pauses without switching to a paid provider.</p>
  </section>;
}
