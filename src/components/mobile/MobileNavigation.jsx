import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, ArrowRight } from 'lucide-react';
import { useTheme, t } from './ThemeContext';
import { getMobileCopy } from './mobileCopy';
import { HIVEMIND_URL, hivemindHref } from './hivemindLinks';

const MobileNavigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { isDark, toggle, locale, setLocale } = useTheme();
  const c = t(isDark);
  const copy = getMobileCopy(locale);
  const navLinks = [
    { label: 'Platform', href: HIVEMIND_URL },
    { label: copy.nav.links.solutions, sectionId: 'solutions' },
    { label: 'Developers', href: hivemindHref('#developers') },
    { label: 'Pricing', href: hivemindHref('#pricing') },
    { label: 'Docs', href: hivemindHref('/docs') },
    { label: './ ' + copy.nav.links.research, href: '/research' },
    { label: './ Benchmark', href: '/benchmark' },
  ];
  const mobileOnlyLinks = [...navLinks, { label: copy.nav.links.contact, sectionId: 'cta-section' }];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      window.lenis?.stop();
    } else {
      document.body.style.overflow = 'unset';
      window.lenis?.start();
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.lenis?.start();
    };
  }, [mobileOpen]);

  const handleNavClick = (item) => {
    setMobileOpen(false);
    if (item.href) {
      if (item.href.startsWith('http')) window.location.assign(item.href);
      else navigate(item.href);
    } else if (item.sectionId) {
      const el = document.getElementById(item.sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <nav className={`fixed top-0 inset-x-0 z-[100] transition-colors duration-500 ${scrolled || mobileOpen ? 'bg-[#05070f]/70 backdrop-blur-md border-b border-white/10' : 'bg-transparent border-b border-transparent'}`}>
        <div className={`max-w-[1200px] mx-auto border-x transition-colors duration-500 ${scrolled || mobileOpen ? 'border-white/10' : 'border-transparent'}`}>
          <div className="px-6 h-16 flex items-center justify-between">
            {/* Logo — SINGULANCE wordmark */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.location.pathname.startsWith('/test')) {
                  window.location.href = '/';
                  return;
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center bg-transparent border-none cursor-pointer p-0"
            >
              <span className="text-white text-lg font-semibold tracking-[0.04em]">SINGULANCE</span>
            </button>

            {/* Center Links — Desktop */}
            <div className="hidden lg:flex items-center gap-5">
              {navLinks.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item)}
                  className={`text-[13px] font-medium ${c.textMuted} ${isDark ? 'hover:text-white' : 'hover:text-[#0a0a0a]'} transition-colors bg-transparent border-none cursor-pointer tracking-wide`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right Buttons — Desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <div className={`inline-flex items-center rounded-full border ${c.border} p-1 ${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
                {['en', 'de'].map((lang) => {
                  const active = locale === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLocale(lang)}
                      className={`min-w-[38px] rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] transition-colors ${
                        active
                          ? `${c.accentBg} ${c.accentText}`
                          : `${c.textMuted} bg-transparent`
                      }`}
                      aria-label={`${copy.nav.languageLabel} ${lang.toUpperCase()}`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={toggle}
                className={`p-2 ${c.textMuted} ${isDark ? 'hover:text-white' : 'hover:text-[#0a0a0a]'} transition-colors bg-transparent border-none cursor-pointer`}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <a
                href={hivemindHref('/login')}
                className={`text-[13px] font-medium ${c.textMuted} ${isDark ? 'hover:text-white' : 'hover:text-[#0a0a0a]'} transition-colors no-underline px-3`}
              >
                Sign in
              </a>
              <a
                href={HIVEMIND_URL}
                className={`flex items-center gap-1.5 px-5 py-2 ${c.accentBg} ${c.accentText} text-xs font-semibold rounded-full ${c.accentHover} transition-colors uppercase tracking-[0.1em] cursor-pointer border-none no-underline`}
              >
                HIVEMIND
                <ArrowRight size={12} />
              </a>
            </div>

            {/* Mobile Hamburger */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`p-2 ${c.textMuted} ${isDark ? 'hover:text-white' : 'hover:text-[#0a0a0a]'} bg-transparent border-none cursor-pointer`}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-[99] ${isDark ? 'bg-[#080808]/95' : 'bg-[#faf9f4]/95'} backdrop-blur-xl lg:hidden`}
          >
            <div className="pt-24 px-8 flex flex-col gap-2">
              {mobileOnlyLinks.map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleNavClick(item)}
                  className={`text-left text-xl font-medium ${c.text} py-3 border-b ${c.border} bg-transparent border-x-0 border-t-0 cursor-pointer`}
                >
                  {item.label}
                </motion.button>
              ))}

              {/* Theme toggle row */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: mobileOnlyLinks.length * 0.05 }}
                onClick={toggle}
                className={`flex items-center gap-3 text-left text-2xl font-medium ${c.text} py-3 border-b ${c.border} bg-transparent border-x-0 border-t-0 cursor-pointer`}
              >
                {isDark ? <Sun size={22} /> : <Moon size={22} />}
                {isDark ? copy.nav.lightMode : copy.nav.darkMode}
              </motion.button>

              {/* Language toggle row */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (mobileOnlyLinks.length + 1) * 0.05 }}
                className={`flex items-center gap-2 py-4 border-b ${c.border}`}
              >
                <span className={`text-[13px] font-medium ${c.textMuted}`}>Language:</span>
                <div className={`inline-flex items-center rounded-full border ${c.border} p-0.5 ${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
                  {['en', 'de'].map((lang) => {
                    const active = locale === lang;
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setLocale(lang)}
                        className={`min-w-[40px] rounded-full px-3 py-1 text-xs font-mono uppercase tracking-[0.22em] transition-colors ${
                          active
                            ? `${c.accentBg} ${c.accentText}`
                            : `${c.textMuted} bg-transparent`
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              <div className="flex flex-col gap-3 mt-8">
                <a
                  href={HIVEMIND_URL}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full py-3.5 rounded-full ${c.accentBg} ${c.accentText} ${c.accentHover} font-semibold text-xs uppercase tracking-[0.1em] no-underline flex items-center justify-center gap-2 transition-colors`}
                >
                  HIVEMIND
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNavigation;
