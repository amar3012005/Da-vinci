/**
 * Language switcher — matches ChatGPT/Claude/Gemini UX.
 *
 * Globe icon button → click → popover w/ scrollable list of native-name
 * language entries → click an entry → i18next.changeLanguage + persisted
 * to localStorage (hivemind:lang).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../../../i18n';

export default function LangSwitcher({ compact = false }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = (i18n.language || 'en').split('-')[0];
  const currentMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === current) || SUPPORTED_LANGUAGES[0];

  const pickLanguage = async (code) => {
    try {
      await i18n.changeLanguage(code);
    } catch (e) {
      console.warn('[lang] changeLanguage failed', e);
    }
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e3e0db] bg-white hover:bg-[#f5f3ee] transition-colors text-[12px] font-medium text-[#525252] ${
          compact ? '' : 'min-w-[68px] justify-center'
        }`}
        title={t('common.language', 'Language')}
        aria-label={t('common.language', 'Language')}
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5" strokeWidth={2} />
        <span className="uppercase tracking-wide text-[11px] font-semibold">
          {currentMeta.code}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[220px] max-h-[360px] overflow-y-auto rounded-xl border border-[#e3e0db] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1.5 z-[100]"
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-[0.08em] text-[#8a8a8a] font-semibold">
            {t('common.languageHeader', 'Choose language')}
          </div>
          {SUPPORTED_LANGUAGES.map((lng) => {
            const active = lng.code === current;
            return (
              <button
                key={lng.code}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => pickLanguage(lng.code)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-[#f5f3ee] transition-colors ${
                  active ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'
                }`}
              >
                <span className="flex-1">
                  <span>{lng.native}</span>
                  <span className="ml-2 text-[10px] text-[#8a8a8a] font-mono uppercase">
                    {lng.code}
                  </span>
                </span>
                {active && <Check className="w-3.5 h-3.5" strokeWidth={2.4} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
