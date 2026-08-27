import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, ChevronRight, ArrowUpRight, Brain, Network, Sparkles, BookOpen, Code2, ShieldCheck, FlaskConical, Landmark } from 'lucide-react';
import SingulanceBrand from '../app/shared/SingulanceBrand';

const navLinks = [
  { label: 'Solutions', href: '#solutions' },
  { label: 'Developers', href: '#developers' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '/hivemind/docs' },
  { label: './ Research', href: '/research' },
  { label: './ Benchmark', href: '/benchmark' },
];

const proofMetrics = [
  { value: '<50ms', label: 'recall' },
  { value: '100%', label: 'yours' },
  { value: '∞', label: 'retention' },
];

const MENU_CONTENT = {
  Solutions: [
    { title: 'Sovereign intelligence', label: 'EU-READY', brief: 'Keep intelligence inside the boundary you control.', href: '#solutions', icon: Landmark },
    { title: 'Company memory', label: 'KNOWLEDGE', brief: 'Turn scattered company knowledge into living context.', href: '/hivemind/app/knowledge', icon: Brain },
    { title: 'Digital workforce', label: 'HYPERAGENTS', brief: 'Recruit specialists who already understand the company.', href: '/hivemind/app/employees', icon: Sparkles },
  ],
  Developers: [
    { title: 'Developer docs', label: 'DOCUMENTATION', brief: 'Build once against memory that keeps getting smarter.', href: '/hivemind/docs', icon: BookOpen },
    { title: 'MCP server', label: 'TOOLS', brief: 'Give every coding agent governed company recall.', href: '/hivemind/app/mcp', icon: Code2 },
    { title: 'ICARUS', label: 'MEMORY SYSTEMS', brief: 'Agent memory that survives models, sessions, and time.', href: '/research/icarus', icon: ShieldCheck },
  ],
  Pricing: [
    { title: 'Personal', label: 'START FREE', brief: 'Start with one brain. Grow into an operating system.', href: '#pricing', icon: Brain },
    { title: 'Teams', label: 'SHARED CONTEXT', brief: 'Give every teammate the same living company context.', href: '#pricing', icon: Network },
    { title: 'Enterprise', label: 'SOVEREIGN', brief: 'Deploy a governed AI company on your terms.', href: '#pricing', icon: Landmark },
  ],
  Docs: [
    { title: 'Documentation', label: 'GUIDES', brief: 'Go from first memory to a working AI company.', href: '/hivemind/docs', icon: BookOpen },
    { title: 'Research', label: 'PAPERS', brief: 'Read the systems thinking behind SINGULANCE.', href: '/research', icon: ShieldCheck },
    { title: 'Benchmark', label: 'EVALUATION', brief: 'Measure recall before trusting it.', href: '/benchmark', icon: FlaskConical },
  ],
  Research: [
    { title: 'Research index', label: 'ALL PAPERS', brief: 'Ideas that become the infrastructure of AI companies.', href: '/research', icon: BookOpen },
    { title: 'ICARUS', label: 'MEMORY FILESYSTEM', brief: 'Memory that outlives the model using it.', href: '/research/icarus', icon: ShieldCheck },
    { title: 'Benchmark', label: 'LONGMEMEVAL', brief: 'Evidence, not promises.', href: '/benchmark', icon: FlaskConical },
  ],
};

