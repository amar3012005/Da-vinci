import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LegacyMobileChatHeader from '../mobile/LegacyMobileChatHeader';
import { useAuth } from '../auth/AuthProvider';
import BrainModeIcon from './BrainModeIcon';
import { Building2 } from 'lucide-react';
import './MobileBrainHeaderActions.css';

export default function MobileBrainHeaderActions() {
  const { i18n } = useTranslation('dashboard');
  const { org } = useAuth() || {};
  const organization = String(org?.name || org?.slug || '').trim();
  const [languageOpen, setLanguageOpen] = useState(false);
  const host = useRef(null);
  useEffect(() => {
    if (!languageOpen) return undefined;
    const dismiss = event => {
      if (event.key === 'Escape') {
        setLanguageOpen(false);
        host.current?.querySelector('[aria-label="Reply language"]')?.focus();
      }
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [languageOpen]);
  return <div ref={host}>
    <div className="hm-mobile-brain-header-identity" aria-label={organization ? `BRAIN · ${organization}` : 'BRAIN'}>
      <span className="hm-mobile-brain-header-icon" aria-hidden="true"><BrainModeIcon size={28} /></span>
      <span className="hm-mobile-brain-header-title">BRAIN</span>
      {organization && <span className="hm-mobile-brain-header-org" title={organization}><Building2 size={12} aria-hidden="true" /><span>{organization}</span></span>}
    </div>
    <LegacyMobileChatHeader compact language={i18n.language} languageOpen={languageOpen}
      onLanguageToggle={() => setLanguageOpen(v => !v)} onLanguageClose={() => setLanguageOpen(false)}
      onLanguageSelect={code => { i18n.changeLanguage(code); setLanguageOpen(false); }}
      onRecents={() => { setLanguageOpen(false); window.dispatchEvent(new Event('hivemind:mobile-history')); }} />
  </div>;
}
