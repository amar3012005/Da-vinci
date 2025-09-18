import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const CampusSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasPreReservation, setHasPreReservation] = useState(false);

  useEffect(() => {
    // Check if user came from pre-reservation
    const urlParams = new URLSearchParams(location.search);
    const isPreReserved = urlParams.get('preReserved') === 'true';
    const restaurant = urlParams.get('restaurant');
    
    if (isPreReserved || localStorage.getItem('preReservation')) {
      setHasPreReservation(true);
    }

    // If pre-reserved for Himalayan Cafe and coming from North Campus, auto-redirect
    if (isPreReserved && restaurant === 'himalayan') {
      // Small delay to show the pre-reservation banner
      setTimeout(() => {
        navigate('/about');
      }, 2000);
    }
  }, [location, navigate]);

  const handleNorthCampusClick = () => {
    // Save campus selection
    localStorage.setItem('selectedCampus', 'north');
    
    if (hasPreReservation) {
      // If pre-reserved, go directly to about page (which will show restaurant selection)
      navigate('/about');
    } else {
      navigate('/about');
    }
  };

  const handleSouthCampusClick = () => {
    // Save campus selection
    localStorage.setItem('selectedCampus', 'south');
    
    // Redirect to AboutPage2 for south campus
    navigate('/about2');
  };

  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center p-2 md:p-4">
      {/* Background patterns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#242_1px,transparent_1px),linear-gradient(-45deg,#111_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#222_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      </div>

     

      {/* Pre-Reservation Banner */}
      {hasPreReservation && (
        <div className="absolute top-4 md:top-10 left-1/2 transform -translate-x-1/2 z-10 px-2">
          <div className="bg-green-500/20 border border-green-400 px-3 md:px-6 py-2 md:py-3 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-green-400 font-mono text-xs md:text-sm font-bold">
                ✓ TABLE PRE-RESERVED
              </div>
              <div className="text-green-400 font-mono text-xs">
                HIMALAYAN_CAFE - 10% Discount Active
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative space-y-4 md:space-y-8 z-10 w-full max-w-sm md:max-w-md">
        <div className="text-center">
          <h2 className="text-lg md:text-2xl lg:text-3xl font-mono text-white mb-1 md:mb-2">
            WHICH CAMPUS
          </h2>
          <h3 className="text-lg md:text-2xl lg:text-3xl font-mono text-green-400">
            DO YOU BELONG TO?
          </h3>
        </div>
        
        <div className="space-y-3 md:space-y-4 w-full px-2 md:px-0">
          <button
            onClick={handleNorthCampusClick}
            className={`w-full py-4 md:py-6 px-4 md:px-8 font-mono text-base md:text-xl text-black font-bold transition-all duration-300 relative
              ${hasPreReservation 
                ? 'bg-green-400 hover:bg-green-300' 
                : 'bg-green-400 hover:bg-green-300'
              }`}
            style={{
              clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)'
            }}
          >
            NORTH CAMPUS
            
            {hasPreReservation && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
              </div>
            )}
          </button>

          <button
            onClick={handleSouthCampusClick}
            className="w-full py-4 md:py-6 px-4 md:px-8 bg-green-400 hover:bg-green-300 font-mono text-base md:text-xl text-black font-bold transition-all duration-300 relative"
            style={{
              clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)'
            }}
          >
            SOUTH CAMPUS
          </button>
        </div>

        <div className="text-center mt-4 md:mt-8 space-y-1 md:space-y-2">
          <div className="text-white/70 font-mono text-xs md:text-sm">
            Select your campus to see nearby restaurants
          </div>
          <div className="text-green-400 font-mono text-xs flex items-center justify-center">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full mr-2"></span>
            Different delivery charges apply
          </div>
        </div>

        {/* Auto-redirect message */}
        {hasPreReservation && (
          <div className="text-center mt-4 md:mt-6">
            <div className="text-green-400 font-mono text-xs animate-pulse">
              Redirecting to Himalayan Cafe...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampusSelection;
