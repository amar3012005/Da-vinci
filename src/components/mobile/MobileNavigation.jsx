import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, ArrowRight, ChevronDown, ArrowUpRight, Brain, Network, Mic2, Bot, ShieldCheck, BookOpen, Code2, Landmark, FileText, FlaskConical, Sparkles } from 'lucide-react';
import { useTheme, t } from './ThemeContext';
import { getMobileCopy } from './mobileCopy';
import { HIVEMIND_URL, hivemindHref } from './hivemindLinks';
import SingulanceBrand from '../hivemind/app/shared/SingulanceBrand';

const PRODUCT_MENU = [
  { title: 'HIVEMIND', label: 'BRAIN', description: 'Your company memory, with complete recall.', href: HIVEMIND_URL, icon: Brain },
  { title: 'HIVEMIND', label: 'OS', description: 'The operating system for your AI company.', href: hivemindHref('/app/employees/mycompany'), icon: Network },
  { title: 'HIVEMIND', label: 'VOICE', description: 'A voice that knows your business.', href: hivemindHref('/app/tara'), icon: Mic2 },
  { title: 'HIVEMIND', label: 'RUNTIME', description: 'Autonomous work, built for the real world.', href: hivemindHref('/app/employees'), icon: Bot, soon: true },
  { title: 'HIVEMIND', label: 'ICARUS', description: 'A memory filesystem for AI agents.', href: '/research/icarus', icon: ShieldCheck },
];

const MENU_CONTENT = {
  Products: { eyebrow: 'THE SINGULANCE STACK', items: PRODUCT_MENU },
  Solutions: {
    eyebrow: 'WHAT SINGULANCE UNLOCKS',
    items: [
      { title: 'Sovereign intelligence', label: 'EU-READY', description: 'Memory and agents built for regulated organizations.', href: hivemindHref('#sovereignty'), icon: Landmark },
      { title: 'Company memory', label: 'KNOWLEDGE', description: 'Turn documents and conversations into permanent context.', href: hivemindHref('#features'), icon: Brain },
      { title: 'Digital workforce', label: 'HYPERAGENTS', description: 'Specialists that act from your company context.', href: hivemindHref('#hyperagents'), icon: Sparkles },
    ],
  },
  Developers: {
    eyebrow: 'BUILD WITH SINGULANCE',
    items: [
      { title: 'Developer docs', label: 'DOCUMENTATION', description: 'Integrate memory, agents, and tools into your workflow.', href: hivemindHref('/docs'), icon: BookOpen },
      { title: 'MCP server', label: 'TOOLS', description: 'Give your coding environment governed company recall.', href: hivemindHref('/app/mcp'), icon: Code2 },
      { title: 'ICARUS research', label: 'MEMORY SYSTEMS', description: 'Read the architecture behind durable agent memory.', href: '/research/icarus', icon: FlaskConical },
    ],
  },
  Pricing: {
    eyebrow: 'PLANS THAT SCALE WITH CONTEXT',
    items: [
      { title: 'Personal', label: 'START FREE', description: 'Build your second brain with HIVEMIND.', href: hivemindHref('#pricing'), icon: Brain },
      { title: 'Teams', label: 'SHARED CONTEXT', description: 'Bring memory, agents, and your team together.', href: hivemindHref('#pricing'), icon: Network },
      { title: 'Enterprise', label: 'SOVEREIGN', description: 'A governed operating layer for your organization.', href: hivemindHref('#pricing'), icon: Landmark },
    ],
  },
  Docs: {
    eyebrow: 'LEARN THE SYSTEM',
    items: [
      { title: 'Documentation', label: 'GUIDES', description: 'Set up HIVEMIND and begin with your company context.', href: hivemindHref('/docs'), icon: BookOpen },
      { title: 'Research', label: 'PAPERS', description: 'Explore the ideas and systems behind SINGULANCE.', href: '/research', icon: FileText },
      { title: 'Benchmark', label: 'EVALUATION', description: 'Inspect our recall and memory-system results.', href: '/benchmark', icon: FlaskConical },
    ],
  },
  Research: {
    eyebrow: 'FROM THE LAB',
    items: [
      { title: 'Research index', label: 'ALL PAPERS', description: 'The work behind our memory and agent systems.', href: '/research', icon: BookOpen },
      { title: 'ICARUS', label: 'MEMORY FILESYSTEM', description: 'Durable memory storage for the agentic era.', href: '/research/icarus', icon: ShieldCheck },
      { title: 'Benchmark', label: 'LONGMEMEVAL', description: 'Measured memory performance and methodology.', href: '/benchmark', icon: FlaskConical },
    ],
  },
};

const MobileNavigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const closeTimerRef = useRef(null);
  const navigate = useNavigate();
  const { isDark, toggle, locale, setLocale } = useTheme();
  const c = t(isDark);
  const copy = getMobileCopy(locale);
  const navLinks = [
    { label: 'Products', href: HIVEMIND_URL, menu: 'Products' },
    { label: copy.nav.links.solutions, sectionId: 'solutions', menu: 'Solutions' },
    { label: 'Developers', href: hivemindHref('#developers'), menu: 'Developers' },
    { label: 'Pricing', href: hivemindHref('#pricing'), menu: 'Pricing' },
    { label: 'Docs', href: hivemindHref('/docs'), menu: 'Docs' },
    { label: './ ' + copy.nav.links.research, href: '/research', menu: 'Research' },
    { label: './ Benchmark', href: '/benchmark', menu: 'Research' },
  ];
  const mobileOnlyLinks = [...navLinks, { label: copy.nav.links.contact, sectionId: 'cta-section' }];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

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
    setActiveMenu(null);
    if (item.href) {
      if (item.href.startsWith('http')) window.location.assign(item.href);
      else navigate(item.href);
    } else if (item.sectionId) {
      // On phone widths, MobileHomepage skips mounting the heavy sections
      // (SubProducts/MobileAboutSection) that own these ids — fall back to
      // the always-mounted footer's namesake anchor so the link still lands
      // somewhere real instead of silently doing nothing.
      const el = document.getElementById(item.sectionId) || document.getElementById(`${item.sectionId}-footer`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cancelMenuClose = () => window.clearTimeout(closeTimerRef.current);
  const closeMenuSoon = () => {
    cancelMenuClose();
    closeTimerRef.current = window.setTimeout(() => setActiveMenu(null), 140);
  };
  const openMenu = (menu) => {
    cancelMenuClose();
    setActiveMenu(menu);
  };
  const activeContent = activeMenu ? MENU_CONTENT[activeMenu] : null;

  return (
    <>
      <nav className={`fixed top-0 inset-x-0 z-[100] transition-colors duration-500 ${scrolled || mobileOpen ? 'bg-[#05070f]/70 backdrop-blur-md border-b border-white/10' : 'bg-transparent border-b border-transparent'}`}>
        <div className={`max-w-[1200px] mx-auto border-x transition-colors duration-500 ${scrolled || mobileOpen ? 'border-white/10' : 'border-transparent'}`}>
          <div className="px-6 h-16 flex items-center justify-between">
            {/* Canonical dark-chrome SINGULANCE vector lockup. */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.location.pathname.startsWith('/test')) {
                  window.location.href = '/';
                  return;
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center bg-transparent border-none cursor-pointer p-0"
              aria-label="SINGULANCE home"
            >
              <SingulanceBrand variant="dark" markSize={32} />
            </button>

            {/* Center Links — Desktop */}
            <div className="hidden lg:flex items-center gap-1" onMouseLeave={closeMenuSoon}>
              {navLinks.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item)}
                  onMouseEnter={() => item.menu && openMenu(item.menu)}
                  onFocus={() => item.menu && openMenu(item.menu)}
                  aria-expanded={activeMenu === item.menu}
                  className={`group flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium ${activeMenu === item.menu ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-[#0a0a0a]') : `${c.textMuted} ${isDark ? 'hover:text-white' : 'hover:text-[#0a0a0a]'}`} transition-colors bg-transparent border-none cursor-pointer tracking-wide`}
                >
                  {item.label}
                  {item.menu && <ChevronDown size={13} className={`transition-transform ${activeMenu === item.menu ? 'rotate-180' : ''}`} />}
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

      {/* Desktop glass mega-menu. It shares the navbar hover boundary, so moving
          from a link into its panel never closes it before a user can click. */}
      <AnimatePresence>
        {activeContent && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onMouseEnter={cancelMenuClose}
            onMouseLeave={closeMenuSoon}
            className={`fixed left-1/2 top-[72px] z-[99] hidden w-[min(980px,calc(100vw-48px))] -translate-x-1/2 overflow-hidden rounded-[18px] border p-3 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-2xl lg:block ${isDark ? 'border-white/15 bg-[#0d1016]/80' : 'border-black/10 bg-white/80'}`}
            style={{ WebkitBackdropFilter: 'blur(24px) saturate(145%)' }}
          >
            <div className={`mb-3 flex items-center justify-between border-b px-2 pb-3 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <span className={`font-mono text-[10px] font-semibold tracking-[0.18em] ${isDark ? 'text-white/45' : 'text-black/45'}`}>{activeContent.eyebrow}</span>
              <span className={`text-[11px] ${isDark ? 'text-white/45' : 'text-black/45'}`}>Explore the system <ArrowUpRight size={12} className="ml-1 inline" /></span>
            </div>
            <div className={`grid gap-2 ${activeContent.items.length === 5 ? 'grid-cols-5' : 'grid-cols-3'}`}>
              {activeContent.items.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={`${item.title}-${item.label}`}
                    href={item.href}
                    onClick={() => setActiveMenu(null)}
                    className={`group block min-h-[180px] rounded-[13px] border p-4 no-underline transition-all ${isDark ? 'border-white/10 bg-white/[0.055] hover:border-[#22d3ee]/70 hover:bg-white/[0.1]' : 'border-black/10 bg-white/45 hover:border-[#117dff]/60 hover:bg-white/75'}`}
                  >
                    <div className="flex items-center justify-between"><Icon size={18} className={isDark ? 'text-[#22d3ee]' : 'text-[#117dff]'} /><ArrowUpRight size={14} className={`opacity-0 transition-opacity group-hover:opacity-100 ${isDark ? 'text-white' : 'text-[#0a0a0a]'}`} /></div>
                    <div className={`mt-8 text-[13px] font-semibold ${isDark ? 'text-white' : 'text-[#0a0a0a]'}`}>{item.title}</div>
                    <div className="mt-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-[#22d3ee]">{item.label}{item.soon ? ' · LAUNCHING SOON' : ''}</div>
                    <p className={`mt-3 text-[11px] leading-5 ${isDark ? 'text-white/55' : 'text-[#525252]'}`}>{item.description}</p>
                  </a>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
