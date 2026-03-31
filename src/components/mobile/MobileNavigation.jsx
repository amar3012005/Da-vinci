import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, ArrowRight } from 'lucide-react';
import { useTheme, t } from './ThemeContext';

const navLinks = [
  { label: 'Solutions', sectionId: 'solutions' },
  { label: 'Research', href: '/research' },
  { label: 'Contact', sectionId: 'cta-section' },
];

const MobileNavigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark, toggle } = useTheme();
  const c = t(isDark);

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
      window.location.href = item.href;
    } else if (item.sectionId) {
      const el = document.getElementById(item.sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <nav className={`fixed top-0 inset-x-0 z-[100] ${c.navBg} border-b ${c.border}`}>
        <div className={`max-w-[1200px] mx-auto border-x ${c.border}`}>
          <div className="px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.location.pathname.startsWith('/test')) {
                  window.location.href = '/';
                  return;
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center bg-transparent border-none cursor-pointer"
            >
              <img
                src="/images/davinci-logo.svg"
                alt="Da Vinci"
                className={`h-8 ${isDark ? 'invert brightness-150' : ''}`}
              />
            </button>

            {/* Center Links — Desktop */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item)}
                  className={`text-sm font-medium ${c.textMuted} ${isDark ? 'hover:text-white' : 'hover:text-[#0a0a0a]'} transition-colors bg-transparent border-none cursor-pointer tracking-wide`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right Buttons — Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggle}
                className={`p-2 ${c.textMuted} ${isDark ? 'hover:text-white' : 'hover:text-[#0a0a0a]'} transition-colors bg-transparent border-none cursor-pointer`}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <a
                href="/hivemind"
                className={`flex items-center gap-1.5 px-5 py-2 ${c.accentBg} ${c.accentText} text-xs font-semibold rounded-full ${c.accentHover} transition-colors uppercase tracking-[0.1em] cursor-pointer border-none no-underline`}
              >
                HIVEMIND
                <ArrowRight size={12} />
              </a>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden p-2 ${c.textMuted} ${isDark ? 'hover:text-white' : 'hover:text-[#0a0a0a]'} bg-transparent border-none cursor-pointer`}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
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
            className={`fixed inset-0 z-[99] ${isDark ? 'bg-[#080808]/95' : 'bg-[#faf9f4]/95'} backdrop-blur-xl md:hidden`}
          >
            <div className="pt-24 px-8 flex flex-col gap-2">
              {navLinks.map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleNavClick(item)}
                  className={`text-left text-2xl font-medium ${c.text} py-3 border-b ${c.border} bg-transparent border-x-0 border-t-0 cursor-pointer`}
                >
                  {item.label}
                </motion.button>
              ))}

              {/* Theme toggle row */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.05 }}
                onClick={toggle}
                className={`flex items-center gap-3 text-left text-2xl font-medium ${c.text} py-3 border-b ${c.border} bg-transparent border-x-0 border-t-0 cursor-pointer`}
              >
                {isDark ? <Sun size={22} /> : <Moon size={22} />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </motion.button>

              <div className="flex flex-col gap-3 mt-8">
                <a
                  href="/hivemind"
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
