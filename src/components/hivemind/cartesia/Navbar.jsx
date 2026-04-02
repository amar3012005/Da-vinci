import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';

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
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            ? 'bg-[#faf9f4]/90 backdrop-blur-xl border-b border-[#e3e0db]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">
          <div className="px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => handleNavClick('/hivemind')}
              className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer"
            >
              <img
                src="/images/davinci-logo.svg"
                alt="Da Vinci"
                className="h-8"
              />
              <span className="text-[#0a0a0a]/30 text-lg font-light">|</span>
              <span className="text-lg font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk']">Hivemind</span>
            </button>

            {/* Center Links — Desktop */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.href)}
                  className="text-sm font-medium text-[#525252] hover:text-[#117dff] transition-colors bg-transparent border-none cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right Buttons — Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => navigate('/hivemind/login')}
                className="text-sm font-medium text-[#525252] hover:text-[#0a0a0a] transition-colors px-4 py-2 rounded-lg border border-[#e3e0db] hover:border-[#d4d0ca] bg-white cursor-pointer"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/hivemind/login')}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#117dff] text-white text-sm font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors group uppercase tracking-[0.075em] cursor-pointer border-none"
              >
                Get Started
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[#525252] hover:text-[#0a0a0a] bg-transparent border-none cursor-pointer"
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
            className="fixed inset-0 z-[99] bg-[#faf9f4]/95 backdrop-blur-xl md:hidden"
          >
            <div className="pt-24 px-8 flex flex-col gap-2">
              {navLinks.map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleNavClick(item.href)}
                  className="text-left text-2xl font-medium text-[#0a0a0a] hover:text-[#117dff] py-3 border-b border-[#e3e0db] bg-transparent border-x-0 border-t-0 cursor-pointer"
                >
                  {item.label}
                </motion.button>
              ))}

              <div className="flex flex-col gap-3 mt-8">
                <button
                  onClick={() => { setMobileOpen(false); navigate('/hivemind/login'); }}
                  className="w-full py-3.5 rounded-lg border border-[#e3e0db] text-[#0a0a0a] font-medium text-base bg-white cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  onClick={() => { setMobileOpen(false); navigate('/hivemind/login'); }}
                  className="w-full py-3.5 rounded-[4px] bg-[#117dff] text-white font-semibold text-sm uppercase tracking-[0.075em] cursor-pointer border-none flex items-center justify-center gap-2"
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
