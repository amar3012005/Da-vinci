/**
 * Mobile-specific utilities for performance optimization and touch gesture handling
 * Used across mobile UI components for consistent behavior and performance
 */

import React from 'react';

// Performance Utilities
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const debounce = (func, wait, immediate) => {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

// RequestIdleCallback polyfill for non-critical tasks
export const requestIdleCallback = (callback, options = {}) => {
  if (window.requestIdleCallback) {
    return window.requestIdleCallback(callback, options);
  }
  
  const start = Date.now();
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    });
  }, 1);
};

// Frame rate limiting utilities
export const createFrameLimiter = (targetFPS = 30) => {
  const frameInterval = 1000 / targetFPS;
  let lastFrameTime = 0;
  
  return (callback) => {
    const now = Date.now();
    if (now - lastFrameTime >= frameInterval) {
      lastFrameTime = now;
      callback();
    }
  };
};

// Memory usage monitoring (if available)
export const getMemoryInfo = () => {
  if ('memory' in performance) {
    return {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
    };
  }
  return null;
};

// Touch Gesture Utilities
export const detectSwipe = (touchStart, touchEnd, threshold = 50) => {
  const deltaX = touchEnd.x - touchStart.x;
  const deltaY = touchEnd.y - touchStart.y;
  
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (Math.abs(deltaX) > threshold) {
      return deltaX > 0 ? 'right' : 'left';
    }
  } else {
    if (Math.abs(deltaY) > threshold) {
      return deltaY > 0 ? 'down' : 'up';
    }
  }
  
  return null;
};

export const handlePinchZoom = (touches, callback) => {
  if (touches.length !== 2) return;
  
  const touch1 = touches[0];
  const touch2 = touches[1];
  
  const distance = Math.sqrt(
    Math.pow(touch2.clientX - touch1.clientX, 2) +
    Math.pow(touch2.clientY - touch1.clientY, 2)
  );
  
  callback(distance);
};

export const vibrate = (pattern = [50]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export const validateTouchTarget = (element, minSize = 44) => {
  const rect = element.getBoundingClientRect();
  return rect.width >= minSize && rect.height >= minSize;
};

export const detectMultiTouch = (touches) => {
  return {
    count: touches.length,
    isMultiTouch: touches.length > 1,
    center: touches.length === 1 ? {
      x: touches[0].clientX,
      y: touches[0].clientY
    } : {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    }
  };
};

// Device Detection
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isTabletDevice = () => {
  return /iPad|Android(?=.*\bMobile\b)/i.test(navigator.userAgent);
};

export const getDevicePixelRatio = () => {
  return Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
};

export const supportsWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (e) {
    return false;
  }
};

export const getBatteryLevel = async () => {
  if ('getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const getNetworkInfo = () => {
  if ('connection' in navigator) {
    const connection = navigator.connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }
  return null;
};

// Animation Helpers
export const reduceMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const supportsHardwareAcceleration = () => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return !!gl;
};

export const optimizeCSSTransforms = (element) => {
  if (element) {
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'transform';
  }
};

export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '0px',
    ...options
  };
  
  if ('IntersectionObserver' in window) {
    return new IntersectionObserver(callback, defaultOptions);
  }
  
  // Fallback for browsers without IntersectionObserver
  return {
    observe: () => {},
    unobserve: () => {},
    disconnect: () => {}
  };
};

// Component Utilities
export const createMobileOptimizedProps = (baseProps = {}) => {
  const isMobile = isMobileDevice();
  const reducedMotion = reduceMotion();
  
  return {
    ...baseProps,
    mobileOptimized: isMobile,
    reducedMotion,
    touchEnabled: isMobile,
    hapticFeedback: isMobile,
    maxFPS: isMobile ? 30 : 60,
    visualizerBars: isMobile ? 24 : 48,
    enableTouch: isMobile
  };
};

export const getOptimalAnimationDuration = (baseDuration = 300) => {
  const reducedMotion = reduceMotion();
  const isMobile = isMobileDevice();
  
  if (reducedMotion) return 0;
  if (isMobile) return baseDuration * 1.5; // Slower animations on mobile
  return baseDuration;
};

// Error Handling
export const handleWebGLError = (error, fallbackCallback) => {
  console.warn('WebGL error:', error);
  if (fallbackCallback) {
    fallbackCallback();
  }
};

export const createErrorBoundary = (Component, FallbackComponent) => {
  return class extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }
    
    static getDerivedStateFromError(error) {
      return { hasError: true };
    }
    
    componentDidCatch(error, errorInfo) {
      console.error('Mobile component error:', error, errorInfo);
    }
    
    render() {
      if (this.state.hasError) {
        return FallbackComponent ? <FallbackComponent /> : <div>Something went wrong.</div>;
      }
      
      return <Component {...this.props} />;
    }
  };
};

// Debugging Helpers
export const logPerformanceMetrics = (componentName) => {
  if (process.env.NODE_ENV === 'development') {
    const memory = getMemoryInfo();
    const network = getNetworkInfo();
    
    console.log(`[${componentName}] Performance Metrics:`, {
      memory,
      network,
      devicePixelRatio: getDevicePixelRatio(),
      isMobile: isMobileDevice(),
      reducedMotion: reduceMotion(),
      webglSupport: supportsWebGL()
    });
  }
};

export const measureRenderTime = (componentName, renderFunction) => {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    const result = renderFunction();
    const end = performance.now();
    
    console.log(`[${componentName}] Render time: ${end - start}ms`);
    return result;
  }
  
  return renderFunction();
};

// Export all utilities as a single object for convenience
export const mobileUtils = {
  // Performance
  throttle,
  debounce,
  requestIdleCallback,
  createFrameLimiter,
  getMemoryInfo,
  
  // Touch Gestures
  detectSwipe,
  handlePinchZoom,
  vibrate,
  validateTouchTarget,
  detectMultiTouch,
  
  // Device Detection
  isMobileDevice,
  isTabletDevice,
  getDevicePixelRatio,
  supportsWebGL,
  getBatteryLevel,
  getNetworkInfo,
  
  // Animation
  reduceMotion,
  supportsHardwareAcceleration,
  optimizeCSSTransforms,
  createIntersectionObserver,
  
  // Component Helpers
  createMobileOptimizedProps,
  getOptimalAnimationDuration,
  
  // Error Handling
  handleWebGLError,
  createErrorBoundary,
  
  // Debugging
  logPerformanceMetrics,
  measureRenderTime
};

export default mobileUtils;
