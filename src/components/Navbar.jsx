import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  
  useEffect(() => {
    // Set active section based on current path
    const path = location.pathname;
    if (path === '/') setActiveSection('home');
    else if (path === '/about') setActiveSection('food');
    else if (path === '/underprogress') setActiveSection('orders');
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

  return (
    <nav className="fixed w-full z-50 font-mono">
      {/* Top Line Decoration */}
      <div className="h-0.5 w-full bg-green-400" />
      
      <div className="bg-black">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between relative">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <Link to="/">
                <img 
                  src={process.env.PUBLIC_URL + '/logo.gif'} 
                  alt="Foodles Logo" 
                  className="h-10"
                  onError={(e) => {
                    console.error('Logo failed to load:', e);
                    // Fallback to text if image fails to load
                    e.target.style.display = 'none';
                  }}
                />
              </Link>
              <div className="text-white">
                <div className="text-xs tracking-wider opacity-60">ID_630.18.056.56</div>
                <div className="text-lg font-bold tracking-wider">FOODLES_</div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                onClick={() => handleNavigation('home')}
                className="group relative"
              >
                <div className="flex items-center space-x-2">
                  <div className={`px-4 py-1 ${activeSection === 'home' ? 'bg-green-400 text-black' : 'text-white'}`}>
                    <span className="text-xs tracking-wider">01/HOME</span>
                  </div>
                  <div className="text-xs text-white/50">{currentTime}</div>
                </div>
                <div className={`absolute -bottom-px left-0 h-0.5 bg-green-400 transition-all duration-300
                  ${activeSection === 'home' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </Link>

              <Link
                to="/about"
                onClick={() => handleNavigation('food')}
                className="group relative"
              >
                <div className="flex items-center space-x-2">
                  <div className={`px-4 py-1 ${activeSection === 'food' ? 'bg-green-400 text-black' : 'text-white'}`}>
                    <span className="text-xs tracking-wider">02/FOOD_points</span>
                  </div>
                  <div className="text-xs text-white/50">{currentTime}</div>
                </div>
                <div className={`absolute -bottom-px left-0 h-0.5 bg-green-400 transition-all duration-300
                  ${activeSection === 'food' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </Link>

              <Link
                to="/underprogress"
                onClick={() => handleNavigation('orders')}
                className="group relative"
              >
                <div className="flex items-center space-x-2">
                  <div className={`px-4 py-1 ${activeSection === 'orders' ? 'bg-green-400 text-black' : 'text-white'}`}>
                    <span className="text-xs tracking-wider">03/ORDERS</span>
                  </div>
                  <div className="text-xs text-white/50">{currentTime}</div>
                </div>
                <div className={`absolute -bottom-px left-0 h-0.5 bg-green-400 transition-all duration-300
                  ${activeSection === 'orders' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </Link>

              <Link
                to="/terms"
                onClick={() => handleNavigation('terms')}
                className="group relative"
              >
                <div className="flex items-center space-x-2">
                  <div className={`px-4 py-1 ${activeSection === 'terms' ? 'bg-green-400 text-black' : 'text-white'}`}>
                    <span className="text-xs tracking-wider">04/TERMS</span>
                  </div>
                  <div className="text-xs text-white/50">{currentTime}</div>
                </div>
                <div className={`absolute -bottom-px left-0 h-0.5 bg-green-400 transition-all duration-300
                  ${activeSection === 'terms' ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </Link>
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
            <Link
              to="/"
              onClick={() => handleNavigation('home')}
              className="w-full text-left py-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-1 h-4 ${activeSection === 'home' ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className={`text-sm tracking-wider ${
                    activeSection === 'home' ? 'text-green-400' : 'text-white/70'
                  }`}>01 / HOME</span>
                </div>
                <div className="text-xs text-white/30">{currentTime}</div>
              </div>
            </Link>

            <Link
              to="/about"
              onClick={() => handleNavigation('food')}
              className="w-full text-left py-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-1 h-4 ${activeSection === 'food' ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className={`text-sm tracking-wider ${
                    activeSection === 'food' ? 'text-green-400' : 'text-white/70'
                  }`}>02 / FOOD_POINTS</span>
                </div>
                <div className="text-xs text-white/30">{currentTime}</div>
              </div>
            </Link>

            <Link
              to="/underprogress"
              onClick={() => handleNavigation('orders')}
              className="w-full text-left py-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-1 h-4 ${activeSection === 'orders' ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className={`text-sm tracking-wider ${
                    activeSection === 'orders' ? 'text-green-400' : 'text-white/70'
                  }`}>03 / ORDERS</span>
                </div>
                <div className="text-xs text-white/30">{currentTime}</div>
              </div>
            </Link>

            <Link
              to="/terms"
              onClick={() => handleNavigation('terms')}
              className="w-full text-left py-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-1 h-4 ${activeSection === 'terms' ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className={`text-sm tracking-wider ${
                    activeSection === 'terms' ? 'text-green-400' : 'text-white/70'
                  }`}>04 / TERMS</span>
                </div>
                <div className="text-xs text-white/30">{currentTime}</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Line Decoration */}
      <div className="h-0.5 w-full bg-green-400" />

      {/* Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="h-full w-full bg-[linear-gradient(90deg,transparent_24px,rgba(255,255,255,0.05)_1px),linear-gradient(transparent_24px,rgba(255,255,255,0.05)_1px)] bg-[size:25px_25px]" />
      </div>
    </nav>
  );
};

export default Navbar;