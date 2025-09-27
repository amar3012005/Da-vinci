import React from "react";
import MainHomepage from "./MainHomepage";
import MobileRedirect from "./MobileRedirect";
import useDeviceDetection from "../hooks/useDeviceDetection";

const DavinciHomepage = () => {
  const { isMobile, isTablet, initialized } = useDeviceDetection();
  
  // Check for manual desktop override
  const checkDesktopOverride = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const forceDesktop = urlParams.get('desktop') === 'true';
    const deviceOverride = urlParams.get('device') === 'desktop';
    
    try {
      const storedOverride = localStorage.getItem('forceDesktop') === 'true';
      return forceDesktop || deviceOverride || storedOverride;
    } catch (e) {
      return forceDesktop || deviceOverride;
    }
  };
  
  // Show enhanced loading state until device detection is complete
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white/80 text-sm font-medium">Initializing...</div>
        </div>
      </div>
    );
  }
  
  // Handle error boundary case
  try {
    const shouldShowMobile = (isMobile || isTablet) && !checkDesktopOverride();
    
    // Show mobile redirect for mobile and tablet devices (unless overridden)  
    if (shouldShowMobile) {
      return <MobileRedirect />;
    }
    
    // Default to desktop version for desktop or when overridden
    return <MainHomepage />;
  } catch (error) {
    // Fallback to desktop version in case of any errors
    console.error('Device detection error:', error);
    return <MainHomepage />;
  }
};

export default DavinciHomepage;
