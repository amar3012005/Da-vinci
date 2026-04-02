import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Color tokens — black & white editorial aesthetic
export const themes = {
  dark: {
    bg: '#080808',
    bgCard: '#141414',
    bgHover: 'rgba(255,255,255,0.03)',
    text: '#E7E7ED',
    textSecondary: '#9E9E9E',
    textMuted: '#585858',
    border: 'rgba(255,255,255,0.1)',
    accent: '#ffffff',
    accentHover: '#d4d4d4',
    badge: '#1a1a1a',
    badgeText: 'rgba(255,255,255,0.6)',
  },
  light: {
    bg: '#faf9f4',
    bgCard: '#ffffff',
    bgHover: '#f3f1ec',
    text: '#0a0a0a',
    textSecondary: '#525252',
    textMuted: '#a3a3a3',
    border: '#e3e0db',
    accent: '#0a0a0a',
    accentHover: '#333333',
    badge: 'rgba(0,0,0,0.05)',
    badgeText: '#0a0a0a',
  },
};

// Tailwind class helpers
export const t = (isDark) => ({
  bg: isDark ? 'bg-[#080808]' : 'bg-[#faf9f4]',
  bgCard: isDark ? 'bg-[#141414]' : 'bg-white',
  text: isDark ? 'text-[#E7E7ED]' : 'text-[#0a0a0a]',
  textSecondary: isDark ? 'text-[#9E9E9E]' : 'text-[#525252]',
  textMuted: isDark ? 'text-[#585858]' : 'text-[#a3a3a3]',
  border: isDark ? 'border-white/10' : 'border-[#e3e0db]',
  accent: isDark ? 'text-white' : 'text-[#0a0a0a]',
  accentBg: isDark ? 'bg-white' : 'bg-[#0a0a0a]',
  accentText: isDark ? 'text-[#080808]' : 'text-white',
  accentHover: isDark ? 'hover:bg-[#d4d4d4]' : 'hover:bg-[#333]',
  badge: isDark ? 'bg-[#1a1a1a] text-white/60' : 'bg-black/[0.04] text-[#0a0a0a]',
  hoverBg: isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-[#f3f1ec]',
  navBg: isDark ? 'bg-[#080808]' : 'bg-[#faf9f4]',
  shadow: isDark ? 'shadow-none' : 'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
  divider: isDark
    ? 'bg-gradient-to-b from-transparent via-white/5 to-white/10'
    : 'bg-gradient-to-b from-transparent via-[#e3e0db]/50 to-[#e3e0db]',
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  const [locale, setLocale] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = window.localStorage.getItem('davinci-mobile-locale');
    if (stored === 'de' || stored === 'en') return stored;
    return 'en';
  });

  const toggle = () => setIsDark((prev) => !prev);
  const toggleLocale = () => setLocale((prev) => (prev === 'en' ? 'de' : 'en'));

  useEffect(() => {
    document.documentElement.style.backgroundColor = isDark ? '#080808' : '#faf9f4';
  }, [isDark]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('davinci-mobile-locale', locale);
  }, [locale]);

  return (
    <ThemeContext.Provider value={{ isDark, toggle, locale, setLocale, toggleLocale }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
