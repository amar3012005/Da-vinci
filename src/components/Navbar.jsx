import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveSection('home');
    else if (path === '/about') setActiveSection('about');
    else if (path === '/demo') setActiveSection('demo');
    else if (path === '/terms') setActiveSection('terms');
  }, [location]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNavigation = (section) => {
    setActiveSection(section);
    setIsMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: '01/HOME', path: '/' },
    { id: 'about', label: '02/ABOUT', path: '/about' },
    { id: 'demo', label: '03/DEMO', path: '/demo' },
    { id: 'terms', label: '04/TERMS', path: '/terms' },
  ];

  return (
    <nav className="fixed w-full z-50 font-mono">
      <div className="h-0.5 w-full bg-green-400" />

      <div className="bg-black">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between relative">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <Link to="/">
                <img
                  src={process.env.PUBLIC_URL + '/logo.svg'}
                  alt="Da'vinci Solutions"
                  className="h-10"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </Link>
              <div className="text-white">
                <div className="text-xs tracking-wider opacity-60">AI ENTERPRISE SYSTEMS</div>
                <div className="text-lg font-bold tracking-wider">DA'VINCI_</div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => handleNavigation(item.id)}
                  className="group relative"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`px-4 py-1 ${activeSection === item.id ? 'bg-green-400 text-black' : 'text-white'}`}>
                      <span className="text-xs tracking-wider">{item.label}</span>
                    </div>
                    <div className="text-xs text-white/50">{currentTime}</div>
                  </div>
                  <div className={`absolute -bottom-px left-0 h-0.5 bg-green-400 transition-all duration-300
                    ${activeSection === item.id ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden flex items-center space-x-2 text-white"
            >
              <span className="text-xs tracking-wider">MENU_</span>
              <ChevronDown
                className={`w-4 h-4 transform transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-500 ease-in-out overflow-hidden ${
            isMenuOpen ? 'max-h-48' : 'max-h-0'
          }`}
        >
          <div className="container mx-auto px-4 py-4 border-t border-white/10">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => handleNavigation(item.id)}
                className="w-full text-left py-2 block"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-1 h-4 ${activeSection === item.id ? 'bg-green-400' : 'bg-white/20'}`} />
                    <span className={`text-sm tracking-wider ${
                      activeSection === item.id ? 'text-green-400' : 'text-white/70'
                    }`}>{item.label.replace('/', ' / ')}</span>
                  </div>
                  <div className="text-xs text-white/30">{currentTime}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="h-0.5 w-full bg-green-400" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="h-full w-full bg-[linear-gradient(90deg,transparent_24px,rgba(255,255,255,0.05)_1px),linear-gradient(transparent_24px,rgba(255,255,255,0.05)_1px)] bg-[size:25px_25px]" />
      </div>
    </nav>
  );
};

export default Navbar;
