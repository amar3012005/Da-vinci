import React, { useEffect, useState } from 'react';
/** Public discovery is separate from authenticated, selectable model grants. */
export function freeCatalog(data) {
 return (Array.isArray(data?.data)?data.data:[]).filter(m=>typeof m?.id==='string'&&m.id.endsWith(':free')&&typeof m.name==='string'&&m.pricing?.prompt!=null&&m.pricing?.completion!=null&&Number(m.pricing.prompt)===0&&Number(m.pricing.completion)===0).sort((a,b)=>a.name.localeCompare(b.name));
}
export default function ProviderModelCatalog({provider,models=[]}) {
 const [open,setOpen]=useState(false),[catalog,setCatalog]=useState(null),[error,setError]=useState(''),[limit,setLimit]=useState(12),[retry,setRetry]=useState(0);
 const router=provider==='OpenRouter';
 useEffect(()=>{
  if(!router||!open)return;
  const controller=new AbortController();setError('');
  fetch('https://openrouter.ai/api/v1/models',{credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('catalog');const data=await response.json();if(!Array.isArray(data?.data))throw Error('catalog');if(!controller.signal.aborted)setCatalog(freeCatalog(data));}).catch(()=>{if(!controller.signal.aborted)setError('The live catalog is unavailable. Your model connection is unchanged.');});
  return()=>controller.abort();
 },[router,open,retry]);
 const items=router?catalog:models.map(id=>({id,name:id}));
 return <details className="hm-provider-catalog" onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary>{router?'Browse the live free-model catalog':'Models available through your ChatGPT connection'}{items?.length?` · ${items.length}`:''}</summary>
  {router&&<p className="hm-provider-catalog-note">Catalog preview. Your selectable route is Free automatic ({'openrouter/free'}); it chooses a compatible model. Individual catalog entries are not yet selectable here.</p>}
  {open&&<>{error?<p role="status" className="hm-provider-catalog-note">{error} <button type="button" onClick={()=>setRetry(n=>n+1)}>Try again</button></p>:items===null?<p className="hm-provider-catalog-note">Loading the official catalog…</p>:items.length?<div className="hm-provider-models">{items.slice(0,limit).map(model=><span className="hm-provider-model" key={model.id}><img src={router?'https://openrouter.ai/favicon.ico':'https://api.iconify.design/logos/openai-icon.svg'} alt="" loading="lazy"/><span>{model.name}</span></span>)}</div>:<p className="hm-provider-catalog-note">{router?'No free variants were returned by the catalog.':'Connect your account to discover its available models. The OpenAI API catalog does not determine your ChatGPT plan access.'}</p>}
  {items?.length>limit&&<button type="button" className="text-xs underline" onClick={()=>setLimit(n=>n+12)}>Show more models</button>}
  <p className="hm-provider-catalog-note"><a href={router?'https://openrouter.ai/models?max_price=0':'https://learn.chatgpt.com/docs/auth'} target="_blank" rel="noreferrer">{router?'Official OpenRouter catalog':'About ChatGPT authentication'}</a></p></>}
 </details>;
}
