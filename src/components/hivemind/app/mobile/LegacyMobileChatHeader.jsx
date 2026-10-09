import React from 'react';
import { Globe, Clock, ChevronDown } from 'lucide-react';

const LANG_OPTIONS = [
  { c: 'en', n: 'English' }, { c: 'de', n: 'Deutsch' },
  { c: 'es', n: 'Español' }, { c: 'fr', n: 'Français' },
  { c: 'it', n: 'Italiano' }, { c: 'pt', n: 'Português' },
  { c: 'nl', n: 'Nederlands' }, { c: 'pl', n: 'Polski' },
  { c: 'sv', n: 'Svenska' }, { c: 'ru', n: 'Русский' },
  { c: 'uk', n: 'Українська' }, { c: 'tr', n: 'Türkçe' },
  { c: 'ar', n: 'العربية' }, { c: 'he', n: 'עברית' },
  { c: 'hi', n: 'हिन्दी' }, { c: 'ja', n: '日本語' },
  { c: 'ko', n: '한국어' }, { c: 'zh', n: '中文' },
  { c: 'vi', n: 'Tiếng Việt' }, { c: 'th', n: 'ไทย' },
  { c: 'id', n: 'Indonesia' },
];

const buttonClass = 'relative z-40 inline-flex items-center gap-1 h-11 min-w-[44px] px-2.5 rounded-full bg-[#faf9f4]/85 backdrop-blur-sm text-[11.5px] font-semibold text-[#3d3d3a] active:bg-[#ece9e2]';

// Original mobile chat chrome; callers retain ownership of their history source.
export default function LegacyMobileChatHeader({ language = 'en', languageOpen = false, onLanguageToggle, onLanguageClose, onLanguageSelect, recentsOpen, onRecents, onRecentsClose, children, compact = false }) {
  const code = language.slice(0, 2);
  const controlClass = compact ? 'relative z-40 inline-flex items-center gap-1 h-11 min-w-[44px] px-1.5 rounded-full bg-[#faf9f4]/85 backdrop-blur-sm text-[10.5px] font-semibold text-[#3d3d3a] active:bg-[#ece9e2]' : buttonClass;
  return <div className={`absolute right-2.5 z-40 flex items-center ${compact ? 'gap-0.5 hm-legacy-chat-header-compact' : 'gap-1.5'}`} style={{ top: 'calc(env(safe-area-inset-top, 0px) + 6px)' }}>
    <div className="relative">
      {languageOpen && <div className="fixed inset-0 z-30" onClick={onLanguageClose} />}
      <button type="button" onClick={onLanguageToggle} className={controlClass} aria-label="Reply language" aria-expanded={languageOpen}>
        <Globe size={16} className="text-[#117dff]" /><span>{code.toUpperCase()}</span>{!compact && <ChevronDown size={11} className="text-[#a3a3a3]" />}
      </button>
      {languageOpen && <div className="absolute top-full mt-1.5 right-0 z-40 w-[180px] overflow-y-auto overscroll-contain bg-white border border-[#e8e5de] rounded-xl shadow-lg py-1" style={{ maxHeight: 'min(300px, calc(var(--hm-mobile-shell-height, 100dvh) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 64px))' }} onClick={onLanguageClose}>
        {LANG_OPTIONS.map(l => <button type="button" key={l.c} onClick={() => onLanguageSelect(l.c)} className={`w-full min-h-[44px] text-left px-3 py-2 flex items-center justify-between text-[13px] ${code === l.c ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'} active:bg-[#f3f1ec]`}>
          <span>{l.n}</span><span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a3a3a3]">{l.c}</span>
        </button>)}
      </div>}
    </div>
    <div className="relative">
      {recentsOpen && <div className="fixed inset-0 z-30" onClick={onRecentsClose} />}
      <button type="button" onClick={onRecents} className={controlClass} aria-label="Recent conversations" aria-expanded={recentsOpen}>
        <Clock size={16} className="text-[#117dff]" /><span>Recents</span>{!compact && <ChevronDown size={11} className="text-[#a3a3a3]" />}
      </button>
      {children}
    </div>
  </div>;
}
