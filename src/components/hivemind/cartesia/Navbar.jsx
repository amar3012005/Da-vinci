import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, ChevronRight } from 'lucide-react';

const navLinks = [
  { label: 'Platform', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Developers', href: '#developers' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '/hivemind/app/connectors' },
  { label: './ Research', href: '/research' },
  { label: './ Benchmark', href: '/benchmark' },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [visible, setVisible] = useState(true);
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

  const handleNavClick = (href) => {
    setMobileOpen(false);
    if (href.startsWith('/')) {
      navigate(href);
    } else if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
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
        <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">
          <div className="px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            {/* Logo */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavClick('/hivemind')}
              className="flex items-center gap-2 sm:gap-2.5 bg-transparent border-none cursor-pointer group"
            >
              <span className="font-['Space_Grotesk'] text-base font-bold tracking-[-0.04em] text-[#0a0a0a] sm:text-lg">HIVEMIND</span>
            </motion.button>

            {/* Center Links — Desktop */}
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((item) => (
                <motion.button
                  key={item.label}
                  whileHover={{ y: -1 }}
                  onClick={() => handleNavClick(item.href)}
                  className="text-xs sm:text-sm font-medium text-[#525252] hover:text-[#117dff] transition-colors bg-transparent border-none cursor-pointer relative group"
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
