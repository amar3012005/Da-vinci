// Real outer React components with isolated mock tenant/network, no production auth.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import MobileShell from '../../src/components/hivemind/app/mobile/MobileShell';
import ChatPanel from '../../src/components/hivemind/app/pages/Chat';
import { bindNativeChatViewport } from '../../src/components/hivemind/app/layout/mobile-chat-viewport';
import '../../src/components/hivemind/app/layout/mobile-chat-viewport.css';
import '../../src/components/hivemind/app/layout/employee-mobile-roster.css';
window.fetch=async()=>({ok:true,json:async()=>({profiles:[{id:'mateo',name:'Mateo Rossi',role:'Operations & Market Analyst'},{id:'klara',name:'Klara Müller',role:'Industrial Strategy Lead'}],notifications:[],items:[]})});
localStorage.setItem('hm_m_splashed','1');
localStorage.setItem('hivemind:user',JSON.stringify({id:'fixture-user'}));
localStorage.setItem('hivemind:talk-to-hive:messages:fixture-user',JSON.stringify(Array.from({length:12},(_,i)=>({id:i,role:i%2?'assistant':'user',content:i%2?'I reviewed the company context. The next step is to confirm your customer priorities, then prepare a focused plan.':'What should we focus on next?'}))));
bindNativeChatViewport(window,document.documentElement.style);
const drawer=new URL(location.href).searchParams.get('view')==='drawer';
createRoot(document.getElementById('root')).render(<BrowserRouter><MobileShell noScroll nativeChatViewport><main className="flex-1 min-h-0 p-5"><h1 className="text-2xl font-semibold">Runtime</h1><p className="mt-3 text-sm text-[#737373]">Your company workspace</p></main>{!drawer&&<ChatPanel isOpen onClose={()=>{}}/>}</MobileShell></BrowserRouter>);
