import React, { useState, useEffect } from 'react';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${scrolled ? 'bg-[#111]/90 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}`}>
      <div className="max-w-[1200px] mx-auto border-x border-[#222] xl:border-[#222]">
        <div className="px-6 h-20 flex items-center justify-between">
          {/* Logo - Cartesia style grid icon + text */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 grid grid-cols-2 gap-0.5">
              <div className="w-full h-full bg-white rounded-sm"></div>
              <div className="w-full h-full bg-white/60 rounded-sm"></div>
              <div className="w-full h-full bg-white/60 rounded-sm"></div>
              <div className="w-full h-full bg-white rounded-sm"></div>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">HIVEMIND</span>
          </div>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8">
            {['Platform', 'Solutions', 'Developers', 'Pricing', 'Company'].map((item) => (
              <button
                key={item}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Right Buttons */}
          <div className="flex items-center gap-4">
            <button
              className="hidden sm:block text-sm font-medium text-white/70 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              Contact sales
            </button>
            <button
              className="text-sm font-medium text-white hover:text-white/80 transition-colors px-4 py-2 rounded-full border border-white/20 hover:border-white/40 bg-transparent cursor-pointer"
            >
              Sign in
            </button>
            <button className="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
