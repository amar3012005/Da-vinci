"use client";

import { useState, useEffect } from "react";

export function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className = ""
}) {
  const [submitted, setSubmitted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);
  const [audioData, setAudioData] = useState(new Array(visualizerBars).fill(0));
  const [permissionError, setPermissionError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    setIsClient(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Adjust visualizer bars for mobile
  const effectiveBars = isMobile ? Math.min(24, visualizerBars) : visualizerBars;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Listen for real audio data
  useEffect(() => {
    const handleAudioData = (event) => {
      if (isDemo && event.detail && event.detail.data) {
        const rawData = event.detail.data;
        console.log('AIVoiceInput received audio data:', rawData.slice(0, 10));
        
        // Map frequency data to visualizer bars
        const mappedData = new Array(effectiveBars).fill(0);
        const step = Math.floor(rawData.length / effectiveBars);
        
        for (let i = 0; i < effectiveBars; i++) {
          const start = i * step;
          const end = Math.min(start + step, rawData.length);
          const slice = rawData.slice(start, end);
          const average = slice.reduce((sum, val) => sum + val, 0) / slice.length;
          mappedData[i] = Math.min(average / 255, 1); // Normalize to 0-1
        }
        
        console.log('Mapped audio data:', mappedData.slice(0, 10));
        setAudioData(mappedData);
      }
    };

    // Check microphone permission
    const checkMicrophonePermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' });
          if (result.state === 'denied') {
            setPermissionError('Microphone access denied. Please enable it in your browser settings.');
          }
        }
      } catch (error) {
        console.warn('Could not check microphone permission:', error);
      }
    };

    checkMicrophonePermission();
    window.addEventListener('audioData', handleAudioData);
    return () => window.removeEventListener('audioData', handleAudioData);
  }, [isDemo, effectiveBars]);

  useEffect(() => {
    if (!isDemo) {
      setSubmitted(false);
      return;
    }

    // When demo mode is active, start the animation immediately
    setSubmitted(true);
    
    // Fallback animation if no real audio data is received
    const fallbackInterval = setInterval(() => {
      if (isDemo && audioData.every(val => val === 0)) {
        // Generate simulated audio data
        const simulatedData = new Array(effectiveBars).fill(0).map(() => Math.random() * 0.8 + 0.2);
        setAudioData(simulatedData);
      }
    }, 100);

    return () => clearInterval(fallbackInterval);
  }, [isDemo, audioData, effectiveBars]);

  return (
    <div className={`w-full py-4 ${className}`}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        
        {/* Permission Error Message */}
        {permissionError && (
          <div className="mb-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs sm:text-sm text-center">
            {permissionError}
          </div>
        )}

        {/* Voice Visualizer */}
        <div className="h-6 sm:h-8 md:h-10 w-full max-w-xs sm:max-w-sm md:max-w-md flex items-center justify-center gap-0.5 sm:gap-1 mb-3 sm:mb-4">
          {[...Array(effectiveBars)].map((_, i) => (
            <div
              key={i}
              className={`w-0.5 sm:w-1 rounded-full transition-all duration-100 ${
                submitted
                  ? "bg-white/60"
                  : "bg-white/10 h-1"
              }`}
              style={
                submitted && isClient
                  ? {
                      height: `${isDemo ? Math.max(10, audioData[i] * 100) : 20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.01}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        {/* Status Text */}
        <p className="h-4 text-xs sm:text-sm text-white/70">
          {submitted ? (isDemo ? "Speaking..." : "Listening...") : "Ready to play"}
        </p>
      </div>
    </div>
  );
}