const CARD_BACKDROPS = [
  'radial-gradient(circle at 82% 14%,rgba(34,211,238,.28),transparent 30%),linear-gradient(145deg,rgba(17,125,255,.14),rgba(255,255,255,.64) 65%)',
  'linear-gradient(105deg,rgba(255,92,32,.32),transparent 30%,rgba(255,174,0,.16) 58%,transparent 74%),linear-gradient(155deg,rgba(255,255,255,.76),rgba(244,241,235,.74))',
  'radial-gradient(circle at 50% 92%,rgba(17,125,255,.28),transparent 38%),radial-gradient(circle at 80% 16%,rgba(34,211,238,.20),transparent 30%),linear-gradient(150deg,rgba(255,255,255,.82),rgba(240,238,232,.70))',
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [visible, setVisible] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const closeTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      setVisible(window.scrollY < lastScrollY || window.scrollY < 100);
      setLastScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    setMobileOpen(false);
  }, [navigate]);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  const handleNavClick = (href) => {
    setMobileOpen(false);
    setActiveMenu(null);
    if (href.startsWith('/')) {
      navigate(href);
    } else if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openMenu = (menu) => {
    window.clearTimeout(closeTimerRef.current);
    setActiveMenu(MENU_CONTENT[menu] ? menu : null);
  };
  const closeMenuSoon = () => {
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setActiveMenu(null), 140);
  };

  return (
    <>
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: visible ? 0 : -100 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${
          scrolled
            ? 'bg-[#faf9f4]/90 backdrop-blur-xl border-b border-[#e3e0db]/80 shadow-[0_2px_16px_rgba(0,0,0,0.04)]'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-[1480px] border-x border-[#e3e0db]">
          <div className="flex h-14 items-center justify-between gap-6 px-4 sm:h-16 sm:px-8">
            {/* Logo */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavClick('/hivemind')}
              className="flex items-center gap-2 sm:gap-2.5 bg-transparent border-none cursor-pointer group"
            >
              <SingulanceBrand variant="light" markSize={30} />
            </motion.button>

            {/* Center Links — Desktop */}
            <div className="hidden min-w-0 flex-1 items-center justify-center gap-4 lg:flex" onMouseLeave={closeMenuSoon}>
              <div className="hidden shrink-0 items-center gap-2 border-r border-[#d9d6d0] pr-4 xl:flex">
                {proofMetrics.map((metric) => (
                  <div key={metric.label} className="min-w-[42px] text-center leading-none">
                    <div className="font-['Space_Grotesk'] text-[11px] font-bold text-[#0a0a0a]">{metric.value}</div>
                    <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.15em] text-[#9b968d]">{metric.label}</div>
                  </div>
                ))}
              </div>
              {navLinks.map((item) => (
                <motion.button
                  key={item.label}
                  whileHover={{ y: -1 }}
                  onClick={() => handleNavClick(item.href)}
                  onMouseEnter={() => openMenu(item.label.replace('./ ', ''))}
                  onFocus={() => openMenu(item.label.replace('./ ', ''))}
                  className="relative shrink-0 cursor-pointer border-none bg-transparent text-xs font-medium text-[#525252] transition-colors hover:text-[#117dff] xl:text-sm"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#117dff] transition-all group-hover:w-full" />
                </motion.button>
              ))}
            </div>

            {/* Right Buttons — Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/hivemind/login')}
                className="text-xs sm:text-sm font-medium text-[#525252] hover:text-[#0a0a0a] transition-colors px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-[#e3e0db] hover:border-[#d4d0ca] bg-white cursor-pointer"
              >
                Sign in
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(17,125,255,0.2)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/hivemind/login')}
                className="flex items-center gap-1 sm:gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 bg-[#117dff] text-white text-xs sm:text-sm font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors group uppercase tracking-[0.075em] cursor-pointer border-none"
              >
                Get Started
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
            </div>

            {/* Mobile Hamburger */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-[#525252] hover:text-[#117dff] transition-colors bg-transparent border-none cursor-pointer"
              aria-label="Toggle menu"
            >
              <motion.div
                initial={false}
                animate={{ rotate: mobileOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </motion.div>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {activeMenu && MENU_CONTENT[activeMenu] && (
          <div className="pointer-events-none fixed inset-x-6 top-[72px] z-[99] hidden justify-center lg:flex" onMouseEnter={() => openMenu(activeMenu)} onMouseLeave={closeMenuSoon}>
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.985 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-auto w-full max-w-[1200px] overflow-hidden rounded-[16px] border border-white/70 bg-white/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_30px_80px_rgba(50,45,35,0.18)] backdrop-blur-3xl"
              style={{ WebkitBackdropFilter: 'blur(30px) saturate(155%)' }}
            >
              <div className="mb-3 flex items-center justify-between border-b border-[#cbc6bc]/60 px-2 pb-3">
                <span className="font-mono text-[9px] font-semibold tracking-[0.2em] text-[#777168]">{activeMenu.toUpperCase()} · SINGULANCE</span>
                <span className="text-[10px] text-[#777168]">Explore the system <ArrowUpRight size={11} className="ml-1 inline" /></span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {MENU_CONTENT[activeMenu].map((item, index) => {
                  const Icon = item.icon;
                  return <a key={item.title} href={item.href} onClick={() => setActiveMenu(null)} className="group relative flex min-h-[238px] flex-col justify-between overflow-hidden rounded-[12px] border border-white/80 p-5 text-[#0a0a0a] no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] transition-all duration-300 hover:-translate-y-1 hover:border-[#48cce7] hover:shadow-[0_18px_36px_rgba(70,60,40,0.16)]" style={{ background: CARD_BACKDROPS[index] }}>
                    <div className="relative flex items-center justify-between"><div className="flex items-center gap-2"><Icon size={17} className="text-[#117dff]" /><span className="text-[11px] font-semibold">{item.title}</span></div><ArrowUpRight size={14} className="text-[#777168] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div>
                    <div className="relative max-w-[15ch] font-['Space_Grotesk'] text-[25px] font-medium leading-[1.02] tracking-[-0.035em]">{item.brief}</div>
                    <div className="relative border-t border-black/10 pt-3 font-mono text-[9px] font-semibold tracking-[0.18em] text-[#117dff]">{item.label}</div>
                  </a>;
                })}
              </div>
            </motion.div>
          </div>
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
            className="fixed inset-0 z-[99] bg-[#faf9f4]/98 backdrop-blur-xl lg:hidden"
          >
            <div className="pt-20 px-4 flex flex-col gap-1 max-h-screen overflow-y-auto">
              <div className="mb-3 flex items-center justify-center gap-5 border-b border-[#e3e0db] pb-4">
                {proofMetrics.map((metric) => <div key={metric.label} className="text-center"><div className="font-['Space_Grotesk'] text-sm font-bold">{metric.value}</div><div className="mt-1 font-mono text-[8px] uppercase tracking-[0.15em] text-[#9b968d]">{metric.label}</div></div>)}
              </div>
              {navLinks.map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleNavClick(item.href)}
                  className="text-left text-lg sm:text-xl font-medium text-[#0a0a0a] hover:text-[#117dff] py-4 border-b border-[#e3e0db]/50 flex items-center justify-between group bg-transparent border-x-0 border-t-0 cursor-pointer"
                >
                  {item.label}
                  <ChevronRight className="w-4 h-4 text-[#a3a3a3] group-hover:text-[#117dff] group-hover:translate-x-1 transition-all" />
                </motion.button>
              ))}

              <div className="flex flex-col gap-3 mt-6 pb-8">
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: navLinks.length * 0.04 + 0.1 }}
                  onClick={() => { setMobileOpen(false); navigate('/hivemind/login'); }}
                  className="w-full py-3.5 rounded-lg border border-[#e3e0db] text-[#0a0a0a] font-medium text-sm bg-white cursor-pointer hover:bg-[#f3f1ec] transition-colors"
                >
                  Sign in
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: navLinks.length * 0.04 + 0.15 }}
                  onClick={() => { setMobileOpen(false); navigate('/hivemind/login'); }}
                  className="w-full py-3.5 rounded-[4px] bg-[#117dff] text-white font-semibold text-xs uppercase tracking-[0.075em] cursor-pointer border-none flex items-center justify-center gap-2 hover:bg-[#0066e0] transition-colors shadow-[0_2px_12px_rgba(17,125,255,0.2)]"
                >
                  Get Started
                  <ArrowRight size={14} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
