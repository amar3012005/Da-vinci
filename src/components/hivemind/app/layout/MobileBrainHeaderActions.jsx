import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LegacyMobileChatHeader from '../mobile/LegacyMobileChatHeader';

export default function MobileBrainHeaderActions() {
  const { i18n } = useTranslation('dashboard');
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
    <LegacyMobileChatHeader language={i18n.language} languageOpen={languageOpen}
      onLanguageToggle={() => setLanguageOpen(v => !v)} onLanguageClose={() => setLanguageOpen(false)}
      onLanguageSelect={code => { i18n.changeLanguage(code); setLanguageOpen(false); }}
      onRecents={() => { setLanguageOpen(false); window.dispatchEvent(new Event('hivemind:mobile-history')); }} />
  </div>;
}
