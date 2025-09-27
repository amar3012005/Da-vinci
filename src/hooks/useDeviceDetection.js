import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MOBILE_MAX_WIDTH, 
  TABLET_MAX_WIDTH, 
  DESKTOP_MIN_WIDTH,
  MEDIA_QUERIES,
  DEVICE_TYPES,
  getDeviceTypeByWidth 
} from '../lib/breakpoints';

const useDeviceDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [screenWidth, setScreenWidth] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const resizeTimeoutRef = useRef(null);

  // Check for manual device override
  const getManualOverride = useCallback(() => {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const deviceParam = urlParams.get('device');
    if (deviceParam && Object.values(DEVICE_TYPES).includes(deviceParam)) {
      return deviceParam;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem('deviceOverride');
      if (stored && Object.values(DEVICE_TYPES).includes(stored)) {
        return stored;
      }
    } catch (e) {
      // localStorage access failed, continue with automatic detection
    }

    return null;
  }, []);

  // Device detection function
  const detectDevice = useCallback(() => {
    // Check if window is available (SSR compatibility)
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        screenWidth: DESKTOP_MIN_WIDTH,
        isTouchDevice: false
      };
    }

    // Check for manual override first
    const manualOverride = getManualOverride();
    if (manualOverride) {
      const width = window.innerWidth;
      return {
        isMobile: manualOverride === DEVICE_TYPES.MOBILE,
        isTablet: manualOverride === DEVICE_TYPES.TABLET,
        isDesktop: manualOverride === DEVICE_TYPES.DESKTOP,
        screenWidth: width,
        isTouchDevice: navigator.maxTouchPoints > 0 || 'ontouchstart' in window
      };
    }

    const width = window.innerWidth;
    
    // Primary detection method: Use matchMedia for more accurate results
    const isMobileViewport = window.matchMedia(MEDIA_QUERIES.mobile).matches;
    const isTabletViewport = window.matchMedia(MEDIA_QUERIES.tablet).matches;
    const isDesktopViewport = window.matchMedia(MEDIA_QUERIES.desktop).matches;
    
    // Enhanced user agent detection with modern device patterns
    const userAgent = navigator.userAgent;
    const mobileUserAgentRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Samsung|Pixel|OnePlus|Huawei|Xiaomi|Oppo|Vivo|LG|HTC|Sony|Nokia/i;
    const isMobileUserAgent = mobileUserAgentRegex.test(userAgent);
    
    // Use modern User-Agent Client Hints API when available
    const hasModernUserAgent = navigator.userAgentData?.mobile !== undefined;
    const isModernMobile = hasModernUserAgent ? navigator.userAgentData.mobile : false;
    
    // Enhanced touch detection
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const hasTouchStart = 'ontouchstart' in window;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const isTouchDevice = maxTouchPoints > 0 || hasTouchStart || hasCoarsePointer;
    
    // Special handling for iPad Pro and large tablets (often report as desktop)
    const isLargeTablet = width >= 1024 && width <= 1366 && isTouchDevice && 
                          (userAgent.includes('iPad') || userAgent.includes('Tablet'));
    
    // Special handling for foldable devices
    const isFoldable = userAgent.includes('Fold') || userAgent.includes('Flip') || 
                       (width > 800 && width < 1200 && isTouchDevice);
    
    // Priority-based detection logic
    let deviceType;
    
    // 1. Check viewport width first (most reliable)
    if (isMobileViewport) {
      deviceType = DEVICE_TYPES.MOBILE;
    } else if (isTabletViewport || isLargeTablet || isFoldable) {
      deviceType = DEVICE_TYPES.TABLET;
    } else if (isDesktopViewport) {
      // 2. For desktop viewport, check if it's actually a mobile device
      if (isModernMobile || (isMobileUserAgent && maxTouchPoints > 0)) {
        // Mobile device with large screen or desktop mode enabled
        deviceType = width <= TABLET_MAX_WIDTH ? DEVICE_TYPES.TABLET : DEVICE_TYPES.MOBILE;
      } else {
        deviceType = DEVICE_TYPES.DESKTOP;
      }
    } else {
      // Fallback based on user agent and touch
      if (isModernMobile || isMobileUserAgent) {
        deviceType = width <= MOBILE_MAX_WIDTH ? DEVICE_TYPES.MOBILE : DEVICE_TYPES.TABLET;
      } else {
        deviceType = DEVICE_TYPES.DESKTOP;
      }
    }
    
    return {
      isMobile: deviceType === DEVICE_TYPES.MOBILE,
      isTablet: deviceType === DEVICE_TYPES.TABLET,
      isDesktop: deviceType === DEVICE_TYPES.DESKTOP,
      screenWidth: width,
      isTouchDevice
    };
  }, [getManualOverride]);

  // Debounced resize handler with reduced timeout for better responsiveness
  const debouncedResize = useCallback(() => {
    if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    resizeTimeoutRef.current = setTimeout(() => {
      const detection = detectDevice();
      setIsMobile(detection.isMobile);
      setIsTablet(detection.isTablet);
      setScreenWidth(detection.screenWidth);
      setIsTouchDevice(detection.isTouchDevice);
    }, 150); // Reduced from 300ms for better responsiveness
  }, [detectDevice]);

  useEffect(() => {
    // Initial detection
    const initialDetection = detectDevice();
    setIsMobile(initialDetection.isMobile);
    setIsTablet(initialDetection.isTablet);
    setScreenWidth(initialDetection.screenWidth);
    setIsTouchDevice(initialDetection.isTouchDevice);
    setInitialized(true);

    // Add resize and orientation change listeners
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', debouncedResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', debouncedResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [detectDevice, debouncedResize]);

  // Calculate isDesktop for convenience
  const isDesktop = !isMobile && !isTablet;

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
    isTouchDevice,
    initialized
  };
};

export default useDeviceDetection;
