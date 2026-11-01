/**
 * Language switcher — matches ChatGPT/Claude/Gemini UX.
 *
 * Globe icon button → click → popover w/ scrollable list of native-name
 * language entries → click an entry → i18next.changeLanguage + persisted
 * to localStorage (hivemind:lang).
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../../../i18n';

const MENU_WIDTH = 220;
const VIEWPORT_GUTTER = 16;

/**
 * Where the menu sits so it is right-aligned to its button and never leaves the viewport.
 * @param {{left: number, right: number}} anchor - The button's viewport rectangle.
 * @param {number} viewportWidth - Width of the viewport in CSS pixels.
 * @returns {{width: number, left: number}} Menu width, and its left edge relative to the button's left edge.
 */
export function menuPlacement(anchor, viewportWidth) {
  const width = Math.max(0, Math.min(MENU_WIDTH, viewportWidth - 2 * VIEWPORT_GUTTER));
  const edge = Math.max(VIEWPORT_GUTTER, Math.min(anchor.right - width, viewportWidth - VIEWPORT_GUTTER - width));
  return { width, left: edge - anchor.left };
}

export default function LangSwitcher({ compact = false, theme = 'light', variant = 'button', linkLabel = null, includeAutoDetect = false, onLanguageChange = null, onAutoDetect = null }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const [placement, setPlacement] = useState(null);

  // Keep the open menu inside the viewport: right-aligned to the button, narrower than the screen minus a gutter.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      if (wrapRef.current) setPlacement(menuPlacement(wrapRef.current.getBoundingClientRect(), document.documentElement.clientWidth || window.innerWidth));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target) && !e.composedPath?.().includes(wrapRef.current)) setOpen(false);
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
  const dark = theme === 'night' || theme === 'dark';

  const pickLanguage = async (code) => {
    try {
      await i18n.changeLanguage(code);
      onLanguageChange?.(code);
      window.dispatchEvent(new CustomEvent('hivemind:ui-language', { detail: { language: code } }));
    } catch (e) {
      console.warn('[lang] changeLanguage failed', e);
    }
    setOpen(false);
  };

  const pickAutoDetect = () => {
    onAutoDetect?.();
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${variant === 'link'
          ? 'inline-flex items-center gap-1 text-[12px] font-medium text-[#117dff] underline decoration-[#117dff]/40 underline-offset-2 hover:text-[#0066e0]'
          : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors text-[12px] font-medium'} ${variant === 'link' ? '' : (
          dark
            ? 'border-[#2f2925] bg-[#080808]/78 text-[#d5c8bc] hover:text-[#fff0e5]'
            : 'border-[#e3e0db] bg-white text-[#525252] hover:bg-[#f5f3ee]'
        )} ${variant === 'link' ? '' : (
          compact ? '' : 'min-w-[68px] justify-center'
        )}`}
        title={t('common.language', 'Language')}
        aria-label={t('common.language', 'Language')}
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5" strokeWidth={2} />
        <span className="uppercase tracking-wide text-[11px] font-semibold">
          {linkLabel || currentMeta.code}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={placement ? { left: placement.left, right: 'auto', width: placement.width } : undefined}
          className={`absolute right-0 mt-2 w-[220px] max-w-[calc(100vw-32px)] max-h-[360px] overflow-y-auto rounded-xl border shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1.5 z-[100] ${
            dark
              ? 'border-[#2f2925] bg-[#080808] shadow-[0_18px_48px_rgba(0,0,0,0.46)]'
              : 'border-[#e3e0db] bg-white'
          }`}
        >
          <div className={`px-3 py-2 text-[10px] uppercase tracking-[0.08em] font-semibold ${dark ? 'text-[#9d9288]' : 'text-[#8a8a8a]'}`}>
            {t('common.languageHeader', 'Choose language')}
          </div>
          {includeAutoDetect && (
            <button
              type="button"
              role="menuitem"
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); pickAutoDetect(); }}
              className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${dark ? 'text-[#d5c8bc] hover:bg-[#151312]' : 'text-[#0a0a0a] hover:bg-[#f5f3ee]'}`}
            >
              Company language: auto-detect from website
            </button>
          )}
          {SUPPORTED_LANGUAGES.map((lng) => {
            const active = lng.code === current;
            return (
              <button
                key={lng.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  pickLanguage(lng.code);
                }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] transition-colors ${
                  dark ? 'hover:bg-[#151312]' : 'hover:bg-[#f5f3ee]'
                } ${
                  active
                    ? dark ? 'text-[#fff0e5] font-semibold' : 'text-[#117dff] font-semibold'
                    : dark ? 'text-[#d5c8bc]' : 'text-[#0a0a0a]'
                }`}
              >
                <span className="flex-1">
                  <span>{lng.native}</span>
                  <span className={`ml-2 text-[10px] font-mono uppercase ${dark ? 'text-[#8f8378]' : 'text-[#8a8a8a]'}`}>
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
