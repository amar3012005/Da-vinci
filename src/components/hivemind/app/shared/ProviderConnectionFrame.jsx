import React, { useState } from 'react';
import { ChatgptMark } from './ChatgptMark';
import { useCopy } from '../layout/sidebar-copy';
import './ProviderConnectionFrame.css';
/** Account controls stay owned by each provider; this frame only changes presentation. */
export default function ProviderConnectionFrame({provider,connected,compact=false,children}) {
 const tx=useCopy('outerApp.providerFrame');
 const [expanded,setExpanded]=useState(!compact);
 const chatgpt=provider==='ChatGPT';
 return <div className="hm-provider-frame">
  {chatgpt && <img className="hm-provider-feature-artwork" src="/images/feature-banners/chatgpt-connection-v1.webp" alt={tx('artworkAlt','Bring your ChatGPT plan to HIVEMIND. Frontier models, real conversations and image creation.')} width="1672" height="941" loading="lazy"/>}
  <div className="hm-provider-banner">
   <div className="hm-provider-mark" aria-hidden="true">{chatgpt?<ChatgptMark/>:<img src="https://openrouter.ai/favicon.ico" alt="" width="30" height="30"/>}</div>
   <div className="hm-provider-copy"><h2>{chatgpt?tx('chatgptTitle','Bring your ChatGPT models to HIVEMIND'):tx('openrouterTitle','Explore free models with OpenRouter')}</h2><p>{chatgpt?tx('chatgptBody','Your account. Your available models.'):tx('openrouterBody','A live model catalog, with a free automatic route.')}</p></div>
   <button type="button" className="hm-provider-action" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded&&compact?tx('hide','Hide details'):connected?tx('manage','Manage connection'):tx('connectTo','Connect to {{provider}}',{provider})}</button>
  </div>
  {expanded&&<div className="hm-provider-body">{children}</div>}
 </div>;
}
