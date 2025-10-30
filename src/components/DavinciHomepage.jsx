import React from "react";
import MainHomepage from "./MainHomepage";
import MainHomepageMobile from "./MainHomepageMobile";
import useDeviceDetection from "../hooks/useDeviceDetection";

const DavinciHomepage = () => {
  const { isMobile, isTablet, initialized } = useDeviceDetection();
  
  // Check for manual device override from URL or localStorage
  const getDeviceOverride = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlOverride = urlParams.get('deviceOverride');
      const storedOverride = localStorage.getItem('deviceOverride');
      
      // Return override if it's a valid value (mobile|tablet|desktop)
      const override = urlOverride || storedOverride;
      if (override && ['mobile', 'tablet', 'desktop'].includes(override)) {
        return override;
      }
    } catch (e) {
      console.warn('Failed to read device override:', e);
    }
    return null;
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
    const override = getDeviceOverride();
    
    // Determine variant from override or device detection
    let variant = 'desktop';
    if (override) {
      variant = override === 'desktop' ? 'desktop' : 'mobile'; // tablet maps to mobile
    } else if (isMobile || isTablet) {
      variant = 'mobile';
    }
    
    // Render appropriate component based on variant
    if (variant === 'mobile') {
      return <MainHomepageMobile />;
    }
    
    // Default to desktop version
    return <MainHomepage />;
  } catch (error) {
    // Fallback to desktop version in case of any errors
    console.error('Device detection error:', error);
    return <MainHomepage />;
  }
};

export default DavinciHomepage;
