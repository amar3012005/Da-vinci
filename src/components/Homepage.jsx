import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles.css';

const Hero = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      // Handle scroll event if needed
    };
    window.addEventListener('scroll', handleScroll);
    
    // Trigger entrance animations
    setTimeout(() => setIsLoaded(true), 100);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAboutClick = () => {
    navigate('/campus');
  };

  return (
    <div className="relative h-screen overflow-hidden bg-black" style={{ marginTop: '-100px' }}>

      {/* Background GIF */}
      <div 
        className="absolute inset-0 bg-cover bg-center w-full h-full"
        style={{ backgroundImage: `url('/images/FOODLES1.gif')`, backgroundSize: '500px', backgroundRepeat: 'no-repeat' }}
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />
      </div>

      {/* Background patterns */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#242_1px,transparent_1px),linear-gradient(-45deg,#111_2px,transparent_1px)] bg-[size:20px_20px]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,#222_1px,transparent_1px),linear-gradient(90deg,#111_2px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
        </div>

        {/* Order Now Button */}
          <div 
            className={`absolute top-3/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-1000 ease-out ${
          isLoaded ? 'translate-y--30 opacity-70 hover:opacity-100' : 'translate-y-20 opacity-0'
            }`}
            onClick={handleAboutClick}
          >
            <img 
          src="/images/ORDER.gif" 
          alt="Order Now"
          className="w-24 h-8 md:w-36 md:h-12 animate-slide mb-1"
            />
            <div className="text-center text-xs md:text-xs text-green-500 font-mono animate-pulse">
          [ CLICK HERE ]
            </div>
          </div>

          {/* Pre-Reserve Table Button */}
        <div 
          className={`absolute bottom-12 md:bottom-20 left-1/2 transform -translate-x-1/2 cursor-pointer transition-all duration-1000 ease-out ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
          onClick={() => navigate('/pre-reserve')}
        >
          <div className="bg-green-500/20 border border-green-400 px-3 py-2 md:px-6 md:py-3 backdrop-blur-sm hover:bg-green-500/30 transition-all duration-300">
            <div className="text-center">
          <div className="text-green-400 font-mono text-xs md:text-sm font-bold">
            PRE-RESERVE TABLE
          </div>
          <div className="text-green-400 font-mono text-xs">
            (HIMALAYAN_CAFE)
          </div>
            </div>
          </div>
          <div className="text-white font-mono text-xs mt-1 text-center">
            10% off on pre-orders at checkout
          </div>
        </div>

        {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#111_1px,transparent_1px),linear-gradient(-45deg,#111_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />
      </div>
    </div>
  );
};

const FuturisticHomepage = () => {
  // Remove prefetchedStatus since it's only used for storage
  // eslint-disable-next-line no-unused-vars
  const [_, setPrefetchedStatus] = useState(null);
  
  // Remove unused navigate if not needed
  useEffect(() => {
    const prefetchRestaurantStatus = async () => {
      try {
        const API_URL = process.env.NODE_ENV === 'production'
          ? 'https://foodles-backend-lpzp.onrender.com'
          : 'http://localhost:5000';

        const response = await fetch(`${API_URL}/api/restaurants/status`);
        const data = await response.json();
        setPrefetchedStatus(data);
        
        // Store in sessionStorage for About page
        sessionStorage.setItem('prefetchedStatus', JSON.stringify({
          data,
          timestamp: Date.now()
        }));

        console.log('✓ Restaurant status prefetched');
      } catch (error) {
        console.error('Failed to prefetch restaurant status:', error);
      }
    };

    prefetchRestaurantStatus();

    // Clear old statuses but keep prefetched data
    return () => {
      const keysToKeep = ['prefetchedStatus'];
      Object.keys(sessionStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
          sessionStorage.removeItem(key);
        }
      });
      localStorage.clear();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main content */}
      <div className="pt-24"style={{ marginTop: '-100px' }}>
        <Hero />
      </div>
    </div>
  );
};

export default FuturisticHomepage;