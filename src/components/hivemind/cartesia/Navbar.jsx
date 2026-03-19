import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, Hexagon } from 'lucide-react';

const navLinks = [
  { label: 'Platform', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Developers', href: '#developers' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '/hivemind/app/connectors' },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
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
      <nav
        className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${
          scrolled
            ? 'bg-[#111]/90 backdrop-blur-md border-b border-white/5'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1200px] mx-auto border-x border-[#222] xl:border-[#222]">
          <div className="px-6 h-20 flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => handleNavClick('/hivemind')}
              className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center">
                <Hexagon size={16} className="text-[#bdf213]" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-white">HIVEMIND</span>
            </button>

            {/* Center Links — Desktop */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.href)}
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right Buttons — Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => navigate('/hivemind/login')}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors px-4 py-2 rounded-full border border-white/20 hover:border-white/40 bg-transparent cursor-pointer"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/hivemind/login')}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#bdf213] text-[#0a0a0a] text-sm font-semibold rounded-full hover:bg-[#d4ff3a] transition-colors group"
              >
                Get Started
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-white/70 hover:text-white bg-transparent border-none cursor-pointer"
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
            className="fixed inset-0 z-[99] bg-[#0a0a0a]/95 backdrop-blur-xl md:hidden"
          >
            <div className="pt-24 px-8 flex flex-col gap-2">
              {navLinks.map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleNavClick(item.href)}
                  className="text-left text-2xl font-medium text-white/80 hover:text-white py-3 border-b border-white/[0.06] bg-transparent border-x-0 border-t-0 cursor-pointer"
                >
                  {item.label}
                </motion.button>
              ))}

              <div className="flex flex-col gap-3 mt-8">
                <button
                  onClick={() => { setMobileOpen(false); navigate('/hivemind/login'); }}
                  className="w-full py-3.5 rounded-full border border-white/20 text-white font-medium text-base bg-transparent cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  onClick={() => { setMobileOpen(false); navigate('/hivemind/login'); }}
                  className="w-full py-3.5 rounded-full bg-[#bdf213] text-[#0a0a0a] font-semibold text-base cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
