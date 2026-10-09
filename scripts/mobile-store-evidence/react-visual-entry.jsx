// Render actual mobile pages with an isolated fixture tenant and mocked network.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import MobileSettings from '../../src/components/hivemind/app/mobile/pages/MobileSettings';
import MobileProfile from '../../src/components/hivemind/app/mobile/pages/MobileProfile';
import { NativeAiConsentGate } from '../../src/components/hivemind/app/mobile/MobileSafetyPanel';
import MobileBilling from '../../src/components/hivemind/app/mobile/pages/MobileBilling';
import MobileProjects from '../../src/components/hivemind/app/mobile/pages/MobileProjects';
import MobileConnectors from '../../src/components/hivemind/app/mobile/pages/MobileConnectors';
import MobileShell from '../../src/components/hivemind/app/mobile/MobileShell';
import LegacyMobileChatHeader from '../../src/components/hivemind/app/mobile/LegacyMobileChatHeader';
localStorage.setItem('hm_m_splashed', '1');
const query = new URL(location.href).searchParams;
window.Capacitor = { isNativePlatform: () => query.get('native') === '1' };
window.fetch = async () => ({ ok: true, json: async () => ({ profiles: [], items: [] }) });
function SensitiveChat() {
  useEffect(() => { window.__privateMounts = [...(window.__privateMounts || []), window.__fixtureUser || 'fixture-user']; }, []);
  return <div data-sensitive-chat>Private native chat</div>;
}
function GateFixture() {
  const [user, setUser] = useState('fixture-user');
  window.__switchUser = () => { window.__fixtureUser = 'other-user'; window.__resetConsent(); setUser('other-user'); };
  return <NativeAiConsentGate><SensitiveChat key={user} /></NativeAiConsentGate>;
}
function HeaderFixture() {
 const [open,setOpen]=useState(false);
 return <MobileShell bareHeader showBareLogo={false}><LegacyMobileChatHeader compact languageOpen={open} onLanguageToggle={()=>setOpen(!open)} onLanguageClose={()=>setOpen(false)} onLanguageSelect={()=>setOpen(false)} onRecents={()=>{}} /><p>Conversation content</p></MobileShell>;
}
const Page = query.get('view') === 'projects' ? MobileProjects : query.get('view') === 'connectors' ? MobileConnectors : query.get('view') === 'header' ? HeaderFixture : query.get('view') === 'gate' ? GateFixture : query.get('view') === 'profile' ? MobileProfile : query.get('view') === 'billing' ? MobileBilling : MobileSettings;
createRoot(document.getElementById('root')).render(<BrowserRouter><Page /></BrowserRouter>);
