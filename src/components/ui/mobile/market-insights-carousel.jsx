/**
 * Market Insights Carousel Component (Mobile Optimized)
 * 
 * A mobile-first carousel component designed to replace RadialOrbitalTimelineMobile
 * with touch-friendly swipe gestures and scroll-snap behavior.
 * 
 * @version 1.0.0
 * @compatibility React 18+, Mobile browsers with scroll-snap support
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Simple device detection function as fallback
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Simple responsive components as fallbacks
const ResponsiveContainer = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

const ResponsiveText = ({ children, className = "", as: Component = 'div' }) => (
  <Component className={className}>{children}</Component>
);

const ResponsiveCard = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

const MarketInsightsCarousel = ({ 
  timelineData = [], 
  onSlideChange,
  initialIndex = 0,
  className = ""
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  
  // Simple device detection with fallback
  const deviceInfo = {
    isMobile: isMobileDevice()
  };

  // Handle slide change with callback
  const handleSlideChange = useCallback((newIndex) => {
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      onSlideChange?.(newIndex);
    }
  }, [activeIndex, onSlideChange]);

  // Handle scroll snap detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set timeout to detect scroll end
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        
        // Calculate current slide based on scroll position
        const scrollLeft = container.scrollLeft;
        const slideWidth = container.offsetWidth;
        const newIndex = Math.round(scrollLeft / slideWidth);
        
        if (newIndex >= 0 && newIndex < timelineData.length) {
          handleSlideChange(newIndex);
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [timelineData.length, handleSlideChange]);

  // Navigation dot click handler
  const handleDotClick = (index) => {
    const container = containerRef.current;
    if (!container) return;

    const slideWidth = container.offsetWidth;
    container.scrollTo({
      left: index * slideWidth,
      behavior: 'smooth'
    });
  };

  // Touch gesture handling
  const handleTouchStart = useCallback((e) => {
    // Prevent default to allow smooth scrolling
    if (deviceInfo.isMobile) {
      e.stopPropagation();
    }
  }, [deviceInfo.isMobile]);

  if (!timelineData || timelineData.length === 0) {
    return (
      <ResponsiveContainer className="flex items-center justify-center min-h-[300px]">
        <ResponsiveText className="text-gray-400">
          No market insights available
        </ResponsiveText>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer className={`market-insights-carousel w-full ${className}`}>
      {/* Carousel Container */}
      <div className="relative w-full max-w-full overflow-hidden">
        {/* Scrollable Content */}
        <div
          ref={containerRef}
          className="scroll-snap-x touch-pan-x flex overflow-x-auto overflow-y-hidden scrollbar-hide w-full"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
          onTouchStart={handleTouchStart}
        >
          {timelineData.map((item, index) => (
            <motion.div
              key={item.id || index}
              className="scroll-snap-center flex-shrink-0 w-full px-4"
              initial={{ opacity: 0.7 }}
              animate={{ 
                opacity: index === activeIndex ? 1 : 0.7,
                scale: index === activeIndex ? 1 : 0.95
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <ResponsiveCard className="h-full min-h-[280px] p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 backdrop-blur-sm">
                {/* Card Header */}
                <div className="flex items-center mb-4">
                  {item.icon && (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-white text-xl">{item.icon}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <ResponsiveText 
                      as="h3" 
                      className="text-fluid-lg font-semibold text-white truncate"
                    >
                      {item.title || `Insight ${index + 1}`}
                    </ResponsiveText>
                    {item.category && (
                      <ResponsiveText className="text-purple-300 text-fluid-sm">
                        {item.category}
                      </ResponsiveText>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="space-y-3">
                  {item.description && (
                    <ResponsiveText className="text-gray-300 text-fluid-sm leading-relaxed">
                      {item.description}
                    </ResponsiveText>
                  )}
                  
                  {item.metrics && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {item.metrics.map((metric, idx) => (
                        <div key={idx} className="text-center p-3 rounded-lg bg-black/20">
                          <ResponsiveText className="text-purple-300 text-fluid-2xl font-bold">
                            {metric.value}
                          </ResponsiveText>
                          <ResponsiveText className="text-gray-400 text-fluid-xs">
                            {metric.label}
                          </ResponsiveText>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.tags && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </ResponsiveCard>
            </motion.div>
          ))}
        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center mt-6 space-x-2">
          {timelineData.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`mobile-touch-target w-3 h-3 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'bg-purple-400 scale-125'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Progress Indicator */}
        <div className="w-full bg-gray-700 h-1 rounded-full mt-4 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ 
              width: `${((activeIndex + 1) / timelineData.length) * 100}%` 
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>

        {/* Slide Counter */}
        <div className="text-center mt-3">
          <ResponsiveText className="text-gray-400 text-fluid-sm">
            {activeIndex + 1} of {timelineData.length}
          </ResponsiveText>
        </div>
      </div>

      {/* Loading State */}
      <AnimatePresence>
        {isScrolling && (
          <motion.div
            className="absolute inset-0 bg-black/10 rounded-lg flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </ResponsiveContainer>
  );
};

/**
 * CSS Classes for scroll-snap functionality
 * Add these to your mobile-responsive.css:
 * 
 * .scroll-snap-x { scroll-snap-type: x mandatory; }
 * .scroll-snap-center { scroll-snap-align: center; }
 * .touch-pan-x { touch-action: pan-x; }
 * .scrollbar-hide::-webkit-scrollbar { display: none; }
 */

export default MarketInsightsCarousel;