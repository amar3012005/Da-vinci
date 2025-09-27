"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function AIVoiceInputMobile({
  onStart,
  onStop,
  visualizerBars = 24, // Reduced from 48 for mobile
  demoMode = false,
  demoInterval = 3000,
  mobileOptimized = true,
  touchEnabled = true,
  hapticFeedback = true,
  disableVisualizer = false,
  className = ""
}) {
  const [submitted, setSubmitted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);
  const [audioData, setAudioData] = useState(new Array(visualizerBars).fill(0));
  const [isPressed, setIsPressed] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const lastProcessTimeRef = useRef(0);
  
  const containerRef = useRef(null);
  const audioDataRef = useRef(audioData);
  const throttleTimeoutRef = useRef(null);
  
  // Array pooling for performance
  const audioDataPoolRef = useRef([]);
  const getPooledArray = useCallback((size) => {
    if (audioDataPoolRef.current.length === 0) {
      audioDataPoolRef.current.push(new Array(size).fill(0));
    }
    const pooled = audioDataPoolRef.current.pop();
    pooled.length = size;
    pooled.fill(0);
    return pooled;
  }, []);
  
  const returnPooledArray = useCallback((array) => {
    if (audioDataPoolRef.current.length < 3) { // Limit pool size
      audioDataPoolRef.current.push(array);
    }
  }, []);

  // Update ref when audioData changes
  useEffect(() => {
    audioDataRef.current = audioData;
  }, [audioData]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Throttled audio data processing for mobile performance
  const processAudioData = useCallback((rawData) => {
    if (disableVisualizer) return; // Skip processing if visualizer is disabled
    
    const now = Date.now();
    if (now - lastProcessTimeRef.current < 100) return; // Throttle to 10fps instead of real-time
    
    lastProcessTimeRef.current = now;
    
    // Map frequency data to visualizer bars with mobile optimizations using array pooling
    const mappedData = getPooledArray(visualizerBars);
    const step = Math.floor(rawData.length / visualizerBars);
    
    for (let i = 0; i < visualizerBars; i++) {
      const start = i * step;
      const end = Math.min(start + step, rawData.length);
      const slice = rawData.slice(start, end);
      const average = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      mappedData[i] = Math.min(average / 255, 1); // Normalize to 0-1
    }
    
    setAudioData(mappedData);
  }, [visualizerBars, disableVisualizer, getPooledArray]);

  // Listen for real audio data with throttling
  useEffect(() => {
    const handleAudioData = (event) => {
      if (isDemo && event.detail && event.detail.data) {
        const rawData = event.detail.data;
        
        // Clear existing timeout
        if (throttleTimeoutRef.current) {
          clearTimeout(throttleTimeoutRef.current);
        }
        
        // Throttle processing
        throttleTimeoutRef.current = setTimeout(() => {
          processAudioData(rawData);
        }, 50);
      }
    };

    window.addEventListener('audioData', handleAudioData);
    return () => {
      window.removeEventListener('audioData', handleAudioData);
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [isDemo, processAudioData]);

  useEffect(() => {
    if (!isDemo) {
      setSubmitted(false);
      return;
    }

    // When demo mode is active, start the animation immediately
    setSubmitted(true);
    
    // Fallback animation if no real audio data is received
    const fallbackInterval = setInterval(() => {
      if (isDemo && audioDataRef.current.every(val => val === 0)) {
        // Generate simulated audio data with mobile-optimized randomness
        const simulatedData = new Array(visualizerBars).fill(0).map(() => 
          Math.random() * 0.6 + 0.2 // Reduced intensity for mobile
        );
        setAudioData(simulatedData);
      }
    }, 150); // Slower fallback for mobile

    return () => clearInterval(fallbackInterval);
  }, [isDemo, visualizerBars]);

  // Haptic feedback utility
  const vibrate = useCallback((pattern = [50]) => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, [hapticFeedback]);

  // Touch event handlers
  const handleTouchStart = useCallback((e) => {
    if (!touchEnabled) return;
    
    e.preventDefault();
    setIsPressed(true);
    setTouchStartTime(Date.now());
    
    // Start swipe detection
    handleSwipeStart(e);
    
    if (!submitted) {
      setSubmitted(true);
      vibrate([30]); // Short vibration for start
      onStart?.();
    }
  }, [touchEnabled, submitted, vibrate, onStart, handleSwipeStart]);

  const handleTouchEnd = useCallback((e) => {
    if (!touchEnabled) return;
    
    e.preventDefault();
    setIsPressed(false);
    
    const touchDuration = Date.now() - touchStartTime;
    
    // Check for swipe first
    handleSwipeEnd(e);
    
    // Long press detection (500ms+)
    if (touchDuration > 500) {
      vibrate([100, 50, 100]); // Long vibration for demo mode
      setIsDemo(!isDemo);
    } else if (submitted) {
      setSubmitted(false);
      vibrate([50]); // Medium vibration for stop
      onStop?.();
    }
    
    // Check for double tap
    handleTouchEndDoubleTap(e);
  }, [touchEnabled, touchStartTime, submitted, vibrate, onStop, isDemo, handleTouchEndDoubleTap, handleSwipeEnd]);

  const handleDoubleTap = useCallback((e) => {
    if (!touchEnabled) return;
    
    e.preventDefault();
    vibrate([25, 25, 25]); // Triple vibration for reset
    setAudioData(new Array(visualizerBars).fill(0));
  }, [touchEnabled, vibrate, visualizerBars]);

  // Touch-based double tap detection
  const lastTouchEndRef = useRef(0);
  const handleTouchEndDoubleTap = useCallback((e) => {
    if (!touchEnabled) return;
    
    const now = Date.now();
    if (now - lastTouchEndRef.current < 300) {
      handleDoubleTap(e);
    }
    lastTouchEndRef.current = now;
  }, [touchEnabled, handleDoubleTap]);

  // Swipe detection for mode switching
  const swipeStartRef = useRef({ x: 0, y: 0 });
  const handleSwipeStart = useCallback((e) => {
    if (!touchEnabled) return;
    const touch = e.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, [touchEnabled]);

  const handleSwipeEnd = useCallback((e) => {
    if (!touchEnabled) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    
    // Detect horizontal swipe (left or right) to toggle demo mode
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      vibrate([50, 25, 50]); // Swipe vibration pattern
      setIsDemo(!isDemo);
    }
  }, [touchEnabled, vibrate, isDemo]);

  // Device detection for automatic mobile optimizations
  const isMobileDevice = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const shouldReduceMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return (
    <div className={`w-full py-4 ${className}`}>
      <div className="relative max-w-sm w-full mx-auto flex items-center flex-col gap-3">
        {/* Mobile-optimized Voice Visualizer */}
        {!disableVisualizer && (
          <div 
            className={`h-6 w-48 sm:w-64 flex items-center justify-center gap-0.5 mb-4 transition-transform duration-200 ${
              isPressed ? 'scale-105' : 'scale-100'
            }`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              touchAction: 'manipulation',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          >
            {[...Array(visualizerBars)].map((_, i) => (
              <div
                key={i}
                className={`w-1 sm:w-0.5 rounded-full transition-all duration-150 ${
                  submitted
                    ? "bg-white/70"
                    : "bg-white/20 h-1"
                }`}
                style={
                  submitted && isClient
                    ? {
                        height: `${isDemo ? Math.max(8, audioData[i] * 80) : 15 + Math.random() * 60}%`,
                        animationDelay: `${i * 0.02}s`,
                        transform: shouldReduceMotion() ? 'none' : 'translateZ(0)', // Hardware acceleration
                        willChange: shouldReduceMotion() ? 'auto' : 'transform'
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
        
        {/* Touch area when visualizer is disabled */}
        {disableVisualizer && (
          <div 
            className="h-16 w-48 sm:w-64 flex items-center justify-center mb-4 transition-transform duration-200 bg-white/5 rounded-lg border border-white/10"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              touchAction: 'manipulation',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          >
            <div className="text-white/60 text-sm">Touch Area</div>
          </div>
        )}

        {/* Mobile-optimized Status Text */}
        <div className="text-center">
          <p className="h-5 text-sm sm:text-xs text-white/80 font-medium">
            {submitted ? (isDemo ? "Demo Mode" : "Listening...") : "Tap to Start"}
          </p>
          {touchEnabled && (
            <p className="text-xs text-white/50 mt-1">
              Tap to start/stop • Long press for demo • Double tap to reset • Swipe to toggle mode
            </p>
          )}
        </div>

        {/* Visual feedback for touch interactions */}
        {isPressed && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-white/10 rounded-lg animate-pulse" />
          </div>
        )}

        {/* Demo mode indicator */}
        {isDemo && (
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default AIVoiceInputMobile;
