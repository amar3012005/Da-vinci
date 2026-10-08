// Render actual mobile pages with an isolated fixture tenant and mocked network.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import MobileSettings from '../../src/components/hivemind/app/mobile/pages/MobileSettings';
import MobileProfile from '../../src/components/hivemind/app/mobile/pages/MobileProfile';
import MobileBilling from '../../src/components/hivemind/app/mobile/pages/MobileBilling';
localStorage.setItem('hm_m_splashed', '1');
const query = new URL(location.href).searchParams;
window.Capacitor = { isNativePlatform: () => query.get('native') === '1' };
window.fetch = async () => ({ ok: true, json: async () => ({ profiles: [], items: [] }) });
const Page = query.get('view') === 'profile' ? MobileProfile : query.get('view') === 'billing' ? MobileBilling : MobileSettings;
createRoot(document.getElementById('root')).render(<BrowserRouter><Page /></BrowserRouter>);
