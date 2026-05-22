/**
 * Dark-theme language switcher for the public Navbar (Da'vinci landing).
 * Same UX as the dashboard switcher but tuned for the black/green palette.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

export default function LangSwitcherDark() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

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

  const pick = async (code) => {
    try { await i18n.changeLanguage(code); } catch {}
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1 text-white hover:text-green-400 transition-colors text-xs tracking-wider font-mono"
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="uppercase">{current}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[220px] max-h-[360px] overflow-y-auto bg-black border border-green-400/30 shadow-[0_8px_24px_rgba(0,0,0,0.4)] py-1 z-[100] font-mono"
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-[0.08em] text-green-400/70">
            Language
          </div>
          {SUPPORTED_LANGUAGES.map((lng) => {
            const active = lng.code === current;
            return (
              <button
                key={lng.code}
                onClick={() => pick(lng.code)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-green-400/10 transition-colors ${
                  active ? 'text-green-400' : 'text-white/80'
                }`}
              >
                <span className="flex-1">
                  <span>{lng.native}</span>
                  <span className="ml-2 text-[10px] text-white/40 uppercase">{lng.code}</span>
                </span>
                {active && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
