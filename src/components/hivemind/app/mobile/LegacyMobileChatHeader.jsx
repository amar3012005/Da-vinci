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

const buttonClass = 'relative z-40 inline-flex items-center gap-1 h-9 px-2.5 rounded-full bg-[#faf9f4]/85 backdrop-blur-sm text-[11.5px] font-semibold text-[#3d3d3a] active:bg-[#ece9e2]';

// Original mobile chat chrome; callers retain ownership of their history source.
export default function LegacyMobileChatHeader({ language = 'en', languageOpen = false, onLanguageToggle, onLanguageClose, onLanguageSelect, recentsOpen, onRecents, onRecentsClose, children }) {
  const code = language.slice(0, 2);
  return <div className="absolute right-2.5 z-40 flex items-center gap-1.5" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 9px)' }}>
    <div className="relative">
      {languageOpen && <div className="fixed inset-0 z-30" onClick={onLanguageClose} />}
      <button type="button" onClick={onLanguageToggle} className={buttonClass} aria-label="Reply language" aria-expanded={languageOpen}>
        <Globe size={13} className="text-[#117dff]" /><span>{code.toUpperCase()}</span><ChevronDown size={11} className="text-[#a3a3a3]" />
      </button>
      {languageOpen && <div className="absolute top-full mt-1.5 right-0 z-40 w-[180px] max-h-[300px] overflow-y-auto bg-white border border-[#e8e5de] rounded-xl shadow-lg py-1" onClick={onLanguageClose}>
        {LANG_OPTIONS.map(l => <button type="button" key={l.c} onClick={() => onLanguageSelect(l.c)} className={`w-full text-left px-3 py-2 flex items-center justify-between text-[13px] ${code === l.c ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'} active:bg-[#f3f1ec]`}>
          <span>{l.n}</span><span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a3a3a3]">{l.c}</span>
        </button>)}
      </div>}
    </div>
    <div className="relative">
      {recentsOpen && <div className="fixed inset-0 z-30" onClick={onRecentsClose} />}
      <button type="button" onClick={onRecents} className={buttonClass} aria-label="Recent conversations" aria-expanded={recentsOpen}>
        <Clock size={13} className="text-[#117dff]" /><span>Recents</span><ChevronDown size={11} className="text-[#a3a3a3]" />
      </button>
      {children}
    </div>
  </div>;
}
